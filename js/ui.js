'use strict';
// ============================================================================
// STARFALL PROTOCOL — interface: rendering, input, animation, screens
// ============================================================================

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = t => esc(t || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => REDUCED ? Math.min(ms, 120) : ms * (SPEED[Settings.get('speed')] || 1);

// ---------------------------------------------------------------- shared card rendering
function typeLabel(d) {
  const f = FACTIONS[d.faction] || FACTIONS.neutral;
  const t = { unit: 'Unit', spell: 'Protocol', gear: 'Gear', trap: 'Trap' }[d.type];
  return (d.faction === 'neutral' ? '' : f.name + ' · ') + t;
}

// Card text fit: once fonts are ready, render every card's text off-screen and keep the largest
// size that fits its box (sizes are in em, so the answer holds at every card scale).
const CARD_FIT = {};
function fitCardText() {
  const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;font-size:16px';
  box.innerHTML = CARD_LIST.map(d => cardHTML(d.id)).join(''); document.body.appendChild(box);
  box.querySelectorAll('.card').forEach(el => {
    const t = el.querySelector('.c-text'); if (!t) return;
    let fit = 'xxdense';
    for (const lv of ['', 'dense', 'xdense', 'xxdense']) { t.className = 'c-text ' + lv; if (t.scrollHeight <= t.clientHeight + 1) { fit = lv; break; } }
    CARD_FIT[el.dataset.card] = fit;
  });
  box.remove();
}
if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(() => setTimeout(fitCardText, 50));

function cardHTML(id, o) {
  o = o || {};
  const d = D(id), f = FACTIONS[d.faction] || FACTIONS.neutral;
  const cost = o.cost != null ? o.cost : d.cost;
  const cc = cost < d.cost ? 'down' : cost > d.cost ? 'up' : '';
  const stats = (d.type === 'unit' || d.type === 'gear')
    ? `<div class="c-atk${o.atk > d.atk ? ' up' : ''}">${o.atk != null ? o.atk : d.atk}</div><div class="c-hp${d.type === 'gear' ? ' dur' : ''}">${d.hp}</div>` : '';
  return `<div class="card t-${d.type} r-${d.rarity} ${o.cls || ''}" style="--h:${f.hue}" data-card="${id}" ${o.attrs || ''}>
    <div class="c-body">
      <div class="c-art" style='background-image:${artPlate(id)}'></div>
      <div class="c-plate"><div class="c-name${d.name.length > 13 ? (d.name.length > 18 ? ' xlong' : ' long') : ''}">${esc(d.name)}</div><div class="c-code"><span>${typeLabel(d)}</span><i class="rar" title="${d.rarity}"></i></div></div>
      <div class="c-text ${CARD_FIT[id] != null ? CARD_FIT[id] : d.text.length > 62 ? 'dense' : ''}">${fmt(d.text)}</div>
    </div>
    <div class="c-cost ${cc}">${cost}</div>
    ${stats}
    ${o.count != null ? `<div class="c-count">×${o.count}</div>` : ''}
  </div>`;
}

function keywordsFor(d) {
  const ids = [...new Set([...(d.kw || []), ...(d.tags || []), ...(d.kwRef || [])])];
  if (d.amplify && !ids.includes('amplify')) ids.push('amplify');
  return ids.filter(k => KEYWORDS[k]).map(k => KEYWORDS[k]);
}

// ---------------------------------------------------------------- tooltip
const Tip = {
  el: null,
  show(html, x, y) {
    if (!this.el) this.el = $('#tooltip');
    this.el.innerHTML = html; this.el.hidden = false;
    const w = this.el.offsetWidth, h = this.el.offsetHeight;
    let left = x + 24, top = y - h / 2;
    if (left + w > window.innerWidth - 8) left = x - w - 24;
    top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
    this.el.style.left = Math.max(8, left) + 'px'; this.el.style.top = top + 'px';
  },
  hide() { if (this.el) this.el.hidden = true; },
};

function cardTipHTML(id, extra) {
  const d = D(id);
  const kws = keywordsFor(d).map(k => `<div class="kw"><b>${esc(k.name)}</b> ${esc(k.text)}</div>`).join('');
  return `<div class="tip-card">${cardHTML(id, { cls: 'big' })}</div>
    <div class="tip-side">${extra || ''}${kws}${d.flavor ? `<div class="flavor">${esc(d.flavor)}</div>` : ''}<div class="tip-hint">Right-click: inspect and lore</div></div>`;
}

// Touch screens: no hover, so no tooltips; hand cards lift on the first tap and play on the second.
const TOUCH = { on: !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) };
document.addEventListener('pointerdown', e => {
  const was = TOUCH.on; TOUCH.on = e.pointerType === 'touch' || e.pointerType === 'pen';
  document.body.classList.toggle('touch', TOUCH.on);
  if (TOUCH.on) Tip.hide();
  if (was !== TOUCH.on && App.screen === 'battle' && UI.s) { fitStage(); renderBattle(); }
}, { passive: true, capture: true });
document.addEventListener('mousemove', e => {
  if (TOUCH.on) return;
  const t = e.target.closest && e.target.closest('[data-tip],[data-card],[data-uid]');
  Tip.target = t;
  if (!t || (UI.dragging)) { Tip.hide(); return; }
  const slot = t.closest('.hand-slot');
  if (slot && Settings.get('hoverZoom')) {
    // the hand card is already enlarged; only show keyword notes beside it
    const d = D(t.dataset.card), kws = keywordsFor(d);
    const r = slot.querySelector('.card').getBoundingClientRect();
    Tip.show(`<div class="tip-side">${kws.map(k => `<div class="kw"><b>${esc(k.name)}</b> ${esc(k.text)}</div>`).join('')}${d.flavor ? `<div class="flavor">${esc(d.flavor)}</div>` : ''}<div class="tip-hint">Right-click: inspect and lore</div></div>`, r.right - 10, r.top + r.height / 2);
    return;
  }
  const html = tipFor(t);
  if (html) Tip.show(html, e.clientX, e.clientY); else Tip.hide();
});
document.addEventListener('scroll', () => Tip.hide(), true);

function tipFor(t) {
  if (t.dataset.tip) {
    const [kind, arg] = t.dataset.tip.split(':');
    if (kind === 'power') { const h = HEROPOWERS[arg]; return `<div class="tip-side solo"><div class="tip-h">${powerIco(arg)} ${esc(h.name)} <span class="pill">${h.cost} Energy</span></div><div>${esc(h.text)}</div><div class="muted">Commander power. Once per turn.</div></div>`; }
    if (kind === 'passive') { const p = PASSIVES[arg]; return `<div class="tip-side solo"><div class="tip-h">${passiveIco(arg)} ${esc(p.name)}</div><div>${esc(p.text)}</div></div>`; }
    if (kind === 'trap') return `<div class="tip-side solo"><div class="tip-h">Hidden Trap</div><div>${esc(KEYWORDS.trap.text)}</div></div>`;
    if (kind === 'weapon' && UI.s) { const w = UI.s.players[+arg].weapon; if (w) return cardTipHTML(w.id, `<div class="muted">Equipped: ${w.atk} Attack, ${w.dur} Durability left.</div>`); }
    if (kind === 'text') return `<div class="tip-side solo">${esc(arg ? decodeURIComponent(arg) : '')}</div>`;
    return null;
  }
  if (t.dataset.card) return cardTipHTML(t.dataset.card);
  if (t.dataset.uid && UI.s) {
    const s = UI.s, c = getChar(s, isNaN(+t.dataset.uid) ? t.dataset.uid : +t.dataset.uid);
    if (!c) return null;
    if (isHero(c)) {
      const bits = [`<div class="tip-h">${esc(c.name)}</div>`, `<div>Health ${c.hp}/${c.maxHp}${c.armor ? ` · Armor ${c.armor}` : ''}</div>`];
      if (c.weapon) bits.push(`<div>Gear: ${esc(D(c.weapon.id).name)} (${c.weapon.atk}/${c.weapon.dur})</div>`);
      if (c.frozen) bits.push('<div class="st-frozen">Frozen</div>');
      c.passives.forEach(id => { const p = PASSIVES[id]; bits.push(`<div class="kw"><b>${esc(p.name)}</b> ${esc(p.text)}</div>`); });
      if (c.phases.length) bits.push(`<div class="kw warn"><b>Phases remaining: ${c.phases.length}</b> This enemy will rise again when defeated.</div>`);
      return `<div class="tip-side solo">${bits.join('')}</div>`;
    }
    const st = [];
    st.push(`Current: <b>${atkOf(s, c)}</b> Attack / <b>${c.hp}</b> Health`);
    if (c.frozen) st.push('<span class="st-frozen">Frozen</span>');
    if (c.silenced) st.push('<span class="st-emp">EMP\'d: no text or keywords</span>');
    if (c.extraDeath.length) st.push(`Salvage: summon ${c.extraDeath.length} Swarmling${c.extraDeath.length > 1 ? 's' : ''}`);
    const kwNow = Object.keys(c.kw).filter(k => KEYWORDS[k]).map(k => KEYWORDS[k].name);
    if (kwNow.length) st.push('Keywords: ' + kwNow.join(', '));
    if (c.sick && c.owner === 0 && !c.kw.warp) st.push(c.kw.blitz ? 'Just arrived: can attack units only.' : 'Just arrived: can attack next turn.');
    return cardTipHTML(c.id, `<div class="muted">${st.join('<br>')}</div>`);
  }
  return null;
}

// ---------------------------------------------------------------- toasts, modals
// newly unlocked achievements: a toast each (the reward is already paid by achieve())
function achieveToast(list) { (list || []).forEach((a, i) => setTimeout(() => toast(`Service record: <b>${esc(a.name)}</b> +${a.reward} Credits`, 3200), 400 + i * 900)); }

function toast(msg, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms || 2200);
  setTimeout(() => t.remove(), (ms || 2200) + 400);
}

function modal(html, cls) {
  const m = $('#modal'); m.className = 'modal ' + (cls || ''); m.innerHTML = `<div class="m-box"><div class="m-in">${html}</div></div>`; m.hidden = false;
  Tip.hide();
  return m;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

function showScreen(id) {
  const prevScreen = App.screen;
  $$('.screen').forEach(s => s.hidden = s.id !== id); App.screen = id; Tip.hide(); window.scrollTo(0, 0);
  const el = $('#' + id); if (el && prevScreen !== id) { el.classList.remove('screen-in'); void el.offsetWidth; el.classList.add('screen-in'); }
  if (typeof closeInspect === 'function') closeInspect();
  if (typeof maybeReload === 'function' && id !== 'battle') setTimeout(maybeReload, 0);
  if (id === 'title' || id === 'hangar' || id === 'shop') document.body.style.setProperty('--sec-h', id === 'shop' ? 30 : 210);
  if (typeof Scene !== 'undefined') {
    if (id === 'battle') Scene.pause();
    else { Scene.resume(); if (id !== 'map') Scene.mood(id === 'hangar' || id === 'station' ? 'hangar' : id === 'shop' ? 'shop' : 'title'); if (prevScreen !== id) Scene.warp(); }
  }
  if (id === 'battle' && UI.enc) {
    if (Music.setTheme) Music.setTheme(UI.enc.sector);
    Music.setMood(UI.enc.final ? 'final' : UI.enc.boss || UI.enc.elite ? 'boss' : 'battle');
  } else {
    // menus play the ambience of the sector you're looking at (the title screen keeps the neutral one)
    if (Music.setTheme) Music.setTheme(id === 'title' || !App.save ? -1 : MapUI.sector != null ? MapUI.sector : highestSector(App.save));
    Music.setMood('menu');
  }
}

// ---------------------------------------------------------------- incremental DOM updates
// Patch an element's children to match new markup, reusing existing nodes so
// art stays decoded, animations don't replay, and hover state survives.
const keyOf = n => n.nodeType === 1 ? (n.getAttribute('data-key') || n.getAttribute('data-uid') || n.id || null) : null;
function morphInto(el, html) {
  const t = document.createElement('template'); t.innerHTML = html;
  morphChildren(el, t.content);
}
function morphChildren(from, to) {
  const keyed = new Map();
  for (const n of from.childNodes) { const k = keyOf(n); if (k) keyed.set(k, n); }
  let i = 0;
  for (const nn of [...to.childNodes]) {
    const k = keyOf(nn), cur = from.childNodes[i] || null;
    let match = null;
    if (k && keyed.has(k)) { match = keyed.get(k); keyed.delete(k); }
    else if (!k && cur && !keyOf(cur) && cur.nodeType === nn.nodeType && cur.nodeName === nn.nodeName) match = cur;
    if (match) { if (match !== cur) from.insertBefore(match, cur); morphNode(match, nn); }
    else from.insertBefore(nn, cur);
    i++;
  }
  while (from.childNodes.length > i) from.removeChild(from.lastChild);
}
function morphNode(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of b.attributes) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  morphChildren(a, b);
}

// ============================================================================
// BATTLE
// ============================================================================
const UI = { s: null, enc: null, mode: null, busy: false, log: [], names: {}, playerTurns: 0, scale: 1, mouse: { x: 0, y: 0 } };

function startBattle(enc, resumeState) {
  closeModal();
  UI.enc = enc; UI.mode = null; UI.busy = false; UI.lethalCue = false; UI.peek = null; UI.advOpen = false; UI.log = []; UI.names = {}; UI.playerTurns = 0; UI.tally = {}; UI.seen = new Map(); UI.seenCards = new Map();
  document.body.style.setProperty('--sec-h', SECTORS[enc.sector].hue);
  try { $('#battle').style.setProperty('--bd', `url(${Scene.backdrop(enc.sector, SECTORS[enc.sector].hue)})`); } catch (e) { /* backdrop is decoration */ }
  showScreen('battle');
  fitStage();
  if (resumeState) {
    UI.s = resumeState; UI.playerTurns = resumeState._pturns || 1;
    renderBattle();
    if (UI.s.active === 1 && !UI.s.over) enemyTurn();
    return;
  }
  const easy = UI.easyRetry === enc.id; UI.easyRetry = null; UI.easyRun = easy;
  const ov = UI.deckOverride && UI.deckOverride.id === enc.id ? { deck: UI.deckOverride.deck.slice() } : null;
  const s = newGame(enc.challenge ? challengeBattle(App.save) : buildBattle(easy || ov ? Object.assign({}, App.save, ov, easy ? { diff: 'cadet' } : null) : App.save, enc));
  UI.s = s; UI.retreat = false;
  const nextCine = !enc.challenge && CINE_AFTER[enc.id];
  if (nextCine && !(App.save.seenCine || []).includes(nextCine)) Cinema.prefetch(nextCine);
  Playtest.start(enc, enc.challenge ? App.save.challenge.deck : enc.fixedDeck || (ov ? ov.deck : App.save.deck), { tuned: !!ov, easy });
  aiMulligan(s, 1);
  renderBattle();
  if (enc.noMulligan) { launchPlay(); return; }
  showMulligan();
}

function showMulligan() {
  const s = UI.s, p = s.players[0];
  const sel = new Set();
  const first = s.first === 0;
  const m = modal(`<div class="m-eyebrow">${first ? 'You go first' : 'You go second: +1 card and an Energy Cell'}</div>
    <h2>Opening Hand</h2><p class="muted">Click cards to send them back for new ones. Swapping expensive cards helps you find early plays.</p>
    <div class="mull-row">${p.hand.map((c, i) => `<button class="mull-card" data-i="${i}">${cardHTML(c.id)}<span class="swap">SWAP</span></button>`).join('')}</div>
    <div class="m-actions"><button class="btn primary" id="mull-ok">Keep and Begin</button></div>`, 'wide');
  m.onclick = e => {
    const b = e.target.closest('.mull-card');
    if (b) { const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('on', sel.has(i)); $('#mull-ok').textContent = sel.size ? `Swap ${sel.size} and Begin` : 'Keep and Begin'; SFX.click(); }
    if (e.target.id === 'mull-ok') { mulligan(s, 0, [...sel]); closeModal(); launchPlay(); }
  };
}

async function launchPlay() {
  const s = UI.s;
  beginPlay(s);
  s.events = s.events.filter(e => e.t !== 'draw');
  if (s.active === 0) { UI.playerTurns = 1; renderBattle(); await banner('YOUR TURN'); await playEvents(); renderBattle(); }
  else { renderBattle(); await banner('ENEMY TURN', 'enemy'); await playEvents(); enemyTurn(); }
}

// Notch and home-bar insets (non-zero in the installed full-screen app on phones).
function safeInsets() {
  let p = document.getElementById('safe-probe');
  if (!p) { p = document.createElement('div'); p.id = 'safe-probe'; p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(p); }
  const cs = getComputedStyle(p);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

// Widescreen stage (1280x760) for desktops, tablets and phones on their side.
// Phones held upright get a 600-wide portrait stage that stretches to fill the height.
function fitStage() {
  const st = $('#stage'); if (!st) return;
  // Size to the battle screen's real box: in iOS home-screen apps innerHeight can
  // include the home-indicator strip the page doesn't actually get.
  const box = $('#battle'), bw = box && box.clientWidth, bh = box && box.clientHeight;
  const vv = window.visualViewport, vw = bw || window.innerWidth;
  const vh0 = Math.min(bh || window.innerHeight, window.innerHeight, vv ? Math.round(vv.height) : Infinity);
  const portrait = vh0 > vw * 1.05;
  const inset = safeInsets(), framedTouch = window.top !== window.self && TOUCH.on;
  const topPad = Math.max(inset.top, portrait && framedTouch ? 62 : 0), botPad = inset.bottom;
  const vh = vh0 - topPad - botPad;
  const W = portrait ? 600 : 1280;
  const H = portrait ? Math.max(960, Math.min(1400, Math.round(vh / (vw / W)))) : 760;
  const sc = Math.min(vw / W, vh / H);
  st.style.top = (topPad + vh / 2) + 'px';
  const changed = UI.portrait !== portrait || UI.W !== W || UI.H !== H;
  UI.scale = sc; UI.portrait = portrait; UI.W = W; UI.H = H;
  st.classList.toggle('portrait', portrait);
  st.style.width = W + 'px'; st.style.height = H + 'px';
  st.style.transform = `translate(-50%, -50%) scale(${sc})`;
  const cv = $('#fxc'); if (cv && (cv.width !== W || cv.height !== H)) { cv.width = W; cv.height = H; }
  if (changed && UI.s && App.screen === 'battle') renderBattle();
  if (!portrait && vh < 500 && App.screen === 'battle' && !UI.rotateHint) { UI.rotateHint = true; toast('Tip: hold your phone upright for a bigger battle view.', 3200); }
}
window.addEventListener('resize', fitStage);
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (App.screen === 'battle') fitStage(); });

