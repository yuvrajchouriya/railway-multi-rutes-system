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
            Welcome to <strong>RailSathi</strong>. Your privacy is important to us. This Privacy Policy explains what information RailSathi collects, how it is used, and how we protect it.
          </p>

          {/* Section 1 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">1. About RailSathi</h2>
          <p>RailSathi is an independent railway information application designed to help users plan railway journeys across India.</p>
          <div className="bg-[#1a1f2e] border border-yellow-700 rounded-xl p-4 mt-2">
            <p className="text-yellow-400 font-bold">Government Disclaimer</p>
            <p className="mt-1">RailSathi does <strong>NOT represent any Government entity and is not affiliated with, endorsed by, authorized by, or associated with</strong> Indian Railways, IRCTC, NTES, CRIS, the Ministry of Railways, or any Government of India organization.</p>
          </div>

          {/* Section 2 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">2. Official Information Sources</h2>
          <p>RailSathi displays railway-related information using publicly available official railway information sources and authorized data providers.</p>
          <p className="font-semibold text-gray-200 mt-3">Official Sources:</p>
          <ul className="list-disc pl-5 space-y-2 mt-1">
            <li>
              Indian Railways —{' '}
              <a href="https://indianrailways.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                https://indianrailways.gov.in
              </a>
            </li>
            <li>
              National Train Enquiry System (NTES) —{' '}
              <a href="https://enquiry.indianrail.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                https://enquiry.indianrail.gov.in
              </a>
            </li>
            <li>
              IRCTC —{' '}
              <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                https://www.irctc.co.in
              </a>
            </li>
            <li>
              Centre for Railway Information Systems (CRIS) —{' '}
              <a href="https://cris.org.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                https://cris.org.in
              </a>
            </li>
          </ul>
          <p className="mt-2 text-yellow-300">Users should always verify important railway information through these official sources before making travel decisions.</p>

          {/* Section 3 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">3. Information We Collect</h2>
          <p>RailSathi does not require account registration.</p>
          <p>Depending on the features you use, the app may process the following information.</p>

          <h3 className="text-md font-semibold text-gray-200 mt-4">Location</h3>
          <p>Location permission is requested only when you use features such as:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>GPS Station Alarm</li>
            <li>Speedometer</li>
          </ul>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Your location is used only to provide these features.</li>
            <li>We do not sell your location information.</li>
          </ul>

          <h3 className="text-md font-semibold text-gray-200 mt-4">Search Information</h3>
          <p>To provide railway information, the app may process:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Departure Station</li>
            <li>Destination Station</li>
            <li>Travel Date</li>
            <li>Train Number (if applicable)</li>
            <li>PNR Number (only when you request PNR status)</li>
          </ul>
          <p className="mt-1">This information is used only to provide the requested railway services.</p>

          <h3 className="text-md font-semibold text-gray-200 mt-4">Local Storage</h3>
          <p>RailSathi stores certain information only on your device, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Recent Searches</li>
            <li>Wishlist</li>
            <li>User Preferences</li>
          </ul>
          <p className="mt-1">You may clear this information at any time by clearing app data or uninstalling the application.</p>

          {/* Section 4 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">4. Information We Do Not Collect</h2>
          <p>RailSathi does not collect or store:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Aadhaar Number</li>
            <li>PAN Number</li>
            <li>Bank Account Details</li>
            <li>Debit/Credit Card Information</li>
            <li>UPI Credentials</li>
            <li>Government Identity Documents</li>
          </ul>
          <p className="mt-2">RailSathi does not process railway ticket bookings or payment transactions.</p>

          {/* Section 5 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">5. How We Use Information</h2>
          <p>Information is used only to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Search trains</li>
            <li>Display train schedules</li>
            <li>Show live train status</li>
            <li>Show PNR status</li>
            <li>Display seat availability</li>
            <li>Show coach position</li>
            <li>Display fare information</li>
            <li>Provide GPS Station Alarm</li>
            <li>Improve app performance and reliability</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">6. Third-Party Services</h2>
          <p>RailSathi may use trusted third-party services including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Google Play Services</li>
            <li>Firebase</li>
            <li>Google AdMob (if advertisements are displayed)</li>
          </ul>
          <p className="mt-2">These services operate according to their own privacy policies. For official railway services, ticket booking, and verification of railway information, users should refer to the official railway websites listed in the "Official Information Sources" section. Train schedule, live train status, PNR status, seat availability, and other railway information are displayed using publicly available official railway information sources and, where applicable, authorized data providers. RailSathi does not guarantee the accuracy or completeness of this information.</p>

          {/* Section 7 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">7. Data Security</h2>
          <p>We use secure communication methods to protect data transmitted between the application and our servers.</p>
          <p className="mt-1">Although we take reasonable measures to protect information, no internet transmission method is completely secure.</p>

          {/* Section 8 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">8. Children's Privacy</h2>
          <p>RailSathi is not intended for children under the age of 13.</p>
          <p className="mt-1">We do not knowingly collect personal information from children.</p>

          {/* Section 9 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">9. Your Choices</h2>
          <p>You may:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Disable Location permission at any time</li>
            <li>Clear app data</li>
            <li>Remove saved preferences</li>
            <li>Uninstall the application</li>
          </ul>

          {/* Section 10 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">10. Disclaimer</h2>
          <p>RailSathi is provided for informational purposes only.</p>
          <p className="mt-1">While we strive to provide accurate railway information, schedules, train locations, PNR status, fares, seat availability, coach position, and other railway information may change at any time.</p>
          <p className="mt-1">Users should verify important railway information through the official sources listed above before making travel decisions.</p>

          {/* Section 11 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">11. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time.</p>
          <p className="mt-1">The latest version will always be available on this page.</p>

          {/* Section 12 */}
          <h2 className="text-lg font-bold text-white mt-8 mb-2">12. Contact Us</h2>
          <p>For any questions regarding this Privacy Policy, please contact us:</p>
          <p className="mt-1"><strong>RailSathi</strong></p>
          <p>
            Website:{' '}
            <a href="https://www.railsathi.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
              https://www.railsathi.in
            </a>
          </p>
          <p>
            Email:{' '}
            <a href="mailto:officialrailsathi@gmail.com" className="text-cyan-400 underline hover:text-cyan-300">
              officialrailsathi@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

