// ============================================
// SERVICE WORKER TVM38 - Version 2.0
// ============================================
// Stratégies par type de ressource :
//   - Assets hachés (/assets/*.js, /assets/*.css) → Cache-First (hachés = auto-invalidés)
//   - HTML / navigation → Network-First (toujours la dernière version)
//   - Images / manifest → Cache-First
//   - API Supabase / Resend → Network-Only (jamais cacher)
// ============================================

const CACHE_VERSION = 'tvm38-v2.0.0';
const CACHE_NAME = CACHE_VERSION;

// Assets statiques pré-cachés à l'installation
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-tvm38.png',
  '/bg-login.jpg',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// ============================================
// INSTALL : Pré-cache des assets critiques
// ============================================
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).catch((error) => {
      console.error('[SW] Erreur pré-cache:', error);
    })
  );
});

// ============================================
// ACTIVATE : Nettoyage des anciens caches
// ============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('tvm38-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// ============================================
// FETCH : Stratégie selon le type de ressource
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ne pas intercepter : dev Vite, extensions navigateur, autres origines que le site
  const isVite = url.hostname === 'localhost' && url.port === '5173';
  const isChrome = url.protocol === 'chrome-extension:';
  if (isVite || isChrome) return;

  // Ne jamais cacher les appels API externes (Supabase, Resend)
  const isExternalAPI = !url.origin.includes(self.location.origin) &&
    (url.hostname.includes('supabase.co') || url.hostname.includes('web3forms.com') || url.hostname.includes('resend.com'));
  if (isExternalAPI) return;

  // Assets hachés Vite (/assets/nom-[hash].js ou .css) → Cache-First
  // Ces fichiers ont des noms uniques par build : si le contenu change, le nom change
  const isHashedAsset = url.pathname.startsWith('/assets/') &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));

  if (isHashedAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Images et manifest → Cache-First
  const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$/i.test(url.pathname) ||
    url.pathname === '/manifest.json';

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Tout le reste (HTML, navigation) → Network-First
  event.respondWith(networkFirst(request));
});

// ============================================
// Stratégie Cache-First
// ============================================
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource indisponible hors ligne', { status: 503 });
  }
}

// ============================================
// Stratégie Network-First
// ============================================
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback hors ligne : renvoyer la page d'accueil depuis le cache
    const fallback = await caches.match('/');
    return fallback || new Response('Hors ligne', { status: 503, statusText: 'Service Unavailable' });
  }
}
