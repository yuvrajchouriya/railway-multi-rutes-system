'use client';

import Link from 'next/link';
import { Train, ArrowLeft, ExternalLink } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#121824] border border-[#233148] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#233148]">
          <div className="flex items-center gap-3">
            <Train className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">About RailSathi</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-300">
          <p className="font-semibold text-gray-400">Last Updated: August 2026</p>

          <p>
            <strong>RailSathi</strong> is an independent railway journey planning application designed to help users access railway information such as train schedules, live train running status, PNR status, seat availability, coach position, fare information, and route planning.
          </p>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-amber-300 font-semibold text-xs sm:text-sm">
            RailSathi is <strong>not affiliated with, endorsed by, authorized by, or associated with</strong> Indian Railways, IRCTC, NTES, CRIS, the Ministry of Railways, or any Government of India organization.
          </div>

          <p>Railway information is displayed using publicly available official railway information sources and, where applicable, authorized data providers.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-3">Official Information Sources</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>Indian Railways — <a href="https://indianrailways.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://indianrailways.gov.in</a></span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>NTES — <a href="https://enquiry.indianrail.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://enquiry.indianrail.gov.in</a></span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>IRCTC — <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://www.irctc.co.in</a></span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>CRIS — <a href="https://cris.org.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://cris.org.in</a></span>
            </li>
          </ul>

          <p className="text-yellow-300 text-sm">Users should verify important railway information through the official sources listed above before making travel decisions.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">Contact</h2>
          <p>Email: <a href="mailto:officialrailsathi@gmail.com" className="text-cyan-400 underline hover:text-cyan-300">officialrailsathi@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
