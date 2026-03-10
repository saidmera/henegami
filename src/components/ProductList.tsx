import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Product, Profile } from '../types';
import { ShoppingCart, Tag, Info, Search, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { logActivity } from '../utils';

interface ProductListProps {
  user: Profile | null;
}

export const ProductList: React.FC<ProductListProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && searchTerm) {
      await logActivity(supabase, user.id, 'search', `User searched for: ${searchTerm}`);
      // Update interests
      const currentInterests = user.interests || [];
      if (!currentInterests.includes(searchTerm)) {
        await supabase.from('profiles').update({
          interests: [...currentInterests, searchTerm]
        }).eq('id', user.id);
      }
    }
  };

  const calculatePrice = (originalPrice: number) => {
    let discount = 1.0;
    if (user && user.discount_remaining > 0) {
      discount -= 0.1;
    }
    if (user && user.fidelity_points >= 100) {
      discount -= 0.05;
    }
    return (originalPrice * discount).toFixed(2);
  };

  const handleBuy = async (product: Product) => {
    if (!user) {
      alert('Please login to purchase');
      return;
    }

    const updates: any = {
      fidelity_points: (user.fidelity_points || 0) + 10
    };

    if (user.discount_remaining > 0) {
      updates.discount_remaining = user.discount_remaining - 1;
    }

    const { error } = await supabase.from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error) {
      const finalPrice = calculatePrice(product.price);
      alert(`Purchased ${product.name} for $${finalPrice}! You earned 10 fidelity points.`);
      // In a real app, we'd refresh the user state here
    }

    await logActivity(supabase, user.id, 'purchase', `Purchased ${product.name}`);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2 rounded-full border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50 backdrop-blur-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-2.5 text-zinc-400 w-5 h-5" />
      </form>

      {user?.discount_remaining > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-800"
        >
          <Tag className="w-5 h-5" />
          <p className="font-medium">You have {user.discount_remaining} discounted purchases remaining! (10% OFF)</p>
        </motion.div>
      )}

      {user?.fidelity_points >= 100 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-3 text-indigo-800"
        >
          <Zap className="w-5 h-5" />
          <p className="font-medium">Fidelity Reward: You have {user.fidelity_points} points! (Extra 5% OFF applied)</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="h-48 bg-zinc-50 relative overflow-hidden group">
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ShoppingCart className="w-12 h-12 text-zinc-200" />
                )}
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                    +{product.images.length - 1} more
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-zinc-900">{product.name}</h3>
                  <div className="text-right">
                    {(user?.discount_remaining > 0 || user?.fidelity_points >= 100) ? (
                      <>
                        <span className="text-sm text-zinc-400 line-through">${product.price}</span>
                        <div className="text-emerald-600 font-bold text-xl">${calculatePrice(product.price)}</div>
                      </>
                    ) : (
                      <div className="text-zinc-900 font-bold text-xl">${product.price}</div>
                    )}
                  </div>
                </div>
                <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stock: {product.stock_quantity}</span>
                  <button
                    onClick={() => handleBuy(product)}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-zinc-400">
            No products found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
