import React from 'react';
import { motion } from 'motion/react';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(category)}
      className="flex flex-col items-center gap-2 cursor-pointer group"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-100 border-2 border-transparent group-hover:border-primary transition-all shadow-sm">
        <img
          src={category.image_url || `https://picsum.photos/seed/${category.slug}/200/200`}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
      <span className="text-[11px] sm:text-xs font-bold text-zinc-700 text-center group-hover:text-primary transition-colors">
        {category.name}
      </span>
    </motion.div>
  );
};
