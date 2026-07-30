'use client';

import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#121824] border border-[#233148] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#233148]">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Terms & Conditions</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-300">
          <p className="font-semibold text-gray-400">Last updated: July 30, 2026</p>
          
          <p>
            By downloading, accessing, or using the <strong>RailSathi</strong> app, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use the application.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. Permitted Use</h2>
          <p>
            RailSathi provides information regarding Indian Railways train routes, availability, fares, and running status. This information is intended strictly for personal, non-commercial planning purposes. You agree not to abuse, scrap, or attempt to compromise our backend API endpoints.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. Accuracy of Information</h2>
          <p>
            While we strive to retrieve accurate and timely details, the travel schedules, availability, and live locations are sourced from third-party APIs. We cannot guarantee 100% accuracy, completeness, or real-time precision of any train data displayed in the app. Use the information at your own discretion.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Hardware & GPS Limitations</h2>
          <p>
            The Speedometer feature relies on your mobile device's built-in GPS sensor. Accuracy is subject to satellite signal strength, weather conditions, train tunnels, and device hardware quality.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Intellectual Property</h2>
          <p>
            The design, code, logo, brand assets, and icons of RailSathi are the exclusive intellectual property of the developers. All other trademarks, station names, and railway data referenced in the app are the property of their respective owners.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. Modifications to Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue any feature or service within the app at any time without prior notice.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">6. Limitation of Liability</h2>
          <p>
            In no event shall RailSathi, its developers, or affiliates be held liable for any travel delays, missed trains, financial losses, or inconveniences resulting from the use or reliance on data presented by this application.
          </p>
        </div>
      </div>
    </div>
  );
}
