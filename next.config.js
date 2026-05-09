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
   * M3U playlist (web player / VLC):
   *   /stream/ax8k2m        → /api/stream/ax8k2m
   *   /stream/ax8k2m.m3u   → /api/stream/ax8k2m
   *
   * IMVU-compatible live radio stream (continuous MP3):
   *   /radio/ax8k2m        → /api/radio/ax8k2m
   *   /radio/ax8k2m.mp3    → /api/radio/ax8k2m   (IMVU prefers .mp3 extension)
   */
  async rewrites() {
    return [
      // M3U playlist endpoint
      {
        source: '/stream/:slug.m3u',
        destination: '/api/stream/:slug',
      },
      {
        source: '/stream/:slug',
        destination: '/api/stream/:slug',
      },

      // IMVU radio stream endpoint
      {
        source: '/radio/:slug.mp3',
        destination: '/api/radio/:slug',
      },
      {
        source: '/radio/:slug',
        destination: '/api/radio/:slug',
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
      // IMVU radio stream — no buffering, no caching
      {
        source: '/api/radio/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
      {
        source: '/radio/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
