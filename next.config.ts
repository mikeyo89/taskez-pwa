import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';
// const IS_PROD = process.env.IS_PROD === 'true';
// const repo = 'taskez-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  // Sensible mobile-first caching. Tune as you scale.
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request }: { request: Request }) =>
          ['style', 'script', 'worker'].includes(request.destination),
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'app-shell' }
      },
      {
        urlPattern: ({ request }: { request: Request }) =>
          ['image', 'font'].includes(request.destination),
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
        }
      },
      {
        urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 }
        }
      }
    ]
  }
});

const config: NextConfig = {
  // output: 'standalone',
  output: 'export', // for prod build.
  typedRoutes: true,
  images: { unoptimized: true }, // lean runtime; offload heavy transforms later
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'"
          }
        ]
      }
    ];
  },
  basePath: '',
  assetPrefix: '',
  // basePath: IS_PROD ? `/${repo}` : '',
  // assetPrefix: IS_PROD ? `/${repo}/` : '',
  trailingSlash: true // avoids 404s for "folder as page"
};

export default withPWA(config);
