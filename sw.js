'use strict';
// ============================================================================
// STARFALL PROTOCOL — offline support for the installed web app.
// Code and pages: network first, but give up after a few seconds and use the
// saved copy, so a weak train connection never stalls the game. Art and voice
// (art/, audio/): served from a long-lived cache straight away and refreshed in
// the background. The page asks for the whole asset list to be saved ahead of
// time ("precache"), so every card, scene and cutscene works with no signal.
// Bump VERSION (tools/stamp_build.py does it) to replace the code cache.
// ============================================================================
const VERSION = 'starfall-b47';
const ASSETS = 'starfall-assets';   // art and voice, kept across builds
const NET_WAIT = 3500;              // ms to wait for the network before using the saved copy
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/build.js', 'js/playtest.js', 'audio/silence.mp3',
  'js/engine.js', 'js/audio.js', 'js/cards.js', 'js/strategies.js', 'js/ai.js', 'js/campaign.js', 'js/economy.js', 'js/station.js', 'js/decks.js', 'js/lore.js', 'js/cinematics.js', 'js/vo.js', 'js/videos.js',
  'js/art.js', 'js/painted.js', 'js/illustrations.js', 'js/icons.js', 'js/ui.js', 'js/shop.js', 'js/inspect.js', 'js/cinema.js', 'js/scene.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== ASSETS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const isAsset = url => url.origin === location.origin && /\/(art|audio|video)\//.test(url.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;

  // art and voice: saved copy first, refreshed quietly in the background
  if (isAsset(url)) {
    e.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(req, { ignoreSearch: true });
      const refresh = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(refresh); return hit; }
      const res = await refresh;
      return res || new Response('', { status: 504, statusText: 'Offline' });
    })());
    return;
  }

  // code, pages and fonts: network first, but not for long
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const net = fetch(req, url.origin === location.origin ? { cache: 'no-cache' } : undefined)
      .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; });
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
    if (!hit) return net;                       // nothing saved: wait for the network
    const timeout = new Promise(r => setTimeout(() => r(null), NET_WAIT));
    const res = await Promise.race([net.catch(() => null), timeout]);
    if (res) return res;
    e.waitUntil(net.catch(() => null));         // keep updating the saved copy in the background
    return hit;
  })());
});

// The page sends the full list of art and voice files; save any we don't have yet.
self.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type !== 'precache' || !Array.isArray(m.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(ASSETS);
    const urls = m.urls.slice(), total = urls.length;
    let done = 0, failed = 0;
    const report = async final => { for (const c of await self.clients.matchAll()) c.postMessage({ type: 'precache', done, failed, total, final: !!final, build: m.build }); };
    const worker = async () => {
      while (urls.length) {
        const u = urls.shift();
        try {
          if (!(await cache.match(u))) { const res = await fetch(u, { cache: 'no-cache' }); if (!res.ok) throw new Error(res.status); await cache.put(u, res); }
        } catch (err) { failed++; }
        done++;
        if (done % 10 === 0) await report(false);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    await report(true);
  })());
});
