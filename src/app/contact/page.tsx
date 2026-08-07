'use client';

import Link from 'next/link';
import { Mail, ArrowLeft, Globe } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#121824] border border-[#233148] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#233148]">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Contact Us</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-gray-300">
          <p>If you have any questions, feedback, or suggestions regarding RailSathi, please contact us. We will respond as soon as possible.</p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-[#182235] border border-[#2C3E5A] rounded-xl p-4">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Email</p>
                <a href="mailto:officialrailsathi@gmail.com" className="text-white font-bold hover:text-cyan-400 transition-colors">
                  officialrailsathi@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#182235] border border-[#2C3E5A] rounded-xl p-4">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Website</p>
                <a href="https://www.railsathi.in" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:text-cyan-400 transition-colors">
                  https://www.railsathi.in
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
