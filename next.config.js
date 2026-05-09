/** @type {import('next').NextConfig} */
const nextConfig = {
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
   * Both hit the same handler:
   *   /stream/ax8k2m        ← clean URL (works in IMVU, VLC, browsers)
   *   /stream/ax8k2m.m3u    ← traditional M3U URL (some players require extension)
   *
   * The endpoint returns an M3U playlist where each track entry is:
   *   /api/stream-resolve/[trackId]
   * which does a 302 redirect to the actual SoundCloud MP3 URL.
   * IMVU follows the redirect chain and plays the MP3 directly.
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
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        ],
      },
      {
        source: '/api/stream-resolve/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
