import type { NextConfig } from "next";

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
};

export default nextConfig;
