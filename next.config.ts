import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

// ── Security HTTP Headers ──────────────────────────────────────────────
const securityHeaders = [
  // Prevent clickjacking — only allow embedding from same origin
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME type sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Enable DNS prefetching for performance
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Restrict browser features (geolocation allowed for GPS speedometer)
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
  // Content Security Policy — restrict resource origins
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://cttrainsapi.confirmtkt.com https://ct.confirmtkt.com https://railradar.in https://irctc1.p.rapidapi.com https://enquiry.indianrail.gov.in",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join('; ')
  }
];

const nextConfig: NextConfig = {
  // Proxy /scraper/ → http://127.0.0.1:3001/ so server-side fetch works
  async rewrites() {
    return [
      {
        source: '/scraper/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
      },
    ];
  },

  // ── Security Headers on all pages ─────────────────────────────────
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // CORS: restrict API routes to same origin only
        // In production this blocks cross-origin callers from other domains
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? (process.env.NEXT_PUBLIC_APP_URL || 'https://railsathi.vercel.app')
              : 'http://localhost:3000',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-RailSathi-Key' },
        ],
      },
    ];
  },

  turbopack: {},
};

export default withPWA(nextConfig);
