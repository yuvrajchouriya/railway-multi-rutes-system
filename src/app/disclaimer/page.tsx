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
          <p className="font-semibold text-gray-400">Last updated: July 30, 2026</p>
          
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-amber-300 font-semibold mb-6 text-xs sm:text-sm">
            IMPORTANT LEGAL NOTICE: Please read this disclaimer carefully before using the RailSathi application.
          </div>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. No Affiliation with Government or IRCTC</h2>
          <p>
            <strong>RailSathi</strong> is a privately developed, independent utility application. 
            We have **no affiliation, association, authorization, endorsement, or official connection** of any kind with:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Indian Railways</strong> (IR)</li>
            <li><strong>Indian Railway Catering and Tourism Corporation</strong> (IRCTC)</li>
            <li><strong>Centre for Railway Information Systems</strong> (CRIS)</li>
            <li>Any other government agencies, departments, or official railway administrative bodies in India.</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. Sourcing of Information</h2>
          <p>
            All information displayed in RailSathi—including seat availability, train locations, fares, station names, PNR status, and timetables—is obtained from publicly available information on the web or third-party web services. None of this data is hosted natively or officially managed by RailSathi.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Not for Official Bookings</h2>
          <p>
            RailSathi is an informational planning assistant. It does not sell tickets, process bookings, handle transaction payments, or modify passenger reservation charts. For official bookings and verified administrative travel information, please use the official channels: **www.irctc.co.in** or the official **IRCTC Rail Connect** application.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Accuracy Guarantee</h2>
          <p>
            Because railway timetables and seat bookings change dynamically, the information shown in this app may differ from the actual status. Users are advised to double-check search results against official platforms before making final travel decisions. The developers shall not be liable for any discrepancies.
          </p>
        </div>
      </div>
    </div>
  );
}
