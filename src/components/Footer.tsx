import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-900 text-zinc-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div>
            <div className="text-2xl font-display font-bold text-white mb-6">
              Chene<span className="text-primary">Gami</span>
            </div>
            <p className="text-sm leading-relaxed mb-8">
              Experience the best online shopping with our curated selection of high-quality products at unbeatable prices.
            </p>
            <div className="flex items-center gap-4">
              <button className="p-2 bg-zinc-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Facebook size={18} />
              </button>
              <button className="p-2 bg-zinc-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Twitter size={18} />
              </button>
              <button className="p-2 bg-zinc-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Instagram size={18} />
              </button>
              <button className="p-2 bg-zinc-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Youtube size={18} />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><button className="hover:text-primary transition-colors">About Us</button></li>
              <li><button className="hover:text-primary transition-colors">Contact Support</button></li>
              <li><button className="hover:text-primary transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-primary transition-colors">Terms of Service</button></li>
              <li><button className="hover:text-primary transition-colors">Shipping Info</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary" />
                support@chenegami.com
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-primary" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={18} className="text-primary" />
                123 Commerce St, Tech City
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold mb-6">Newsletter</h4>
            <p className="text-sm mb-6">Subscribe to get special offers and once-in-a-lifetime deals.</p>
            <form className="relative">
              <input
                type="email"
                placeholder="Your email address"
                className="w-full bg-zinc-800 border-none rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button className="absolute right-1 top-1 bottom-1 px-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs">
            © 2026 Chenegami. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Apple_Pay_logo.svg" alt="Apple Pay" className="h-6 opacity-50 grayscale hover:grayscale-0 transition-all" />
          </div>
        </div>
      </div>
    </footer>
  );
};
