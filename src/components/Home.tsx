import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, TrendingUp, Clock, History, ChevronRight } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductService } from '../services/productService';
import { ProductCard } from './ProductCard';
import { CategoryCard } from './CategoryCard';

interface HomeProps {
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const Home: React.FC<HomeProps> = ({ onAddToCart, onViewDetails }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [recentlySearched, setRecentlySearched] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cats, trending, deals, rec] = await Promise.all([
          ProductService.getCategories(),
          ProductService.getProducts({ is_trending: true }),
          ProductService.getProducts({ is_flash_deal: true }),
          ProductService.getRecommendedProducts()
        ]);
        setCategories(cats);
        setTrendingProducts(trending);
        setFlashDeals(deals);
        setRecommended(rec);
        setRecentlySearched(ProductService.getSearchHistory());
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-12 animate-pulse">
        <div className="h-40 bg-zinc-100 rounded-3xl" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-zinc-100 rounded-full" />
              <div className="h-3 bg-zinc-100 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-zinc-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      
      {/* Hero Banner */}
      <section className="relative h-48 sm:h-64 lg:h-80 rounded-3xl overflow-hidden bg-primary shadow-xl shadow-primary/20">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent z-10" />
        <img
          src="https://picsum.photos/seed/shop/1200/400"
          alt="Banner"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 sm:px-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md"
          >
            <span className="inline-block bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              Limited Time Offer
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mb-4 leading-tight">
              Big Savings on <br /> Smart Tech
            </h1>
            <button className="bg-white text-primary px-8 py-3 rounded-2xl font-bold hover:bg-zinc-100 transition-all active:scale-95">
              Shop Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-zinc-900">Shop by Category</h2>
          <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-8">
          {categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} onClick={() => {}} />
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      {flashDeals.length > 0 && (
        <section className="bg-amber-50 -mx-4 sm:-mx-8 px-4 sm:px-8 py-12 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 text-white rounded-xl">
                <Zap size={24} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-zinc-900">Flash Deals</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                  <Clock size={14} />
                  Ends in 12:45:00
                </div>
              </div>
            </div>
            <button className="text-sm font-bold text-amber-600 hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {flashDeals.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recommended for You */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-xl font-display font-bold text-zinc-900">Recommended for You</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {recommended.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 text-zinc-900 rounded-xl">
              <Zap size={24} />
            </div>
            <h2 className="text-xl font-display font-bold text-zinc-900">Trending Now</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {trendingProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </section>

      {/* Recently Searched */}
      {recentlySearched.length > 0 && (
        <section className="border-t border-zinc-100 pt-12">
          <div className="flex items-center gap-3 mb-6">
            <History size={20} className="text-zinc-400" />
            <h2 className="text-lg font-display font-bold text-zinc-900">Recently Searched</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {recentlySearched.map((query, i) => (
              <button
                key={i}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-sm font-medium rounded-full transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
