const withPWA = require('@ducanh2912/next-pwa').default({
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

module.exports = withPWA({
  output: 'standalone',
  experimental: { typedRoutes: true },
  images: { unoptimized: true } // lean runtime; offload heavy transforms later
});

module.exports = {
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
  }
};

// export default withPWA({
//   ...config,
//   dest: 'public',
//   register: true,
//   // Sensible mobile-first caching. Tune as you scale.
//   workboxOptions: {
//     runtimeCaching: [
//       {
//         urlPattern: ({ request }: { request: Request }) =>
//           ['style', 'script', 'worker'].includes(request.destination),
//         handler: 'StaleWhileRevalidate',
//         options: { cacheName: 'app-shell' }
//       },
//       {
//         urlPattern: ({ request }: { request: Request }) =>
//           ['image', 'font'].includes(request.destination),
//         handler: 'CacheFirst',
//         options: {
//           cacheName: 'static-assets',
//           expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }
//         }
//       },
//       {
//         urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
//         handler: 'NetworkFirst',
//         options: {
//           cacheName: 'api-cache',
//           networkTimeoutSeconds: 3,
//           expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 }
//         }
//       }
//     ]
//   }
// });
