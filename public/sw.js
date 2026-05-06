// ============================================
// SERVICE WORKER TVM38 - Version 1.0
// ============================================
// Stratégie : Network-First (réseau d'abord, cache en fallback)
// Cache : Seulement les fichiers statiques (images, CSS, manifest)
// Ne PAS cacher : JS, HTML, fichiers dynamiques
// ============================================

// Version du cache (changez ce numéro pour forcer une mise à jour)
const CACHE_VERSION = 'tvm38-v1.0.0';
const CACHE_NAME = CACHE_VERSION;

// Liste des fichiers statiques à mettre en cache
// IMPORTANT : NE PAS inclure les fichiers JS ou HTML
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo-tvm38.png',
  '/bg-login.jpg',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// ============================================
// INSTALL : Mise en cache des assets statiques
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  self.skipWaiting(); // Activer le nouveau SW immédiatement

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets statiques');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('[SW] Erreur lors de la mise en cache:', error);
    })
  );
});

// ============================================
// ACTIVATE : Nettoyage des anciens caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer tous les caches qui ne correspondent pas à la version actuelle
          if (cacheName !== CACHE_NAME && cacheName.startsWith('tvm38-')) {
            console.log('[SW] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prendre le contrôle immédiatement de tous les clients
  return self.clients.claim();
});

// ============================================
// FETCH : Stratégie Network-First
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // NE PAS intercepter les requêtes pour :
  // - Fichiers JS (on veut toujours la dernière version)
  // - Fichiers HTML (on veut toujours la dernière version)
  // - Requêtes API (données dynamiques)
  const isJS = url.pathname.endsWith('.js');
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/';
  const isAPI = url.pathname.startsWith('/api/');
  const isVite = url.host.includes('localhost') && url.port === '5173';

  // Si c'est un fichier JS, HTML ou API : laisser passer directement (pas de cache)
  if (isJS || isHTML || isAPI || isVite) {
    return;
  }

  // Pour les fichiers statiques (images, CSS, manifest, etc.) : Network-First
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la réponse est valide, on la met en cache et on la renvoie
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, on essaie le cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Récupération depuis le cache:', request.url);
            return cachedResponse;
          }
          // Si rien dans le cache, on renvoie une erreur
          return new Response('Hors ligne', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
