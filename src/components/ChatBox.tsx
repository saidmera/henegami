import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Message, AI_SYSTEM_ID } from '../types';
import { Send, MessageSquare, X, Minimize2, Maximize2, Bot, Smile, Sticker } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// AI_SYSTEM_ID is imported from types.ts

interface ChatBoxProps {
  user: Profile;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const EMOJIS = ['😊', '👋', '👍', '🔥', '❤️', '🙌', '✨', '🛒', '📦', '💰', '🎉', '🚀', '⭐', '💡', '💯'];
  const STICKERS = [
    { id: 's1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=happy', label: 'Happy Bot' },
    { id: 's2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cool', label: 'Cool Bot' },
    { id: 's3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wow', label: 'Wow Bot' },
    { id: 's4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=love', label: 'Love Bot' },
    { id: 's5', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=party', label: 'Party Bot' },
    { id: 's6', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=idea', label: 'Idea Bot' },
    { id: 's7', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=rich', label: 'Rich Bot' },
    { id: 's8', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=fast', label: 'Fast Bot' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const msg = payload.new as Message;
          // Show message if:
          // 1. It's not from current user and directed to current user (reply)
          // 2. It's from current user (sync across tabs)
          if (msg.sender_id !== user.id && msg.receiver_id === user.id) {
            setMessages(prev => [...prev, msg]);
            if (!isOpen || isMinimized) setUnreadCount(prev => prev + 1);
          } else if (msg.sender_id === user.id) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isOpen, user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const getAIResponse = async (userMessage: string) => {
    try {
      setIsTyping(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `You are a helpful Support AI for an Affiliate & E-commerce platform. 
      Users include Customers (who buy products), Promoters (who share codes for commissions), and Admins.
      Current User Context:
      - Name/Email: ${user.email}
      - Role: ${user.role}
      - Fidelity Points: ${user.fidelity_points}
      
      Platform Rules:
      - Promoters earn $0.10 per referral and $2.00 per sale.
      - Customers get 10 fidelity points per purchase. 100 points = 5% extra discount.
      - Payouts can be requested via the Promoter Dashboard.
      
      Be concise, professional, and friendly. If you cannot answer a technical billing question, tell them an Admin will review the chat shortly.`;

      const response = await ai.models.generateContent({
        model,
        contents: userMessage,
        config: { systemInstruction }
      });

      const aiText = response.text || "I'm sorry, I'm having trouble processing that. An admin will be with you shortly.";

      // Insert AI message into DB
      const { data: msgData } = await supabase.from('messages').insert([{
        sender_id: AI_SYSTEM_ID,
        receiver_id: user.id, // Direct response to user
        content: aiText,
      }]).select();

      if (msgData) {
        setMessages(prev => [...prev, msgData[0]]);
        
        // Notify admins about the AI interaction
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'moderator']);
        if (admins) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'AI Support Activity',
            content: `AI responded to ${user.email}: "${aiText.substring(0, 50)}..."`,
            type: 'chat',
            is_read: false
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (e?: React.FormEvent, content?: string) => {
    if (e) e.preventDefault();
    const messageToSend = content || newMessage;
    if (!messageToSend.trim()) return;

    const userMsg = messageToSend;
    setNewMessage('');
    setShowEmojiPicker(false);
    setShowStickerPicker(false);

    const msgData = {
      sender_id: user.id,
      receiver_id: null, // Support channel
      content: userMsg,
    };

    const { data: sentMsg, error } = await supabase.from('messages').insert([msgData]).select();
    if (sentMsg) {
      setMessages(prev => [...prev, sentMsg[0]]);
      
      // Notify admins about new user message
      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['admin', 'moderator']);
      if (admins) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'New Support Message',
          content: `${user.email}: ${userMsg.substring(0, 50)}...`,
          type: 'chat',
          is_read: false
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // Trigger AI response if it's a support message and user is not admin/mod
      if (user.role !== 'admin' && user.role !== 'moderator') {
        getAIResponse(userMsg);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => { setIsOpen(true); setUnreadCount(0); }}
            className="bg-zinc-900 text-white p-4 rounded-full shadow-xl hover:bg-zinc-800 transition-colors relative"
          >
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white w-80 rounded-2xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-zinc-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-semibold text-sm">Live Assistance</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded">
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50"
                >
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.sender_id === user.id 
                          ? 'bg-zinc-900 text-white rounded-tr-none' 
                          : msg.sender_id === AI_SYSTEM_ID
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tl-none shadow-sm'
                            : 'bg-white text-zinc-900 border border-zinc-100 rounded-tl-none shadow-sm'
                      }`}>
                        {msg.sender_id === AI_SYSTEM_ID && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold uppercase text-indigo-400">
                            <Bot className="w-3 h-3" /> AI Assistant
                          </div>
                        )}
                        {msg.content.startsWith('http') && (msg.content.includes('dicebear') || msg.content.includes('sticker')) ? (
                          <img src={msg.content} alt="sticker" className="w-24 h-24 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          msg.content
                        )}
                        <div className={`text-[10px] mt-1 opacity-50 ${msg.sender_id === user.id ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-zinc-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 && !isTyping && (
                    <div className="text-center py-10 text-zinc-400 text-xs italic">
                      How can we help you today?
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-zinc-100 space-y-3 bg-white">
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-wrap gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-100"
                      >
                        {EMOJIS.map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => setNewMessage(prev => prev + emoji)}
                            className="text-xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                    {showStickerPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="grid grid-cols-4 gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-100"
                      >
                        {STICKERS.map(sticker => (
                          <button 
                            key={sticker.id} 
                            onClick={() => sendMessage(undefined, sticker.url)}
                            className="hover:scale-110 transition-transform p-1 bg-white rounded-lg border border-zinc-200"
                          >
                            <img src={sticker.url} alt={sticker.label} className="w-full h-full" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={(e) => sendMessage(e)} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-4 pr-20 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                          className={`p-1 rounded-lg transition-colors ${showEmojiPicker ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                          className={`p-1 rounded-lg transition-colors ${showStickerPicker ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                          <Sticker className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim() || isTyping}
                      className="bg-zinc-900 text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
