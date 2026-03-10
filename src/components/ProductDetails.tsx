import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingCart, ShieldCheck, Truck, RotateCcw, Heart, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Review } from '../types';
import { ProductService } from '../services/productService';

interface ProductDetailsProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, isOpen, onClose, onAddToCart }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingReviews(true);
      ProductService.getProductReviews(product.id)
        .then(setReviews)
        .finally(() => setIsLoadingReviews(false));
    }
  }, [isOpen, product.id]);

  const discountPrice = product.price * (1 - product.discount_percentage / 100);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full text-zinc-400 hover:text-zinc-900 transition-colors shadow-sm"
          >
            <X size={24} />
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              
              {/* Image Gallery */}
              <div className="p-6 sm:p-8 bg-zinc-50">
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-white shadow-sm">
                  <img
                    src={product.images[activeImage] || `https://picsum.photos/seed/${product.slug}-${activeImage}/800/800`}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(product.images.length > 0 ? product.images : [1, 2, 3, 4]).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        activeImage === i ? 'border-primary shadow-md' : 'border-transparent hover:border-zinc-200'
                      }`}
                    >
                      <img
                        src={typeof img === 'string' ? img : `https://picsum.photos/seed/${product.slug}-${i}/200/200`}
                        alt={`${product.name} view ${i + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 sm:p-8 lg:border-l border-zinc-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-lg">
                    Official Store
                  </span>
                  <div className="flex items-center text-amber-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-bold ml-1">{product.rating}</span>
                  </div>
                  <span className="text-xs text-zinc-400">({product.review_count} reviews)</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 mb-4 leading-tight">
                  {product.name}
                </h1>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-display font-bold text-primary">
                    ${discountPrice.toFixed(2)}
                  </span>
                  {product.discount_percentage > 0 && (
                    <>
                      <span className="text-lg text-zinc-400 line-through">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-lg">
                        -{product.discount_percentage}%
                      </span>
                    </>
                  )}
                </div>

                <p className="text-zinc-600 text-sm leading-relaxed mb-8">
                  {product.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <Truck size={20} className="text-primary" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Free Shipping</div>
                      <div className="text-[10px] text-zinc-500">On orders over $50</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <RotateCcw size={20} className="text-primary" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">30-Day Returns</div>
                      <div className="text-[10px] text-zinc-500">Hassle-free process</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <button
                    onClick={() => onAddToCart(product)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                  <button className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
                    Buy Now
                  </button>
                  <button className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-colors">
                    <Heart size={20} />
                  </button>
                </div>

                {/* Reviews Section */}
                <div className="border-t border-zinc-100 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-display font-bold text-zinc-900">Customer Reviews</h3>
                    <button className="text-sm font-bold text-primary hover:underline">Write a Review</button>
                  </div>

                  {isLoadingReviews ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="h-24 bg-zinc-50 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map(review => (
                        <div key={review.id} className="bg-zinc-50 p-4 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                {review.user_email?.[0].toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-900">{review.user_email?.split('@')[0]}</div>
                                <div className="flex items-center text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={10} fill={i < review.rating ? 'currentColor' : 'none'} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            {review.is_verified_purchase && (
                              <div className="flex items-center gap-1 text-emerald-600">
                                <ShieldCheck size={12} />
                                <span className="text-[10px] font-bold">Verified</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-400 text-sm">No reviews yet. Be the first to review!</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
