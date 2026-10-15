'use strict';
// ============================================================================
// STARFALL PROTOCOL — offline support for the installed web app.
// Network first, so a new build shows up as soon as you're online; the cache
// is the fallback when you're not. Bump VERSION to drop old caches.
// ============================================================================
const VERSION = 'starfall-b45';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/build.js', 'js/playtest.js', 'audio/silence.mp3',
  'js/engine.js', 'js/audio.js', 'js/cards.js', 'js/strategies.js', 'js/ai.js', 'js/campaign.js', 'js/economy.js', 'js/station.js', 'js/decks.js', 'js/lore.js', 'js/cinematics.js', 'js/vo.js',
  'js/art.js', 'js/painted.js', 'js/illustrations.js', 'js/icons.js', 'js/ui.js', 'js/shop.js', 'js/inspect.js', 'js/cinema.js', 'js/scene.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // same-origin: always revalidate with the server (cheap 304s), so a new build shows up immediately
      const res = await fetch(req, url.origin === location.origin ? { cache: 'no-cache' } : undefined);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return cache.match('index.html');
      throw err;
    }
  })());
});
