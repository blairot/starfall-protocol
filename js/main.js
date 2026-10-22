'use strict';
// ============================================================================
// STARFALL PROTOCOL — boot, saving, starfield
// Saves go to this browser (localStorage) and, when the page runs as a
// claude.ai artifact, also to the viewer's private account storage.
// ============================================================================

const SAVE_KEY = 'starfall_protocol_save_v1';

const Store = {
  db: null, uid: null, writing: false, queued: null,
  local() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } },
  async connect() {
    try {
      if (!window.claude || !window.claude.use) return null;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return null;
      const id = await user.id();
      if (!id) return null;
      this.db = db; this.uid = id;
      const snap = await db.doc('data/users/' + id + '/save').get();
      if (snap.exists) { const d = snap.data(); if (d && d.json) return JSON.parse(d.json); }
    } catch (e) { this.db = null; }
    return null;
  },
  write(save) {
    save.updated = Date.now();
    const json = JSON.stringify(save);
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) { /* storage blocked */ }
    if (this.db) { this.queued = json; this.flush(); }
  },
  async flush() {
    if (this.writing || !this.queued) return;
    this.writing = true;
    const json = this.queued; this.queued = null;
    try { await this.db.doc('data/users/' + this.uid + '/save').set({ json, updated: Date.now() }); }
    catch (e) { if (e && (e.code === 'revoked' || e.code === 'not_granted' || e.code === 'invalid_argument')) this.db = null; }
    this.writing = false;
    if (this.queued) setTimeout(() => this.flush(), 800);
  },
  clear() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    if (this.db) this.db.doc('data/users/' + this.uid + '/save').delete().catch(() => {});
  },
};

let persistTimer = null;
// developer shortcut button (only when ?dev=1 was used on this device)
document.addEventListener('DOMContentLoaded', () => { if (typeof devButtonHTML === 'function') document.body.insertAdjacentHTML('beforeend', devButtonHTML()); });

// ---------------------------------------------------------------- offline download
// Saves every card, portrait, scene and voice file to the phone so the game works
// with no signal. Runs once per build in the background; Settings shows progress.
const Offline = {
  st: null, running: false,
  state() { if (!this.st) { try { this.st = JSON.parse(localStorage.getItem('sf_offline')) || {}; } catch (e) { this.st = {}; } } return this.st; },
  save() { try { localStorage.setItem('sf_offline', JSON.stringify(this.st)); } catch (e) { /* storage blocked */ } },
  available() { return 'serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && window.top === window.self && !window.claude; },
  ready() { const s = this.state(); return s.build === (typeof BUILD !== 'undefined' ? BUILD.n : 0) && s.failed === 0 && s.done === s.total && s.total > 0; },
  async start(manual) {
    if (!this.available() || this.running) return;
    if (!manual && (this.ready() || navigator.onLine === false)) return;
    const reg = await navigator.serviceWorker.ready; if (!reg.active) return;
    try {
      const list = await (await fetch('assets.json', { cache: 'no-cache' })).json();
      const urls = (typeof ART_LITE !== 'undefined' && ART_LITE ? list.lite : list.full) || [];
      this.running = true; Object.assign(this.state(), { build: BUILD.n, done: 0, total: urls.length, failed: 0 }); this.save(); this.paint();
      reg.active.postMessage({ type: 'precache', urls, build: BUILD.n });
    } catch (e) { this.running = false; if (manual) toast('Could not start the download. Check your connection and try again.'); }
  },
  onMessage(m) {
    if (!m || m.type !== 'precache') return;
    Object.assign(this.state(), { done: m.done, total: m.total, failed: m.failed, build: m.build }); this.save();
    if (m.final) { this.running = false; if (m.failed) this.state().failedAt = Date.now(); }
    this.paint();
  },
  label() {
    if (!this.available()) return 'Offline play works in the installed app (Add to Home Screen) and on the GitHub Pages site.';
    const s = this.state();
    if (this.running) return `Downloading art and voice for offline play: ${s.done || 0} of ${s.total || '…'} files.`;
    if (this.ready()) return `Ready for offline play: all ${s.total} art and voice files are saved on this device.`;
    if (s.failed && s.build === BUILD.n) return `${s.failed} of ${s.total} files didn't download. Tap the button to try again when you have signal.`;
    return 'Not everything is saved yet. Download it now so every card and cutscene works with no signal.';
  },
  paint() { const el = document.getElementById('offline-status'); if (el) el.textContent = this.label(); const b = document.getElementById('offline-go'); if (b) b.disabled = this.running; },
};

function persist() {
  if (!App.save) return;
  if (typeof syncDecks === 'function') syncDecks(App.save);
  const now = Date.now();
  App.save.stats.playMs = (App.save.stats.playMs || 0) + Math.min(now - App.sessionStart, 10 * 60000);
  App.sessionStart = now;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => Store.write(App.save), 250);
}

