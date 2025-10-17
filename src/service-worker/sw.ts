/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

type NotificationPayload = {
  title: string;
  body?: string;
  icon?: string;
};

const APP_SHELL_URL = '/index.html';
const OFFLINE_FALLBACK_URL = '/offline.html';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const appShellHandler = createHandlerBoundToURL(APP_SHELL_URL);

registerRoute(
  new NavigationRoute(async (options) => {
    try {
      return await appShellHandler(options);
    } catch (error) {
      console.error('Failed to serve app shell from cache', error);
      const offlineResponse = await caches.match(OFFLINE_FALLBACK_URL, { ignoreSearch: true });
      if (offlineResponse) return offlineResponse;
      return Response.error();
    }
  })
);

registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'app-shell' })
);

registerRoute(
  ({ request }) => ['image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24
      })
    ]
  })
);

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json() as NotificationPayload;
  const title = data.title ?? 'Taskez PM';
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body,
    icon: data.icon ?? '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now()
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = allClients.find((client) => client.focused);
      if (focused) {
        return focused.focus();
      }
      if (allClients.length > 0) {
        return allClients[0].focus();
      }
      return self.clients.openWindow('/');
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
