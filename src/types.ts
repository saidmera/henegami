export const AI_SYSTEM_ID = '00000000-0000-0000-0000-000000000000';

export type UserRole = 'customer' | 'promoter' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface Profile {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  promo_code_used: string | null;
  discount_remaining: number;
  fidelity_points: number;
  unpaid_balance: number;
  interests: string[];
  last_activity: string;
  created_at: string;
}

export interface PromoCode {
  id: number;
  code: string;
  creator_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount_percentage: number;
  category_id: string;
  stock_quantity: number;
  rating: number;
  review_count: number;
  images: string[];
  is_trending: boolean;
  is_flash_deal: boolean;
  flash_deal_end?: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_email?: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ActivityLog {
  id: number;
  user_id: string;
  action_type: string;
  details: string;
  created_at: string;
}

export interface MonthlyRate {
  id: number;
  month: string;
  referral_rate: number;
  sale_rate: number;
}

export interface LeaderboardEntry {
  email: string;
  referrals: number;
}

export interface PayoutRequest {
  id: number;
  promoter_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  payment_method_details: string;
  created_at: string;
  paid_at?: string;
}

export interface MarketingAsset {
  id: number;
  title: string;
  type: 'image' | 'video';
  url: string;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: string;
  receiver_id: string | null; // null for support channel or direct messages
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  content: string;
  type: 'referral' | 'sale' | 'payout' | 'chat';
  is_read: boolean;
  created_at: string;
}