function migrate(save) {
  if (!save || !save.coll) return null;
  save.codex = save.codex || []; save.powers = save.powers || []; save.seenSector = save.seenSector || {};
  save.stats = save.stats || { wins: 0, losses: 0, playMs: 0 };
  if (save.credits == null) save.credits = 0;
  if (save.scrap == null) save.scrap = 0;
  save.packs = save.packs || {}; save.pity = save.pity || {}; save.contracts = (save.contracts || []).filter(c => CONTRACTS[c.id]);
  ensureStation(save);
  ensureDecks(save);
  // campaigns from before cutscenes existed: unlock the ones already earned for replay in the Archive
  save.seenCine = save.seenCine || [];
  if (Object.keys(save.cleared).length && !save.seenCine.includes('opening')) save.seenCine.push('opening');
  Object.entries(CINE_AFTER).forEach(([enc, cid]) => { if (save.cleared[enc] && !save.seenCine.includes(cid)) save.seenCine.push(cid); });
  refillContracts(save);
  save.deck = (save.deck || []).filter(id => CARDS[id]);
  Object.keys(save.coll).forEach(id => { if (!CARDS[id]) delete save.coll[id]; });
  return save;
}

function maybeReload() { if (App.pendingReload && App.screen !== 'battle' && !(typeof Cinema !== 'undefined' && Cinema.playing())) { App.pendingReload = false; location.reload(); } }

// ---------------------------------------------------------------- boot
function start(data) {
  Scene.start();
  FX.attach();
  setupBattleInput();
  document.body.classList.toggle('no-zoom', !Settings.get('hoverZoom'));
  document.addEventListener('pointerdown', () => SFX.init(), { passive: true });
  App.save = migrate(Store.local());
  if (data && data.save) App.save = migrate(data.save) || App.save;
  if (data && data.battle && data.enc && ENC[data.enc] && App.save) startBattle(ENC[data.enc], data.battle);
  else openTitle();
  // Crash guard: if the last launch never finished booting (e.g. the phone ran out of
  // memory), start in safe mode and skip the background art preparation this time.
  let lastBootFailed = false;
  try { lastBootFailed = localStorage.getItem('sf_booting') === '1'; localStorage.setItem('sf_booting', '1'); } catch (e) { /* storage blocked */ }
  const bootDone = () => { try { localStorage.removeItem('sf_booting'); } catch (e) { /* storage blocked */ } };
  setTimeout(bootDone, 15000);
  window.addEventListener('pagehide', bootDone);   // a normal reload or navigation is not a crash
  App.safeMode = lastBootFailed;
  if (lastBootFailed) setTimeout(() => toast('Safe graphics mode: the last launch didn\'t finish loading.', 3500), 800);
  else { setTimeout(prewarmAllArt, 1500); setTimeout(() => prefetchOwnArt(App.save), 3000); }
  // Installed web app (GitHub Pages): cache the game for offline play. Not inside claude.ai.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && window.top === window.self && !window.claude) {
    navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => { /* offline play is optional */ });
    navigator.serviceWorker.addEventListener('message', e => Offline.onMessage(e.data));
    navigator.serviceWorker.ready.then(() => setTimeout(() => Offline.start(false), 4000));
    // A new build took over: reload once, but never in the middle of a battle.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) App.pendingReload = true; maybeReload(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.serviceWorker.controller) navigator.serviceWorker.getRegistration().then(r => r && r.update()); });
  }
  // Account storage answers later; prefer whichever save is newer.
  Store.connect().then(remote => {
    remote = migrate(remote);
    if (remote && (!App.save || (remote.updated || 0) > (App.save.updated || 0))) {
      App.save = remote;
      if (App.screen === 'title') openTitle();
    } else if (App.save && Store.db) Store.write(App.save);
  });
  window.addEventListener('beforeunload', () => { if (App.save) { App.save.stats.playMs += Math.min(Date.now() - App.sessionStart, 600000); App.sessionStart = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(App.save)); } catch (e) { /* ignore */ } } });
}

if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  window.claude.hot.snapshot(() => ({ save: App.save, battle: UI.s && !UI.s.over && !UI.busy ? Object.assign({}, UI.s, { _pturns: UI.playerTurns }) : null, enc: UI.enc && UI.enc.id }));
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
