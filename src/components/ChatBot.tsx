import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, X, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithGemini, analyzeImageWithGemini } from '../services/geminiService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hello! I am your Chenegami assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = image;
    
    setMessages(prev => [...prev, { role: 'user', text: userMessage || 'Analyzing image...' }]);
    setInput('');
    setImage(null);
    setIsLoading(true);

    try {
      let responseText = '';
      if (currentImage) {
        responseText = await analyzeImageWithGemini(currentImage, userMessage || "What is in this image?");
      } else {
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));
        responseText = await chatWithGemini(userMessage, history);
      }
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-zinc-900 text-white rounded-full shadow-lg hover:scale-110 transition-transform z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col overflow-hidden z-50"
          >
            <div className="p-4 bg-zinc-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500 rounded-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm">Chenegami AI</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-2 h-2" /> Powered by Gemini
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-100 text-zinc-800 shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-zinc-100 p-3 rounded-2xl shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}
            </div>

            {image && (
              <div className="px-4 py-2 bg-zinc-100 flex items-center gap-2">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200">
                  <img src={image} className="w-full h-full object-cover" />
                  <button onClick={() => setImage(null)} className="absolute top-0 right-0 bg-black/50 p-0.5 text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-zinc-500">Image attached</span>
              </div>
            )}

            <div className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                accept="image/*"
                onChange={handleImageUpload}
              />
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-zinc-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
