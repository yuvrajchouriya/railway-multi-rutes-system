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
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Terms &amp; Conditions</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#182235] px-3 py-1.5 rounded-lg border border-[#2C3E5A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-gray-300">
          <p className="font-semibold text-gray-400">Last Updated: August 2026</p>
          <p>Welcome to RailSathi. By downloading, installing, accessing, or using the RailSathi application, you agree to be bound by these Terms &amp; Conditions. If you do not agree with these terms, please discontinue using the application.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. About RailSathi</h2>
          <p>RailSathi is an independent railway information application. It does <strong>NOT</strong> represent any Government entity and is <strong>NOT</strong> affiliated with, authorized by, endorsed by, or associated with:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Indian Railways (IR)</li>
            <li>Indian Railway Catering and Tourism Corporation (IRCTC)</li>
            <li>Centre for Railway Information Systems (CRIS)</li>
            <li>National Train Enquiry System (NTES)</li>
            <li>Ministry of Railways</li>
            <li>Government of India or any of its departments or agencies</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. Permitted Use</h2>
          <p>RailSathi is intended only for personal and non-commercial use. You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Reverse engineer the application</li>
            <li>Scrape or copy application data</li>
            <li>Abuse or overload our servers</li>
            <li>Attempt unauthorized access to our systems</li>
            <li>Use the application for unlawful activities</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Official Information Sources</h2>
          <p>RailSathi displays railway information using publicly available official railway information sources and, where applicable, authorized data providers.</p>
          <ul className="list-disc pl-5 space-y-2 mt-1">
            <li>Indian Railways — <a href="https://indianrailways.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://indianrailways.gov.in</a></li>
            <li>NTES — <a href="https://enquiry.indianrail.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://enquiry.indianrail.gov.in</a></li>
            <li>IRCTC — <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://www.irctc.co.in</a></li>
            <li>CRIS — <a href="https://cris.org.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">https://cris.org.in</a></li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Accuracy of Information</h2>
          <p>Railway schedules, train locations, PNR status, coach position, fares, seat availability, and other railway information may change without notice. RailSathi cannot guarantee that all information is always complete, accurate, or up to date. Information should be used only for journey planning purposes.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. GPS Features</h2>
          <p>Features such as GPS Station Alarm and Speedometer require access to your device location. Location accuracy depends on:</p>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>GPS signal availability</li>
            <li>Device hardware</li>
            <li>Weather conditions</li>
            <li>Tunnels</li>
            <li>Network availability</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">6. Intellectual Property</h2>
          <p>The RailSathi name, logo, application design, source code, graphics, and other original content are the intellectual property of RailSathi. All railway names, station names, train names, and trademarks belong to their respective owners.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">7. Service Availability</h2>
          <p>RailSathi may modify, improve, suspend, or discontinue any feature or service at any time without prior notice. We are not responsible for interruptions caused by network failures, maintenance, third-party services, or circumstances beyond our control.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">8. Limitation of Liability</h2>
          <p>RailSathi is provided for informational and journey planning purposes only. RailSathi does not sell railway tickets, process bookings, handle payments, modify reservation records, or provide official government railway services.</p>
          <p className="mt-2">The developers of RailSathi shall not be liable for travel delays, missed trains, booking issues, financial losses, inconvenience, or damages resulting from reliance on information displayed within the application.</p>
          <p className="mt-2 text-yellow-300">Users should always verify important railway information through the official sources listed above before making travel decisions.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">9. Changes to These Terms</h2>
          <p>We may update these Terms &amp; Conditions from time to time. The latest version will always be available on this page.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">10. Contact Us</h2>
          <p>For any questions regarding these Terms &amp; Conditions, please contact:</p>
          <p className="mt-1"><strong>RailSathi</strong></p>
          <p>Email: <a href="mailto:officialrailsathi@gmail.com" className="text-cyan-400 underline hover:text-cyan-300">officialrailsathi@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
