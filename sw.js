// CONECTA - Service Worker Seguro (Somente Shell Estático)
// Regra de ouro: NUNCA intercepta, armazena em cache ou altera requisições de banco de dados (Firebase/Firestore),
// Cloudinary, ViaCEP ou qualquer método de escrita (POST/PUT/DELETE/PATCH).

const CACHE_NAME = 'conecta-shell-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './somentelogo.png',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. NUNCA intercepta escritas ou métodos que não sejam GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 2. NUNCA intercepta Firebase, Firestore, Cloudinary, ViaCEP ou APIs externas
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('viacep.com.br')
  ) {
    return;
  }

  // 3. Para navegação (index.html): Network-First (sempre busca a versão mais nova online; usa cache só se estiver offline)
  if (request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. Para imagens locais e manifest: Cache-First com fallback na rede
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