function minionHTML(s, m, side) {
  const d = D(m.id), f = FACTIONS[d.faction] || FACTIONS.neutral, a = atkOf(s, m);
  const cls = ['unit'];
  if (!UI.seen.has(m.uid)) UI.seen.set(m.uid, performance.now());
  if (performance.now() - UI.seen.get(m.uid) < 600) cls.push('arriving');
  if (m.kw.guardian) cls.push('guardian');
  if (m.kw.barrier) cls.push('barrier');
  if (m.kw.cloak) cls.push('cloak');
  if (m.frozen) cls.push('frozen');
  if (m.silenced) cls.push('silenced');
  if (side === 0 && s.active === 0 && !UI.busy && !UI.mode && canAttack(s, 0, m.uid)) cls.push('ready');
  if (side === 0 && m.sick && !m.kw.warp && !(m.kw.blitz)) cls.push('sleeping');
  if (UI.mode && UI.mode.targets.includes(m.uid)) cls.push('targetable');
  if (UI.mode && UI.mode.k === 'atk' && UI.mode.uid === m.uid) cls.push('selected');
  const badges = [];
  if (m.kw.toxic) badges.push(`<i class="b-tox" title="Toxic">${ico('toxic')}</i>`);
  if (m.kw.siphon) badges.push(`<i class="b-sip" title="Siphon">${ico('siphon')}</i>`);
  if (m.kw.twin) badges.push(`<i title="Twin-Fire">${ico('twin')}</i>`);
  if (m.kw.amplify) badges.push(`<i class="b-amp" title="Amplify">${ico('amplify')}<em>${m.kw.amplify}</em></i>`);
  if ((!m.silenced && d.death) || m.extraDeath.length) badges.push(`<i title="Salvage">${ico('salvage')}</i>`);
  if (!m.silenced && (d.turnStart || d.turnEnd || d.onSpell || d.onSummon || d.onDamaged || d.onAttack || d.auraAtk || d.onAnyDeath)) badges.push(`<i title="Effect">${ico('effect')}</i>`);
  const ac = a > d.atk ? 'up' : a < d.atk ? 'down' : '';
  const hc = m.hp < m.maxHp ? 'down' : m.maxHp > d.hp ? 'up' : '';
  return `<div class="${cls.join(' ')}" data-uid="${m.uid}" style="--h:${f.hue}">
    <div class="u-frame"><div class="u-art" style='background-image:${artPlate(m.id)}'></div></div>
    ${m.kw.barrier ? '<div class="u-shell"></div>' : ''}${m.frozen ? `<div class="u-ice">${ico('cryo')}</div>` : ''}
    <div class="u-atk ${ac}">${a}</div><div class="u-hp ${hc}">${m.hp}</div>
    ${badges.length ? `<div class="u-badges">${badges.join('')}</div>` : ''}
    ${m.sick && side === 0 && !m.kw.warp && !m.kw.blitz ? '<div class="u-status">Standby</div>' : ''}
  </div>`;
}

const ENEMY_FACTION = ['neutral', 'raider', 'swarm', 'synth', 'psi', 'void'];
function heroArt(p) { return p.i === 0 ? portraitPlate('commander', 'fleet', PLAYER_ART) : portraitPlate(p.name, ENEMY_FACTION[UI.enc ? UI.enc.sector : 0], ENEMY_ART[p.name]); }
function heroHTML(s, p) {
  const a = atkOf(s, p), side = p.i;
  const cls = ['hero', side === 0 ? 'mine' : 'theirs'];
  if (side === 0 && s.active === 0 && !UI.busy && !UI.mode && canAttack(s, 0, p.uid)) cls.push('ready');
  if (UI.mode && UI.mode.targets.includes(p.uid)) cls.push('targetable');
  if (UI.mode && UI.mode.k === 'atk' && UI.mode.uid === p.uid) cls.push('selected');
  if (p.frozen) cls.push('frozen');
  const hc = p.hp < p.maxHp ? 'down' : '';
  return `<div class="${cls.join(' ')}" data-uid="${p.uid}">
    <div class="h-frame"><div class="h-art"${side ? PortraitLoop.attr(p.name) : ''} style='background-image:${heroArt(p)}'></div><div class="h-ring"></div></div>
    <div class="h-name">${esc(p.name)}</div>
    <div class="h-hp ${hc}">${p.hp}</div>
    ${p.armor ? `<div class="h-armor">${p.armor}</div>` : ''}
    ${a ? `<div class="h-atk">${a}</div>` : ''}
  </div>`;
}

function heroRowHTML(s, pi) {
  const p = s.players[pi];
  const traps = p.traps.map(t => pi === 0
    ? `<div class="trap mine" data-card="${t.id}">${ico('trap')}</div>`
    : `<div class="trap" data-tip="trap">${ico('hidden')}</div>`).join('');
  let pow = '';
  if (p.power) {
    const h = HEROPOWERS[p.power.id];
    const ready = pi === 0 && !UI.busy && !UI.mode && canPower(s, 0);
    const sel = UI.mode && UI.mode.k === 'pow' && pi === 0;
    pow = `<button class="power ${p.power.used ? 'used' : ''} ${ready ? 'ready' : ''} ${sel ? 'selected' : ''}" ${pi === 0 ? 'data-power="1"' : ''} data-tip="power:${p.power.id}" aria-label="${esc(h.name)}"><span class="p-icon">${powerIco(p.power.id)}</span><span class="p-cost">${h.cost}</span></button>`;
  }
  const weap = p.weapon ? `<div class="weapon" data-tip="weapon:${pi}"><span class="w-art" style='background-image:${artPlate(p.weapon.id)}'></span><span class="w-atk">${p.weapon.atk}</span><span class="w-dur">${p.weapon.dur}</span></div>` : '<div class="weapon empty"></div>';
  const pass = p.passives.map(id => `<div class="passive" data-tip="passive:${id}">${passiveIco(id)}</div>`).join('');
  return `<div class="traps">${traps}</div><div class="weapon-slot">${weap}</div>${heroHTML(s, p)}<div class="power-slot">${pow}</div><div class="passives">${pass}</div>`;
}

function manaHTML(p) {
  let pips = '';
  for (let k = 0; k < 10; k++) {
    let c = 'pip';
    if (k < p.mana) c += ' full';
    else if (k < p.maxMana - p.locked) c += ' spent';
    else if (k < p.maxMana) c += ' locked';
    else c += ' none';
    pips += `<i class="${c}"></i>`;
  }
  return `<div class="mana-num"><b>${p.mana}</b>/${p.maxMana}</div><div class="pips">${pips}</div>${p.overload ? `<div class="ovl">Overheat: ${p.overload} locked next turn</div>` : ''}${p.locked ? `<div class="ovl">${p.locked} locked this turn</div>` : ''}`;
}

function myTurnNow(s) { return s.active === 0 && !s.over; }
function anyMoves(s) {
  if (s.active !== 0 || s.over) return false;
  const p = s.players[0];
  if (p.hand.some((c, i) => canPlay(s, 0, i))) return true;
  if (canPower(s, 0)) return true;
  return [p, ...p.board].some(c => canAttack(s, 0, c.uid));
}

function renderBattle() {
  const s = UI.s; if (!s) return;
  const P = s.players[0], E = s.players[1];
  for (const p of s.players) { UI.names[p.uid] = p.name; p.board.forEach(m => UI.names[m.uid] = D(m.id).name); }
  const tips = UI.enc.tips || [];
  const tip = tips.length ? advisorTip(s, UI.enc, Math.max(1, UI.playerTurns)) : '';
  const handN = P.hand.length;
  const HW = UI.portrait ? 576 : 880, CW = UI.portrait ? 152 : 122, fitN = Math.floor(HW / CW);
  const overlap = handN > fitN ? -Math.min(UI.portrait ? 84 : 62, Math.ceil((handN * CW - HW) / (handN - 1))) : 4;
  if (UI.peek != null && (UI.peek >= handN || UI.busy || !myTurnNow(s))) UI.peek = null;
  const myTurn = s.active === 0 && !s.over;
  // a unit in hand shows the Attack it will have from your commander's passives (e.g. the Veteran Crews modifier)
  const handAtk = (s, id) => { const d = D(id); if (d.type !== 'unit') return null; let a = d.atk;
    const kw = {}; (d.kw || []).forEach(k => kw[k] = true);
    for (const pid of s.players[0].passives) { const ps = PASSIVES[pid]; if (ps && ps.auraAtk) try { a += ps.auraAtk(s, { id, kw, owner: 0 }) || 0; } catch (e) { /* needs a real unit */ } }
    return a; };
  const hand = P.hand.map((c, i) => {
    const playable = myTurn && !UI.busy && !UI.mode && canPlay(s, 0, i);
    const sel = UI.mode && UI.mode.k === 'play' && UI.mode.hi === i;
    if (!UI.seenCards.has(c.uid)) UI.seenCards.set(c.uid, performance.now());
    const fresh = performance.now() - UI.seenCards.get(c.uid) < 500;
    return `<div class="hand-slot${fresh ? ' drawn' : ''}${UI.peek === i ? ' peek' : ''}" data-key="c${c.uid}" style="margin-left:${i ? overlap : 0}px;--i:${i};--n:${handN}">${cardHTML(c.id, { cost: costOf(s, 0, c), atk: handAtk(s, c.id), cls: (playable ? 'playable' : '') + (sel ? ' selected' : ''), attrs: `data-hand="${i}"` })}</div>`;
  }).join('');
  const seeCosts = stationLv(App.save, 'observatory') >= 3;
  const ehand = E.hand.map(c => `<i class="cback">${seeCosts ? `<em>${costOf(s, 1, c)}</em>` : ''}</i>`).join('');
  const crystals = Array.from({ length: Math.max(E.maxMana, E.mana) }, (_, k) => `<i class="${k < E.mana ? 'full' : ''}"></i>`).join('');
  const kind = UI.enc.challenge ? `Trial ${UI.enc.trial}/${CHALLENGE.battles}` : UI.enc.final ? 'Final' : UI.enc.boss ? 'Boss' : UI.enc.elite ? 'Elite' : 'Mission ' + UI.enc.id;
  battleIntensity(s);
  const endCls = myTurn && !UI.busy ? (anyMoves(s) ? 'live' : 'live done') : 'wait';
  morphInto($('#stage-ui'), `
    <aside class="b-left">
      <div class="mission-plate"><div class="mp-sec">Sector ${String(UI.enc.sector + 1).padStart(2, '0')} · ${esc(SECTORS[UI.enc.sector].name)}</div><div class="mp-name">${esc(UI.enc.name)}</div><div class="mp-tag"><span class="pill ${UI.enc.boss || UI.enc.final ? 'boss' : UI.enc.elite ? 'elite' : ''}">${kind}</span><span class="pill">Turn ${Math.max(1, Math.ceil(s.turnNo / 2))}</span>${tip && Settings.get('tips') ? `<button class="pill adv-btn ${UI.advOpen ? 'on' : ''}" data-adv="1">Advisor</button>` : ''}</div></div>
      ${tip && Settings.get('tips') ? `<div class="advisor ${UI.advOpen ? 'open' : ''}"><div class="adv-h">Tactical Advisor</div><div class="adv-t">${tip}</div></div>` : ''}
      <div class="b-log" ${Settings.get('log') ? '' : 'hidden'}><div class="log-h">Combat feed</div><ol>${UI.log.slice(-14).map(l => `<li class="${/^(You|Your)\b/.test(l) ? 'mine' : ''}">${l}</li>`).join('')}</ol></div>
    </aside>
    <main class="field">
      <div class="e-hand">${ehand}</div>
      <div class="hero-row enemy">${heroRowHTML(s, 1)}</div>
      <div class="board enemy">${E.board.map(m => minionHTML(s, m, 1)).join('')}</div>
      <div class="midline"><span class="${myTurn ? '' : 'enemy'}">${myTurn ? 'YOUR TURN' : s.over ? 'BATTLE OVER' : 'ENEMY TURN'}</span></div>
      <div class="board player">${P.board.map(m => minionHTML(s, m, 0)).join('')}</div>
      <div class="hero-row player">${heroRowHTML(s, 0)}</div>
      <div class="hand" style="--overlap:${overlap}px">${hand}</div>
      <div class="inspect-hint">${UI.peek != null ? 'Tap the card again to play it' : TOUCH.on ? 'Press and hold any card to inspect' : 'Right-click any card to inspect'}</div>
    </main>
    <aside class="b-right">
      <div class="side-stat enemy"><div class="ss-h">Enemy intel</div><div><span class="lbl">Energy</span><b>${E.mana}/${E.maxMana}</b></div><div class="e-crystals">${crystals}</div><div><span class="lbl">Hand</span><b>${E.hand.length}</b></div><div><span class="lbl">Deck</span><b>${E.deck.length}</b></div></div>
      <button id="endturn" class="${endCls}" ${myTurn && !UI.busy ? '' : 'disabled'}>${myTurn ? 'END TURN' : 'ENEMY TURN'}<small>${myTurn ? (anyMoves(s) ? (TOUCH.on ? 'Moves left' : 'Hotkey E') : 'No moves left') : 'Stand by'}</small></button>
      <div class="mana"><div class="mana-l">Energy</div>${manaHTML(P)}</div>
      <div class="side-stat"><div class="deck-stack"><span class="ds-cards"><i></i><i></i><i></i></span><div><span class="lbl">Your deck</span><br><b>${P.deck.length}</b></div></div>${P.fatigue ? `<div><span class="lbl">Fatigue</span><b>${P.fatigue}</b></div>` : ''}</div>
      <button id="bmenu" class="btn ghost small">Menu</button>
    </aside>
    <svg id="arrow" class="arrow" width="${UI.W || 1280}" height="${UI.H || 760}" viewBox="0 0 ${UI.W || 1280} ${UI.H || 760}"><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor"/></marker></defs><line id="arrow-line" x1="0" y1="0" x2="0" y2="0" marker-end="url(#ah)"/></svg>`);
  PortraitLoop.mount($('#stage-ui'));   // keeps an animated boss portrait playing through redraws
  if (Tip.target && !Tip.target.isConnected) Tip.hide();
  updateArrow();
}

// Music follows the fight: bigger boards and lower health push the intensity.
function battleIntensity(s) {
  if (!Music.setIntensity) return;
  const P = s.players[0], E = s.players[1];
  const units = P.board.length + E.board.length;
  const low = Math.min(P.hp / P.maxHp, E.hp / E.maxHp);
  const x = Math.min(1, 0.15 + units * 0.07 + Math.min(10, s.turnNo / 2) * 0.03 + (1 - low) * 0.45);
  Music.setIntensity(x);
  const danger = Math.min(P.hp, E.hp) <= 8 && !s.over;
  if (danger && !UI.lethalCue && Music.stinger) { UI.lethalCue = true; Music.stinger('lethal'); }
}

// ---------------------------------------------------------------- stage coords
function stagePoint(clientX, clientY) {
  const r = $('#stage').getBoundingClientRect();
  return { x: (clientX - r.left) / UI.scale, y: (clientY - r.top) / UI.scale };
}
function elCenter(elm) { const r = elm.getBoundingClientRect(); return stagePoint(r.left + r.width / 2, r.top + r.height / 2); }
function uidEl(uid) { return $(`#stage [data-uid="${uid}"]`); }

function updateArrow() {
  const line = $('#arrow-line'); if (!line) return;
  const svg = $('#arrow');
  if (!UI.mode) { svg.classList.remove('on'); return; }
  let src = null;
  if (UI.mode.k === 'atk') src = uidEl(UI.mode.uid);
  else if (UI.mode.k === 'play') src = $(`#stage [data-hand="${UI.mode.hi}"]`);
  else if (UI.mode.k === 'pow') src = $('#stage [data-power]');
  if (!src) { svg.classList.remove('on'); return; }
  const a = elCenter(src), b = stagePoint(UI.mouse.x, UI.mouse.y);
  line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
  svg.classList.add('on');
}

// ---------------------------------------------------------------- input
function setupBattleInput() {
  const st = $('#stage');
  st.addEventListener('mousemove', e => { UI.mouse = { x: e.clientX, y: e.clientY }; if (UI.mode) updateArrow(); });
  st.addEventListener('contextmenu', e => { if (UI.mode) { e.preventDefault(); cancelMode(); } });
  st.addEventListener('click', e => {
    SFX.init();
    UI.mouse = { x: e.clientX, y: e.clientY };
    const s = UI.s; if (!s) return;
    if (e.target.closest('#bmenu')) { battleMenu(); return; }
    if (e.target.closest('[data-adv]')) { UI.advOpen = !UI.advOpen; renderBattle(); return; }
    if (UI.advOpen && e.target.closest('.advisor')) { UI.advOpen = false; renderBattle(); return; }
    const peekHit = e.target.closest('[data-hand]');
    if (UI.peek != null && (!peekHit || +peekHit.dataset.hand !== UI.peek)) { UI.peek = null; renderBattle(); if (!peekHit) return; }
    // touch has no hover: tapping enemy info opens it (any turn, but not while picking a target)
    if (TOUCH.on && !UI.mode && !s.choice) {
      if (e.target.closest('.hero-row.enemy') && !e.target.closest('.weapon')) { openCommander({ pi: 1 }); return; }
      const eu = e.target.closest('.board.enemy [data-uid]');
      if (eu) { const c = getChar(s, parseUid(eu.dataset.uid)); if (c) { openInspect(c.id, { uid: c.uid }); return; } }
    }
    if (UI.busy || s.over || s.active !== 0 || s.choice) return;
    if (e.target.closest('#endturn')) { cancelMode(); requestEndTurn(); return; }
    const handEl = e.target.closest('[data-hand]');
    const uidElm = e.target.closest('[data-uid]');
    const powEl = e.target.closest('[data-power]');
    if (UI.mode) {
      if (uidElm) {
        const uid = parseUid(uidElm.dataset.uid);
        if (UI.mode.targets.includes(uid)) { const m = UI.mode; UI.mode = null; execMode(m, uid); return; }
      }
      const wasHand = UI.mode.k === 'play' && handEl && +handEl.dataset.hand === UI.mode.hi;
      cancelMode();
      if (wasHand) return;
    }
    if (handEl) return clickHand(+handEl.dataset.hand);
    if (powEl) return clickPower();
    if (uidElm) return clickChar(parseUid(uidElm.dataset.uid));
  });
  document.addEventListener('keydown', e => {
    if (App.screen !== 'battle') return;
    if (e.key === 'Escape') cancelMode();
    if ((e.key === 'e' || e.key === 'E') && !UI.busy && UI.s && UI.s.active === 0 && !UI.s.over && $('#modal').hidden) { cancelMode(); requestEndTurn(); }
  });
}
function parseUid(v) { return /^H\d$/.test(v) ? v : +v; }
function cancelMode() { if (UI.mode) { UI.mode = null; renderBattle(); } }

