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
          <p className="font-semibold text-gray-400">Last Updated: August 2026</p>
          
          <p>
            Welcome to <strong>RailSathi</strong>. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how RailSathi collects, uses, and protects information when you use the application.
          </p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. Information We Collect</h2>
          <p>RailSathi does not require users to create an account or log in.</p>
          <p>Depending on the features you use, the app may process the following information:</p>
          
          <h3 className="text-md font-semibold text-gray-200 mt-4">Location</h3>
          <p>If you enable the GPS Station Alarm or Speedometer feature, RailSathi requests access to your device's location.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your location is used only to provide these features.</li>
            <li>We do not sell your location information.</li>
          </ul>

          <h3 className="text-md font-semibold text-gray-200 mt-4">Search Information</h3>
          <p>When you search for trains, the following information may be sent securely to our servers to provide results:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Departure Station</li>
            <li>Destination Station</li>
            <li>Travel Date</li>
            <li>Train Number (when applicable)</li>
          </ul>
          <p>This information is used only to provide railway information and is not used to identify you personally.</p>

          <h3 className="text-md font-semibold text-gray-200 mt-4">Local Storage</h3>
          <p>RailSathi stores certain information locally on your device, such as:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Recent Searches</li>
            <li>Wishlist</li>
            <li>User Preferences</li>
          </ul>
          <p>This information remains on your device unless you remove it or uninstall the app.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. How We Use Information</h2>
          <p>Information is used only to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Search trains</li>
            <li>Show live train status</li>
            <li>Display PNR status</li>
            <li>Show seat availability</li>
            <li>Provide route suggestions</li>
            <li>GPS Station Alarm</li>
            <li>Improve app performance</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Data Security</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We use secure communication protocols to protect data transmitted between the app and our servers.</li>
            <li>We continuously work to protect your information from unauthorized access.</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Third-Party Services</h2>
          <p>RailSathi may use third-party services to provide functionality, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Railway information providers</li>
            <li>Google Play Services</li>
            <li>Firebase (if applicable)</li>
            <li>Google AdMob (if advertisements are shown)</li>
          </ul>
          <p>These services may collect information according to their own privacy policies.</p>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. Children's Privacy</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>RailSathi is not specifically directed toward children under 13 years of age.</li>
            <li>We do not knowingly collect personal information from children.</li>
            <li>If you believe a child has provided personal information, please contact us.</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">6. Your Choices</h2>
          <p>You may:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Disable Location permission anytime</li>
            <li>Clear app data</li>
            <li>Delete stored preferences</li>
            <li>Uninstall the application</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">7. Changes to This Privacy Policy</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We may update this Privacy Policy from time to time.</li>
            <li>Changes will be reflected on this page with an updated revision date.</li>
          </ul>

          <h2 className="text-lg font-bold text-white mt-8 mb-2">8. Contact Us</h2>
          <p>If you have any questions regarding this Privacy Policy, please contact us:</p>
          <p><strong>Email:</strong> officialrailsathi@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
