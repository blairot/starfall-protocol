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
function persist() {
  if (!App.save) return;
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
  refillContracts(save);
  save.deck = (save.deck || []).filter(id => CARDS[id]);
  Object.keys(save.coll).forEach(id => { if (!CARDS[id]) delete save.coll[id]; });
  return save;
}

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
  setTimeout(prewarmAllArt, 1200);
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
