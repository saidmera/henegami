import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, UserRole } from '../types';
import bcrypt from 'bcryptjs';
import { motion } from 'motion/react';
import { Mail, Lock, Tag, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { logActivity } from '../utils';

interface AuthFormProps {
  onAuthSuccess: (user: Profile) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error('Database error. Please try again.');
        }
        
        if (!data) {
          throw new Error('User not found. Please register first.');
        }

        let cleanHash = data.password_hash?.trim();
        // Remove potential leading/trailing quotes if they were accidentally added to the DB
        while (cleanHash && (cleanHash.startsWith("'") || cleanHash.startsWith('"') || cleanHash.endsWith("'") || cleanHash.endsWith('"'))) {
          if (cleanHash.startsWith("'") || cleanHash.startsWith('"')) {
            cleanHash = cleanHash.substring(1);
          }
          if (cleanHash.endsWith("'") || cleanHash.endsWith('"')) {
            cleanHash = cleanHash.substring(0, cleanHash.length - 1);
          }
        }
        
        // Use compareSync for more reliable results in this environment
        const isMatch = bcrypt.compareSync(password, cleanHash);
        
        if (!isMatch) {
          throw new Error('Invalid credentials');
        }

        await logActivity(supabase, data.id, 'login', 'User logged in');
        onAuthSuccess(data);
      } else {
        // Registration
        const hashedPassword = bcrypt.hashSync(password, 10);
        const initialDiscount = promoCode ? 3 : 0;

        // Check if promo code exists if provided
        if (promoCode) {
          const { data: codeData } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', promoCode)
            .single();
          
          if (!codeData) {
            throw new Error('Invalid promo code');
          }
        }

        const { data, error } = await supabase
          .from('profiles')
          .insert([
            {
              email,
              password_hash: hashedPassword,
              promo_code_used: promoCode || null,
              discount_remaining: initialDiscount,
              role: 'customer' as UserRole,
              interests: [],
              last_activity: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) throw error;
        await logActivity(supabase, data.id, 'register', `User registered with promo: ${promoCode || 'none'}`);
        onAuthSuccess(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-zinc-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-zinc-900 rounded-2xl mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">{isLogin ? 'Welcome Back' : 'Join chenegami'}</h2>
          <p className="text-zinc-500 text-sm mt-2">
            {isLogin ? 'Enter your credentials to access your account' : 'Start your journey with us today'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Promo Code (Optional)</label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                  placeholder="SAVE10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                />
              </div>
              <p className="text-[10px] text-zinc-400 ml-1">Use a code for 10% off your first 3 purchases!</p>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
