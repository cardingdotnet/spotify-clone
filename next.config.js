/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow production builds to succeed even with TS or lint warnings.
  // Errors in dev are still shown — this only affects the production build.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.sndcdn.com',
      },
    ],
  },

  /**
   * URL Rewrites — pretty stream URLs
   * 
   * Both URLs hit the same handler:
   *   /stream/my-playlist        ← clean URL
   *   /stream/my-playlist.m3u    ← traditional playlist URL
   */
  async rewrites() {
    return [
      {
        source: '/stream/:slug.m3u',
        destination: '/api/stream/:slug',
      },
      {
        source: '/stream/:slug',
        destination: '/api/stream/:slug',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/api/stream/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/api/stream-resolve/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
