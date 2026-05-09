/** @type {import('next').NextConfig} */
const nextConfig = {
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
   * Both these URLs hit the same handler:
   *   /stream/my-playlist        ← clean URL
   *   /stream/my-playlist.m3u    ← traditional playlist URL
   * 
   * Internal route: /api/stream/{slug}
   * The handler strips .m3u from slug if present.
   */
  async rewrites() {
    return [
      // Match with .m3u extension
      {
        source: '/stream/:slug.m3u',
        destination: '/api/stream/:slug',
      },
      // Match without extension
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
