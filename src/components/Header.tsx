import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Bell, Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductService } from '../services/productService';
import { Category, Profile } from '../types';

interface HeaderProps {
  cartCount: number;
  onSearch: (query: string) => void;
  user: Profile | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, onSearch, user, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    ProductService.getCategories().then(setCategories);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length > 1) {
      const history = ProductService.getSearchHistory();
      const filtered = history.filter(q => q.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      ProductService.addToSearchHistory(searchQuery);
      onSearch(searchQuery);
      setShowSuggestions(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-600 hover:text-primary transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="text-2xl font-display font-bold text-primary tracking-tight cursor-pointer">
              Chenegami
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search for items..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                className="w-full bg-zinc-100 border-none rounded-full py-2.5 pl-5 pr-12 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button 
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
              >
                <Search size={18} />
              </button>
            </form>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden z-50"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(s);
                        onSearch(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-5 py-3 text-sm hover:bg-zinc-50 transition-colors flex items-center gap-3"
                    >
                      <Search size={14} className="text-zinc-400" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-4">
            <button className="hidden sm:flex p-2 text-zinc-600 hover:text-primary transition-colors relative">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-2">
                <Link 
                  to={user.role === 'admin' || user.role === 'moderator' ? '/admin' : '/promoter'}
                  className="p-2 text-zinc-600 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <User size={22} />
                  <span className="hidden md:block text-sm font-medium">{user.name}</span>
                </Link>
                <button 
                  onClick={onLogout}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="p-2 text-zinc-600 hover:text-primary transition-colors flex items-center gap-2">
                <User size={22} />
                <span className="hidden md:block text-sm font-medium">Login</span>
              </Link>
            )}

            <button className="p-2 text-zinc-600 hover:text-primary transition-colors relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Nav (Desktop) */}
        <nav className="hidden lg:flex items-center gap-8 h-10 text-sm font-medium text-zinc-600 overflow-x-auto no-scrollbar">
          {categories.slice(0, 8).map(cat => (
            <button key={cat.id} className="hover:text-primary transition-colors whitespace-nowrap">
              {cat.name}
            </button>
          ))}
          <button className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">
            All Categories <ChevronDown size={14} />
          </button>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[70] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="text-xl font-display font-bold text-primary">Categories</div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className="w-full text-left py-3 px-4 rounded-xl hover:bg-zinc-50 transition-colors font-medium text-zinc-700 flex items-center justify-between"
                  >
                    {cat.name}
                    <ChevronDown size={16} className="-rotate-90 text-zinc-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
