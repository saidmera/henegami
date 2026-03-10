import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { PromoterDashboard } from './components/PromoterDashboard';
import { ChatBox } from './components/ChatBox';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './components/Home';
import { ProductDetails } from './components/ProductDetails';
import { Profile, Product, CartItem } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShoppingCart, User as UserIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('affiliate_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.status === 'banned') {
        alert('Your account has been banned.');
        localStorage.removeItem('affiliate_user');
        return;
      }
      setUser(parsed);
    }

    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const handleAuthSuccess = (userData: Profile) => {
    setUser(userData);
    localStorage.setItem('affiliate_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('affiliate_user');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    // Optional: Show toast
  };

  const viewProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  if (user && user.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 max-w-md text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Account Suspended</h1>
          <p className="text-zinc-500 mb-6">Your account has been temporarily suspended. Please contact support for more information.</p>
          <button onClick={handleLogout} className="text-primary font-semibold hover:underline">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-primary/10">
        
        <Header 
          cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
          onSearch={(query) => console.log('Searching for:', query)} 
          user={user}
          onLogout={handleLogout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Routes>
            <Route 
              path="/" 
              element={
                <Home 
                  onAddToCart={addToCart} 
                  onViewDetails={viewProductDetails} 
                />
              } 
            />
            <Route 
              path="/auth" 
              element={user ? <Navigate to="/" /> : <AuthForm onAuthSuccess={handleAuthSuccess} />} 
            />
            <Route 
              path="/admin" 
              element={
                user && (user.role === 'admin' || user.role === 'moderator') 
                  ? <AdminDashboard user={user} /> 
                  : <Navigate to="/auth" />
              } 
            />
            <Route 
              path="/promoter" 
              element={
                user && user.role === 'promoter' 
                  ? <PromoterDashboard user={user} /> 
                  : <Navigate to="/auth" />
              } 
            />
          </Routes>
        </main>

        <Footer />

        {/* Product Details Modal */}
        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            onAddToCart={addToCart}
          />
        )}

        {/* Global Chat Box */}
        {user && <ChatBox user={user} />}

        {/* Mobile Bottom Navigation (Optional for APK feel) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-6 py-3 flex items-center justify-between z-50">
          <Link to="/" className="flex flex-col items-center gap-1 text-primary">
            <div className="p-1 bg-primary/10 rounded-lg"><Zap size={20} /></div>
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-zinc-400">
            <div className="p-1"><motion.div whileTap={{ scale: 0.8 }}><ShoppingCart size={20} /></motion.div></div>
            <span className="text-[10px] font-bold">Cart</span>
          </button>
          <Link 
            to={user ? (user.role === 'admin' || user.role === 'moderator' ? '/admin' : '/promoter') : '/auth'} 
            className="flex flex-col items-center gap-1 text-zinc-400"
          >
            <div className="p-1"><UserIcon size={20} /></div>
            <span className="text-[10px] font-bold">{user ? 'Account' : 'Login'}</span>
          </Link>
        </div>
      </div>
    </Router>
  );
}
