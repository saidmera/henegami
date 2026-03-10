import { supabase } from '../supabaseClient';
import { Product, Category, Review } from '../types';

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Electronics', slug: 'electronics', image_url: 'https://picsum.photos/seed/elec/200/200' },
  { id: '2', name: 'Accessories', slug: 'accessories', image_url: 'https://picsum.photos/seed/acc/200/200' },
  { id: '3', name: 'Smart Gadgets', slug: 'smart-gadgets', image_url: 'https://picsum.photos/seed/smart/200/200' },
  { id: '4', name: 'Fashion', slug: 'fashion', image_url: 'https://picsum.photos/seed/fashion/200/200' },
  { id: '5', name: 'Home & Kitchen', slug: 'home-kitchen', image_url: 'https://picsum.photos/seed/home/200/200' },
  { id: '6', name: 'Beauty', slug: 'beauty', image_url: 'https://picsum.photos/seed/beauty/200/200' },
  { id: '7', name: 'Deals', slug: 'deals', image_url: 'https://picsum.photos/seed/deals/200/200' },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Wireless Noise Cancelling Headphones',
    slug: 'wireless-headphones',
    description: 'Experience pure sound with our latest noise-cancelling technology. Perfect for travel and focus.',
    price: 299.99,
    discount_percentage: 20,
    category_id: '1',
    stock_quantity: 50,
    rating: 4.8,
    review_count: 1250,
    images: [],
    is_trending: true,
    is_flash_deal: true,
    flash_deal_end: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    name: 'Smart Watch Series 9',
    slug: 'smart-watch-9',
    description: 'The ultimate fitness companion. Track your health, stay connected, and look stylish.',
    price: 399.00,
    discount_percentage: 15,
    category_id: '3',
    stock_quantity: 30,
    rating: 4.9,
    review_count: 850,
    images: [],
    is_trending: true,
    is_flash_deal: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    name: 'Minimalist Leather Wallet',
    slug: 'leather-wallet',
    description: 'Handcrafted genuine leather wallet for the modern professional. Slim design, maximum capacity.',
    price: 45.00,
    discount_percentage: 0,
    category_id: '2',
    stock_quantity: 100,
    rating: 4.7,
    review_count: 420,
    images: [],
    is_trending: false,
    is_flash_deal: true,
    flash_deal_end: new Date(Date.now() + 43200000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'p4',
    name: 'Professional DSLR Camera',
    slug: 'dslr-camera',
    description: 'Capture every moment in stunning detail. High-resolution sensor and advanced autofocus.',
    price: 1299.00,
    discount_percentage: 10,
    category_id: '1',
    stock_quantity: 15,
    rating: 4.6,
    review_count: 310,
    images: [],
    is_trending: false,
    is_flash_deal: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'p5',
    name: 'Organic Cotton T-Shirt',
    slug: 'cotton-tshirt',
    description: 'Soft, breathable, and sustainable. The perfect everyday essential for your wardrobe.',
    price: 25.00,
    discount_percentage: 30,
    category_id: '4',
    stock_quantity: 200,
    rating: 4.5,
    review_count: 1500,
    images: [],
    is_trending: true,
    is_flash_deal: false,
    created_at: new Date().toISOString()
  }
];

export const ProductService = {
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data && data.length > 0 ? data : MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  async getProducts(filters?: { 
    category_id?: string; 
    is_trending?: boolean; 
    is_flash_deal?: boolean;
    search?: string;
  }): Promise<Product[]> {
    try {
      let query = supabase.from('products').select('*');

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.is_trending) {
        query = query.eq('is_trending', true);
      }
      if (filters?.is_flash_deal) {
        query = query.eq('is_flash_deal', true);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data && data.length > 0) return data;
      
      // Fallback to mock data filtering
      let filtered = [...MOCK_PRODUCTS];
      if (filters?.category_id) filtered = filtered.filter(p => p.category_id === filters.category_id);
      if (filters?.is_trending) filtered = filtered.filter(p => p.is_trending);
      if (filters?.is_flash_deal) filtered = filtered.filter(p => p.is_flash_deal);
      if (filters?.search) filtered = filtered.filter(p => p.name.toLowerCase().includes(filters.search!.toLowerCase()));
      
      return filtered;
    } catch {
      return MOCK_PRODUCTS;
    }
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) return null;
    return data;
  },

  async getProductReviews(productId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles (email)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(r => ({
      ...r,
      user_email: (r as any).profiles?.email
    }));
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Search history helpers
  getSearchHistory(): string[] {
    const history = localStorage.getItem('search_history');
    return history ? JSON.parse(history) : [];
  },

  addToSearchHistory(query: string) {
    if (!query.trim()) return;
    const history = this.getSearchHistory();
    const newHistory = [query, ...history.filter(q => q !== query)].slice(0, 10);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  },

  async getRecommendedProducts(): Promise<Product[]> {
    const history = this.getSearchHistory();
    if (history.length === 0) {
      return this.getProducts({ is_trending: true });
    }

    // Simple recommendation: products matching recent search terms
    const searchTerm = history[0];
    return this.getProducts({ search: searchTerm });
  }
};
