import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Product, Category, ActivityLog, PayoutRequest, MarketingAsset, Message, AI_SYSTEM_ID, MonthlyRate } from '../types';
import { 
  Plus, Edit2, Trash2, Users, Package, Activity, 
  TrendingUp, Clock, User as UserIcon, Search,
  DollarSign, ShieldAlert, Image as ImageIcon, Video,
  MessageSquare, CheckCircle, XCircle, Ban, Send
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  user: Profile;
}

// AI_SYSTEM_ID is imported from types.ts

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'users' | 'logs' | 'analytics' | 'referrals' | 'payouts' | 'assets' | 'support'>('analytics');
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [supportMessages, setSupportMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);
  const [selectedUserMessages, setSelectedUserMessages] = useState<Message[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedUserMessages]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [assetForm, setAssetForm] = useState({ title: '', type: 'image' as 'image' | 'video', url: '' });
  
  // Form states
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    slug: '',
    price: 0, 
    discount_percentage: 0,
    description: '', 
    stock_quantity: 0,
    category_id: '',
    images: [''] as string[],
    is_trending: false,
    is_flash_deal: false
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    image_url: ''
  });

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const msgSubscription = supabase
      .channel('admin-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message;
        // If it's a support message (incoming)
        if (!msg.receiver_id) {
          setSupportMessages(prev => [msg, ...prev]);
          // If we are currently looking at this user's chat, add it to history and claim it
          if (selectedUserIdRef.current === msg.sender_id) {
            setSelectedUserMessages(prev => [...prev, msg]);
            // Claim in DB
            supabase.from('messages').update({ receiver_id: user.id }).eq('id', msg.id).then();
          }
        }
        // If it's a reply from admin (outgoing) or AI response
        if ((msg.sender_id === user.id || msg.sender_id === AI_SYSTEM_ID) && msg.receiver_id === selectedUserIdRef.current) {
          setSelectedUserMessages(prev => [...prev, msg]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message;
        // If a message was assigned to someone else
        if (msg.receiver_id && msg.receiver_id !== user.id) {
          setSupportMessages(prev => prev.filter(m => m.id !== msg.id));
        }
        // If it was assigned to me
        if (msg.receiver_id === user.id) {
          setSupportMessages(prev => {
            const exists = prev.find(m => m.id === msg.id);
            if (exists) return prev.map(m => m.id === msg.id ? msg : m);
            return [msg, ...prev];
          });
        }
      })
      .subscribe();

    const notifSubscription = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        playNotificationSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSubscription);
      supabase.removeChannel(notifSubscription);
    };
  }, []);

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play blocked'));
  };

  const handleReply = async (senderId: string) => {
    const text = replyText[senderId];
    if (!text?.trim()) return;

    const { error } = await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: senderId,
      content: text
    }]);

    if (!error) {
      setReplyText({ ...replyText, [senderId]: '' });
      // Refresh messages for selected user
      if (selectedUserId === senderId) {
        fetchUserMessages(senderId);
      }
      alert('Reply sent!');
    }
  };

  const fetchUserMessages = async (userId: string) => {
    // Automatically assign the message to the current admin
    await supabase
      .from('messages')
      .update({ receiver_id: user.id })
      .eq('sender_id', userId)
      .is('receiver_id', null);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    if (data) setSelectedUserMessages(data);
  };

  useEffect(() => {
    if (selectedUserId) {
      fetchUserMessages(selectedUserId);
    }
  }, [selectedUserId]);

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security: Basic image URL validation
    const imageRegex = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
    const invalidImages = formData.images.filter(url => url.trim() !== '' && !imageRegex.test(url.split('?')[0]));
    if (invalidImages.length > 0) {
      alert('One or more image URLs are invalid. Please use direct links to image files (jpg, png, etc.)');
      return;
    }

    // Filter out empty image URLs
    const cleanedData = {
      ...formData,
      images: formData.images.filter(url => url.trim() !== '')
    };

    if (cleanedData.images.length === 0) {
      alert('Please add at least one image URL');
      return;
    }

    if (isEditing) {
      await supabase.from('products').update(cleanedData).eq('id', isEditing);
    } else {
      await supabase.from('products').insert([cleanedData]);
    }
    setFormData({ 
      name: '', slug: '', price: 0, discount_percentage: 0, 
      description: '', stock_quantity: 0, category_id: '', 
      images: [''], is_trending: false, is_flash_deal: false 
    });
    setIsEditing(null);
    fetchData();
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('categories').insert([categoryFormData]);
    setCategoryFormData({ name: '', slug: '', image_url: '' });
    fetchData();
  };

  const handleImageChange = (index: number, value: string) => {
    const newUrls = [...formData.images];
    newUrls[index] = value;
    setFormData({ ...formData, images: newUrls });
  };

  const addImageField = () => {
    if (formData.images.length < 4) {
      setFormData({ ...formData, images: [...formData.images, ''] });
    }
  };

  const removeImageField = (index: number) => {
    const newUrls = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newUrls.length > 0 ? newUrls : [''] });
  };

  const deleteProduct = async (id: number) => {
    if (confirm('Are you sure?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    if (!error) fetchData();
  };

  const processPayout = async (payoutId: number, status: 'paid' | 'rejected') => {
    const { error } = await supabase.from('payout_requests')
      .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
      .eq('id', payoutId);
    if (!error) fetchData();
  };

  const addAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Security: URL extension validation
    const urlRegex = /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|mov)$/i;
    if (!urlRegex.test(assetForm.url.split('?')[0])) {
      alert('Invalid asset URL. Please use direct links to media files (jpg, png, mp4, etc.)');
      return;
    }

    const { error } = await supabase.from('marketing_assets').insert([assetForm]);
    if (!error) {
      setAssetForm({ title: '', type: 'image', url: '' });
      fetchData();
    }
  };

  const deleteAsset = async (id: number) => {
    await supabase.from('marketing_assets').delete().eq('id', id);
    fetchData();
  };

  // Analytics Data
  const roleData = [
    { name: 'Customers', value: profiles.filter(p => p.role === 'customer').length },
    { name: 'Promoters', value: profiles.filter(p => p.role === 'promoter').length },
    { name: 'Staff', value: profiles.filter(p => p.role === 'admin' || p.role === 'moderator').length },
  ];

  const COLORS = ['#10b981', '#6366f1', '#f43f5e'];

  const interestData = profiles.reduce((acc: any[], profile) => {
    (profile.interests || []).forEach(interest => {
      const existing = acc.find(a => a.name === interest);
      if (existing) existing.count++;
      else acc.push({ name: interest, count: 1 });
    });
    return acc;
  }, []).sort((a, b) => b.count - a.count).slice(0, 5);

  const totalReferrals = profiles.filter(p => p.promo_code_used).length;
  
  const promoterStats = profiles
    .filter(p => p.role === 'promoter')
    .map(promoter => {
      const referrals = profiles.filter(p => p.promo_code_used && profiles.find(p2 => p2.id === promoter.id)?.email === p.promo_code_used).length; // This logic is slightly wrong, let's fix it
      return { email: promoter.email, referrals };
    });

  // Correcting promoter referral logic:
  // We need to know which promo code belongs to which promoter.
  // Let's fetch promo codes too.
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [monthlyRates, setMonthlyRates] = useState<MonthlyRate[]>([]);
  const [rateForm, setRateForm] = useState({ month: new Date().toISOString().slice(0, 7), referral_rate: 0.10, sale_rate: 2.00 });
  
  const fetchData = async () => {
    const [pRes, lRes, prRes, pcRes, payRes, assetRes, msgRes, notifRes, catRes, rateRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
      supabase.from('promo_codes').select('*'),
      supabase.from('payout_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('marketing_assets').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('*').or(`receiver_id.is.null,receiver_id.eq.${user.id}`).order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('categories').select('*'),
      supabase.from('monthly_rates').select('*').order('month', { ascending: false })
    ]);
    
    if (pRes.data) setProducts(pRes.data);
    if (lRes.data) setLogs(lRes.data);
    if (prRes.data) setProfiles(prRes.data);
    if (pcRes.data) setPromoCodes(pcRes.data);
    if (payRes.data) setPayouts(payRes.data);
    if (assetRes.data) setAssets(assetRes.data);
    if (msgRes.data) setSupportMessages(msgRes.data);
    if (notifRes.data) setNotifications(notifRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (rateRes.data) setMonthlyRates(rateRes.data);
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('monthly_rates').upsert([rateForm], { onConflict: 'month' });
    if (!error) {
      alert('Rates updated for ' + rateForm.month);
      fetchData();
    }
  };

  const conversionData = promoCodes.map(code => {
    const promoter = profiles.find(p => p.id === code.creator_id);
    const referrals = profiles.filter(p => p.promo_code_used === code.code).length;
    const sales = logs.filter(l => l.action_type === 'purchase' && profiles.find(p => p.id === l.user_id)?.promo_code_used === code.code).length;
    
    // Algorithm matching PromoterDashboard
    const currentMonth = new Date().toISOString().slice(0, 7);
    const rates = monthlyRates.find(r => r.month === currentMonth) || { referral_rate: 0.10, sale_rate: 2.00 };
    
    let referralEarnings = 0;
    if (referrals <= 50) referralEarnings = referrals * rates.referral_rate;
    else if (referrals <= 150) referralEarnings = (50 * rates.referral_rate) + ((referrals - 50) * (rates.referral_rate * 1.2));
    else referralEarnings = (50 * rates.referral_rate) + (100 * (rates.referral_rate * 1.2)) + ((referrals - 150) * (rates.referral_rate * 1.5));
    
    const saleEarnings = sales * rates.sale_rate;
    const milestoneBonus = Math.floor(referrals / 50) * 5.00;
    const totalReferralsCount = profiles.filter(p => p.promo_code_used).length;
    const share = totalReferralsCount > 0 ? (referrals / totalReferralsCount) * 100 : 0;
    const performanceBonus = (share > 5 && referrals >= 10) ? 10.00 : 0;
    
    const lifetime = referralEarnings + saleEarnings + milestoneBonus + performanceBonus;
    const paid = payouts.filter(p => p.promoter_id === code.creator_id && p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pending = payouts.filter(p => p.promoter_id === code.creator_id && p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    
    return {
      name: promoter?.email || code.code,
      referrals,
      sales,
      lifetime,
      balance: lifetime - paid - pending,
      percentage: parseFloat(share.toFixed(1))
    };
  }).sort((a, b) => b.referrals - a.referrals);

  const referralsByMonth = profiles
    .filter(p => p.promo_code_used)
    .reduce((acc: any, p) => {
      const month = new Date(p.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

  const monthlyReferralData = Object.entries(referralsByMonth).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      {/* Admin Header with Notifications */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin Control Center</h1>
          <p className="text-zinc-500 text-sm">Manage platform operations and support</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:bg-zinc-50 transition-colors relative"
          >
            <Clock className="w-5 h-5 text-zinc-600" />
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-zinc-100 font-bold text-sm">System Notifications</div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <div className="font-semibold text-xs text-zinc-900">{n.title}</div>
                    <p className="text-[10px] text-zinc-500 mt-1">{n.content}</p>
                    <div className="text-[8px] text-zinc-300 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 text-xs italic">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex border-b border-zinc-100">
        {[
          { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
          { id: 'referrals', icon: TrendingUp, label: 'Referrals' },
          { id: 'payouts', icon: DollarSign, label: 'Payouts' },
          { id: 'categories', icon: Package, label: 'Categories' },
          { id: 'products', icon: Package, label: 'Inventory' },
          { id: 'assets', icon: ImageIcon, label: 'Assets' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'support', icon: MessageSquare, label: 'Support' },
          { id: 'logs', icon: Activity, label: 'Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="bg-zinc-50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Pending Payout Requests</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="pb-2 font-semibold">Promoter</th>
                      <th className="pb-2 font-semibold">Amount</th>
                      <th className="pb-2 font-semibold">Method</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payouts.filter(p => p.status === 'pending').map(p => (
                      <tr key={p.id}>
                        <td className="py-3 text-zinc-900">{profiles.find(pr => pr.id === p.promoter_id)?.email}</td>
                        <td className="py-3 font-bold text-emerald-600">${p.amount}</td>
                        <td className="py-3 text-zinc-500">{p.payment_method_details}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => processPayout(p.id, 'paid')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => processPayout(p.id, 'rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payouts.filter(p => p.status === 'pending').length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-zinc-400 italic">No pending requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-8">
            <form onSubmit={addAsset} className="bg-zinc-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Title</label>
                <input type="text" required className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={assetForm.title} onChange={e => setAssetForm({...assetForm, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
                <select className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={assetForm.type} onChange={e => setAssetForm({...assetForm, type: e.target.value as any})}>
                  <option value="image">Image Banner</option>
                  <option value="video">Video Template</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">URL</label>
                <input type="url" required className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={assetForm.url} onChange={e => setAssetForm({...assetForm, url: e.target.value})} />
              </div>
              <button type="submit" className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 flex items-center justify-center gap-2 md:col-span-3">
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map(asset => (
                <div key={asset.id} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm group">
                  <div className="h-32 bg-zinc-50 flex items-center justify-center relative">
                    {asset.type === 'image' ? <ImageIcon className="w-8 h-8 text-zinc-200" /> : <Video className="w-8 h-8 text-zinc-200" />}
                    <button onClick={() => deleteAsset(asset.id)} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-zinc-900">{asset.title}</h4>
                    <p className="text-xs text-zinc-400 truncate mt-1">{asset.url}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Conversation List */}
            <div className="lg:col-span-1 bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-200 bg-white">
                <h3 className="text-sm font-bold text-zinc-900">Conversations</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {Array.from(new Set(supportMessages.map(m => m.sender_id))).map(senderId => {
                  const userProfile = profiles.find(p => p.id === senderId);
                  const lastMsg = supportMessages.find(m => m.sender_id === senderId);
                  const isAI = senderId === '00000000-0000-0000-0000-000000000000';
                  
                  if (isAI) return null; // Don't show AI as a separate conversation starter

                  return (
                    <button
                      key={senderId}
                      onClick={() => setSelectedUserId(senderId)}
                      className={`w-full p-4 text-left border-b border-zinc-100 transition-colors hover:bg-white ${
                        selectedUserId === senderId ? 'bg-white border-l-4 border-l-emerald-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">
                            {userProfile?.email || 'Unknown User'}
                          </span>
                          {!lastMsg?.receiver_id ? (
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Unassigned</span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Assigned to me</span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{lastMsg?.content}</p>
                    </button>
                  );
                })}
                {supportMessages.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 text-xs italic">No conversations</div>
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 flex flex-col overflow-hidden shadow-sm">
              {selectedUserId ? (
                <>
                  <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">
                          {profiles.find(p => p.id === selectedUserId)?.email}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                          {profiles.find(p => p.id === selectedUserId)?.role}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/30">
                    {selectedUserMessages.map((msg, idx) => {
                      const isMe = msg.sender_id === user.id;
                      const isAI = msg.sender_id === '00000000-0000-0000-0000-000000000000';
                      
                      return (
                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                            isMe ? 'bg-zinc-900 text-white rounded-tr-none' : 
                            isAI ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tl-none' :
                            'bg-white text-zinc-700 border border-zinc-100 rounded-tl-none'
                          }`}>
                            {isAI && <div className="text-[8px] font-black uppercase mb-1 opacity-50">AI Assistant</div>}
                            <p>{msg.content}</p>
                            <div className={`text-[8px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 border-t border-zinc-100 bg-white">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Type your reply..."
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={replyText[selectedUserId] || ''}
                        onChange={e => setReplyText({ ...replyText, [selectedUserId]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleReply(selectedUserId)}
                      />
                      <button 
                        onClick={() => handleReply(selectedUserId)}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-3 h-3" /> Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-zinc-200" />
                  </div>
                  <h3 className="font-bold text-zinc-900 mb-1">Select a conversation</h3>
                  <p className="text-sm max-w-[200px]">Choose a user from the list to view their support history and reply.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                <Users className="w-4 h-4" /> User Distribution
              </h3>
              <div className="h-64">
                {roleData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs italic">
                    No user data available
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {roleData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Top Interests
              </h3>
              <div className="h-64">
                {interestData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interestData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 text-xs italic">
                    No interest data available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-8">
            <div className="bg-zinc-50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Manage Monthly Rates
              </h3>
              <form onSubmit={handleRateSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Month</label>
                  <input type="month" className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={rateForm.month} onChange={e => setRateForm({...rateForm, month: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Ref Rate ($)</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={rateForm.referral_rate} onChange={e => setRateForm({...rateForm, referral_rate: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Sale Rate ($)</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 rounded-lg border border-zinc-200" value={rateForm.sale_rate} onChange={e => setRateForm({...rateForm, sale_rate: parseFloat(e.target.value)})} />
                </div>
                <button type="submit" className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800">
                  Update Rates
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {monthlyRates.map(r => (
                  <button key={r.month} onClick={() => setRateForm({ month: r.month, referral_rate: r.referral_rate, sale_rate: r.sale_rate })} className="px-3 py-1 bg-white border border-zinc-100 rounded-lg text-xs hover:border-zinc-300">
                    {r.month}: ${r.referral_rate}/${r.sale_rate}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-50 p-6 rounded-2xl">
                <h3 className="text-sm font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Conversion Rate (Share of Total Referrals)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl">
                <h3 className="text-sm font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Referrals by Month
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyReferralData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-6 rounded-2xl">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Promoter Performance & Balances</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="pb-2 font-semibold">Promoter</th>
                      <th className="pb-2 font-semibold">Code</th>
                      <th className="pb-2 font-semibold text-right">Refs/Sales</th>
                      <th className="pb-2 font-semibold text-right">Lifetime</th>
                      <th className="pb-2 font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {conversionData.map(d => (
                      <tr key={d.name}>
                        <td className="py-3 text-zinc-900">{d.name}</td>
                        <td className="py-3 text-zinc-500 font-mono">{promoCodes.find(c => (profiles.find(p => p.id === c.creator_id)?.email || c.code) === d.name)?.code}</td>
                        <td className="py-3 text-right font-medium">{d.referrals} / {d.sales}</td>
                        <td className="py-3 text-right text-zinc-600">${d.lifetime.toFixed(2)}</td>
                        <td className="py-3 text-right text-emerald-600 font-bold">${d.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-8">
            <form onSubmit={handleCategorySubmit} className="bg-zinc-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Slug</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={categoryFormData.slug}
                  onChange={e => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Image URL</label>
                <input
                  type="url"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={categoryFormData.image_url}
                  onChange={e => setCategoryFormData({ ...categoryFormData, image_url: e.target.value })}
                />
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 md:col-span-3">
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white border border-zinc-100 rounded-2xl p-4 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-zinc-50">
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-bold text-zinc-900">{cat.name}</div>
                  <div className="text-[10px] text-zinc-400">{cat.slug}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-8">
            <form onSubmit={handleProductSubmit} className="bg-zinc-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Slug</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.price || ''}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Discount (%)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.discount_percentage || ''}
                  onChange={e => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Stock</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.stock_quantity || ''}
                  onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_trending}
                    onChange={e => setFormData({ ...formData, is_trending: e.target.checked })}
                  />
                  Trending
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_flash_deal}
                    onChange={e => setFormData({ ...formData, is_flash_deal: e.target.checked })}
                  />
                  Flash Deal
                </label>
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isEditing ? 'Update' : 'Add Product'}
              </button>
              
              <div className="md:col-span-2 lg:col-span-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Product Images (1-4 URLs)</label>
                  {formData.images.length < 4 && (
                    <button 
                      type="button" 
                      onClick={addImageField}
                      className="text-[10px] font-bold text-emerald-600 uppercase hover:underline"
                    >
                      + Add Image
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.images.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        placeholder={`Image URL ${index + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                        value={url}
                        onChange={e => handleImageChange(index, e.target.value)}
                        required={index === 0}
                      />
                      {formData.images.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeImageField(index)}
                          className="p-2 text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-4 space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="pb-4 font-semibold text-zinc-900">Product</th>
                    <th className="pb-4 font-semibold text-zinc-900">Category</th>
                    <th className="pb-4 font-semibold text-zinc-900 text-right">Price</th>
                    <th className="pb-4 font-semibold text-zinc-900 text-right">Stock</th>
                    <th className="pb-4 font-semibold text-zinc-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="py-4">
                        <div className="font-medium text-zinc-900">{p.name}</div>
                        <div className="text-xs text-zinc-400 truncate max-w-xs">{p.slug}</div>
                      </td>
                      <td className="py-4 text-zinc-600">
                        {categories.find(c => c.id === p.category_id)?.name || 'Uncategorized'}
                      </td>
                      <td className="py-4 text-right font-mono text-zinc-600">
                        ${p.price}
                        {p.discount_percentage > 0 && <span className="text-[10px] text-primary ml-1">(-{p.discount_percentage}%)</span>}
                      </td>
                      <td className="py-4 text-right text-zinc-600">{p.stock_quantity}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { 
                              setIsEditing(p.id as any); 
                              setFormData({
                                ...p,
                                images: p.images && p.images.length > 0 ? p.images : ['']
                              }); 
                            }} 
                            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteProduct(p.id as any)} className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-4 font-semibold text-zinc-900">User</th>
                  <th className="pb-4 font-semibold text-zinc-900">Role</th>
                  <th className="pb-4 font-semibold text-zinc-900">Interests</th>
                  <th className="pb-4 font-semibold text-zinc-900 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {profiles.map(p => (
                  <tr key={p.id}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="font-medium text-zinc-900">{p.email}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.role === 'admin' ? 'bg-red-100 text-red-700' :
                          p.role === 'promoter' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {p.role}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.interests || []).slice(0, 3).map(i => (
                          <span key={i} className="text-[10px] bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-100">{i}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === 'active' ? (
                          <button onClick={() => updateUserStatus(p.id, 'suspended')} title="Suspend" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg">
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => updateUserStatus(p.id, 'active')} title="Activate" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => updateUserStatus(p.id, 'banned')} title="Ban" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{log.action_type}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-zinc-700 mt-1">{log.details}</p>
                  <div className="text-[10px] text-zinc-400 mt-1">User ID: {log.user_id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
};
