'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#121824] border border-[#233148] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#233148]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Disclaimer</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-300">
          <p className="font-semibold text-gray-400">Last Updated: August 2026</p>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-amber-300 font-semibold mb-6 text-xs sm:text-sm">
            IMPORTANT NOTICE: Please read this disclaimer carefully before using the RailSathi application.
          </div>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. No Government Affiliation</h2>
          <p>RailSathi does <strong>NOT</strong> represent any Government entity and is not affiliated with, authorized by, endorsed by, or associated with:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Indian Railways (IR)</li>
            <li>Indian Railway Catering and Tourism Corporation (IRCTC)</li>
            <li>Centre for Railway Information Systems (CRIS)</li>
            <li>National Train Enquiry System (NTES)</li>
            <li>Ministry of Railways</li>
            <li>Government of India or any of its departments or agencies</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. Official Information Sources</h2>
          <p>RailSathi displays railway-related information using publicly available official railway information sources and authorized data providers.</p>
          <p className="font-semibold text-gray-200 mt-3">Official Sources:</p>
          <ul className="list-disc pl-5 space-y-2 mt-1">
            <li>Indian Railways — <a href="https://indianrailways.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://indianrailways.gov.in</a></li>
            <li>National Train Enquiry System (NTES) — <a href="https://enquiry.indianrail.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://enquiry.indianrail.gov.in</a></li>
            <li>IRCTC — <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://www.irctc.co.in</a></li>
            <li>CRIS — <a href="https://cris.org.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://cris.org.in</a></li>
          </ul>
          <p className="mt-2 text-yellow-300">Users should verify important railway information using the official websites listed above before making travel decisions.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Informational Use Only</h2>
          <p>RailSathi is provided for information and journey planning purposes only. The application does <strong>not</strong>:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Sell railway tickets</li>
            <li>Process ticket bookings</li>
            <li>Accept payments</li>
            <li>Modify PNR records</li>
            <li>Modify reservation charts</li>
            <li>Provide official government railway services</li>
          </ul>
          <p className="mt-2">For official ticket booking, please use the official <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">IRCTC website</a>.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Accuracy of Information</h2>
          <p>Railway schedules, train locations, fares, coach positions, seat availability, PNR status, and other railway information may change without notice. While we strive to provide accurate and timely information, RailSathi cannot guarantee completeness or accuracy at all times.</p>
          <p className="mt-2 text-yellow-300">Users should always verify important travel information using the official sources listed above before making travel decisions.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. Limitation of Liability</h2>
          <p>RailSathi and its developers shall not be liable for any loss, delay, missed journey, inconvenience, or damages resulting from reliance on the information provided by this application.</p>
        </div>
      </div>
    </div>
  );
}