function clickHand(i) {
  const s = UI.s;
  if (TOUCH.on && UI.peek !== i) { UI.peek = i; SFX.click(); renderBattle(); return; }   // first tap: lift and read
  UI.peek = null;
  if (!canPlay(s, 0, i)) { toast(whyCantPlay(s, 0, i)); return; }
  const c = s.players[0].hand[i];
  const ts = cardTargets(s, 0, c);
  if (ts.length) { UI.mode = { k: 'play', hi: i, targets: ts }; SFX.click(); renderBattle(); return; }
  act(() => playCard(s, 0, i, null), c.id);
}
function clickPower() {
  const s = UI.s;
  if (!canPower(s, 0)) { const p = s.players[0]; toast(!p.power ? 'No commander power.' : p.power.used ? 'Power already used this turn.' : 'Not enough energy.'); return; }
  const ts = powerTargets(s, 0);
  if (ts.length) { UI.mode = { k: 'pow', targets: ts }; renderBattle(); return; }
  act(() => usePower(s, 0, null));
}
function clickChar(uid) {
  const s = UI.s; const c = getChar(s, uid);
  if (!c || ownerOf(c) !== 0) return;
  if (!canAttack(s, 0, uid)) {
    if (isHero(c)) { if (atkOf(s, c) <= 0) toast('Your commander needs Gear to attack.'); else toast('Your commander already attacked.'); }
    else if (c.frozen) toast('Frozen: it can\'t attack this turn.');
    else if (atkOf(s, c) <= 0) toast('This unit has no Attack.');
    else if (c.sick && !c.kw.warp && !c.kw.blitz) toast('Units need a turn to get ready before attacking.');
    else toast('This unit has already attacked.');
    return;
  }
  UI.mode = { k: 'atk', uid, targets: attackTargets(s, uid) }; SFX.click(); renderBattle();
}
function execMode(m, tgt) {
  const s = UI.s;
  if (m.k === 'play') act(() => playCard(s, 0, m.hi, tgt), s.players[0].hand[m.hi].id);
  else if (m.k === 'pow') act(() => usePower(s, 0, tgt));
  else act(() => attack(s, m.uid, tgt));
}

async function act(fn, playedId) {
  UI.busy = true;
  if (playedId) { const d = D(playedId); d.type === 'spell' ? SFX.spell() : SFX.play(); }
  fn();
  await playEvents();
  UI.busy = false;
  renderBattle();
  await afterAction();
}

async function afterAction() {
  const s = UI.s;
  if (s.choice) { showScan(); return; }
  if (s.over) { await sleep(T(500)); endBattle(); return; }
  if (Settings.get('autoEnd') && s.active === 0 && !anyMoves(s) && !UI.busy) { await sleep(T(600)); if (UI.s === s && !UI.busy && s.active === 0 && !anyMoves(s) && $('#modal').hidden) playerEndTurn(); }
}

function showScan() {
  const s = UI.s, ch = s.choice;
  const m = modal(`<div class="m-eyebrow">Scan</div><h2>Choose a card</h2><div class="pick-row">${ch.opts.map((id, i) => `<button class="pick" data-i="${i}">${cardHTML(id)}</button>`).join('')}</div>`, 'wide');
  m.onclick = e => { const b = e.target.closest('.pick'); if (!b) return; resolveChoice(s, +b.dataset.i); closeModal(); s.events = []; renderBattle(); afterAction(); };
}

function requestEndTurn() {
  if (Settings.get('confirmEnd') && anyMoves(UI.s)) {
    const m = modal(`<h2>End turn?</h2><p>You still have Energy or attacks available.</p><div class="m-actions"><button class="btn ghost" data-a="no">Keep playing</button><button class="btn primary" data-a="yes">End turn</button></div>`);
    m.onclick = e => { const a = e.target.dataset.a; if (!a) return; closeModal(); if (a === 'yes') playerEndTurn(); };
    return;
  }
  playerEndTurn();
}

async function playerEndTurn() {
  const s = UI.s;
  UI.busy = true; renderBattle();
  endTurn(s);
  await playEvents();
  if (s.over) { UI.busy = false; renderBattle(); return afterAction(); }
  renderBattle();
  await banner('ENEMY TURN', 'enemy');
  enemyTurn();
}

async function enemyTurn() {
  const s = UI.s; UI.busy = true; renderBattle();
  await sleep(T(450));
  const lvl = s.players[1].ai;
  for (let n = 0; n < 45 && !s.over && UI.s === s; n++) {
    const a = aiChoose(s, 1, lvl);
    if (!a) break;
    applyAct(s, 1, a);
    await playEvents(); renderBattle();
    await sleep(T(320));
  }
  if (UI.s !== s) return;
  if (!s.over) { endTurn(s); await playEvents(); }
  UI.busy = false;
  if (s.over) { renderBattle(); return afterAction(); }
  UI.playerTurns++;
  renderBattle();
  await banner('YOUR TURN');
  await playEvents(); renderBattle();
  if (s.over) afterAction();
}

// ---------------------------------------------------------------- animation
function logLine(html) { UI.log.push(html); if (UI.log.length > 60) UI.log.shift(); }
const nm = uid => `<b>${esc(UI.names[uid] || '?')}</b>`;
const who = pi => pi === 0 ? 'You' : esc(UI.s.players[1].name);

function floater(uid, text, cls) {
  const e = uidEl(uid); const fx = $('#fx'); if (!e || !fx) return false;
  const c = elCenter(e);
  const f = document.createElement('div'); f.className = 'floater ' + cls; f.textContent = text;
  f.style.left = c.x + 'px'; f.style.top = c.y + 'px';
  fx.appendChild(f); setTimeout(() => f.remove(), T(1100));
  if (cls === 'dmg') { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  return true;
}

async function lunge(from, to) {
  const a = uidEl(from), b = uidEl(to); if (!a || !b) return;
  const pa = elCenter(a), pb = elCenter(b);
  const dx = (pb.x - pa.x) * 0.8, dy = (pb.y - pa.y) * 0.8;
  a.style.zIndex = 30;
  try {
    const anim = a.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.3}px,${dy * 0.3}px) scale(1.12)`, offset: 0.35 }, { transform: `translate(${dx}px,${dy}px) scale(1.05)`, offset: 0.6 }, { transform: 'translate(0,0) scale(1)' }], { duration: T(460), easing: 'ease-in-out' });
    await Promise.race([anim.finished, sleep(T(460) + 150)]);
  } catch (e) { /* animation interrupted */ }
  a.style.zIndex = '';
}

async function showCardFlash(id, label, cls) {
  const fx = $('#fx'); if (!fx) return;
  const w = document.createElement('div'); w.className = 'flash ' + (cls || '');
  w.innerHTML = `<div class="flash-l">${esc(label)}</div>${cardHTML(id, { cls: 'big' })}`;
  fx.appendChild(w);
  await sleep(T(1150));
  w.classList.add('out'); await sleep(T(250)); w.remove();
}

async function banner(text, cls, sub) {
  const fx = $('#fx'); if (!fx) return;
  if (text === 'YOUR TURN') SFX.turn(); else if (text === 'ENEMY TURN') SFX.enemyTurn();
  const b = document.createElement('div'); b.className = 'banner ' + (cls || '');
  b.innerHTML = `<div>${esc(text)}</div>${sub ? `<p>${esc(sub)}</p>` : ''}`;
  fx.appendChild(b);
  await sleep(T(sub ? 2400 : 850));
  b.classList.add('out'); await sleep(T(250)); b.remove();
}

const FX_COLORS = { dmg: '#ff7a45', heal: '#6dffa0', shield: '#ffd166', ice: '#9fe8ff', emp: '#c08cff', trap: '#c08cff' };
function centerOf(uid) { const e = uidEl(uid); return e ? elCenter(e) : null; }
function factionColor(id) { const f = FACTIONS[D(id).faction] || FACTIONS.neutral; return `hsl(${f.hue},90%,65%)`; }

function countEvent(e) {
  if ((e.t === 'summon' || e.t === 'death') && e.id && !UI.names[e.uid]) UI.names[e.uid] = D(e.id).name;
  const t = UI.tally || (UI.tally = {}); const inc = (k, n) => { t[k] = (t[k] || 0) + (n == null ? 1 : n); };
  if (e.t === 'play' || e.t === 'attack' || e.t === 'power') Playtest.act(e.t + ':' + (e.pi != null ? e.pi : '') + ':' + (e.id || e.from || ''));
  if (e.t === 'play' && e.pi === 0) { Playtest.played(e.id); const d = D(e.id); if (d.type === 'unit') inc('units'); if (d.type === 'spell' && !d.token) inc('spells'); inc('f_' + d.faction); }
  else if (e.t === 'death' && e.pi === 1) inc('kills');
  else if (e.t === 'dmg' && e.uid === 'H1') inc('face', e.n);
  else if (e.t === 'power' && e.pi === 0) inc('powers');
  else if (e.t === 'attack' && e.from === 'H0') inc('heroAttacks');
}

async function playEvents() {
  const s = UI.s; const evs = s.events; s.events = [];
  let pending = false;
  const flush = async () => { if (pending) { await sleep(T(420)); pending = false; } };
  for (const e of evs) {
    countEvent(e);
    switch (e.t) {
      case 'play': {
        const d = D(e.id);
        if (e.pi === 1 && d.type === 'trap') logLine(`${who(e.pi)} armed a hidden Trap`);
        else logLine(`${who(e.pi)} played <b>${esc(d.name)}</b>${e.tgt != null && UI.names[e.tgt] ? ` on ${nm(e.tgt)}` : ''}`);
        if (e.pi === 1) { await flush(); d.type === 'spell' ? SFX.spell() : SFX.play(); await showCardFlash(e.id, d.type === 'trap' ? 'Enemy arms a Trap' : e.id === 'energy_cell' ? 'Enemy spends its Energy Cell: +1 Energy' : 'Enemy plays',d.type === 'trap' ? 'trapflash hidden-card' : ''); }
        if (d.type === 'spell' || (d.type === 'unit' && e.tgt != null)) {
          const from = centerOf('H' + e.pi), to = e.tgt != null ? centerOf(e.tgt) : null;
          if (from && to) { SFX.zap(); await FX.bolt(from, to, factionColor(e.id), T(340)); }
          else if (d.type === 'spell') { const b = $(`#stage .board.${e.pi === 0 ? 'enemy' : 'player'}`); if (b) { const c = elCenter(b); FX.ring(c.x, c.y, factionColor(e.id), 320); FX.spark(c.x, c.y, { color: factionColor(e.id), count: 30, speed: 7, life: 40 }); } }
        }
        break;
      }
      case 'power': {
        const h = HEROPOWERS[e.id];
        logLine(`${who(e.pi)} used <b>${esc(h.name)}</b>`);
        if (e.pi === 1) { await flush(); const pe = $('#stage .hero-row.enemy .power'); if (pe) { pe.classList.add('pulse'); } toast(`${esc(UI.s.players[1].name)}: ${esc(h.name)}`, 1400); await sleep(T(400)); }
        if (e.tgt != null) { const from = centerOf('H' + e.pi), to = centerOf(e.tgt); if (from && to) { SFX.zap(); await FX.bolt(from, to, e.pi === 0 ? '#44c6ff' : '#ff6fa8', T(300)); } }
        break;
      }
      case 'attack': {
        await flush(); logLine(`${nm(e.from)} attacked ${nm(e.to)}`);
        await lunge(e.from, e.to);
        const c = centerOf(e.to); if (c) FX.impact(c.x, c.y, '#ffb347', 3);
        SFX.hit();
        break;
      }
      case 'dmg': {
        const hit = e.n - (e.soak || 0), txt = e.soak ? (hit ? `-${hit} · ${e.soak} blocked` : `${e.soak} blocked`) : '-' + e.n;
        if (floater(e.uid, txt, hit ? 'dmg' : 'armor')) pending = true;
        const c = centerOf(e.uid); if (c) FX.spark(c.x, c.y, { color: FX_COLORS.dmg, count: 6 + e.n * 2, speed: 3 + e.n * 0.4, life: 26 });
        if (typeof e.uid === 'string' && e.n >= 3 || e.n >= 6) { shakeStage(e.n); if (e.n >= 5) SFX.bigHit(); }
        break;
      }
      case 'heal': { if (floater(e.uid, '+' + e.n, 'heal')) { pending = true; SFX.heal(); } const c = centerOf(e.uid); if (c) FX.spark(c.x, c.y + 20, { color: FX_COLORS.heal, count: 14, speed: 1.2, lift: -1.6, gravity: -0.02, life: 40 }); break; }
      case 'armor': { if (floater(e.uid, '+' + e.n + ' armor', 'armor')) pending = true; const c = centerOf(e.uid); if (c) FX.ring(c.x, c.y, '#e7edf7', 60); break; }
      case 'shield': { if (floater(e.uid, 'BLOCKED', 'shield')) { pending = true; SFX.shield(); } const c = centerOf(e.uid); if (c) { FX.ring(c.x, c.y, FX_COLORS.shield, 70); FX.spark(c.x, c.y, { color: FX_COLORS.shield, count: 16, speed: 4, life: 22 }); } break; }
      case 'freeze': { if (floater(e.uid, 'FROZEN', 'ice')) pending = true; SFX.freeze(); const c = centerOf(e.uid); if (c) FX.spark(c.x, c.y, { color: FX_COLORS.ice, count: 14, speed: 3, life: 34, kind: 'shard', size: 1.6, gravity: 0.1 }); break; }
      case 'silence': { if (floater(e.uid, 'EMP', 'emp')) pending = true; const c = centerOf(e.uid); if (c) FX.ring(c.x, c.y, FX_COLORS.emp, 90); SFX.zap(); break; }
      case 'buff': { const el2 = uidEl(e.uid); if (el2) { el2.classList.add('buffed'); pending = true; const c = elCenter(el2); FX.spark(c.x, c.y + 30, { color: '#7dffa8', count: 8, speed: 1, lift: -1.4, gravity: -0.01, life: 30 }); } break; }
      case 'death': {
        const el2 = uidEl(e.uid);
        if (el2) { el2.classList.add('dying'); pending = true; const c = elCenter(el2); const hue = getComputedStyle(el2).getPropertyValue('--h') || 30; FX.spark(c.x, c.y, { color: `hsl(${hue},90%,62%)`, count: 26, speed: 5, life: 40, size: 3 }); FX.spark(c.x, c.y, { color: '#ffd9a0', count: 10, speed: 2.5, life: 24 }); FX.ring(c.x, c.y, `hsl(${hue},90%,70%)`, 70); }
        logLine(`${nm(e.uid)} was destroyed`); SFX.death(); break;
      }
      case 'trap': { await flush(); SFX.trap(); const d = D(e.id); logLine(`${e.pi === 0 ? 'Your' : 'Enemy'} Trap fired: <b>${esc(d.name)}</b>`); const c = centerOf('H' + e.pi); if (c) FX.ring(c.x, c.y, FX_COLORS.trap, 160); await showCardFlash(e.id, e.pi === 0 ? 'Your Trap fires!' : 'Enemy Trap fires!', 'trapflash'); break; }
      case 'countered': toast('The Protocol was cancelled!'); logLine('Protocol cancelled by a Trap'); break;
      case 'burn': { const d = D(e.id); toast(`${e.pi === 0 ? 'Your hand is full.' : 'Enemy hand full.'} ${esc(d.name)} was destroyed.`); logLine(`${who(e.pi)} overdrew and lost <b>${esc(d.name)}</b>`); break; }
      case 'fatigue': logLine(`${who(e.pi)} ${e.pi === 0 ? 'are' : 'is'} out of cards: ${e.n} fatigue damage`); if (e.pi === 0) toast(`Deck empty! You take ${e.n} fatigue damage.`); break;
      case 'steal': logLine(`${nm(e.uid)} changed sides`); break;
      case 'phase': {
        await flush(); renderBattle(); SFX.phase(); if (Music.stinger) Music.stinger('phase'); shakeStage(10);
        const c = centerOf('H' + e.pi); if (c) { FX.ring(c.x, c.y, '#ff7ad1', 600); FX.spark(c.x, c.y, { color: '#ff7ad1', count: 80, speed: 9, life: 60, size: 3 }); }
        await banner(e.name.toUpperCase(), 'phase', e.text); logLine(`<b>${esc(e.name)}</b> rises!`); break;
      }
      case 'equip': logLine(`${who(e.pi)} equipped <b>${esc(D(e.id).name)}</b>`); break;
    }
  }
  await flush();
}

