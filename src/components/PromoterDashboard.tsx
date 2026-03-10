import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, PromoCode, PayoutRequest, MarketingAsset, Notification } from '../types';
import { 
  Plus, Copy, Check, Tag, Users, TrendingUp, Trophy, 
  DollarSign, Image as ImageIcon, Video, Bell, Send,
  CreditCard, Clock, CheckCircle, XCircle, BarChart3,
  ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { LeaderboardEntry, ActivityLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts';

interface PromoterDashboardProps {
  user: Profile;
}

export const PromoterDashboard: React.FC<PromoterDashboardProps> = ({ user }) => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalUses: 0, totalSales: 0, conversionShare: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'assets' | 'payouts'>('overview');
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [codePerformance, setCodePerformance] = useState<any[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
  const [currentRates, setCurrentRates] = useState({ referral_rate: 0.10, sale_rate: 2.00 });
  const [earningsBreakdown, setEarningsBreakdown] = useState({ referrals: 0, sales: 0, milestones: 0, performance: 0, tiered_bonus: 0 });
  const [balance, setBalance] = useState({ lifetime: 0, paid: 0, pending: 0, available: 0 });

  useEffect(() => {
    fetchData();
    
    // Real-time notifications subscription
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev]);
        playNotificationSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play blocked'));
  };

  const fetchData = async () => {
    // Fetch codes, assets, payouts, notifications
    const [codesRes, assetRes, payRes, notifRes] = await Promise.all([
      supabase.from('promo_codes').select('*').eq('creator_id', user.id),
      supabase.from('marketing_assets').select('*'),
      supabase.from('payout_requests').select('*').eq('promoter_id', user.id).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    if (codesRes.data) setCodes(codesRes.data);
    if (assetRes.data) setAssets(assetRes.data);
    if (payRes.data) setPayouts(payRes.data);
    if (notifRes.data) setNotifications(notifRes.data);

    // Fetch current month rates
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: rateData } = await supabase.from('monthly_rates').select('*').eq('month', currentMonth).single();
    const rates = rateData || { referral_rate: 0.10, sale_rate: 2.00 };
    setCurrentRates(rates);

    if (!codesRes.data) return;
    const codesList = codesRes.data.map(c => c.code);

    // Fetch all referrals to calculate share
    const { data: allReferrals } = await supabase.from('profiles').select('promo_code_used');
    const totalReferrals = allReferrals?.filter(p => p.promo_code_used).length || 0;
    const myReferrals = allReferrals?.filter(p => p.promo_code_used && codesList.includes(p.promo_code_used)).length || 0;

    // Fetch sales (purchases)
    const { data: salesData } = await supabase.from('activity_logs')
      .select('*')
      .eq('action_type', 'purchase')
      .in('user_id', (await supabase.from('profiles').select('id').in('promo_code_used', codesList)).data?.map(p => p.id) || []);

    const mySales = salesData?.length || 0;

    const conversionShare = totalReferrals > 0 ? (myReferrals / totalReferrals) * 100 : 0;
    
    // --- ADVANCED AFFILIATE ALGORITHM ---
    
    // 1. Volume-Based Tiered Referral Rate
    // Tier 1 (0-50): Base
    // Tier 2 (51-150): Base + 20%
    // Tier 3 (151+): Base + 50%
    let referralEarnings = 0;
    let tieredBonus = 0;
    
    if (myReferrals <= 50) {
      referralEarnings = myReferrals * rates.referral_rate;
    } else if (myReferrals <= 150) {
      const tier1 = 50 * rates.referral_rate;
      const tier2 = (myReferrals - 50) * (rates.referral_rate * 1.2);
      referralEarnings = tier1 + tier2;
      tieredBonus = tier2 - ((myReferrals - 50) * rates.referral_rate);
    } else {
      const tier1 = 50 * rates.referral_rate;
      const tier2 = 100 * (rates.referral_rate * 1.2);
      const tier3 = (myReferrals - 150) * (rates.referral_rate * 1.5);
      referralEarnings = tier1 + tier2 + tier3;
      tieredBonus = (tier2 + tier3) - ((myReferrals - 50) * rates.referral_rate);
    }

    // 2. Sales Commission
    const saleEarnings = mySales * rates.sale_rate;
    
    // 3. Milestone Bonuses ($5 for every 50 referrals)
    const milestoneBonus = Math.floor(myReferrals / 50) * 5.00;
    
    // 4. Performance Bonus ($10 if conversion share > 5% and referrals >= 10)
    const performanceBonus = (conversionShare > 5 && myReferrals >= 10) ? 10.00 : 0;
    
    const lifetimeEarnings = referralEarnings + saleEarnings + milestoneBonus + performanceBonus;

    // 5. Balance Calculation (Lifetime - Paid - Pending)
    const totalPaid = payRes.data?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalPending = payRes.data?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
    const availableBalance = lifetimeEarnings - totalPaid - totalPending;

    setStats({
      totalUses: myReferrals,
      totalSales: mySales,
      conversionShare
    });

    setEarningsBreakdown({
      referrals: referralEarnings,
      sales: saleEarnings,
      milestones: milestoneBonus,
      performance: performanceBonus,
      tiered_bonus: tieredBonus
    });

    setBalance({
      lifetime: lifetimeEarnings,
      paid: totalPaid,
      pending: totalPending,
      available: availableBalance
    });

    setRevenue(lifetimeEarnings);

    // Performance Data (Last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const { data: referralLogs } = await supabase.from('profiles')
      .select('created_at')
      .in('promo_code_used', codesList);

    const { data: saleLogs } = await supabase.from('activity_logs')
      .select('created_at')
      .eq('action_type', 'purchase')
      .in('user_id', (await supabase.from('profiles').select('id').in('promo_code_used', codesList)).data?.map(p => p.id) || []);

    const dailyPerformance = last7Days.map(date => {
      const refs = referralLogs?.filter(l => l.created_at.startsWith(date)).length || 0;
      const sales = saleLogs?.filter(l => l.created_at.startsWith(date)).length || 0;
      return { date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), referrals: refs, sales: sales };
    });
    setPerformanceData(dailyPerformance);

    // Code-level performance
    const codeStats = codesRes.data.map(code => {
      const refs = allReferrals?.filter(p => p.promo_code_used === code.code).length || 0;
      return { code: code.code, referrals: refs, sales: 0 }; // Sales per code is harder without order tracking
    });
    setCodePerformance(codeStats);

    // Recent Referrals
    const { data: recentRefs } = await supabase.from('profiles')
      .select('email, created_at, promo_code_used')
      .in('promo_code_used', codesList)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentReferrals(recentRefs || []);

    // Leaderboard (Daily)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // This is a complex query for Supabase without a custom function, 
    // so we'll fetch and aggregate in JS for this demo.
    const { data: dailyProfiles } = await supabase.from('profiles')
      .select('promo_code_used, email')
      .gte('created_at', today.toISOString());

    const { data: allCodes } = await supabase.from('promo_codes').select('code, creator_id');
    const { data: allPromoters } = await supabase.from('profiles').select('id, email').eq('role', 'promoter');

    const dailyStats = (dailyProfiles || []).reduce((acc: any, p) => {
      if (p.promo_code_used) {
        const creatorId = allCodes?.find(c => c.code === p.promo_code_used)?.creator_id;
        const promoterEmail = allPromoters?.find(pr => pr.id === creatorId)?.email;
        if (promoterEmail) {
          acc[promoterEmail] = (acc[promoterEmail] || 0) + 1;
        }
      }
      return acc;
    }, {});

    const sortedLeaderboard = Object.entries(dailyStats)
      .map(([email, referrals]) => ({ email, referrals: referrals as number }))
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 5);

    setLeaderboard(sortedLeaderboard);
  };

  const generateCode = async () => {
    if (!newCode) return;
    const { error } = await supabase.from('promo_codes').insert([{ code: newCode, creator_id: user.id }]);
    if (error) {
      alert('Code already exists or error occurred');
    } else {
      setNewCode('');
      fetchData();
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const requestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance.available) {
      alert('Invalid amount or insufficient balance');
      return;
    }

    const { error } = await supabase.from('payout_requests').insert([{
      promoter_id: user.id,
      amount,
      payment_method_details: payoutMethod,
      status: 'pending'
    }]);

    if (!error) {
      setPayoutAmount('');
      setPayoutMethod('');
      fetchData();
      alert('Payout request submitted!');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Notifications */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Promoter Hub</h1>
          <p className="text-zinc-500 text-sm">Manage your affiliate business</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:bg-zinc-50 transition-colors relative"
          >
            <Bell className="w-5 h-5 text-zinc-600" />
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 font-bold text-sm">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                      <div className="font-semibold text-xs text-zinc-900">{n.title}</div>
                      <p className="text-[10px] text-zinc-500 mt-1">{n.content}</p>
                      <div className="text-[8px] text-zinc-300 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-8 text-center text-zinc-400 text-xs italic">No notifications yet</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-zinc-900">Referrals</h3>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-zinc-900">{stats.totalUses}</div>
            <div className="text-xs text-emerald-600 font-bold mb-1 flex items-center">
              <ArrowUpRight size={14} /> +12%
            </div>
          </div>
          <div className="text-xs text-zinc-400 mt-1">Total people brought</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-zinc-900">Conv. Share</h3>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-zinc-900">{stats.conversionShare.toFixed(1)}%</div>
            <div className="text-xs text-indigo-600 font-bold mb-1 flex items-center">
              <ArrowUpRight size={14} /> +2.4%
            </div>
          </div>
          <div className="text-xs text-zinc-400 mt-1">Of all platform referrals</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-xl">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-zinc-900">Available</h3>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-zinc-900">${balance.available.toFixed(2)}</div>
            <div className="text-xs text-amber-600 font-bold mb-1 flex items-center">
              <ArrowUpRight size={14} /> +${(earningsBreakdown.milestones + earningsBreakdown.performance + earningsBreakdown.tiered_bonus).toFixed(2)} bonus
            </div>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Lifetime: ${balance.lifetime.toFixed(2)} | Paid: ${balance.paid.toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 rounded-xl">
              <Trophy className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-semibold text-zinc-900">Sales</h3>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-3xl font-bold text-zinc-900">{stats.totalSales}</div>
            <div className="text-xs text-rose-600 font-bold mb-1 flex items-center">
              <ArrowUpRight size={14} /> +5
            </div>
          </div>
          <div className="text-xs text-zinc-400 mt-1">Purchases by referrals</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-100">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'performance', label: 'Performance', icon: BarChart3 },
          { id: 'assets', label: 'Assets', icon: ImageIcon },
          { id: 'payouts', label: 'Payouts', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${
              activeTab === tab.id ? 'text-primary' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Your Promo Codes</h2>
                    <p className="text-zinc-500 text-sm">Create and manage codes to share with your audience.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new code..."
                      className="px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newCode}
                      onChange={e => setNewCode(e.target.value.toUpperCase())}
                    />
                    <button
                      onClick={generateCode}
                      className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Create
                    </button>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {codes.map(code => (
                      <div key={code.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group">
                        <div>
                          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Code</div>
                          <div className="font-mono font-bold text-lg text-zinc-900">{code.code}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-2 rounded-lg bg-white shadow-sm text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                          {copied === code.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                    {codes.length === 0 && (
                      <div className="col-span-full text-center py-12 text-zinc-400 italic">
                        You haven't created any promo codes yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-zinc-100">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> High Five
                  </h2>
                  <p className="text-zinc-500 text-sm">Top 5 promoters today</p>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.email} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-zinc-200 text-zinc-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-white text-zinc-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-sm font-medium text-zinc-900 truncate max-w-[120px]">
                            {entry.email.split('@')[0]}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-emerald-600">
                          {entry.referrals} refs
                        </div>
                      </div>
                    ))}
                    {leaderboard.length === 0 && (
                      <div className="text-center py-8 text-zinc-400 text-sm italic">
                        No referrals yet today. Be the first!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Mini List */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">Recent Referrals</h2>
                <button onClick={() => setActiveTab('performance')} className="text-sm font-bold text-primary hover:underline">View All</button>
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  {recentReferrals.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-400 font-bold">
                          {ref.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{ref.email}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Used Code: {ref.promo_code_used}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400">{new Date(ref.created_at).toLocaleDateString()}</div>
                        <div className="text-xs font-bold text-emerald-600">+$0.10</div>
                      </div>
                    </div>
                  ))}
                  {recentReferrals.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 italic">No recent referrals</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-6">Referral Trends (7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorRefs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="referrals" stroke="#10b981" fillOpacity={1} fill="url(#colorRefs)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-6">Sales Performance</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-zinc-100">
                <h2 className="text-xl font-bold text-zinc-900">Code Performance Breakdown</h2>
              </div>
              <div className="p-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="pb-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Promo Code</th>
                        <th className="pb-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Referrals</th>
                        <th className="pb-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Sales</th>
                        <th className="pb-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Revenue</th>
                        <th className="pb-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {codePerformance.map(cp => (
                        <tr key={cp.code}>
                          <td className="py-4 font-mono font-bold text-zinc-900">{cp.code}</td>
                          <td className="py-4 text-zinc-600">{cp.referrals}</td>
                          <td className="py-4 text-zinc-600">{cp.sales}</td>
                          <td className="py-4 font-bold text-emerald-600">
                            ${(cp.referrals * currentRates.referral_rate + cp.sales * currentRates.sale_rate).toFixed(2)}
                          </td>
                          <td className="py-4 text-right">
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map(asset => (
              <div key={asset.id} className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm group">
                <div className="aspect-video bg-zinc-50 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Video className="w-8 h-8 text-zinc-400" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Video Template</span>
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm text-zinc-900 truncate">{asset.title}</h4>
                <button 
                  onClick={() => copyToClipboard(asset.url)}
                  className="mt-3 w-full py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  Copy Link
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-zinc-100">
                <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" /> Request Payout
                </h2>
                <p className="text-zinc-500 text-sm">Withdraw your earnings</p>
              </div>
              <div className="p-8">
                <form onSubmit={requestPayout} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Amount ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200" 
                        placeholder="0.00"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Method (e.g. PayPal)</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200" 
                        placeholder="email@example.com"
                        value={payoutMethod}
                        onChange={e => setPayoutMethod(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Request Payout
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-zinc-100">
                <h2 className="text-xl font-bold text-zinc-900">Recent Requests</h2>
              </div>
              <div className="p-8">
                <div className="space-y-3">
                  {payouts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {p.status === 'paid' ? <CheckCircle className="w-4 h-4" /> : 
                           p.status === 'pending' ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">${p.amount}</div>
                          <div className="text-[10px] text-zinc-400">{new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${
                        p.status === 'paid' ? 'text-emerald-600' :
                        p.status === 'pending' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                  {payouts.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 italic">No payout history</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
