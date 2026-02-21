const SERVICE_WORKER_VERSION = 'v7.2';
const CACHE_NAME = 'app:v3.99.8-service:v7.2'; // Updated by pre-push hook
const urlsToCache = [
  '/manifest.json',
  '/logo192.png',
  '/logo192-dev.png'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first for everything, cache fallback for static assets only
self.addEventListener('fetch', (event) => {
  // Skip service worker for Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Never cache HTML - always fetch from network
  if (event.request.url.endsWith('/') || event.request.url.endsWith('.html')) {
    return; // Let browser handle normally
  }
  
  // For static assets, use network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request).then(response => {
          return response || new Response('Network error', { status: 408 });
        });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-readings') {
    event.waitUntil(syncReadings());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New tarot reading session reminder',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Tarot Reading Tracker', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'reset-15') {
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          clientList[0].postMessage({ type: 'RESET_TIMER', minutes: 15 });
        }
      })
    );
  } else if (event.action === 'reset-30') {
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          clientList[0].postMessage({ type: 'RESET_TIMER', minutes: 30 });
        }
      })
    );
  }
});

// Periodic background sync (requires registration from main app)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'backup-readings') {
    event.waitUntil(backupReadings());
  }
});

// Sync readings function
async function syncReadings() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'SYNC_READINGS' });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Backup readings function
async function backupReadings() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'BACKUP_READINGS' });
    }
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
