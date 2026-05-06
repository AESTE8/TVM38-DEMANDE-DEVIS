// Ce service worker s'auto-décharge pour nettoyer le cache
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Supprimer tous les caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Ne pas intercepter les fetch - laisser passer tout
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
