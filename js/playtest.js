'use strict';
// ============================================================================
// STARFALL PROTOCOL — playtest kit.
// Records every battle on this device (mission, result, turns, minutes, Health
// left, retries, deck, cards played, rating), catches script errors with the
// last few actions, and packs it all into a "feedback code" testers copy and
// send. Nothing leaves the device unless the player copies the code.
// Developer shortcuts live here too (open with ?dev=1, close with ?dev=0).
// ============================================================================

const PT_KEY = 'sf_playtest_v1', PT_MAX_BATTLES = 600, PT_MAX_ERRORS = 60;

const Playtest = {
  d: null,        // { tester, battles, errors, notes, decks }
  cur: null,      // the battle in progress
  ring: [],       // last few actions, attached to errors

  data() {
    if (this.d) return this.d;
    let d = null; try { d = JSON.parse(localStorage.getItem(PT_KEY)); } catch (e) { d = null; }
    d = d && d.battles ? d : {};
    d.tester = d.tester || { id: Math.random().toString(36).slice(2, 10), name: '' };
    d.battles = d.battles || []; d.errors = d.errors || []; d.notes = d.notes || []; d.decks = d.decks || {};
    return (this.d = d);
  },
  store() {
    const d = this.data();
    if (d.battles.length > PT_MAX_BATTLES) d.battles.splice(0, d.battles.length - PT_MAX_BATTLES);
    if (d.errors.length > PT_MAX_ERRORS) d.errors.splice(0, d.errors.length - PT_MAX_ERRORS);
    try { localStorage.setItem(PT_KEY, JSON.stringify(d)); } catch (e) { /* storage full or blocked: recording is best-effort */ }
  },
  dev() { try { return localStorage.getItem('sf_dev') === '1'; } catch (e) { return false; } },

  // decks are stored once and referenced by a short hash
  deckRef(deck) {
    const d = this.data(), c = {};
    deck.forEach(id => c[id] = (c[id] || 0) + 1);
    const s = Object.keys(c).sort().map(id => c[id] > 1 ? id + '*' + c[id] : id).join(',');
    let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const k = (h >>> 0).toString(36);
    d.decks[k] = s;
    return k;
  },

  start(enc, deck, opts) {
    const d = this.data(), save = App.save;
    // retries: losses on this mission since its last win
    let retry = 0;
    for (let i = d.battles.length - 1; i >= 0; i--) { const b = d.battles[i]; if (b.m !== enc.id) continue; if (b.r === 'win') break; retry++; }
    this.cur = { m: enc.id, t0: Date.now(), d: save.diff, retry, deck: this.deckRef(deck), pw: save.power || null,
      tuned: !!(opts && opts.tuned), easy: !!(opts && opts.easy), first: !save.cleared[enc.id], played: {} };
    this.ring = [];
  },
  played(id) { if (this.cur) this.cur.played[id] = (this.cur.played[id] || 0) + 1; },
  act(s) { this.ring.push(s); if (this.ring.length > 12) this.ring.shift(); },

  // result: 'win' | 'loss' | 'retreat'
  end(s, result) {
    const c = this.cur; if (!c) return null;
    this.cur = null;
    const rec = Object.assign({}, c, {
      r: result, t: c.t0, min: Math.round((Date.now() - c.t0) / 6000) / 10,
      turns: s.turnNo || 0, hp: [s.players[0].hp, s.players[1].hp], phase: (s.players[1].phases || []).length,
      b: typeof BUILD !== 'undefined' ? BUILD.n : 0, dev: this.dev() || undefined,
    });
    delete rec.t0;
    this.data().battles.push(rec); this.store();
    return rec;
  },
  rate(n, note) {
    const b = this.data().battles[this.data().battles.length - 1]; if (!b) return;
    if (n != null) b.rate = n;
    if (note != null) b.note = String(note).slice(0, 280);
    this.store();
  },
  note(text) { const t = String(text || '').trim().slice(0, 1000); if (!t) return; this.data().notes.push({ t: Date.now(), b: typeof BUILD !== 'undefined' ? BUILD.n : 0, screen: App.screen, text: t }); this.store(); },
  error(msg, stack) {
    const d = this.data();
    d.errors.push({ t: Date.now(), b: typeof BUILD !== 'undefined' ? BUILD.n : 0, m: UI && UI.enc ? UI.enc.id : null, screen: App.screen, msg: String(msg).slice(0, 300), stack: String(stack || '').split('\n').slice(0, 5).join(' | ').slice(0, 600), last: this.ring.slice() });
    this.store();
  },

  summary() {
    const d = this.data(), b = d.battles.filter(x => !x.dev);
    return { battles: b.length, wins: b.filter(x => x.r === 'win').length, minutes: Math.round(b.reduce((a, x) => a + (x.min || 0), 0)), errors: d.errors.length, notes: d.notes.length };
  },

  // ---- feedback code: "SF1." + base64url(gzip(json)), or "SF1u." uncompressed when gzip is unavailable
  async code() {
    const d = this.data(), save = App.save;
    const payload = { v: 1, at: Date.now(), build: typeof BUILD !== 'undefined' ? BUILD.n : 0, tester: d.tester,
      device: { touch: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), w: screen.width, h: screen.height, standalone: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || !!navigator.standalone, ua: navigator.userAgent.slice(0, 160) },
      campaign: save ? { diff: save.diff, cleared: Object.keys(save.cleared).length, sector: highestSector(save) + 1, playMin: Math.round((save.stats.playMs || 0) / 60000), wins: save.stats.wins, losses: save.stats.losses, station: save.station && save.station.mods, cards: collectionCount(save) } : null,
      battles: d.battles, errors: d.errors, notes: d.notes, decks: d.decks };
    const json = JSON.stringify(payload);
    const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    if (typeof CompressionStream !== 'undefined') {
      try {
        const gz = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
        return 'SF1.' + b64(new Uint8Array(gz));
      } catch (e) { /* fall through */ }
    }
    return 'SF1u.' + b64(new TextEncoder().encode(json));
  },
  clear() { const t = this.data().tester; this.d = { tester: t, battles: [], errors: [], notes: [], decks: {} }; this.store(); },
};

