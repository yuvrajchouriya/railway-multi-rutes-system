import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

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
  turbopack: {},
};

export default withPWA(nextConfig);
