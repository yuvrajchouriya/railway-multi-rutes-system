'use client';

import Link from 'next/link';
import { Heart, Shield, Scale, AlertTriangle, Info, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="hidden md:block mt-20 border-t border-[#1E293B] bg-[#0A0E17]/60 backdrop-blur-md py-8 text-gray-400">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
        <div className="flex items-center gap-1">
          <span>&copy; {new Date().getFullYear()} RailSathi. Made with</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
          <span>for smarter journeys.</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="/about" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>About</span>
          </Link>
          <Link href="/privacy" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Privacy Policy</span>
          </Link>
          <Link href="/terms" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Terms & Conditions</span>
          </Link>
          <Link href="/disclaimer" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Disclaimer</span>
          </Link>
          <Link href="/contact" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>Contact Us</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