// catch script errors anywhere in the game
window.addEventListener('error', e => { try { Playtest.error(e.message, e.error && e.error.stack); } catch (x) { /* never let reporting throw */ } });
window.addEventListener('unhandledrejection', e => { try { Playtest.error('Unhandled: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack); } catch (x) { /* ignore */ } });

// ?dev=1 turns developer shortcuts on for this device, ?dev=0 turns them off
(function () {
  const m = /[?&#]dev=([01])/.exec(location.search + location.hash);
  if (m) try { if (m[1] === '1') localStorage.setItem('sf_dev', '1'); else localStorage.removeItem('sf_dev'); } catch (e) { /* storage blocked */ }
})();

// ---------------------------------------------------------------- after-battle rating
function rateHTML() {
  return `<div class="pt-rate"><span class="muted small">How was that battle?</span>
    <span class="pt-stars" role="group" aria-label="Rate this battle">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="pt-star" data-pt-rate="${n}" aria-label="${n} of 5">★</button>`).join('')}</span>
    <input class="pt-note" data-pt-note maxlength="280" placeholder="Anything to add? (optional)" aria-label="Optional note about this battle"></div>`;
}
// wire the rating row inside a result popup (call after modal() renders it)
function wireRate(m) {
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-pt-rate]'); if (!b) return;
    e.stopPropagation();
    const n = +b.dataset.ptRate; Playtest.rate(n);
    m.querySelectorAll('.pt-star').forEach(s => s.classList.toggle('on', +s.dataset.ptRate <= n));
  }, true);
  const inp = m.querySelector('[data-pt-note]');
  if (inp) { inp.addEventListener('change', () => Playtest.rate(null, inp.value)); inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); }); }
}

// ---------------------------------------------------------------- settings: playtest section
function playtestHTML() {
  const s = Playtest.summary(), t = Playtest.data().tester;
  return `<h3>Playtest</h3>
    <p class="muted small">This test build records your battles on this device: which mission, the result, turns and minutes, cards played, and any ratings or notes. Nothing leaves your device unless you copy the feedback code and send it.</p>
    <div class="pt-stats"><span><b>${s.battles}</b> battles</span><span><b>${s.wins}</b> wins</span><span><b>${s.minutes}</b> minutes</span>${s.notes ? `<span><b>${s.notes}</b> notes</span>` : ''}${s.errors ? `<span><b>${s.errors}</b> errors caught</span>` : ''}</div>
    <label class="pt-name"><span class="muted small">Your name (so we know whose feedback this is)</span><input data-pt-name maxlength="40" value="${esc(t.name || '')}" autocomplete="off"></label>
    <div class="m-actions left"><button class="btn primary" data-a="pt-copy">Copy feedback code</button>${navigator.share ? '<button class="btn" data-a="pt-share">Send…</button>' : ''}<button class="btn" data-a="pt-note">Report a problem or idea</button></div>
    <div id="pt-extra"></div>`;
}

async function playtestClick(a, root) {
  const nameIn = root.querySelector('[data-pt-name]');
  if (nameIn) { Playtest.data().tester.name = nameIn.value.trim().slice(0, 40); Playtest.store(); }
  const box = root.querySelector('#pt-extra');
  if (a === 'pt-copy' || a === 'pt-share') {
    const code = await Playtest.code();
    if (a === 'pt-share') {
      try { await navigator.share({ title: 'Starfall Protocol feedback', text: code }); toast('Thanks! Feedback sent.'); return; } catch (e) { /* cancelled or unsupported: show the code instead */ }
    }
    box.innerHTML = `<textarea id="pt-code" readonly rows="3" aria-label="Feedback code">${code}</textarea><p class="muted small">Paste this into a message to the developer. It is ${Math.round(code.length / 1024) || 1} KB.</p>`;
    $('#pt-code').select();
    try { await navigator.clipboard.writeText(code); toast('Feedback code copied. Paste it into a message to the developer.'); } catch (e) { toast('Select the code and copy it.'); }
  }
  if (a === 'pt-note') box.innerHTML = `<textarea id="pt-note-in" rows="3" maxlength="1000" placeholder="What happened, or what would make the game better?" aria-label="Problem or idea"></textarea><div class="m-actions left"><button class="btn primary" data-a="pt-note-save">Save note</button></div>`;
  if (a === 'pt-note-save') { const v = $('#pt-note-in').value; if (v.trim()) { Playtest.note(v); toast('Note saved. It goes with your next feedback code.'); box.innerHTML = ''; } }
}

// ---------------------------------------------------------------- developer shortcuts
function devButtonHTML() { return Playtest.dev() ? '<button class="dev-fab" id="dev-fab" aria-label="Developer shortcuts">DEV</button>' : ''; }

function openDevPanel() {
  const save = App.save, inBattle = App.screen === 'battle' && UI.s && !UI.s.over;
  const opts = ENCOUNTERS.map(e => `<option value="${e.id}">${e.id} · ${esc(e.name)}${e.boss ? ' (boss)' : e.elite ? ' (optional)' : ''}</option>`).join('');
  const m = modal(`<div class="m-eyebrow">Developer shortcuts</div><h2>Dev panel</h2>
    <p class="muted small">Battles played with these on are marked as dev in the feedback data. Turn off with ?dev=0 in the address.</p>
    ${inBattle ? '<div class="m-actions left"><button class="btn primary" data-dv="win">Win this battle</button><button class="btn" data-dv="lose">Lose this battle</button></div>' : ''}
    ${save ? `<h3>Jump to a battle</h3><div class="dev-row"><select id="dv-enc">${opts}</select><button class="btn" data-dv="go">Start</button></div>
    <h3>Campaign</h3><div class="dev-row"><select id="dv-sec">${SECTORS.map((s, i) => `<option value="${i}">Clear up to Sector ${i + 1}: ${esc(s.name)}</option>`).join('')}</select><button class="btn" data-dv="clear">Apply</button></div>
    <div class="m-actions left"><button class="btn" data-dv="rich">+1000 Credits, Scrap, Alloy</button><button class="btn" data-dv="cards">Own every card</button><button class="btn" data-dv="station">Repair all of Anchorage</button></div>` : '<p class="muted">Start a campaign first.</p>'}
    <h3>Playtest data</h3><div class="m-actions left"><button class="btn danger" data-dv="wipe">Clear recorded battles</button></div>
    <div class="m-actions"><button class="btn primary" data-dv="close">Close</button></div>`, 'dev-modal');
  m.onclick = e => {
    const a = e.target.closest('[data-dv]') && e.target.closest('[data-dv]').dataset.dv; if (!a) return;
    if (a === 'close') { closeModal(); return; }
    if (a === 'win' || a === 'lose') { closeModal(); const p = UI.s.players[a === 'win' ? 1 : 0]; p.phases = []; p.hp = 0; UI.s.over = true; UI.s.winner = a === 'win' ? 0 : 1; endBattle(); return; }
    if (a === 'go') { const enc = ENCOUNTERS.find(x => x.id === $('#dv-enc').value); closeModal(); UI.s = null; startBattle(enc); return; }
    if (a === 'clear') {
      const n = +$('#dv-sec').value;
      ENCOUNTERS.filter(x => x.sector < n || (x.sector === n && !x.boss)).forEach(x => { save.cleared[x.id] = true; });
      ['packs', 'scan', 'gear', 'mulligan'].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); });
      const size = deckSizeFor(save); autoFillDeck(save, size); persist(); toast(`Cleared everything before the Sector ${n + 1} boss.`);
    }
    if (a === 'rich') { save.credits += 1000; save.scrap += 1000; ensureStation(save).alloy += 1000; persist(); toast('Added 1000 of each.'); }
    if (a === 'cards') { CARD_LIST.filter(d => !d.token).forEach(d => { save.coll[d.id] = maxCopies(d); }); persist(); toast('You now own every card.'); }
    if (a === 'station') { ensureStation(save); STATION.order.forEach(id => { save.station.mods[id] = STATION.mods[id].max; }); persist(); toast('Anchorage fully repaired.'); }
    if (a === 'wipe') { Playtest.clear(); toast('Recorded battles cleared.'); }
  };
}
document.addEventListener('click', e => { if (e.target.closest('#dev-fab')) openDevPanel(); });
