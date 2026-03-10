import React from 'react';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onViewDetails }) => {
  const discountPrice = product.price * (1 - product.discount_percentage / 100);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
      onClick={() => onViewDetails(product)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-zinc-50">
        <img
          src={product.images[0] || `https://picsum.photos/seed/${product.slug}/400/400`}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.discount_percentage > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
              -{product.discount_percentage}%
            </span>
          )}
          {product.is_trending && (
            <span className="bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
              Trending
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); /* Handle wishlist */ }}
          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-primary transition-colors shadow-sm"
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-1 mb-1">
          <div className="flex items-center text-amber-400">
            <Star size={12} fill="currentColor" />
            <span className="text-[11px] font-bold ml-0.5">{product.rating}</span>
          </div>
          <span className="text-[10px] text-zinc-400">({product.review_count})</span>
        </div>

        <h3 className="text-sm font-medium text-zinc-800 line-clamp-2 mb-2 min-h-[40px]">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-lg font-display font-bold text-zinc-900">
            ${discountPrice.toFixed(2)}
          </span>
          {product.discount_percentage > 0 && (
            <span className="text-xs text-zinc-400 line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex items-center justify-center gap-2 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
          >
            <ShoppingCart size={14} />
            Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle Buy Now
            }}
            className="py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
};
