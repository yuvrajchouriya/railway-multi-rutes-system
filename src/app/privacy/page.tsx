'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#121824] border border-[#233148] rounded-2xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#233148]">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-300">
          <p className="font-semibold text-gray-400">Last updated: July 30, 2026</p>
          
          <p>
            Welcome to <strong>RailSathi</strong>. Your privacy is critical to us. This Privacy Policy explains how we collect, use, and protect your information when you use our travel planning application.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. Information Collection</h2>
          <p>
            RailSathi is designed to run with maximum privacy. We do not require account registration or login.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Local Data Storage:</strong> We save your searched route history and wishlist items locally on your device (using standard browser LocalStorage). This data never leaves your device unless you choose to delete it.</li>
            <li><strong>Device GPS Location:</strong> If you use the Speedometer feature, the app requests access to your device's hardware GPS to display real-time speed. Location data is processed strictly on-device in real-time and is never uploaded, shared, or stored on any server.</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. API Requests & Security</h2>
          <p>
            To search trains and retrieve live statuses, the app communicates with our secure API routes. We do not track or associate search parameters (stations, dates) with your personal identity. All requests are protected with strict authorization filters to prevent third-party scraping.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Third-Party Services</h2>
          <p>
            Our app accesses public APIs to gather train schedules and status updates. We do not control or share any personal data with these external services.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Children's Privacy</h2>
          <p>
            Our services do not address anyone under the age of 13. We do not knowingly collect personal identifiable information from children.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. Contact Us</h2>
          <p>
            If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at support@railsathi.com.
          </p>
        </div>
      </div>
    </div>
  );
}
