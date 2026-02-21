# PWA Offline Support & Service Worker

## Overview
Progressive Web App features with offline support, caching strategy, and installability.

## Context
- Current implementation: `serviceWorker.js`
- Cache version: v6
- Strategy: Network-first caching
- Excludes Supabase API calls
- Update notification system

## Features

### Service Worker Caching
**Strategy**: Network-first with cache fallback

**Cached Resources**:
- index.html
- styles.css
- manifest.json
- Logo images (192x192, 512x512)
- Module files (modules/*.js)

**Excluded from Cache**:
- Supabase API calls
- External CDN resources
- Dynamic API endpoints

### PWA Installability
**Requirements**:
- manifest.json with app metadata
- Service worker registered
- HTTPS (production only)
- Icons (192x192, 512x512)

**Manifest Configuration**:
```json
{
  "name": "Tarot Reading Tracker",
  "short_name": "Tarot Tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#8b5cf6",
  "icons": [
    {
      "src": "logo192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Offline Indicator
**Current Implementation**: Offline badge in header

**Features**:
- Red "Offline" badge when network unavailable
- Monitors `navigator.onLine` status
- Updates on `online`/`offline` events
- Triggers sync when back online

**Technical Notes**:
```javascript
function updateOnlineStatus() {
  const indicator = document.getElementById('offline-indicator');
  if (!navigator.onLine) {
    indicator.style.display = 'inline-block';
  } else {
    indicator.style.display = 'none';
    // Trigger sync when back online
    sessionStore.save();
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
```

### Update Notification
**Trigger**: New service worker available

**Features**:
- Toast notification with "Update Now" button
- Clicking button reloads page with new version
- Dismissible notification
- Auto-dismiss after 10 seconds

**Implementation**:
```javascript
navigator.serviceWorker.addEventListener('controllerchange', () => {
  showUpdateNotification();
});

function showUpdateNotification() {
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.innerHTML = `
    New version available!
    <button onclick="location.reload()">Update Now</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 10000);
}
```

## Implementation Details

### Service Worker Registration
```javascript
// index.html
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceWorker.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.error('SW registration failed', err));
}
```

### Cache Strategy
```javascript
// serviceWorker.js
self.addEventListener('fetch', event => {
  // Skip Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

### Cache Versioning
```javascript
const CACHE_NAME = 'tarot-tracker-v6';

// Clear old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});
```

## Testing

### Manual Testing
- Install app on mobile device
- Test offline functionality
- Verify cached resources load
- Test update notification
- Verify online/offline indicator

### Automated Testing
```javascript
describe('Service Worker', () => {
  test('registers successfully');
  test('caches static resources');
  test('serves from cache when offline');
  test('updates cache on new version');
  test('clears old caches');
});
```

## Browser Compatibility
- Service Workers: All modern browsers
- Cache API: All modern browsers
- Manifest: All modern browsers
- Install prompt: Chrome, Edge, Safari (limited)

## Deployment

### Production Requirements
- HTTPS enabled (required for service workers)
- manifest.json in root directory
- Icons in root directory
- Service worker in root directory

### AWS Amplify Configuration
- Auto-detected as static site
- HTTPS automatic
- CDN distribution automatic
- No special configuration needed

## Future Enhancements
- Background sync for offline changes
- Push notifications
- Periodic background sync
- Advanced caching strategies
- Offline-first architecture

## References
- serviceWorker.js: Current implementation
- manifest.json: PWA manifest
- ARCHITECTURE.md: Deployment details
- MDN Service Worker docs: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