// ---------------------------------------------------------------- battle menu / end
function battleMenu() {
  const m = modal(`<div class="m-eyebrow">${esc(UI.enc.name)}</div><h2>Paused</h2><div class="menu-list">
    <button class="btn primary" data-a="resume">Resume</button>
    <button class="btn" data-a="settings">Settings</button>
    <button class="btn" data-a="codex">Archive & rules</button>
    <button class="btn danger" data-a="concede">Retreat (counts as a loss)</button></div>`);
  m.onclick = e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'resume') closeModal();
    if (a === 'codex') openArchive('manual', battleMenu);
    if (a === 'settings') showSettings(battleMenu);
    if (a === 'concede') { closeModal(); UI.retreat = true; UI.s.over = true; UI.s.winner = 1; endBattle(); }
  };
}

function contractLines(done) {
  return done.map(c => `<div class="reward-chip contract"><span class="rc-icon">${ico('contract')}</span><span><b>Contract complete:</b> ${esc(CONTRACTS[c.id].text)}</span><b class="rc-val">+${CONTRACTS[c.id].reward} Credits</b></div>`).join('');
}

// The defeat screen names what did the damage, so a loss says what to prepare for.
function hurtHTML(s) {
  const top = Object.entries(s.hurt || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return '';
  return `<div class="hurt"><div class="m-eyebrow">What hurt you most</div>${top.map(([k, n]) => `<div class="hurt-row"><span>${esc(k)}</span><b>${n} damage</b></div>`).join('')}</div>`;
}

function endBattle() {
  const s = UI.s, enc = UI.enc, save = App.save;
  if (UI.ended === s) return; UI.ended = s;
  Tip.hide();
  const won = s.winner === 0;
  Playtest.end(s, won ? 'win' : UI.retreat ? 'retreat' : 'loss'); UI.retreat = false;
  const tally = Object.assign({}, s.tally || {});
  if (enc.challenge) return endChallengeBattle(s, enc, won, tally);
  // consecutive losses on the same mission, for the easier-retry offer
  save.streak = won ? null : { id: enc.id, n: save.streak && save.streak.id === enc.id ? save.streak.n + 1 : 1 };
  if (!won) {
    save.stats.losses++;
    const offerEasy = save.streak.n >= (enc.boss ? 1 : 2) && save.diff !== 'cadet' && !UI.easyRun;
    const done = applyContracts(save, tally);
    achieve(save, { won: false, enc, s, easy: UI.easyRun });
    persist(); SFX.lose(); if (Music.stinger) Music.stinger('defeat');
    const m = modal(`${paintedBanner('screen-defeat')}<div class="m-eyebrow danger">Defeat</div><h2>${esc(enc.name)}</h2>
      <p>Your forces pull back to regroup. Adjust your deck in the Hangar and try again.</p>
      ${hurtHTML(s)}
      ${done.length ? `<div class="rewards">${contractLines(done)}</div>` : ''}
      ${(enc.tips || []).length || s.hurt ? `<div class="advisor inline"><div class="adv-h">Advisor</div><div class="adv-t">${defeatAdvice(s, enc, save)}</div></div>` : ''}
      ${offerEasy ? `<p class="muted">${save.streak.n > 1 ? `That's ${save.streak.n} losses in a row here.` : 'Bosses are tough.'} <b>Retry on Cadet</b> runs this one battle with weaker enemies and doesn't change your difficulty setting.</p>` : save.diff !== 'cadet' && save.stats.losses >= 3 ? '<p class="muted">Struggling? You can switch to Cadet difficulty in Settings at any time.</p>' : ''}
      ${rateHTML()}
      <div class="m-actions"><button class="btn" data-a="map">Back to Star Map</button><button class="btn" data-a="hangar">Hangar</button>${offerEasy ? '<button class="btn" data-a="easy">Retry on Cadet</button>' : ''}<button class="btn primary" data-a="retry">Retry</button></div>`);
    wireRate(m);
    m.onclick = e => { const a = e.target.dataset.a; if (!a) return; UI.s = null; if (a === 'easy') { UI.easyRetry = enc.id; startBattle(enc); } else if (a === 'retry') startBattle(enc); else if (a === 'hangar') { closeModal(); openHangar(() => openBriefing(enc)); } else { closeModal(); openMap(); } };
    return;
  }
  SFX.win(); if (Music.stinger) Music.stinger('victory');
  const firstClear = !save.cleared[enc.id];
  const prevSector = highestSector(save);
  save.cleared[enc.id] = true; save.stats.wins++;
  tally.wins = 1; if (enc.elite || enc.boss) tally.bigWins = 1;
  const done = applyContracts(save, tally);
  const rw = battleRewards(save, enc, firstClear);
  save.credits += rw.credits;
  if (rw.packs) save.packs[rw.packTier] = (save.packs[rw.packTier] || 0) + rw.packs;
  const graduated = enc.graduation && firstClear && !economyOpen(save);
  if (graduated) { ['packs', 'crafting', 'anchorage'].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); }); refillContracts(save); }
  if (rw.alloy) ensureStation(save).alloy += rw.alloy;
  if (rw.scrap) save.scrap += rw.scrap;
  const legendScrap = rw.legendary ? gainCard(save, rw.legendary) : 0;
  const granted = [], crate = firstClear ? crateChoice(enc, save) : null;
  if (firstClear && enc.grant && !crate) Object.entries(enc.grant).forEach(([id, n]) => { grantCard(save, id, n); for (let k = 0; k < n; k++) granted.push(id); });
  const loaded = firstClear && enc.sector === 0 && !enc.elite && granted.length ? academyLoad(save, [...new Set(granted)]) : [];
  const unlocked = [];
  if (firstClear && enc.unlockPowers) enc.unlockPowers.forEach(p => { if (!save.powers.includes(p)) { save.powers.push(p); unlocked.push(p); } });
  if (!save.power && save.powers.length) save.power = save.powers[0];
  const newSector = highestSector(save) > prevSector;
  if (newSector) refillContracts(save);
  persist();
  UI.s = null;

  const set = PACK_SETS[rw.packTier - 1];
  const chips = rw.credits ? [`<div class="reward-chip"><span class="rc-icon">${ico('credits')}</span><span>${graduated ? 'Graduation bonus' : firstClear ? 'Mission reward' : 'Replay reward'}</span><b class="rc-val">+${rw.credits} Credits</b></div>`] : [];
  if (rw.packs) chips.push(`<div class="reward-chip rc-pack"><span class="rc-icon">${ico('pack')}</span><span>${esc(set.name)}${rw.packs > 1 ? ' ×' + rw.packs : ''}</span><b class="rc-val">+${rw.packs} pack${rw.packs > 1 ? 's' : ''}</b></div>`);
  if (rw.alloy) chips.push(`<div class="reward-chip rc-alloy"><span class="rc-icon">${ico('alloy')}</span><span>Salvaged Alloy for Anchorage</span><b class="rc-val">+${rw.alloy} Alloy</b></div>`);
  if (rw.scrap) chips.push(`<div class="reward-chip"><span class="rc-icon">${ico('scrap')}</span><span>Salvaged from the Singularity</span><b class="rc-val">+${rw.scrap} Scrap</b></div>`);
  if (firstClear && enc.boss && bossesCleared(save) <= 5) chips.push(`<div class="reward-chip rc-up"><span class="rc-icon">${ico('shield')}</span><span>Hull reinforced: your commander now has ${playerMaxHp(save)} Health</span><b class="rc-val">+${HULL_PER_BOSS} Health</b></div>`);
  const bits = [];
  if (rw.legendary) bits.push(`<div class="legend-reveal"><div class="lr-card">${cardHTML(rw.legendary, { cls: 'big' })}</div><div><div class="m-eyebrow">Legendary acquired</div><h3 class="lr-name">${esc(D(rw.legendary).name)} joins your fleet</h3><p class="muted">${legendScrap ? `You already owned this card, so it became ${legendScrap} Scrap.` : 'Add it to your deck in the Hangar.'}</p></div></div>`);
  if (granted.length) {
    const c = {}; granted.forEach(id => c[id] = (c[id] || 0) + 1);
    bits.push(`<div class="got"><b>New cards:</b> ${Object.entries(c).map(([id, n]) => `<span class="chip" data-card="${id}">${esc(D(id).name)}${n > 1 ? ' ×' + n : ''}</span>`).join(' ')}<div class="muted">${loaded.length ? `HALCYON has loaded them into your deck for the next lesson${loaded.removed.length ? `, swapping out ${loaded.removed.map(id => esc(D(id).name)).join(', ')}` : ''}. Change it any time in the Hangar.` : "They're in your collection. Add them to a deck in the Hangar."}</div></div>`);
  }
  if (crate) bits.push(`<div class="crate" id="crate"><div class="m-eyebrow">Supply crate</div><h3>Choose one card to keep</h3>
    <div class="crate-row">${crate.map(id => `<button class="crate-card" data-crate="${id}" aria-label="Keep ${esc(D(id).name)}">${cardHTML(id)}<span class="crate-own">${crateCopies(id) > 1 ? '×' + crateCopies(id) + ' · ' : ''}${save.coll[id] ? 'You have ' + save.coll[id] : 'New'}</span></button>`).join('')}</div>
    <p class="muted small">${TOUCH.on ? 'Press and hold' : 'Right-click'} a card to read it first. The other two go back to the quartermaster.</p></div>`);
  unlocked.forEach(p => bits.push(`<div class="got power-got"><b>New commander power:</b> ${powerIco(p)} ${esc(HEROPOWERS[p].name)}: ${esc(HEROPOWERS[p].text)} <span class="muted">Equip it in the Hangar.</span></div>`));
  if (newSector && DECK_SIZES[highestSector(save)] > DECK_SIZES[prevSector]) bits.push(`<div class="got upgrade-got"><span class="up-tag">Upgrade</span><b>Deck size ${DECK_SIZES[prevSector]} → ${deckSizeFor(save)} cards.</b> <span class="muted">Add ${Math.max(0, deckSizeFor(save) - save.deck.length)} cards in the Hangar before your next battle. A new pack set is available at the Supply Depot.</span></div>`);
  if (graduated) bits.push('<div class="got"><b>Training complete. Three things are now open:</b><ul class="grad-list"><li><b>Supply Depot:</b> spend Credits on packs of new cards.</li><li><b>Crafting:</b> spare copies become Scrap; spend Scrap in the Hangar on the cards you want.</li><li><b>Anchorage:</b> your forward base. Spend Alloy there on upgrades.</li></ul><span class="muted">Each is explained in the Archive. Battles and contracts earn Credits and Alloy from now on.</span></div>');
  const earned = achieve(save, { won: true, enc, s, easy: UI.easyRun }); persist();
  if (earned.length) bits.push(`<div class="got"><b>Service record:</b> ${earned.map(a => `<span class="chip">${esc(a.name)}</span>`).join(' ')} <span class="muted">+${earned.reduce((n, a) => n + a.reward, 0)} Credits</span></div>`);
  // the story cutscene plays straight after the win, then the debrief
  const cine = firstClear && CINE_AFTER[enc.id];
  const show = () => {
  const unopened = unopenedPacks(save);
  const m = modal(`${paintedBanner('screen-victory')}<div class="m-eyebrow ok">Victory</div><h2>${esc(enc.name)}</h2>
    ${enc.victory && firstClear ? `<p class="story">${esc(enc.victory)}</p>` : ''}
    ${chips.length || done.length ? `<div class="rewards">${chips.join('')}${contractLines(done)}</div>` : ''}
    ${economyOpen(save) ? `<div class="wallet-line"><span>${ico('credits')} <b>${save.credits}</b> Credits</span><span>${ico('scrap')} <b>${save.scrap}</b> Scrap</span><span>${ico('alloy')} <b>${ensureStation(save).alloy}</b> Alloy</span>${unopened ? `<span>${ico('pack')} <b>${unopened}</b> unopened pack${unopened > 1 ? 's' : ''}</span>` : ''}</div>` : ''}
    ${bits.join('')}
    ${rateHTML()}
    <div class="m-actions">${unopened ? `<button class="btn" data-a="open">Open packs (${unopened})</button>` : ''}<button class="btn" data-a="hangar">Hangar</button>${upgradesAvailable(save) ? `<button class="btn" data-a="station">Anchorage (${upgradesAvailable(save)} ready)</button>` : ''}<button class="btn primary" data-a="go">${enc.final ? 'Continue' : 'Star Map'}</button></div>`, 'wide');
  wireRate(m);
  // the crate must be opened before leaving
  let picked = !crate;
  const acts = m.querySelectorAll('.m-actions .btn');
  if (!picked) acts.forEach(b => { b.disabled = true; b.title = 'Choose a card from the supply crate first'; });
  m.addEventListener('click', e => {
    const c = e.target.closest('[data-crate]'); if (!c || picked) return;
    picked = true; const id = c.dataset.crate;
    const copies = crateCopies(id); grantCard(save, id, copies); persist(); SFX.heal();
    m.querySelectorAll('.crate-card').forEach(b => { b.disabled = true; b.classList.toggle('kept', b === c); b.classList.toggle('gone', b !== c); });
    m.querySelector('.crate h3').textContent = `${D(id).name}${copies > 1 ? ' ×' + copies : ''} added to your collection`;
    acts.forEach(b => { b.disabled = false; b.title = ''; });
    burstAt(c.getBoundingClientRect(), '#7dffa8', 24);
  });
  m.onclick = e => {
    const a = e.target.dataset.a; if (!a || !picked) return; closeModal();
    afterVictory(a, enc);
  };
  };
  if (cine) Cinema.play(cine, show); else show();
}

// Where the victory screen's buttons lead (after any cutscene).
function afterVictory(a, enc) {
  if (enc.final) return showEnding();
  if (a === 'open') openShop(openMap, true);
  else if (a === 'hangar') openHangar(openMap);
  else if (a === 'station') openStation(openMap);
  else openMap();
}

function showEnding() {
  const save = App.save; save.finished = true; persist();
  const mins = Math.round((save.stats.playMs || 0) / 60000);
  showScreen('title');
  $('#title').innerHTML = `${extraArt('screen-ending') ? `<div class="end-bg" style='background-image:${extraArt('screen-ending')}'></div>` : ''}<div class="title-wrap ending">
    <div class="eyebrow">Campaign complete</div>
    <h1 class="logo">STARFALL<span>PROTOCOL</span></h1>
    <p class="story big">The Choir is destroyed and the Lamps are safe. For the first time since the Starfall, nothing at the galactic core is calling to us.</p>
    <div class="stats-row"><div><b>${save.stats.wins}</b><span>Victories</span></div><div><b>${save.stats.losses}</b><span>Defeats</span></div><div><b>${collectionCount(save)}</b><span>Cards collected</span></div><div><b>${mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm'}</b><span>Time in command</span></div></div>
    <p class="muted">Thank you for playing, ${esc(save.name)}. You can replay any battle from the Star Map to complete your collection, or start a new campaign on Admiral difficulty for a tougher fight.</p>
    <div class="title-btns"><button class="btn primary" id="end-map">Return to Star Map</button></div></div>`;
  $('#end-map').onclick = openMap;
}

// ============================================================================
// STAR MAP
// ============================================================================
const App = { save: null, screen: 'title', sessionStart: Date.now() };

const MapUI = { sector: null };

// Node positions for a sector's route, in percent of the chart box.
function routeLayout(si) {
  const encs = ENCOUNTERS.filter(e => e.sector === si), main = encs.filter(e => !e.elite), elites = encs.filter(e => e.elite);
  const r = seeded(hashStr('route' + si)), pos = {};
  main.forEach((e, k) => { const t = k / Math.max(1, main.length - 1); pos[e.id] = [9 + t * 80, 54 + Math.sin(t * Math.PI * 1.7 + si * 1.3) * 20 + (r() - 0.5) * 8]; });
  elites.forEach(e => { const a = pos[e.after]; pos[e.id] = [a[0] + 5, a[1] > 52 ? a[1] - 30 : a[1] + 28]; });
  return { encs, main, elites, pos };
}

function openMap() {
  closeModal();
  const save = App.save;
  const hs = highestSector(save), next = nextEncounter(save);
  if (MapUI.sector == null || MapUI.sector > hs) MapUI.sector = next ? next.sector : hs;
  showScreen('map');
  renderMap();
  // first visit to a newly unlocked sector
  if (!save.seenSector[hs]) {
    save.seenSector[hs] = true; persist();
    const sec = SECTORS[hs];
    const m = modal(`${paintedBanner('sector-' + sec.id)}<div class="m-eyebrow">Sector ${String(hs + 1).padStart(2, '0')} // new heading</div><h2>${esc(sec.name)}</h2><p class="story">${esc(sec.intro)}</p>
      ${hs > 0 && DECK_SIZES[hs] > DECK_SIZES[hs - 1] ? `<div class="got upgrade-got"><span class="up-tag">Upgrade</span><b>Deck size ${DECK_SIZES[hs - 1]} → ${DECK_SIZES[hs]} cards.</b> <span class="muted">Fill the new slots in the Hangar before your next battle.</span></div>` : ''}<div class="m-actions"><button class="btn primary" data-a="ok">Set course</button></div>`, 'sector-modal');
    m.onclick = e => { if (e.target.dataset.a) closeModal(); };
  }
}

// ---------------------------------------------------------------- Proving Grounds (js/challenge.js)
function chHull(run) { return `<span class="ch-hull" title="${run.lives} hull left">${Array.from({ length: CHALLENGE.lives }, (_, k) => `<i class="${k < run.lives ? 'on' : ''}"></i>`).join('')}</span>`; }
function chDeckHTML(run) {
  const curve = Array(8).fill(0); run.deck.forEach(id => curve[Math.min(7, D(id).cost)]++);
  const top = Math.max(1, ...curve), units = run.deck.filter(id => D(id).type === 'unit').length;
  const counts = {}; run.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  return `<div class="ch-deck"><div class="ch-curve">${curve.map((n, c) => `<div><i style="height:${n / top * 100}%"></i><b>${n || ''}</b><span>${c === 7 ? '7+' : c}</span></div>`).join('')}</div>
    <div class="muted small">${run.deck.length} cards · ${units} units · ${run.deck.length - units} other</div>
    <div class="ch-list">${Object.keys(counts).sort((a, b) => D(a).cost - D(b).cost || D(a).name.localeCompare(D(b).name)).map(id => `<span class="chip" data-card="${id}">${D(id).cost} · ${esc(D(id).name)}${counts[id] > 1 ? ' ×2' : ''}</span>`).join('')}</div></div>`;
}
function chPrizeLine(wins) { const pr = chPrize(wins); return [`${wins ? CHALLENGE.winCredits * wins * (wins + 1) / 2 : 0} Credits so far`, pr.keep ? 'keep one card' : 'keep a card at 3 wins', pr.packs ? `${pr.packs} ${esc(PACK_SETS[PACK_SETS.length - 1].name)}${pr.packs > 1 ? 's' : ''}` : 'a pack at 4 wins'].join(' · '); }
function openChallenge() {
  const save = App.save, run = save.challenge;
  const wire = (m, fn) => { m.onclick = e => { const b = e.target.closest('[data-a],[data-pick],[data-power]'); if (b) fn(b, e); }; };
  const later = '<button class="btn ghost" data-a="later">Later</button>', quit = '<button class="btn ghost" data-a="abandon">Abandon run</button>';
  const common = b => { const a = b.dataset.a; if (a === 'later') { closeModal(); renderMap(); return true; }
    if (a === 'abandon') { if (b.dataset.sure) { chAbandon(save); persist(); openChallenge(); } else { b.dataset.sure = 1; b.textContent = 'Abandon: are you sure?'; } return true; } return false; };
  if (!run) {
    const m = modal(`<div class="m-eyebrow">Challenge run</div><h2>The Proving Grounds</h2>
      <p class="story">The Proving Grounds are the Academy's oldest simulator, the one Halcyon was first built to run. Okonkwo has had it restored. Okonkwo: "Halcyon put every cadet through this, me included. No collection, no favourites: a power, twenty cards off the shelf, and eight fights against everyone we've faced. It's still running its old code. Let's see what you're made of."</p>
      <ul class="grad-list"><li><b>Draft:</b> choose a commander power, then pick 1 of 3 cards twenty times. Every set is in the draw.</li>
      <li><b>Eight trials</b> against enemies from across the war, each with a random modifier. After each win, add a card to your deck.</li>
      <li><b>${CHALLENGE.lives} hull points.</b> A loss costs one and re-rolls the trial. Lose them all and the run ends.</li>
      <li><b>Rewards</b> go to your real collection: Credits for every win, keep one card from your run deck at 3 wins, a ${esc(PACK_SETS[PACK_SETS.length - 1].name)} at 4 wins and two at 8.</li></ul>
      ${save.stats.chBest ? `<p class="muted">Runs played: ${save.stats.challenges || 0} · Best: ${save.stats.chBest}/${CHALLENGE.battles}</p>` : ''}
      <div class="m-actions">${later}<button class="btn primary" data-a="go">Begin</button></div>`, 'wide');
    return wire(m, b => { if (common(b)) return; if (b.dataset.a === 'go') { startChallenge(save); persist(); SFX.heal(); openChallenge(); } });
  }
  if (run.step === 'power') {
    const m = modal(`<div class="m-eyebrow">Proving Grounds · Draft</div><h2>Choose a commander power</h2>
      <div class="ch-powers">${run.powers.map(p => `<button class="btn ch-power" data-power="${p}">${powerIco(p)}<b>${esc(HEROPOWERS[p].name)}</b><span class="muted">${HEROPOWERS[p].cost} Energy: ${esc(HEROPOWERS[p].text)}</span></button>`).join('')}</div>
      <div class="m-actions">${quit}${later}</div>`, 'wide');
    return wire(m, b => { if (common(b)) return; if (b.dataset.power && chChoosePower(save, b.dataset.power)) { persist(); SFX.click(); openChallenge(); } });
  }
  if (run.step === 'draft' || run.step === 'reward') {
    const draft = run.step === 'draft';
    const m = modal(`<div class="m-eyebrow">Proving Grounds · ${draft ? `Draft pick ${run.deck.length + 1} of ${CHALLENGE.picks}` : `Spoils of trial ${run.at}`}</div>
      <h2>${draft ? 'Pick one card for your deck' : 'Add one card to your deck'}</h2>
      <p class="muted small">${TOUCH.on ? 'Press and hold' : 'Right-click'} a card to read it first.${draft ? '' : ' Spoils lean towards rarer cards.'}</p>
      <div class="crate-row">${run.offer.map(id => `<button class="crate-card" data-pick="${id}">${cardHTML(id)}<span class="crate-own">${run.deck.includes(id) ? 'In deck ×' + run.deck.filter(x => x === id).length : D(id).rarity}</span></button>`).join('')}</div>
      ${run.deck.length ? chDeckHTML(run) : ''}
      <div class="m-actions">${quit}${later}${draft ? '' : '<button class="btn" data-a="skip">Skip</button>'}</div>`, 'wide');
    return wire(m, b => {
      if (common(b)) return;
      const id = b.dataset.pick || null; if (!id && b.dataset.a !== 'skip') return;
      if (draft ? chDraft(save, id) : chReward(save, id)) { persist(); SFX.click(); openChallenge(); }
    });
  }
  if (run.step === 'fight') {
    const enc = chEnc(save), e = enc.enemy;
    const m = modal(`<div class="m-eyebrow">Proving Grounds · Trial ${run.at + 1} of ${CHALLENGE.battles}${run.at === CHALLENGE.battles - 1 ? ' · Final trial' : ''}</div>
      <div class="ch-brief"><span class="nm-art" style='background-image:${portraitPlate(e.name, ENEMY_FACTION[enc.sector], ENEMY_ART[e.name])}'></span>
        <div><h2>${esc(e.name)}</h2><div class="muted">${esc(SECTORS[enc.sector].name)} · ${esc(enc.name)}</div>
        <div class="ch-status">${chHull(run)}<span><b>${run.wins}</b> won</span><span class="muted small">${chPrizeLine(run.wins)}</span></div></div></div>
      <div class="ch-mods">${enc.mods.map(k => `<div class="ch-mod"><b>${esc(CH_MODS[k].name)}</b><span>${esc(CH_MODS[k].text)}</span></div>`).join('')}</div>
      <p class="muted small">Your commander: ${CHALLENGE.hp} Health, ${powerIco(run.power)} ${esc(HEROPOWERS[run.power].name)}. A win pays ${CHALLENGE.winCredits * (run.wins + 1)} Credits.</p>
      ${chDeckHTML(run)}
      <div class="m-actions">${quit}${later}<button class="btn primary" data-a="launch">Launch</button></div>`, 'wide');
    return wire(m, b => { if (common(b)) return; if (b.dataset.a === 'launch') { closeModal(); UI.s = null; startBattle(chEnc(save)); } });
  }
  // keep / done: the run is over
  const pr = chPrize(run.wins), full = id => (save.coll[id] || 0) >= maxCopies(D(id));
  const uniq = [...new Set(run.deck)].sort((a, b) => full(a) - full(b) || cardRating(b) - cardRating(a));
  const m = modal(`<div class="m-eyebrow">Proving Grounds · Run complete</div><h2>${run.wins >= CHALLENGE.battles ? 'All eight trials cleared' : `${run.wins} trial${run.wins === 1 ? '' : 's'} won`}</h2>
    <p class="muted">${chPrizeLine(run.wins)}</p>
    ${pr.keep ? `<h3>Keep one card from your run deck</h3><div class="ch-keep">${uniq.map(id => `<button class="crate-card" data-pick="${id}">${cardHTML(id)}<span class="crate-own">${save.coll[id] ? 'You have ' + save.coll[id] : 'New'}</span></button>`).join('')}</div>`
      : '<p>Win 3 trials to keep a card from your run deck.</p><div class="m-actions"><button class="btn primary" data-a="finish">Finish</button></div>'}`, 'wide');
  wire(m, b => {
    if (!b.dataset.pick && b.dataset.a !== 'finish') return;
    const out = chFinish(save, b.dataset.pick); if (!out) return;
    const earned = achieve(save); persist(); SFX.heal();
    const r = modal(`<div class="m-eyebrow ok">Proving Grounds</div><h2>Run rewards</h2><div class="rewards">
      ${out.packs ? `<div class="reward-chip rc-pack"><span class="rc-icon">${ico('pack')}</span><span>${esc(PACK_SETS[PACK_SETS.length - 1].name)}</span><b class="rc-val">+${out.packs} pack${out.packs > 1 ? 's' : ''}</b></div>` : ''}
      ${out.kept ? `<div class="reward-chip"><span class="rc-icon">${ico('pack')}</span><span>${esc(D(out.kept).name)}</span><b class="rc-val">${out.scrap ? `+${out.scrap} Scrap (already owned)` : 'Added to collection'}</b></div>` : ''}
      ${!out.packs && !out.kept ? '<p class="muted">Your Credits were paid after each win.</p>' : ''}</div>
      ${earned.length ? `<div class="got"><b>Service record:</b> ${earned.map(a => `<span class="chip">${esc(a.name)}</span>`).join(' ')} <span class="muted">+${earned.reduce((n, a) => n + a.reward, 0)} Credits</span></div>` : ''}
      <div class="m-actions">${out.packs ? '<button class="btn" data-a="open">Open packs</button>' : ''}<button class="btn primary" data-a="map">Star Map</button></div>`);
    r.onclick = e => { const a = e.target.dataset.a; if (!a) return; closeModal(); if (a === 'open') openShop(openMap, true); else openMap(); };
  });
}
function endChallengeBattle(s, enc, won, tally) {
  const save = App.save;
  if (won) { save.stats.wins++; tally.wins = 1; } else save.stats.losses++;
  const done = applyContracts(save, tally);
  const res = chResult(save, won) || { won, credits: 0, over: false };
  const earned = achieve(save, { won, enc, s }); persist();
  if (won) { SFX.win(); if (Music.stinger) Music.stinger('victory'); } else { SFX.lose(); if (Music.stinger) Music.stinger('defeat'); }
  UI.s = null;
  const run = save.challenge, lives = run ? run.lives : 0;
  const line = won ? (res.over ? 'All eight trials cleared. The Proving Grounds have nothing left to teach you.' : `Trial ${enc.trial} cleared. ${CHALLENGE.battles - run.wins} to go.`)
    : lives > 0 ? `Your hull takes the hit: ${lives} hull point${lives > 1 ? 's' : ''} left. The trial is re-rolled with a new modifier.` : 'Your hull is gone. The run ends here.';
  const m = modal(`${paintedBanner(won ? 'screen-victory' : 'screen-defeat')}<div class="m-eyebrow ${won ? 'ok' : 'danger'}">${won ? 'Victory' : 'Defeat'} · Proving Grounds</div><h2>${esc(enc.enemy.name)}</h2>
    <p>${line}</p>${run ? chHull(run) : ''}
    ${!won ? hurtHTML(s) : ''}
    ${res.credits || done.length ? `<div class="rewards">${res.credits ? `<div class="reward-chip"><span class="rc-icon">${ico('credits')}</span><span>Trial reward</span><b class="rc-val">+${res.credits} Credits</b></div>` : ''}${contractLines(done)}</div>` : ''}
    ${earned.length ? `<div class="got"><b>Service record:</b> ${earned.map(a => `<span class="chip">${esc(a.name)}</span>`).join(' ')} <span class="muted">+${earned.reduce((n, a) => n + a.reward, 0)} Credits</span></div>` : ''}
    ${rateHTML()}
    <div class="m-actions"><button class="btn primary" data-a="go">Continue</button></div>`, 'wide');
  wireRate(m);
  m.onclick = e => { if (e.target.dataset.a === 'go') { closeModal(); showScreen('map'); renderMap(); openChallenge(); } };
}

// a route event: a short scene with a choice of routes (js/events.js)
function openEvent(ev) {
  const save = App.save;
  const choose = k => {
    const ch = ev.choices[k];
    if (ch.kind === 'shop') return openShopEvent(ev, k);
    const res = resolveEvent(save, ev, k); if (!res) return;
    achieveToast(achieve(save)); persist(); SFX.heal(); eventResult(ev, res);
  };
  const m = modal(`<div class="m-eyebrow">${esc(SECTORS[ev.sector].name)} · ${esc(ev.kind)}</div><h2>${esc(ev.name)}</h2>
    <p class="story">${esc(ev.text)}</p>
    <div class="ev-choices">${ev.choices.map((c, k) => `<button class="btn ev-choice" data-k="${k}">${esc(c.label)}${c.n ? ` <span class="muted">+${c.n} ${c.kind === 'credits' ? 'Credits' : c.kind === 'alloy' ? 'Alloy' : 'Scrap'}</span>` : c.kind === 'pack' ? ` <span class="muted">+1 ${esc(PACK_SETS[c.set - 1].name)}</span>` : c.kind === 'card' ? ' <span class="muted">+1 card</span>' : ''}</button>`).join('')}</div>
    <div class="m-actions"><button class="btn ghost" data-a="later">Decide later</button></div>`, 'event-modal');
  m.onclick = e => { const b = e.target.closest('[data-k]'); if (b) { SFX.click(); choose(+b.dataset.k); return; } if (e.target.dataset.a === 'later') { closeModal(); renderMap(); } };
}
function openShopEvent(ev, k) {
  const save = App.save, offer = eventOffer(save, ev, ev.choices[k].set); persist();
  const m = modal(`<div class="m-eyebrow">${esc(ev.kind)} · ${esc(ev.name)}</div><h2>Pick one to buy</h2><p class="muted">You have <b>${save.credits}</b> Credits. You can buy one card; the others go back on the shelf.</p>
    <div class="crate-row">${offer.map(id => { const p = EVENT_PRICE[D(id).rarity]; return `<button class="crate-card" data-buy="${id}" ${save.credits < p ? 'disabled' : ''}>${cardHTML(id)}<span class="crate-own">${p} Credits · ${save.coll[id] ? 'you have ' + save.coll[id] : 'new'}</span></button>`; }).join('')}</div>
    <div class="m-actions"><button class="btn ghost" data-a="back">Back</button></div>`, 'wide');
  m.onclick = e => {
    const b = e.target.closest('[data-buy]'); if (b) { const res = resolveEvent(save, ev, k, b.dataset.buy); if (res) { achieveToast(achieve(save)); persist(); SFX.heal(); eventResult(ev, res); } return; }
    if (e.target.dataset.a === 'back') openEvent(ev);
  };
}
function eventResult(ev, res) {
  const m = modal(`<div class="m-eyebrow">${esc(ev.kind)} · ${esc(ev.name)}</div><h2>${esc(res.text)}</h2>
    ${res.cards.length ? `<div class="crate-row">${res.cards.map(id => cardHTML(id)).join('')}</div><p class="muted">It's in your collection. Add it to a deck in the Hangar.</p>` : ''}
    <div class="m-actions"><button class="btn primary" data-a="ok">Continue</button></div>`, 'event-modal');
  m.onclick = e => { if (e.target.dataset.a === 'ok') { closeModal(); renderMap(); } };
}

function renderMap() {
  const save = App.save, si = MapUI.sector, sec = SECTORS[si];
  const hs = highestSector(save), next = nextEncounter(save);
  Scene.mood('map', sec.hue); document.body.style.setProperty('--sec-h', sec.hue);
  const { encs, main, elites, pos } = routeLayout(si);
  const done = encs.filter(e => save.cleared[e.id]).length;
  // hyperlanes
  const seg = (a, b, cls) => { const [x0, y0] = pos[a.id], [x1, y1] = pos[b.id], dx = (x1 - x0) / 2; return `<path class="lane ${cls}" d="M${x0} ${y0} C${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}" vector-effect="non-scaling-stroke"/>`; };
  let lanes = '';
  for (let k = 0; k < main.length - 1; k++) {
    const a = main[k], b = main[k + 1];
    lanes += seg(a, b, save.cleared[b.id] ? 'done' : encUnlocked(save, b) ? 'active' : 'locked');
  }
  elites.forEach(e => { const [x0, y0] = pos[e.after], [x1, y1] = pos[e.id]; lanes += `<path class="lane spur ${save.cleared[e.id] ? 'done' : encUnlocked(save, e) ? 'active' : 'locked'}" d="M${x0} ${y0} L${x1} ${y1}" vector-effect="non-scaling-stroke"/>`; });
  // nodes
  const nodes = encs.map(e => {
    const ok = encUnlocked(save, e), cl = !!save.cleared[e.id], [x, y] = pos[e.id], isNext = next && next.id === e.id;
    const cls = ['mnode', x < 22 ? 'al' : x > 78 ? 'ar' : '', e.boss ? 'boss' : '', e.elite ? 'elite' : '', cl ? 'cleared' : '', ok && !cl ? 'open' : '', !ok ? 'locked' : '', isNext ? 'next' : ''].join(' ');
    const face = e.boss ? `<span class="mn-art" style='background-image:${portraitPlate(e.enemy.name, ENEMY_FACTION[e.sector], ENEMY_ART[e.enemy.name])}'></span>` : '';
    const glyph = cl ? ico('check') : !ok ? ico('lock') : e.elite ? ico('elite') : e.boss ? '' : e.id.split('-')[1];
    return `<button class="${cls}" style="left:${x}%;top:${y}%" ${ok ? `data-enc="${e.id}"` : 'disabled'} aria-label="${esc(ok || cl ? e.name : 'Locked mission')}">
      <span class="mn-hex">${face}<span class="mn-g">${glyph}</span></span>
      <span class="mn-label"><b>${ok || cl ? esc(e.name) : 'Unknown signal'}</b><i>${e.boss ? 'Boss' : e.elite ? 'Elite · optional' : 'Mission ' + e.id}</i></span></button>`;
  }).join('');
  const evNodes = EVENTS.filter(ev => ev.sector === si).map(ev => {
    const k = main.findIndex(e => e.id === ev.after), a = pos[ev.after], b = pos[(main[k + 1] || main[k]).id];
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2 + ((a[1] + b[1]) / 2 > 52 ? -24 : 24);
    const open = eventOpen(save, ev), dn = eventDone(save, ev);
    lanes += `<path class="lane spur ev ${dn ? 'done' : open ? 'active' : 'locked'}" d="M${a[0]} ${a[1]} L${x} ${y}" vector-effect="non-scaling-stroke"/>`;
    const cls = ['mnode', 'event', x < 22 ? 'al' : x > 78 ? 'ar' : '', dn ? 'cleared' : '', open && !dn ? 'open' : '', !open ? 'locked' : ''].join(' ');
    return `<button class="${cls}" style="left:${x}%;top:${y}%" ${open && !dn ? `data-event="${ev.id}"` : 'disabled'} aria-label="${esc(open ? ev.name : 'Unknown signal')}">
      <span class="mn-hex"><span class="mn-g">${dn ? ico('check') : open ? ico('scope') : ico('lock')}</span></span>
      <span class="mn-label"><b>${open ? esc(ev.name) : 'Unknown signal'}</b><i>${open ? esc(ev.kind) : 'Event'}</i></span></button>`;
  }).join('');
  const shipAt = next && next.sector === si ? pos[next.id] : null;
  // sector strip
  const strip = SECTORS.map((s, i) => {
    const un = sectorUnlocked(save, i), es = ENCOUNTERS.filter(e => e.sector === i), dn = es.filter(e => save.cleared[e.id]).length;
    if (!un && i > hs + 1) return `<div class="gs hidden-sec"><span class="gs-n">${String(i + 1).padStart(2, '0')}</span><span class="gs-name">· · ·</span></div>`;
    return `<button class="gs ${i === si ? 'on' : ''} ${un ? '' : 'locked'}" ${un ? `data-sec="${i}"` : 'disabled'} style="--h:${s.hue}">
      <span class="gs-art" ${un ? `style='background-image:${extraArt('sector-' + s.id) || portraitPlate(s.name, ENEMY_FACTION[i], SECTOR_ART[i])}'` : ''}>${un ? '' : ico('lock')}</span>
      <span class="gs-txt"><span class="gs-n">Sector ${String(i + 1).padStart(2, '0')}</span><span class="gs-name">${un ? esc(s.name) : 'Uncharted'}</span>
      <span class="gs-pips">${es.filter(e => !e.elite).map(e => `<i class="${save.cleared[e.id] ? 'on' : ''}"></i>`).join('')}</span></span></button>`;
  }).join('');
  // next mission card
  const nextCard = next ? (() => {
    const e = next.enemy;
    return `<div class="ops-card mission"><div class="oc-h">Next mission</div>
      <div class="nm-top"><span class="nm-art" style='background-image:${portraitPlate(e.name, ENEMY_FACTION[next.sector], ENEMY_ART[e.name])}'></span>
      <div><div class="nm-sec">${esc(SECTORS[next.sector].name)} · ${next.boss ? 'Boss' : 'Mission ' + next.id}</div><div class="nm-name">${esc(next.name)}</div><div class="muted small">vs ${esc(e.name)}</div></div></div>
      <p class="nm-story">${esc(next.story.split('. ')[0].replace(/\.$/, ''))}.</p>
      <button class="btn primary wide" data-enc="${next.id}">Brief me</button></div>`;
  })() : `<div class="ops-card mission"><div class="oc-h">Campaign complete</div><p class="muted">Every main mission is cleared. Replay any battle to finish your collection.</p></div>`;
  const contracts = economyOpen(save) && save.contracts.length ? `<div class="ops-card"><div class="oc-h">Contracts</div>${save.contracts.map(c => { const d = CONTRACTS[c.id]; return `<div class="oc-ct"><div class="oc-ct-t"><span>${esc(d.text)}</span><span class="ct-rw">${ico('credits')} ${contractRewardOf(save, c.id)}</span></div><div class="ct-bar"><i style="width:${(c.progress / d.goal) * 100}%"></i></div><span class="muted small">${c.progress}/${d.goal}</span></div>`; }).join('')}</div>` : '';
  const diff = DIFFICULTY[save.diff];
  const cmdr = `<div class="ops-card"><div class="oc-h">Commander</div><div class="cmd-name">${esc(save.name)}</div>
    <div class="cmd-stats"><div title="${PLAYER_HP} base + ${HULL_PER_BOSS} for each boss defeated (${Math.min(5, bossesCleared(save)) * HULL_PER_BOSS})${medbayHp(save) ? ' + Med Bay ' + medbayHp(save) : ''}"><b>${playerMaxHp(save)}</b><span>Hull</span></div><div><b>${deckSizeFor(save)}</b><span>Deck</span></div><div><b>${save.stats.wins}</b><span>Wins</span></div><div><b>${diff.name}</b><span>Difficulty</span></div></div></div>`;
  const stn = stationOpen(save) ? (() => { const st = ensureStation(save), up = upgradesAvailable(save), tot = STATION.order.reduce((a, id) => a + STATION.mods[id].max, 0), have = STATION.order.reduce((a, id) => a + stationLv(save, id), 0);
    return `<div class="ops-card stn-teaser"><div class="oc-h">Anchorage</div><div class="oc-ct-t"><span>${ico('alloy')} <b>${st.alloy}</b> Alloy</span><span class="muted">${have}/${tot} systems</span></div><div class="meter"><i style="width:${have / tot * 100}%"></i></div>
      <button class="btn ${up ? 'primary' : ''} wide" data-nav="station">${up ? `Repairs ready (${up})` : 'Visit station'}</button></div>`; })() : '';
  const chal = challengeOpen(save) ? (() => { const run = save.challenge;
    return `<div class="ops-card chal-card"><div class="oc-h">Proving Grounds</div>${run ? `<div class="oc-ct-t"><span><b>${run.wins}</b>/${CHALLENGE.battles} trials won</span>${chHull(run)}</div>` : `<p class="muted small">Draft a deck from every set and survive eight trials. Rewards go to your collection.${save.stats.chBest ? ` Best run: ${save.stats.chBest}/${CHALLENGE.battles}.` : ''}</p>`}
      <button class="btn ${run ? 'primary' : ''} wide" data-chal="1">${run ? 'Continue run' : 'Start a run'}</button></div>`; })()
    : challengeTeaser(save) ? '<div class="ops-card chal-card locked"><div class="oc-h">Proving Grounds</div><p class="muted small">Finish the campaign to open challenge runs: draft a deck, survive eight trials.</p></div>' : '';
  morphInto($('#map'), `<div class="nav-shell">
    ${cmdBar(save, 'map')}
    <div class="g-strip">${strip}</div>
    <div class="map-main">
      <section class="chart" style='--h:${sec.hue};--art:url(${Scene.backdrop(si, sec.hue)})' data-key="chart-${si}">
        <div class="chart-head"><div class="ch-n">Sector ${String(si + 1).padStart(2, '0')} // ${esc(sec.sub)}</div><h2>${esc(sec.name)}</h2><div class="ch-prog"><b>${done}</b>/${encs.length} cleared</div></div>
        <div class="chart-coords">GRID ${String.fromCharCode(65 + si)}-${(si + 1) * 117} · ${encs.length} SIGNALS</div>
        <svg class="lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lanes}</svg>
        ${nodes}${evNodes}
        ${shipAt ? `<div class="ship-marker" style="left:${shipAt[0]}%;top:${shipAt[1]}%" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12l16-7-5 7 5 7z"/></svg></div>` : ''}
      </section>
      <aside class="ops">${nextCard}${chal}${stn}${contracts}${cmdr}</aside>
    </div></div>`);
  const gStrip = $('#map .g-strip'), onSec = gStrip && gStrip.querySelector('.gs.on');
  if (onSec && gStrip.scrollWidth > gStrip.clientWidth) gStrip.scrollLeft = onSec.offsetLeft - gStrip.offsetLeft - 12;
  $('#map').onclick = e => {
    const b = e.target.closest('[data-enc]'); if (b) { SFX.init(); SFX.click(); openBriefing(ENC[b.dataset.enc]); return; }
    if (e.target.closest('[data-chal]')) { SFX.init(); SFX.click(); openChallenge(); return; }
    const ev = e.target.closest('[data-event]'); if (ev) { SFX.init(); SFX.click(); openEvent(EVENTS.find(x => x.id === ev.dataset.event)); return; }
    const s = e.target.closest('[data-sec]'); if (s) { SFX.click(); MapUI.sector = +s.dataset.sec; if (Music.setTheme) Music.setTheme(MapUI.sector); renderMap(); return; }
    cmdBarClick(e, openMap);
  };
}

// Shared command bar for the menu screens.
function cmdBar(save, here) {
  const open = economyOpen(save), n = unopenedPacks(save);
  const nav = [['map', 'Star Map', 'm-map'], open ? ['station', 'Anchorage', 'm-station'] : null, ['hangar', 'Hangar', 'm-hangar'], open ? ['shop', 'Supply Depot', 'm-shop'] : null, ['archive', 'Archive', 'm-archive'], ['settings', 'Settings', 'm-settings']].filter(Boolean);
  const up = open ? upgradesAvailable(save) : 0;
  return `<header class="cmd-bar"><button class="brand" data-nav="title" aria-label="Title screen">STARFALL<span>PROTOCOL</span></button>
    <nav class="cmd-nav">${nav.map(([k, l, id]) => `<button class="cn ${k === here ? 'on' : ''}" id="${id}" data-nav="${k}">${l}${k === 'shop' && n ? `<span class="badge">${n}</span>` : ''}${k === 'station' && up ? `<span class="badge">${up}</span>` : ''}</button>`).join('')}</nav>
    ${open ? walletHTML(save) : '<div></div>'}</header>`;
}
function cmdBarClick(e, back) {
  const b = e.target.closest('[data-nav]'); if (!b) return false;
  SFX.init(); SFX.click();
  const k = b.dataset.nav;
  if (k === 'title') openTitle();
  if (k === 'map') openMap();
  if (k === 'hangar') openHangar(back || openMap);
  if (k === 'shop') openShop(back || openMap);
  if (k === 'codex' || k === 'archive') openArchive(k === 'codex' ? 'manual' : null, null);
  if (k === 'station') openStation(back || openMap);
  if (k === 'settings') showSettings();
  return true;
}

// Deep-Scan Observatory: Mk I shows the enemy's best cards, Mk II the whole list.
function intelHTML(save, e) {
  const obs = stationLv(save, 'observatory'); if (!obs) return '';
  const counts = {}; e.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  let ids = Object.keys(counts).sort((a, b) => D(a).cost - D(b).cost || D(a).name.localeCompare(D(b).name));
  if (obs < 2) ids = Object.keys(counts).sort((a, b) => cardRating(b) - cardRating(a)).slice(0, 4);
  return `<div class="intel"><div class="ph">Deep-scan intel <span class="meta">${obs < 2 ? 'Key cards' : e.deck.length + ' cards'}</span></div><div class="intel-cards">${ids.map(id => `<span class="chip" data-card="${id}">${esc(D(id).name)}${obs >= 2 && counts[id] > 1 ? ' ×' + counts[id] : ''}</span>`).join('')}</div></div>`;
}

// Briefing state that survives re-rendering the popup (deck switch, tuner progress).
const Brief = { id: null, run: null, result: null, use: false, cancel: null, delArm: false };

function openBriefing(enc) {
  const save = App.save, e = enc.enemy, diff = DIFFICULTY[save.diff];
  if (Brief.id !== enc.id) { if (Brief.cancel) Brief.cancel(); Object.assign(Brief, { id: enc.id, run: null, result: null, use: false, cancel: null }); }
  ensureDecks(save);
  const teach = [...(enc.teaches || []), ...(enc.teachesAlso || [])];
  const fresh = teach.filter(k => !save.codex.includes(k));
  // previews: mechanics on the cards in this mission's reward crate, not in its fight
  const soon = (enc.previews || []).filter(k => !save.codex.includes(k) && !teach.includes(k));
  const hp = Math.round(e.hp * diff.hp);
  const power = e.power ? HEROPOWERS[e.power] : null;
  const rewardTxt = save.cleared[enc.id] ? (economyOpen(save) ? `${Math.round(ECON.replayCredits[encKind(enc)] * creditMultOf(save))} Credits + ${ECON.alloyReplay[encKind(enc)]} Alloy (replay)` : 'Training replay') : [describeEncReward(enc, save), enc.unlockPowers ? 'a new commander power' : '', enc.grant ? (enc.elite ? Object.keys(enc.grant).map(id => esc(D(id).name)).join(' + ') : 'a supply crate of new cards') : ''].filter(Boolean).join(' + ') || 'Training credit';
  const size = deckSizeFor(save);
  const tunedOn = !enc.fixedDeck && Brief.use && Brief.result && Brief.result.best.label !== 'Your deck';
  const deckOk = enc.fixedDeck || tunedOn || save.deck.length === size;
  const m = modal(`<div class="m-eyebrow">${esc(SECTORS[enc.sector].name)} · ${enc.boss ? 'Boss' : enc.elite ? 'Elite (optional)' : 'Mission ' + enc.id}</div>
    <h2>${esc(enc.name)}</h2>
    <div class="brief">
      <div class="foe"><button class="foe-art" data-cmdr="${enc.id}" aria-label="${esc(e.name)} dossier" title="Commander dossier" style='background-image:${portraitPlate(e.name, ENEMY_FACTION[enc.sector], ENEMY_ART[e.name])}'></button><div><div class="foe-name">${esc(e.name)}</div><div class="muted">${hp} Health${e.phases ? ` · ${e.phases.length + 1} phases` : ''}</div>
        ${power ? `<div class="foe-line">${powerIco(e.power)}<span><b>${esc(power.name)}:</b> ${esc(power.text)}</span></div>` : ''}
        ${(e.passives || []).map(id => `<div class="foe-line">${passiveIco(id)}<span><b>${esc(PASSIVES[id].name)}:</b> ${esc(PASSIVES[id].text)}</span></div>`).join('')}
        ${tacticsLine(enc)}
        ${e.startTraps ? `<div class="foe-line">${ico('trap')}<b>Starts with ${e.startTraps.length} Trap${e.startTraps.length > 1 ? 's' : ''} armed.</b></div>` : ''}
        ${intelHTML(save, e)}</div></div>
      ${storyHTML(enc.story, enc)}
      ${fresh.map(k => `<div class="newmech"><span class="pill new">New</span> <b>${esc(KEYWORDS[k].name)}</b> ${esc(KEYWORDS[k].text)}</div>`).join('')}
      ${soon.map(k => `<div class="newmech"><span class="pill">In your rewards</span> <b>${esc(KEYWORDS[k].name)}</b> ${esc(KEYWORDS[k].text)}</div>`).join('')}
      <div class="brief-foot"><span class="muted">Reward:</span> ${rewardTxt}${save.cleared[enc.id] ? ' <span class="pill">Cleared</span>' : ''}</div>
      ${enc.fixedDeck ? '<div class="brief-foot muted">This simulation uses a standard training deck.</div>' : briefDeckHTML(save, enc, size, deckOk, tunedOn)}
    </div>
    <div class="m-actions"><button class="btn ghost" data-a="back">Back</button>${enc.fixedDeck ? '' : '<button class="btn" data-a="hangar">Hangar</button>'}<button class="btn primary" data-a="go" ${deckOk ? '' : 'disabled'}>Launch</button></div>`, 'brief-modal');
  m.onchange = ev => {
    const t = ev.target;
    if (t.matches('[data-brief-deck]')) { if (switchDeck(save, +t.value, size)) toast(`That deck needs ${size - save.deck.length} more cards.`); persist(); Brief.result = null; Brief.use = false; openBriefing(enc); }
    if (t.matches('[data-tune-use]')) { Brief.use = t.checked; openBriefing(enc); }
  };
  m.onclick = ev => {
    const a = ev.target.closest('[data-a]') && ev.target.closest('[data-a]').dataset.a; if (!a) return;
    if (a === 'back') { if (Brief.cancel) Brief.cancel(); Brief.run = null; Brief.cancel = null; closeModal(); }
    if (a === 'hangar') { if (Brief.cancel) Brief.cancel(); Brief.run = null; Brief.id = null; closeModal(); openHangar(() => { openMap(); openBriefing(enc); }); }
    if (a === 'tune') {
      SFX.init(); Brief.run = { done: 0, total: 1 }; Brief.result = null; openBriefing(enc);
      Brief.cancel = tuneDeck(save, enc, (done, total) => {
        Brief.run = { done, total };
        const bar = $('#tune-bar'); if (bar) { bar.style.width = (done / total * 100).toFixed(0) + '%'; $('#tune-n').textContent = `${done} of ${total} simulated battles`; }
      }, res => { Brief.run = null; Brief.cancel = null; Brief.result = res; Brief.use = res.best.label !== 'Your deck'; if (Brief.id === enc.id && !$('#modal').hidden) openBriefing(enc); });
    }
    if (a === 'fill') { autoFillDeck(save, size); persist(); toast('Filled the empty slots. Your own picks were kept.'); openBriefing(enc); return; }
    if (a === 'tune-stop') { if (Brief.cancel) Brief.cancel(); Brief.run = null; Brief.cancel = null; openBriefing(enc); }
    if (a === 'tune-save' || a === 'tune-replace') {
      const best = Brief.result.best.deck;
      if (a === 'tune-save') addSavedDeck(save, enc.name, best, size);
      else { save.deck = best.slice(); syncDecks(save); }
      persist(); toast(a === 'tune-save' ? `Saved as a new deck: ${esc(activeDeck(save).name)}.` : `Updated ${esc(activeDeck(save).name)} with the tuned deck.`);
      Brief.result = null; Brief.use = false; openBriefing(enc);
    }
    if (a === 'go') {
      SFX.init(); [...teach, ...soon].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); });
      UI.deckOverride = tunedOn ? { id: enc.id, deck: Brief.result.best.deck.slice() } : null;
      if (tunedOn) save.stats.tuned = (save.stats.tuned || 0) + 1;
      persist(); startBattle(enc);
    }
  };
}

function offlineHTML() {
  const ok = Offline.available();
  return `<h3>Offline play</h3><p class="muted small" id="offline-status">${esc(Offline.label())}</p>
    ${ok ? `<div class="m-actions left"><button class="btn" data-a="offline" id="offline-go" ${Offline.running ? 'disabled' : ''}>${Offline.ready() ? 'Check again' : 'Download everything now'}</button></div>` : ''}`;
}

// How this enemy plays (its AI personality), shown in briefings and dossiers.
// A mission story is narration with quoted lines ("Okonkwo: \"...\""). Show each quote as a short
// transmission (speaker portrait, name, line) apart from the narration, so the two don't run together.
function speakerArt(name, enc) {
  const n = name.toLowerCase();
  const cast = Object.values(typeof CAST !== 'undefined' ? CAST : {}).find(c => c.portrait && c.name.toLowerCase().split(/[ ,]+/).includes(n.split(' ')[0]) && c.name.toLowerCase().includes(n));
  if (cast) { const p = cast.portrait; if (p.card) return artPlate(p.card); const x = ENCOUNTERS.find(e => e.enemy.name === p.enemy); return portraitPlate(p.enemy, ENEMY_FACTION[x ? x.sector : 0], ENEMY_ART[p.enemy]); }
  const x = (enc && enc.enemy.name.toLowerCase().includes(n) ? enc : null) || ENCOUNTERS.find(e => e.enemy.name.toLowerCase().includes(n));
  if (x) return portraitPlate(x.enemy.name, ENEMY_FACTION[x.sector], ENEMY_ART[x.enemy.name]);
  const card = CARD_LIST.find(d => d.name.toLowerCase().includes(n) && d.type === 'unit');
  return card ? artPlate(card.id) : '';
}
function storyHTML(text, enc) {
  const re = /(?<=^|[.!?"]\s+)([A-Z][A-Za-z'.\- ]{1,28}?): "([^"]*)"/g, parts = []; let last = 0, m;
  while ((m = re.exec(text))) {
    const pre = text.slice(last, m.index).trim();
    if (pre) parts.push(`<p class="story">${esc(pre)}</p>`);
    const art = speakerArt(m[1], enc);
    parts.push(`<div class="comm-line"><span class="cl-face" style='${art ? `background-image:${art}` : ''}'>${art ? '' : esc(m[1][0])}</span><div><div class="cl-who">${esc(m[1])}</div><q>${esc(m[2])}</q></div></div>`);
    last = m.index + m[0].length;
  }
  const rest = text.slice(last).trim(); if (rest) parts.push(`<p class="story">${esc(rest)}</p>`);
  return `<div class="brief-story">${parts.join('')}</div>`;
}
function tacticsLine(enc, cls) {
  if (typeof personaOf !== 'function' || !enc) return '';
  const p = personaOf(enc); if (!p || !p.name) return '';
  return `<div class="${cls || 'foe-line'}">${ico('target')}<span><b>Tactics: ${esc(p.name)}.</b> ${esc(p.text)}</span></div>`;
}

// Briefing: which deck you're taking, and the optional mission-tuned deck.
function briefDeckHTML(save, enc, size, deckOk, tunedOn) {
  const decks = save.decks, cur = activeDeck(save);
  const pick = decks.length > 1
    ? `<select class="brief-deck" data-brief-deck aria-label="Deck for this battle">${decks.map((d, i) => `<option value="${i}" ${i === save.activeDeck ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>`
    : `<b>${esc(cur.name)}</b>`;
  const pw = save.power && !enc.noPower ? ` · Power: ${esc(HEROPOWERS[save.power].name)}` : '';
  const line = tunedOn
    ? `<div class="brief-foot"><span class="muted">Deck:</span> <b>Mission-tuned deck</b> · ${size} cards${pw} <span class="pill">Assist</span></div>`
    : `<div class="brief-foot ${deckOk ? '' : 'warn'}"><span class="muted">Deck:</span> ${pick} ${save.deck.length}/${size} cards${pw}${deckOk ? '' : ` · needs ${size - save.deck.length} more <button class="btn small" data-a="fill">Fill empty slots</button>`}</div>`;
  let body;
  if (Brief.run) {
    const pc = Brief.run.done / Brief.run.total * 100;
    body = `<div class="tune-prog"><i id="tune-bar" style="width:${pc.toFixed(0)}%"></i></div>
      <div class="tune-row"><span class="muted small" id="tune-n">${Brief.run.done} of ${Brief.run.total} simulated battles</span><button class="btn small ghost" data-a="tune-stop">Cancel</button></div>`;
  } else if (Brief.result) {
    const r = Brief.result, pct = c => Math.round(c.wins / Math.max(1, c.games) * 100) + '%';
    if (r.best.label === 'Your deck') {
      body = `<p>Your current deck did best in simulated battles against ${esc(enc.enemy.name)} (won ${pct(r.best)}). No changes needed.</p>`;
    } else {
      const dd = deckDiff(save.deck, r.best.deck), n = dd.add.reduce((a, x) => a + x.n, 0);
      const chip = (x, sign) => `<span class="chip ${sign === '+' ? 'add' : 'rem'}" data-card="${x.id}">${sign}${x.n > 1 ? x.n + ' ' : ''}${esc(D(x.id).name)}</span>`;
      const room = save.decks.length < deckSlots(save);
      body = `<p>Simulated battles against ${esc(enc.enemy.name)}: <b>${esc(cur.name)}</b> won ${r.base ? pct(r.base) : 'n/a'}, the tuned deck won <b>${pct(r.best)}</b>.</p>
        <details class="tune-diff"><summary>${n} card${n === 1 ? '' : 's'} swapped</summary><div class="chips">${dd.add.map(x => chip(x, '+')).join(' ')} ${dd.rem.map(x => chip(x, '−')).join(' ')}</div></details>
        <label class="tune-use"><input type="checkbox" data-tune-use ${Brief.use ? 'checked' : ''}> Use the tuned deck for this mission</label>
        <div class="tune-row">${room ? '<button class="btn small" data-a="tune-save">Save as a new deck</button>' : `<button class="btn small" data-a="tune-replace">Replace ${esc(cur.name)} with it</button>`}<span class="muted small">Win rates are rough: the simulations use an AI pilot.</span></div>`;
    }
  } else {
    body = `<p class="muted small">Builds a deck from your collection with the best chance against this enemy, by playing quick simulated battles. Using it makes the mission easier.</p>
      <button class="btn small" data-a="tune">Build a tuned deck</button>`;
  }
  return line + `<div class="tune"><div class="tune-h"><b>Mission-tuned deck</b> <span class="pill">Assist</span></div>${body}</div>`;
}

// ============================================================================
// HANGAR (deck builder)
// ============================================================================
const Hangar = { back: null, filter: 'all', cost: -1, q: '', mode: 'deck', strat: null };

function openHangar(back) {
  Hangar.back = back || openMap;
  closeModal(); showScreen('hangar'); renderHangar();
}

function renderHangar() {
  const save = App.save, size = deckSizeFor(save);
  ensureDecks(save);
  const inDeck = {}; save.deck.forEach(id => inDeck[id] = (inDeck[id] || 0) + 1);
  if (!economyOpen(save)) Hangar.mode = 'deck';
  const craft = Hangar.mode === 'craft';
  const base = craft ? CARD_LIST.filter(d => !d.token && setUnlocked(save, d.tier)) : Object.keys(save.coll).filter(id => save.coll[id] > 0).map(D);
  const owned = base
    .filter(d => Hangar.filter === 'all' || (Hangar.filter === 'missing' ? (save.coll[d.id] || 0) < maxCopies(d) : d.type === Hangar.filter))
    .filter(d => Hangar.cost < 0 || (Hangar.cost >= 7 ? d.cost >= 7 : d.cost === Hangar.cost))
    .filter(d => !Hangar.q || (d.name + ' ' + d.text).toLowerCase().includes(Hangar.q.toLowerCase()))
    .filter(d => !Hangar.strat || (d.strat || []).includes(Hangar.strat))
    .sort((a, b) => Hangar.strat ? (b.engine ? 1 : 0) - (a.engine ? 1 : 0) || a.cost - b.cost || a.name.localeCompare(b.name) : a.cost - b.cost || a.name.localeCompare(b.name));
  const grid = craft ? owned.map(d => {
    const n = save.coll[d.id] || 0, max = maxCopies(d);
    return `<button class="coll-card ${n ? '' : 'unowned'} ${n >= max ? 'complete' : ''}" data-craft="${d.id}">${cardHTML(d.id)}<span class="in-deck ${n >= max ? '' : 'need'}">${n}/${max}${n < max && canCraft(save, d.id) ? ' · ⚙ craft' : ''}</span></button>`;
  }).join('') : owned.map(d => {
    const n = save.coll[d.id], used = inDeck[d.id] || 0, max = Math.min(n, maxCopies(d));
    return `<button class="coll-card ${used >= max ? 'maxed' : ''}" data-add="${d.id}">${save.signature === d.id && stationLv(save, 'armory') >= 2 ? '<span class="sig-mark">SIGNATURE</span>' : ''}${cardHTML(d.id, { count: n })}${used ? `<span class="in-deck">${used} in deck</span>` : ''}</button>`;
  }).join('') || '<p class="muted">No cards match this filter.</p>';
  const rows = Object.entries(inDeck).map(([id, n]) => D(id)).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
    .map(d => `<button class="deck-row" data-rm="${d.id}" data-card="${d.id}" style="--h:${(FACTIONS[d.faction] || FACTIONS.neutral).hue}"><span class="dr-cost">${d.cost}</span><span class="dr-icon" style='background-image:${artPlate(d.id)}'></span><span class="dr-name">${esc(d.name)}</span><span class="dr-n">${inDeck[d.id] > 1 ? '×' + inDeck[d.id] : ''}</span></button>`).join('');
  const curve = [0, 0, 0, 0, 0, 0, 0, 0]; save.deck.forEach(id => curve[Math.min(7, D(id).cost)]++);
  const cmax = Math.max(1, ...curve);
  const types = { unit: 0, spell: 0, gear: 0, trap: 0 }; save.deck.forEach(id => types[D(id).type]++);
  const powers = save.powers.map(p => { const h = HEROPOWERS[p]; return `<button class="pw ${save.power === p ? 'on' : ''}" data-pw="${p}"><span class="pw-i">${powerIco(p)}</span><span><b>${esc(h.name)}</b><br><span class="muted">${esc(h.text)}</span></span></button>`; }).join('') || '<p class="muted">Commander powers unlock in Sector 1.</p>';
  const tabs = [['all', 'All'], craft ? ['missing', 'Missing'] : null, ['unit', 'Units'], ['spell', 'Protocols'], ['gear', 'Gear'], ['trap', 'Traps']].filter(x => x && (x[0] === 'all' || x[0] === 'missing' || base.some(d => d.type === x[0])));
  const setDone = craft ? base.filter(d => (save.coll[d.id] || 0) >= maxCopies(d)).length : 0;
  $('#hangar').innerHTML = `<div class="nav-shell hangar-wrap">
    ${cmdBar(save, 'hangar')}
    <div class="sub-head"><div><div class="sh-tag">Fleet logistics</div><h1>Hangar</h1></div><span class="muted">Build your deck and choose your commander power.</span><button class="btn primary" id="h-done">Done</button></div>
    <div class="mode-bar">${economyOpen(save) ? `<div class="seg"><button class="${craft ? '' : 'on'}" data-mode="deck">Build deck</button><button class="${craft ? 'on' : ''}" data-mode="craft">Craft cards</button></div>` : ''}
      <span class="muted small">${craft ? `Every card from the sets you have reached: you have <b>${setDone} of ${base.length}</b> complete. Click one to craft it with Scrap, or scrap spare copies. <b>Missing</b> shows only the cards you still need.` : (TOUCH.on ? 'Tap a card to add it. Tap a deck entry to remove it. Press and hold any card to read it.' : 'Click a card to add it. Click a deck entry to remove it. Right-click any card to read it.') + ' Up to 2 copies (1 Legendary).'}</span></div>
    <div class="hangar-body">
      <section class="coll">
        <div class="filters">${tabs.map(([k, l]) => `<button class="chipbtn ${Hangar.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
          <span class="sep"></span>${[-1, 0, 1, 2, 3, 4, 5, 6, 7].map(c => `<button class="chipbtn cost ${Hangar.cost === c ? 'on' : ''}" data-c="${c}">${c < 0 ? 'Any' : c >= 7 ? '7+' : c}</button>`).join('')}
          <input id="h-q" type="search" placeholder="Search cards" value="${esc(Hangar.q)}" aria-label="Search cards"></div>
        ${stratBannerHTML(save)}
        <div class="coll-grid">${grid}</div>
      </section>
      <button class="deck-fab" id="h-jump" aria-label="Show your deck">${esc(activeDeck(save).name)} <b>${save.deck.length}/${size}</b></button>
      <aside class="deckpanel">
        ${deckBarHTML(save)}
        <div class="dp-head"><h3>Cards</h3><div class="dp-count ${save.deck.length === size ? 'ok' : 'bad'}"><b>${save.deck.length}</b>/${size}</div></div>
        <div class="curve">${curve.map((n, i) => `<div class="bar"><i style="height:${(n / cmax) * 100}%"></i><span>${i >= 7 ? '7+' : i}</span><em>${n || ''}</em></div>`).join('')}</div>
        <div class="muted small">${types.unit} units · ${types.spell} protocols${types.gear ? ` · ${types.gear} gear` : ''}${types.trap ? ` · ${types.trap} traps` : ''}</div>
        ${deckStratHTML(save)}
        <div class="deck-list">${rows || '<p class="muted">Empty deck.</p>'}</div>
        <div class="dp-btns"><button class="btn small" id="h-auto" ${save.deck.length >= size ? 'disabled title="Your deck is full"' : ''}>Fill empty slots</button><button class="btn small ghost" id="h-clear">Clear</button></div>
        ${signatureHTML(save)}
        <h3>Commander Power</h3><div class="powers">${powers}</div>
      </aside>
    </div></div>`;
  const root = $('#hangar');
  root.onclick = e => {
    if (cmdBarClick(e, Hangar.back)) return;
    const t = e.target;
    const add = t.closest('[data-add]'), rm = t.closest('[data-rm]'), f = t.closest('[data-f]'), c = t.closest('[data-c]'), pw = t.closest('[data-pw]');
    const cr = t.closest('[data-craft]'), md = t.closest('[data-mode]'), dk = t.closest('[data-dk]');
    if (!t.closest('[data-dk-del]')) Brief.delArm = false;
    const st = t.closest('[data-strat]');
    if (st) { Hangar.strat = st.dataset.strat || null; Hangar.filter = 'all'; Hangar.cost = -1; Hangar.q = ''; SFX.click(); renderHangar(); const g = $('.coll'); if (g && TOUCH.on) g.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); return; }
    if (dk) { const i = +dk.dataset.dk; if (i !== save.activeDeck) { const short = switchDeck(save, i, size); persist(); SFX.click(); toast(`Switched to ${esc(activeDeck(save).name)}.${short ? ` It needs ${size - save.deck.length} more cards.` : ''}`); } renderHangar(); return; }
    if (t.closest('[data-dk-new]')) { const tmp = { coll: save.coll, deck: [] }; autoFillDeck(tmp, size); if (addSavedDeck(save, 'New deck', tmp.deck, size)) { persist(); SFX.click(); toast('New deck created from your best cards. Rename it below.'); } renderHangar(); return; }
    if (t.closest('[data-dk-dup]')) { if (addSavedDeck(save, activeDeck(save).name + ' copy', save.deck, size)) { persist(); SFX.click(); toast('Deck copied. You are now editing the copy.'); } renderHangar(); return; }
    if (t.closest('[data-dk-del]')) {
      if (!Brief.delArm) { Brief.delArm = true; renderHangar(); return; }
      const name = activeDeck(save).name; Brief.delArm = false;
      if (deleteDeck(save, save.activeDeck, size)) { persist(); toast(`Deleted ${esc(name)}.`); }
      renderHangar(); return;
    }
    if (md) { Hangar.mode = md.dataset.mode; Hangar.filter = 'all'; renderHangar(); return; }
    if (cr) { craftDialog(cr.dataset.craft, renderHangar); return; }
    if (t.id === 'h-shop') { openShop(Hangar.back); return; } // Done in the Depot returns to where the Hangar was opened from
    if (add) {
      const id = add.dataset.add, d = D(id), used = inDeck[id] || 0;
      if (save.deck.length >= size) toast(`Deck is full (${size}). Remove a card first.`);
      else if (used >= Math.min(save.coll[id], maxCopies(d))) toast(used >= maxCopies(d) ? `Max ${maxCopies(d)} cop${maxCopies(d) > 1 ? 'ies' : 'y'} per deck.` : 'You don\'t own more copies.');
      else { save.deck.push(id); save.deckEdited = true; SFX.click(); persist(); renderHangar(); }
      return;
    }
    if (rm) { const i = save.deck.indexOf(rm.dataset.rm); if (i >= 0) { save.deck.splice(i, 1); save.deckEdited = true; } SFX.click(); persist(); renderHangar(); return; }
    if (f) { Hangar.filter = f.dataset.f; renderHangar(); return; }
    if (c) { Hangar.cost = +c.dataset.c; renderHangar(); return; }
    if (pw) { save.power = pw.dataset.pw; persist(); renderHangar(); return; }
    if (t.closest('#h-jump')) { $('.deckpanel').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); return; }
    if (t.id === 'h-auto') { const n = size - save.deck.length; if (n <= 0) return; autoFillDeck(save, size); persist(); renderHangar(); toast(`Filled ${n} empty slot${n > 1 ? 's' : ''}. Your own picks were kept.`); }
    if (t.id === 'h-clear') { save.deck = []; persist(); renderHangar(); }
    if (t.id === 'h-done') {
      if (save.deck.length !== size) toast(`Your deck needs exactly ${size} cards (currently ${save.deck.length}).`);
      Hangar.back();
    }
  };
  const dn = $('#dk-name');
  if (dn) {
    dn.onchange = () => { renameDeck(save, save.activeDeck, dn.value); persist(); renderHangar(); };
    dn.onkeydown = ev => { if (ev.key === 'Enter') dn.blur(); };
  }
  const q = $('#h-q');
  q.oninput = () => { Hangar.q = q.value; const pos = q.selectionStart; renderHangar(); const q2 = $('#h-q'); q2.focus(); q2.setSelectionRange(pos, pos); };
}

// The deck switcher at the top of the Hangar's deck panel.
function deckBarHTML(save) {
  const decks = save.decks, slots = deckSlots(save), cur = save.activeDeck, room = decks.length < slots;
  const tabs = decks.map((d, i) => `<button class="dk-tab ${i === cur ? 'on' : ''}" data-dk="${i}" ${i === cur ? 'aria-current="true"' : ''} title="${i === cur ? 'You are editing this deck' : 'Switch to this deck'}"><span>${esc(d.name)}</span>${i === cur ? '<i>Editing</i>' : ''}</button>`).join('');
  const hint = slots < 3 && economyOpen(save) ? '<p class="muted small">Repair the Armory at Anchorage to keep up to 3 decks.</p>' : '';
  return `<div class="dk-bar">
    <div class="dk-h"><h3>Your decks</h3>${slots > 1 ? `<span class="muted small">${decks.length} of ${slots} slots</span>` : ''}</div>
    ${slots > 1 ? `<div class="dk-tabs">${tabs}${room ? '<button class="dk-tab add" data-dk-new>+ New deck</button>' : ''}</div>` : ''}
    <label class="dk-name"><span class="muted small">Deck name</span><input id="dk-name" value="${esc(decks[cur].name)}" maxlength="${DECK_NAME_MAX}" autocomplete="off"></label>
    <div class="dk-foot"><span class="dk-saved">${ico('check')} Changes save automatically</span>
      <span class="dk-acts">${room ? '<button class="linkbtn" data-dk-dup>Duplicate</button>' : ''}${decks.length > 1 ? `<button class="linkbtn ${Brief.delArm ? 'danger' : ''}" data-dk-del>${Brief.delArm ? 'Tap again to delete' : 'Delete'}</button>` : ''}</span></div>
    ${hint}</div>`;
}

// Strategies available so far: their faction's set is unlocked.
function openStrategies(save) {
  return Object.keys(STRATEGIES).filter(k => strategyCards(k).some(d => setUnlocked(save, d.tier)));
}

// Deck sidebar: which strategies this deck leans toward, or suggestions when it has none.
function deckStratHTML(save) {
  if (typeof STRATEGIES === 'undefined') return '';
  const open = openStrategies(save); if (!open.length) return '';
  const mine = deckStrategies(save.deck).filter(x => x.n >= 2 && STRATEGIES[x.key]).slice(0, 2);
  const chip = (k, extra) => `<button class="strat-chip ${Hangar.strat === k ? 'on' : ''}" data-strat="${Hangar.strat === k ? '' : k}" style="--h:${FACTIONS[STRATEGIES[k].faction].hue}" title="${esc(STRATEGIES[k].text)}"><b>${esc(STRATEGIES[k].name)}</b>${extra || ''}</button>`;
  if (mine.length) return `<div class="strat-box"><div class="sb-h">Strategy</div>${mine.map(x => chip(x.key, `<span>${x.n} card${x.n > 1 ? 's' : ''}${x.engine ? ' · engine' : ' · no engine yet'}</span>`)).join('')}</div>`;
  // suggest strategies from the factions already in the deck, newest sets first
  const facN = {}; save.deck.forEach(id => { const f = D(id).faction; facN[f] = (facN[f] || 0) + 1; });
  const tierOf = k => Math.min(...strategyCards(k).map(d => d.tier));
  const pickN = open.slice().sort((a, b) => (facN[STRATEGIES[b].faction] || 0) - (facN[STRATEGIES[a].faction] || 0) || tierOf(b) - tierOf(a)).slice(0, 4);
  return `<div class="strat-box"><div class="sb-h">Pick a strategy</div><p class="muted small">Decks built around one plan are stronger. Tap one to see its cards.</p><div class="strat-row">${pickN.map(k => chip(k)).join('')}</div></div>`;
}

// Banner above the collection while it is filtered to one strategy.
function stratBannerHTML(save) {
  const k = Hangar.strat; if (!k || typeof STRATEGIES === 'undefined' || !STRATEGIES[k]) return Hangar.mode === 'deck' && typeof STRATEGIES !== 'undefined' ? `<div class="strat-all"><span class="muted small">Strategies:</span>${openStrategies(save).map(x => `<button class="strat-mini" data-strat="${x}" style="--h:${FACTIONS[STRATEGIES[x].faction].hue}">${esc(STRATEGIES[x].name)}</button>`).join('')}</div>` : '';
  const S = STRATEGIES[k], all = strategyCards(k), eng = all.filter(d => d.engine);
  const owned = all.filter(d => (save.coll[d.id] || 0) > 0).length;
  return `<div class="strat-banner" style="--h:${FACTIONS[S.faction].hue}"><div><div class="m-eyebrow">${esc(FACTIONS[S.faction].name)} strategy</div><h3>${esc(S.name)}</h3><p>${esc(S.text)}</p>
    <p class="muted small">${eng.length ? `Engine card: <b>${eng.map(d => esc(d.name)).join(', ')}</b>. ` : ''}You own ${owned} of its ${all.length} cards.${Hangar.mode === 'deck' && owned < all.length ? ' Switch to Craft cards to see the rest.' : ''}</p></div>
    <button class="btn small ghost" data-strat="">Show all cards</button></div>`;
}

function signatureHTML(save) {
  const sig = stationLv(save, 'armory') >= 2;
  const sd = sig && save.signature ? D(save.signature) : null;
  return `${sig ? `<h3>Signature card</h3>${sd ? `<div class="sig-slot"><span class="dr-icon" style='background-image:${artPlate(save.signature)}'></span><span><b>${esc(sd.name)}</b><br><span class="muted small">${save.deck.includes(save.signature) ? 'Always in your opening hand' + (stationLv(save, 'armory') >= 3 ? ', 1 cheaper' : '') + '.' : 'Not in this deck, so it has no effect.'}</span></span></div>` : `<p class="muted small">${TOUCH.on ? 'Press and hold' : 'Right-click'} a card in your deck and choose "Make signature card".</p>`}` : ''}`;
}

// ============================================================================
// CODEX, SETTINGS, TITLE
// ============================================================================
function showCodex(back) { openArchive('manual', back || null); }
function showCodexOld(back) {
  const save = App.save;
  const order = Object.keys(KEYWORDS);
  const list = order.map(k => save && save.codex.includes(k)
    ? `<div class="cx"><b>${esc(KEYWORDS[k].name)}</b><span>${esc(KEYWORDS[k].text)}</span></div>`
    : `<div class="cx locked"><b>???</b><span>Not yet encountered.</span></div>`).join('');
  const m = modal(`<div class="m-eyebrow">Field manual</div><h2>Codex</h2>
    <div class="codex">${list}</div>
    <h3>Controls</h3><div class="codex"><div class="cx"><b>Play a card</b><span>Click it. If it needs a target, click the target.</span></div><div class="cx"><b>Attack</b><span>Click a glowing unit (or your commander with Gear), then an enemy.</span></div><div class="cx"><b>Cancel</b><span>Right-click or press Esc.</span></div><div class="cx"><b>End turn</b><span>The END TURN button, or press E.</span></div><div class="cx"><b>Inspect</b><span>Hover anything for details.</span></div></div>
    <div class="m-actions"><button class="btn primary" data-a="close">Close</button></div>`, 'wide');
  m.onclick = e => { if (e.target.dataset.a) { closeModal(); if (back) back(); } };
}

const SetUI = { tab: 'audio' };
function showSettings(back) {
  const save = App.save, tab = SetUI.tab;
  const sw = (k, label, hint) => `<div class="set-row"><div><b>${label}</b>${hint ? `<span>${hint}</span>` : ''}</div><button class="switch ${Settings.get(k) ? 'on' : ''}" role="switch" aria-checked="${!!Settings.get(k)}" data-sw="${k}" aria-label="${esc(label)}"><i></i></button></div>`;
  const slider = (k, label) => `<div class="set-row"><div><b>${label}</b></div><div class="slider"><input type="range" min="0" max="100" step="5" id="set-${k}" data-sl="${k}" value="${Settings.get(k)}" aria-label="${esc(label)}"><output>${Settings.get(k)}</output></div></div>`;
  const seg = (k, label, opts, hint) => `<div class="set-row"><div><b>${label}</b>${hint ? `<span>${hint}</span>` : ''}</div><div class="seg">${opts.map(([v, l]) => `<button class="${Settings.get(k) === v ? 'on' : ''}" data-seg="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  let body = '';
  if (tab === 'audio') body = slider('master', 'Master volume') + slider('music', 'Music') + slider('sfx', 'Sound effects') + slider('voice', 'Voices') + sw('subs', 'Subtitles', 'Show spoken lines in cutscenes.') + sw('muted', 'Mute all audio', 'Silences music, effects and voices.')
    + '<p class="muted small">The soundtrack is generated live and shifts between menu, battle and boss moods.</p>';
  if (tab === 'gameplay') body = (save ? `<div class="set-row col"><div><b>Difficulty</b><span>Change any time. Affects enemy Health and how well they play.</span></div><div class="diff-row">${Object.entries(DIFFICULTY).map(([k, d]) => `<button class="diff ${save.diff === k ? 'on' : ''}" data-d="${k}"><b>${d.name}</b><span>${d.text}</span></button>`).join('')}</div></div>` : '')
    + seg('speed', 'Animation speed', [['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']], 'Also speeds up the enemy turn.')
    + sw('tips', 'Tactical Advisor', 'Show mission tips during battle.')
    + sw('log', 'Combat log', 'Show the running log of plays and attacks.')
    + sw('confirmEnd', 'Confirm end turn', 'Ask before ending a turn while you still have moves.')
    + sw('autoEnd', 'Auto end turn', 'End your turn automatically when nothing is left to do.');
  if (tab === 'display') body = sw('particles', 'Particle effects', 'Bolts, sparks and explosions.')
    + sw('shake', 'Screen shake', 'Shake on heavy hits.')
    + sw('hoverZoom', 'Enlarge cards on hover', 'Lift and zoom cards in your hand.')
    + '<div class="set-row"><div><b>Fullscreen</b><span>Play without browser chrome. Esc exits.</span></div><button class="btn small" data-a="fullscreen">Toggle</button></div>'
    + (REDUCED ? '<p class="muted small">Your system asks for reduced motion, so animations are kept short.</p>' : '');
  const buildLine = typeof BUILD !== 'undefined' ? `<p class="muted small">Build ${BUILD.n} · ${BUILD.date}</p>` : '';
  if (tab === 'data') body = buildLine + (save ? `<p class="muted small">${Store.db ? 'Progress saves automatically to your account and this browser.' : 'Progress saves automatically in this browser. Copy a backup code to move it to another device.'}</p>
    <div class="m-actions left"><button class="btn" data-a="export">Copy backup code</button><button class="btn" data-a="import">Restore from code</button><button class="btn danger" data-a="reset">Erase campaign</button></div><div id="set-extra"></div>${offlineHTML()}${playtestHTML()}`
    : '<p class="muted">No campaign yet.</p><div class="m-actions left"><button class="btn" data-a="import">Restore from code</button></div><div id="set-extra"></div>' + offlineHTML() + playtestHTML());
  const tabs = [['audio', 'Audio'], ['gameplay', 'Gameplay'], ['display', 'Display'], ['data', 'Save Data']];
  const m = modal(`<h2>Settings</h2><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="set-body">${body}</div><div class="m-actions"><button class="btn primary" data-a="close">Done</button></div>`, 'settings-modal');
  m.oninput = e => { const k = e.target.dataset.sl; if (!k) return; Settings.set(k, +e.target.value); e.target.nextElementSibling.textContent = e.target.value; };
  m.onchange = e => { if (e.target.dataset.sl === 'sfx' || e.target.dataset.sl === 'master') SFX.click(); };
  m.onclick = async e => {
    SFX.init();
    const t = e.target.closest('[data-tab],[data-sw],[data-seg],[data-d],[data-a]'); if (!t) return;
    if (t.dataset.tab) { SetUI.tab = t.dataset.tab; return showSettings(back); }
    if (t.dataset.sw) { Settings.set(t.dataset.sw, !Settings.get(t.dataset.sw)); SFX.click(); if (UI.s && App.screen === 'battle') renderBattle(); return showSettings(back); }
    if (t.dataset.seg) { Settings.set(t.dataset.seg, t.dataset.v); SFX.click(); return showSettings(back); }
    if (t.dataset.d) { save.diff = t.dataset.d; persist(); toast(`Difficulty: ${DIFFICULTY[save.diff].name}. Applies from your next battle.`); return showSettings(back); }
    const a = t.dataset.a;
    if (a.startsWith('pt-')) return playtestClick(a, m);
    if (a === 'offline') { Offline.start(true); return; }
    if (a === 'close') { closeModal(); if (back) back(); else if (App.screen === 'map') openMap(); else if (App.screen === 'title') openTitle(); }
    if (a === 'fullscreen') { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (err) { toast('Fullscreen is not available here.'); } }
    if (a === 'export') {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
      $('#set-extra').innerHTML = `<textarea id="bk" readonly rows="4" aria-label="Backup code">${code}</textarea><p class="muted small">Keep this code somewhere safe.</p>`;
      $('#bk').select();
      try { await navigator.clipboard.writeText(code); toast('Backup code copied.'); } catch (err) { toast('Select the code and copy it.'); }
    }
    if (a === 'import') $('#set-extra').innerHTML = '<textarea id="bk-in" rows="4" placeholder="Paste a backup code" aria-label="Backup code to restore"></textarea><div class="m-actions left"><button class="btn primary" data-a="do-import">Restore</button></div>';
    if (a === 'do-import') {
      try { const s2 = migrate(JSON.parse(decodeURIComponent(escape(atob($('#bk-in').value.trim()))))); if (!s2 || !s2.cleared) throw 0; App.save = s2; persist(); toast('Campaign restored.'); closeModal(); openMap(); }
      catch (err) { toast('That code could not be read. Check that it was copied completely.'); }
    }
    if (a === 'reset') $('#set-extra').innerHTML = '<div class="warnbox">Erase all progress, cards and stats? This cannot be undone. <button class="btn danger" data-a="reset-yes">Erase everything</button></div>';
    if (a === 'reset-yes') { App.save = null; Store.clear(); UI.s = null; closeModal(); openTitle(); }
  };
}

function openTitle() {
  showScreen('title');
  const save = App.save, next = save && nextEncounter(save);
  const cleared = save ? ENCOUNTERS.filter(e => save.cleared[e.id]).length : 0;
  $('#title').innerHTML = `<div class="title-hero">
    <div class="title-main">
      <div class="eyebrow">A tactical card campaign</div>
      <h1 class="logo"><span class="lg-1">STARFALL</span><span class="lg-2">PROTOCOL</span></h1>
      <p class="tagline">Command a fleet across six sectors of a galaxy that has started to sing. Build your deck, learn each new threat, and silence the Choir.</p>
      <nav class="tmenu">
        ${save ? `<button class="tm primary" id="t-cont"><span class="tm-k">Continue</span><span class="tm-s">${next ? `${esc(SECTORS[next.sector].name)} · ${esc(next.name)}` : 'Campaign complete'}</span></button>` : ''}
        <button class="tm ${save ? '' : 'primary'}" id="t-new"><span class="tm-k">New campaign</span><span class="tm-s">${save ? 'Start over with a new commander' : 'Enlist and begin training'}</span></button>
        <button class="tm" id="t-set"><span class="tm-k">Settings</span><span class="tm-s">Audio, speed, display, saves</span></button>
      </nav>
    </div>
    <aside class="signal" aria-label="Signal readout">
      <div class="sig-h">Incoming transmission</div>
      <div class="sig-wave" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--d:${(i * 0.07).toFixed(2)}s;--a:${(0.3 + Math.abs(Math.sin(i * 0.7)) * 0.7).toFixed(2)}"></i>`).join('')}</div>
      <dl><dt>Origin</dt><dd>Galactic core</dd><dt>Pattern</dt><dd>Harmonic, repeating</dd><dt>Status</dt><dd>${save && save.finished ? 'Silenced' : 'Unresolved'}</dd><dt>Campaign</dt><dd>${save ? `${cleared} / ${ENCOUNTERS.length} missions` : 'Not started'}</dd></dl>
    </aside>
  </div>
  <div class="title-foot">6 sectors · ${ENCOUNTERS.length} battles · ${CARD_LIST.filter(d => !d.token).length} collectible cards${typeof BUILD !== 'undefined' ? ` · build ${BUILD.n} (${BUILD.date})` : ''}</div>`;
  $('#title').onclick = e => {
    SFX.init();
    const b = e.target.closest('.tm'); if (b) SFX.click();
    if (e.target.closest('#t-cont')) openMap();
    if (e.target.closest('#t-new')) newCampaignDialog();
    if (e.target.closest('#t-set')) showSettings();
  };
}

function newCampaignDialog() {
  const has = !!App.save;
  const m = modal(`<div class="m-eyebrow">New campaign</div><h2>Enlist</h2>
    <label class="field-l" for="nc-name">Commander name</label><input id="nc-name" maxlength="24" value="${esc((App.save && App.save.name) || 'Commander')}">
    <label class="field-l">Difficulty</label><div class="diff-row">${Object.entries(DIFFICULTY).map(([k, d]) => `<button class="diff ${k === 'officer' ? 'on' : ''}" data-d="${k}"><b>${d.name}</b><span>${d.text}</span></button>`).join('')}</div>
    ${has ? '<div class="warnbox">Starting over replaces your current campaign.</div>' : ''}
    <div class="m-actions"><button class="btn ghost" data-a="back">Back</button><button class="btn primary" data-a="go">Begin</button></div>`);
  let diff = 'officer';
  m.onclick = e => {
    const d = e.target.closest('[data-d]'); if (d) { diff = d.dataset.d; $$('.diff', m).forEach(b => b.classList.toggle('on', b === d)); return; }
    const a = e.target.dataset.a;
    if (a === 'back') closeModal();
    if (a === 'go') { App.save = newSave($('#nc-name').value.trim() || 'Commander', diff); persist(); closeModal(); Cinema.play('opening', openMap); }
  };
}
