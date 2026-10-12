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

function cardHTML(id, o) {
  o = o || {};
  const d = D(id), f = FACTIONS[d.faction] || FACTIONS.neutral;
  const cost = o.cost != null ? o.cost : d.cost;
  const cc = cost < d.cost ? 'down' : cost > d.cost ? 'up' : '';
  const stats = (d.type === 'unit' || d.type === 'gear')
    ? `<div class="c-atk">${d.atk}</div><div class="c-hp${d.type === 'gear' ? ' dur' : ''}">${d.hp}</div>` : '';
  return `<div class="card t-${d.type} r-${d.rarity} ${o.cls || ''}" style="--h:${f.hue}" data-card="${id}" ${o.attrs || ''}>
    <div class="c-body">
      <div class="c-art" style='background-image:${artPlate(id)}'></div>
      <div class="c-plate"><div class="c-name${d.name.length > 13 ? (d.name.length > 18 ? ' xlong' : ' long') : ''}">${esc(d.name)}</div><div class="c-code"><span>${typeLabel(d)}</span><i class="rar" title="${d.rarity}"></i></div></div>
      <div class="c-text${d.text.length > 62 ? ' dense' : ''}">${fmt(d.text)}</div>
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
  if (was !== TOUCH.on && App.screen === 'battle' && UI.s) renderBattle();
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
  if (id === 'title' || id === 'hangar' || id === 'shop') document.body.style.setProperty('--sec-h', id === 'shop' ? 30 : 210);
  if (typeof Scene !== 'undefined') {
    if (id === 'battle') Scene.pause();
    else { Scene.resume(); if (id !== 'map') Scene.mood(id === 'hangar' || id === 'station' ? 'hangar' : id === 'shop' ? 'shop' : 'title'); if (prevScreen !== id) Scene.warp(); }
  }
  if (id === 'battle' && UI.enc) {
    if (Music.setTheme) Music.setTheme(UI.enc.sector);
    Music.setMood(UI.enc.final ? 'final' : UI.enc.boss || UI.enc.elite ? 'boss' : 'battle');
  } else Music.setMood('menu');
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
  const s = newGame(buildBattle(App.save, enc));
  UI.s = s;
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

// Widescreen stage (1280x760) for desktops, tablets and phones on their side.
// Phones held upright get a 600-wide portrait stage that stretches to fill the height.
function fitStage() {
  const st = $('#stage'); if (!st) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const portrait = vh > vw * 1.05;
  const W = portrait ? 600 : 1280;
  const H = portrait ? Math.max(960, Math.min(1400, Math.round(vh / (vw / W)))) : 760;
  const sc = Math.min(vw / W, vh / H);
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
    <div class="h-frame"><div class="h-art" style='background-image:${heroArt(p)}'></div><div class="h-ring"></div></div>
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
  const tip = tips.length ? tips[Math.min(Math.max(0, UI.playerTurns - 1), tips.length - 1)] : '';
  const handN = P.hand.length;
  const HW = UI.portrait ? 576 : 880, CW = UI.portrait ? 152 : 122, fitN = Math.floor(HW / CW);
  const overlap = handN > fitN ? -Math.min(UI.portrait ? 84 : 62, Math.ceil((handN * CW - HW) / (handN - 1))) : 4;
  if (UI.peek != null && (UI.peek >= handN || UI.busy || !myTurnNow(s))) UI.peek = null;
  const myTurn = s.active === 0 && !s.over;
  const hand = P.hand.map((c, i) => {
    const playable = myTurn && !UI.busy && !UI.mode && canPlay(s, 0, i);
    const sel = UI.mode && UI.mode.k === 'play' && UI.mode.hi === i;
    if (!UI.seenCards.has(c.uid)) UI.seenCards.set(c.uid, performance.now());
    const fresh = performance.now() - UI.seenCards.get(c.uid) < 500;
    return `<div class="hand-slot${fresh ? ' drawn' : ''}${UI.peek === i ? ' peek' : ''}" data-key="c${c.uid}" style="margin-left:${i ? overlap : 0}px;--i:${i};--n:${handN}">${cardHTML(c.id, { cost: costOf(s, 0, c), cls: (playable ? 'playable' : '') + (sel ? ' selected' : ''), attrs: `data-hand="${i}"` })}</div>`;
  }).join('');
  const seeCosts = stationLv(App.save, 'observatory') >= 3;
  const ehand = E.hand.map(c => `<i class="cback">${seeCosts ? `<em>${costOf(s, 1, c)}</em>` : ''}</i>`).join('');
  const crystals = Array.from({ length: Math.max(E.maxMana, E.mana) }, (_, k) => `<i class="${k < E.mana ? 'full' : ''}"></i>`).join('');
  const kind = UI.enc.final ? 'Final' : UI.enc.boss ? 'Boss' : UI.enc.elite ? 'Elite' : 'Mission ' + UI.enc.id;
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
  if (e.t === 'play' && e.pi === 0) { const d = D(e.id); if (d.type === 'unit') inc('units'); if (d.type === 'spell' && !d.token) inc('spells'); inc('f_' + d.faction); }
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
        logLine(`${who(e.pi)} played <b>${esc(d.name)}</b>${e.tgt != null && UI.names[e.tgt] ? ` on ${nm(e.tgt)}` : ''}`);
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
        if (floater(e.uid, '-' + e.n, 'dmg')) pending = true;
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
      case 'countered': toast('The spell was cancelled!'); logLine('Spell cancelled by a Trap'); break;
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
    if (a === 'concede') { closeModal(); UI.s.over = true; UI.s.winner = 1; endBattle(); }
  };
}

function contractLines(done) {
  return done.map(c => `<div class="reward-chip contract"><span class="rc-icon">${ico('contract')}</span><span><b>Contract complete:</b> ${esc(CONTRACTS[c.id].text)}</span><b class="rc-val">+${CONTRACTS[c.id].reward} Credits</b></div>`).join('');
}

function endBattle() {
  const s = UI.s, enc = UI.enc, save = App.save;
  if (UI.ended === s) return; UI.ended = s;
  Tip.hide();
  const won = s.winner === 0;
  const tally = Object.assign({}, UI.tally);
  if (!won) {
    save.stats.losses++;
    const done = applyContracts(save, tally);
    persist(); SFX.lose(); if (Music.stinger) Music.stinger('defeat');
    const m = modal(`<div class="m-eyebrow danger">Defeat</div><h2>${esc(enc.name)}</h2>
      <p>Your flagship withdraws to repair. Adjust your deck in the Hangar and try again.</p>
      ${done.length ? `<div class="rewards">${contractLines(done)}</div>` : ''}
      ${(enc.tips || []).length ? `<div class="advisor inline"><div class="adv-h">Advisor</div><div class="adv-t">${pick(enc.tips)}</div></div>` : ''}
      ${save.diff !== 'cadet' && save.stats.losses >= 3 ? '<p class="muted">Struggling? You can switch to Cadet difficulty in Settings at any time.</p>' : ''}
      <div class="m-actions"><button class="btn" data-a="map">Back to Star Map</button><button class="btn" data-a="hangar">Hangar</button><button class="btn primary" data-a="retry">Retry</button></div>`);
    m.onclick = e => { const a = e.target.dataset.a; if (!a) return; UI.s = null; if (a === 'retry') startBattle(enc); else if (a === 'hangar') { closeModal(); openHangar(() => openBriefing(enc)); } else { closeModal(); openMap(); } };
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
  if (graduated) { ['packs', 'crafting'].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); }); refillContracts(save); }
  if (rw.alloy) ensureStation(save).alloy += rw.alloy;
  if (rw.scrap) save.scrap += rw.scrap;
  const legendScrap = rw.legendary ? gainCard(save, rw.legendary) : 0;
  const granted = [];
  if (firstClear && enc.grant) Object.entries(enc.grant).forEach(([id, n]) => { grantCard(save, id, n); for (let k = 0; k < n; k++) granted.push(id); });
  const unlocked = [];
  if (firstClear && enc.unlockPowers) enc.unlockPowers.forEach(p => { if (!save.powers.includes(p)) { save.powers.push(p); unlocked.push(p); } });
  if (!save.power && save.powers.length) save.power = save.powers[0];
  const newSector = highestSector(save) > prevSector;
  if (granted.length) integrateGrants(save, granted, deckSizeFor(save));
  if (newSector) { autoFillDeck(save, deckSizeFor(save)); refillContracts(save); }
  persist();
  UI.s = null;

  const set = PACK_SETS[rw.packTier - 1];
  const chips = rw.credits ? [`<div class="reward-chip"><span class="rc-icon">${ico('credits')}</span><span>${graduated ? 'Graduation bonus' : firstClear ? 'Mission reward' : 'Replay reward'}</span><b class="rc-val">+${rw.credits} Credits</b></div>`] : [];
  if (rw.packs) chips.push(`<div class="reward-chip rc-pack"><span class="rc-icon">${ico('pack')}</span><span>${esc(set.name)}${rw.packs > 1 ? ' ×' + rw.packs : ''}</span><b class="rc-val">+${rw.packs} pack${rw.packs > 1 ? 's' : ''}</b></div>`);
  if (rw.alloy) chips.push(`<div class="reward-chip rc-alloy"><span class="rc-icon">${ico('alloy')}</span><span>Salvaged Alloy for Anchorage</span><b class="rc-val">+${rw.alloy} Alloy</b></div>`);
  if (rw.scrap) chips.push(`<div class="reward-chip"><span class="rc-icon">${ico('scrap')}</span><span>Salvaged from the Singularity</span><b class="rc-val">+${rw.scrap} Scrap</b></div>`);
  const bits = [];
  if (rw.legendary) bits.push(`<div class="legend-reveal"><div class="lr-card">${cardHTML(rw.legendary, { cls: 'big' })}</div><div><div class="m-eyebrow">Legendary acquired</div><h3 class="lr-name">${esc(D(rw.legendary).name)} joins your fleet</h3><p class="muted">${legendScrap ? `You already owned this card, so it became ${legendScrap} Scrap.` : 'Add it to your deck in the Hangar.'}</p></div></div>`);
  if (granted.length) {
    const c = {}; granted.forEach(id => c[id] = (c[id] || 0) + 1);
    bits.push(`<div class="got"><b>Supply crate:</b> ${Object.entries(c).map(([id, n]) => `<span class="chip" data-card="${id}">${esc(D(id).name)}${n > 1 ? ' ×' + n : ''}</span>`).join(' ')}<div class="muted">New cards were slotted into your deck so you can try them next battle.</div></div>`);
  }
  unlocked.forEach(p => bits.push(`<div class="got power-got"><b>New commander power:</b> ${powerIco(p)} ${esc(HEROPOWERS[p].name)}: ${esc(HEROPOWERS[p].text)} <span class="muted">Equip it in the Hangar.</span></div>`));
  if (newSector) bits.push(`<div class="got"><b>Deck size increased to ${deckSizeFor(save)}.</b> <span class="muted">Your deck was topped up automatically. A new pack set is available at the Supply Depot.</span></div>`);
  if (graduated) bits.push('<div class="got"><b>Training complete: Supply Depot and Anchorage unlocked.</b> <span class="muted">Battles and contracts now earn Credits for Supply Packs at the Depot, and Alloy to repair Anchorage, your new forward base. Craft the cards you want with Scrap in the Hangar.</span></div>');
  const unopened = unopenedPacks(save);
  const m = modal(`<div class="m-eyebrow ok">Victory</div><h2>${esc(enc.name)}</h2>
    ${enc.victory && firstClear ? `<p class="story">${esc(enc.victory)}</p>` : ''}
    ${chips.length || done.length ? `<div class="rewards">${chips.join('')}${contractLines(done)}</div>` : ''}
    ${economyOpen(save) ? `<div class="wallet-line"><span>${ico('credits')} <b>${save.credits}</b> Credits</span><span>${ico('scrap')} <b>${save.scrap}</b> Scrap</span><span>${ico('alloy')} <b>${ensureStation(save).alloy}</b> Alloy</span>${unopened ? `<span>${ico('pack')} <b>${unopened}</b> unopened pack${unopened > 1 ? 's' : ''}</span>` : ''}</div>` : ''}
    ${bits.join('')}
    <div class="m-actions">${unopened ? `<button class="btn" data-a="open">Open packs (${unopened})</button>` : ''}<button class="btn" data-a="hangar">Hangar</button>${upgradesAvailable(save) ? `<button class="btn" data-a="station">Anchorage (${upgradesAvailable(save)} ready)</button>` : ''}<button class="btn primary" data-a="go">${enc.final ? 'Continue' : 'Star Map'}</button></div>`, 'wide');
  m.onclick = e => {
    const a = e.target.dataset.a; if (!a) return; closeModal();
    if (enc.final) return showEnding();
    if (a === 'open') openShop(openMap, true);
    else if (a === 'hangar') openHangar(openMap);
    else if (a === 'station') openStation(openMap);
    else openMap();
  };
}

function integrateGrants(save, ids, size) {
  const fresh = ids.slice();
  const deck = save.deck.slice();
  fresh.forEach(id => { if (deck.filter(x => x === id).length < Math.min(save.coll[id] || 0, maxCopies(D(id)))) deck.push(id); });
  const protectedIds = new Set(fresh);
  while (deck.length > size) {
    let worst = -1, ws = 1e9;
    deck.forEach((id, i) => { if (protectedIds.has(id)) return; const r = cardRating(id); if (r < ws) { ws = r; worst = i; } });
    if (worst < 0) worst = 0;
    deck.splice(worst, 1);
  }
  save.deck = deck;
  if (deck.length < size) autoFillDeck(save, size);
}

function showEnding() {
  const save = App.save; save.finished = true; persist();
  const mins = Math.round((save.stats.playMs || 0) / 60000);
  showScreen('title');
  $('#title').innerHTML = `<div class="title-wrap ending">
    <div class="eyebrow">Campaign complete</div>
    <h1 class="logo">STARFALL<span>PROTOCOL</span></h1>
    <p class="story big">The Choir is silent. The galaxy is quiet, and it belongs to its people again.</p>
    <div class="stats-row"><div><b>${save.stats.wins}</b><span>Victories</span></div><div><b>${save.stats.losses}</b><span>Defeats</span></div><div><b>${collectionCount(save)}</b><span>Cards collected</span></div><div><b>${mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm'}</b><span>Time in command</span></div></div>
    <p class="muted">Thank you for playing, ${esc(save.name)}. You can keep replaying any battle from the Star Map to finish your collection, or start a new campaign on Admiral difficulty.</p>
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
    const m = modal(`<div class="m-eyebrow">Sector ${String(hs + 1).padStart(2, '0')} // new heading</div><h2>${esc(sec.name)}</h2><p class="story">${esc(sec.intro)}</p>
      ${hs > 0 ? `<p class="muted">Deck size is now <b>${DECK_SIZES[hs]}</b> cards.</p>` : ''}<div class="m-actions"><button class="btn primary" data-a="ok">Set course</button></div>`, 'sector-modal');
    m.onclick = e => { if (e.target.dataset.a) closeModal(); };
  }
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
  const shipAt = next && next.sector === si ? pos[next.id] : null;
  // sector strip
  const strip = SECTORS.map((s, i) => {
    const un = sectorUnlocked(save, i), es = ENCOUNTERS.filter(e => e.sector === i), dn = es.filter(e => save.cleared[e.id]).length;
    if (!un && i > hs + 1) return `<div class="gs hidden-sec"><span class="gs-n">${String(i + 1).padStart(2, '0')}</span><span class="gs-name">· · ·</span></div>`;
    return `<button class="gs ${i === si ? 'on' : ''} ${un ? '' : 'locked'}" ${un ? `data-sec="${i}"` : 'disabled'} style="--h:${s.hue}">
      <span class="gs-art" ${un ? `style='background-image:${portraitPlate(s.name, ENEMY_FACTION[i], SECTOR_ART[i])}'` : ''}>${un ? '' : ico('lock')}</span>
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
    <div class="cmd-stats"><div><b>${playerMaxHp(save)}</b><span>Hull</span></div><div><b>${deckSizeFor(save)}</b><span>Deck</span></div><div><b>${save.stats.wins}</b><span>Wins</span></div><div><b>${diff.name}</b><span>Difficulty</span></div></div></div>`;
  const stn = stationOpen(save) ? (() => { const st = ensureStation(save), up = upgradesAvailable(save), tot = STATION.order.reduce((a, id) => a + STATION.mods[id].max, 0), have = STATION.order.reduce((a, id) => a + stationLv(save, id), 0);
    return `<div class="ops-card stn-teaser"><div class="oc-h">Anchorage</div><div class="oc-ct-t"><span>${ico('alloy')} <b>${st.alloy}</b> Alloy</span><span class="muted">${have}/${tot} systems</span></div><div class="meter"><i style="width:${have / tot * 100}%"></i></div>
      <button class="btn ${up ? 'primary' : ''} wide" data-nav="station">${up ? `Repairs ready (${up})` : 'Visit station'}</button></div>`; })() : '';
  morphInto($('#map'), `<div class="nav-shell">
    ${cmdBar(save, 'map')}
    <div class="g-strip">${strip}</div>
    <div class="map-main">
      <section class="chart" style='--h:${sec.hue};--art:${portraitPlate(sec.name, ENEMY_FACTION[si], SECTOR_ART[si])}' data-key="chart-${si}">
        <div class="chart-head"><div class="ch-n">Sector ${String(si + 1).padStart(2, '0')} // ${esc(sec.sub)}</div><h2>${esc(sec.name)}</h2><div class="ch-prog"><b>${done}</b>/${encs.length} cleared</div></div>
        <div class="chart-coords">GRID ${String.fromCharCode(65 + si)}-${(si + 1) * 117} · ${encs.length} SIGNALS</div>
        <svg class="lanes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lanes}</svg>
        ${nodes}
        ${shipAt ? `<div class="ship-marker" style="left:${shipAt[0]}%;top:${shipAt[1]}%" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12l16-7-5 7 5 7z"/></svg></div>` : ''}
      </section>
      <aside class="ops">${nextCard}${stn}${contracts}${cmdr}</aside>
    </div></div>`);
  const gStrip = $('#map .g-strip'), onSec = gStrip && gStrip.querySelector('.gs.on');
  if (onSec && gStrip.scrollWidth > gStrip.clientWidth) gStrip.scrollLeft = onSec.offsetLeft - gStrip.offsetLeft - 12;
  $('#map').onclick = e => {
    const b = e.target.closest('[data-enc]'); if (b) { SFX.init(); SFX.click(); openBriefing(ENC[b.dataset.enc]); return; }
    const s = e.target.closest('[data-sec]'); if (s) { SFX.click(); MapUI.sector = +s.dataset.sec; renderMap(); return; }
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

function openBriefing(enc) {
  const save = App.save, e = enc.enemy, diff = DIFFICULTY[save.diff];
  const teach = [...(enc.teaches || []), ...(enc.teachesAlso || [])];
  const fresh = teach.filter(k => !save.codex.includes(k));
  const hp = Math.round(e.hp * diff.hp);
  const power = e.power ? HEROPOWERS[e.power] : null;
  const rewardTxt = save.cleared[enc.id] ? (economyOpen(save) ? `${Math.round(ECON.replayCredits[encKind(enc)] * creditMultOf(save))} Credits + ${ECON.alloyReplay[encKind(enc)]} Alloy (replay)` : 'Training replay') : [describeEncReward(enc, save), enc.unlockPowers ? 'a new commander power' : '', enc.grant ? 'a supply crate of new cards' : ''].filter(Boolean).join(' + ') || 'Training credit';
  const size = deckSizeFor(save);
  const deckOk = enc.fixedDeck || save.deck.length === size;
  const m = modal(`<div class="m-eyebrow">${esc(SECTORS[enc.sector].name)} · ${enc.boss ? 'Boss' : enc.elite ? 'Elite (optional)' : 'Mission ' + enc.id}</div>
    <h2>${esc(enc.name)}</h2>
    <div class="brief">
      <div class="foe"><div class="foe-art" style='background-image:${portraitPlate(e.name, ENEMY_FACTION[enc.sector], ENEMY_ART[e.name])}'></div><div><div class="foe-name">${esc(e.name)}</div><div class="muted">${hp} Health${e.phases ? ` · ${e.phases.length + 1} phases` : ''}</div>
        ${power ? `<div class="foe-line">${powerIco(e.power)} <b>${esc(power.name)}:</b> ${esc(power.text)}</div>` : ''}
        ${(e.passives || []).map(id => `<div class="foe-line">${passiveIco(id)} <b>${esc(PASSIVES[id].name)}:</b> ${esc(PASSIVES[id].text)}</div>`).join('')}
        ${e.startTraps ? `<div class="foe-line">${ico('trap')} <b>Starts with ${e.startTraps.length} Trap${e.startTraps.length > 1 ? 's' : ''} armed.</b></div>` : ''}
        ${intelHTML(save, e)}</div></div>
      <p class="story">${esc(enc.story)}</p>
      ${fresh.map(k => `<div class="newmech"><span class="pill new">New</span> <b>${esc(KEYWORDS[k].name)}</b> ${esc(KEYWORDS[k].text)}</div>`).join('')}
      <div class="brief-foot"><span class="muted">Reward:</span> ${rewardTxt}${save.cleared[enc.id] ? ' <span class="pill">Cleared</span>' : ''}</div>
      ${enc.fixedDeck ? '<div class="brief-foot muted">This simulation uses a standard training deck.</div>' : `<div class="brief-foot ${deckOk ? '' : 'warn'}"><span class="muted">Your deck:</span> ${save.deck.length}/${size} cards${save.power && !enc.noPower ? ` · Power: ${esc(HEROPOWERS[save.power].name)}` : ''}${deckOk ? '' : ' (fix it in the Hangar)'}</div>`}
    </div>
    <div class="m-actions"><button class="btn ghost" data-a="back">Back</button>${enc.fixedDeck ? '' : '<button class="btn" data-a="hangar">Hangar</button>'}<button class="btn primary" data-a="go" ${deckOk ? '' : 'disabled'}>Launch</button></div>`, 'brief-modal');
  m.onclick = ev => {
    const a = ev.target.dataset.a; if (!a) return;
    if (a === 'back') closeModal();
    if (a === 'hangar') { closeModal(); openHangar(() => { openMap(); openBriefing(enc); }); }
    if (a === 'go') { SFX.init(); teach.forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); }); persist(); startBattle(enc); }
  };
}

// ============================================================================
// HANGAR (deck builder)
// ============================================================================
const Hangar = { back: null, filter: 'all', cost: -1, q: '', mode: 'deck' };

function openHangar(back) {
  Hangar.back = back || openMap;
  closeModal(); showScreen('hangar'); renderHangar();
}

function renderHangar() {
  const save = App.save, size = deckSizeFor(save);
  const inDeck = {}; save.deck.forEach(id => inDeck[id] = (inDeck[id] || 0) + 1);
  if (!economyOpen(save)) Hangar.mode = 'deck';
  const craft = Hangar.mode === 'craft';
  const base = craft ? CARD_LIST.filter(d => !d.token && setUnlocked(save, d.tier)) : Object.keys(save.coll).filter(id => save.coll[id] > 0).map(D);
  const owned = base
    .filter(d => Hangar.filter === 'all' || d.type === Hangar.filter)
    .filter(d => Hangar.cost < 0 || (Hangar.cost >= 7 ? d.cost >= 7 : d.cost === Hangar.cost))
    .filter(d => !Hangar.q || (d.name + ' ' + d.text).toLowerCase().includes(Hangar.q.toLowerCase()))
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
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
  const tabs = [['all', 'All'], ['unit', 'Units'], ['spell', 'Protocols'], ['gear', 'Gear'], ['trap', 'Traps']].filter(([k]) => k === 'all' || base.some(d => d.type === k));
  $('#hangar').innerHTML = `<div class="nav-shell hangar-wrap">
    ${cmdBar(save, 'hangar')}
    <div class="sub-head"><div><div class="sh-tag">Fleet logistics</div><h1>Hangar</h1></div><span class="muted">Build your deck and choose your commander power.</span><button class="btn primary" id="h-done">Done</button></div>
    <div class="mode-bar">${economyOpen(save) ? `<div class="seg"><button class="${craft ? '' : 'on'}" data-mode="deck">Build deck</button><button class="${craft ? 'on' : ''}" data-mode="craft">Craft cards</button></div>` : ''}
      <span class="muted small">${craft ? 'Every card from the sets you have reached. Click one to craft it with Scrap, or scrap spare copies.' : (TOUCH.on ? 'Tap a card to add it. Tap a deck entry to remove it. Press and hold any card to read it.' : 'Click a card to add it. Click a deck entry to remove it. Right-click any card to read it.') + ' Up to 2 copies (1 Legendary).'}</span></div>
    <div class="hangar-body">
      <section class="coll">
        <div class="filters">${tabs.map(([k, l]) => `<button class="chipbtn ${Hangar.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}
          <span class="sep"></span>${[-1, 0, 1, 2, 3, 4, 5, 6, 7].map(c => `<button class="chipbtn cost ${Hangar.cost === c ? 'on' : ''}" data-c="${c}">${c < 0 ? 'Any' : c >= 7 ? '7+' : c}</button>`).join('')}
          <input id="h-q" type="search" placeholder="Search cards" value="${esc(Hangar.q)}" aria-label="Search cards"></div>
        <div class="coll-grid">${grid}</div>
      </section>
      <button class="deck-fab" id="h-jump" aria-label="Show your deck">Deck <b>${save.deck.length}/${size}</b></button>
      <aside class="deckpanel">
        <div class="dp-head"><h3>Deck</h3><div class="dp-count ${save.deck.length === size ? 'ok' : 'bad'}"><b>${save.deck.length}</b>/${size}</div></div>
        <div class="curve">${curve.map((n, i) => `<div class="bar"><i style="height:${(n / cmax) * 100}%"></i><span>${i >= 7 ? '7+' : i}</span><em>${n || ''}</em></div>`).join('')}</div>
        <div class="muted small">${types.unit} units · ${types.spell} protocols${types.gear ? ` · ${types.gear} gear` : ''}${types.trap ? ` · ${types.trap} traps` : ''}</div>
        <div class="deck-list">${rows || '<p class="muted">Empty deck.</p>'}</div>
        <div class="dp-btns"><button class="btn small" id="h-auto">Auto-fill</button><button class="btn small ghost" id="h-clear">Clear</button></div>
        ${loadoutsHTML(save)}
        <h3>Commander Power</h3><div class="powers">${powers}</div>
      </aside>
    </div></div>`;
  const root = $('#hangar');
  root.onclick = e => {
    if (cmdBarClick(e, Hangar.back)) return;
    const t = e.target;
    const add = t.closest('[data-add]'), rm = t.closest('[data-rm]'), f = t.closest('[data-f]'), c = t.closest('[data-c]'), pw = t.closest('[data-pw]');
    const cr = t.closest('[data-craft]'), md = t.closest('[data-mode]'), lo = t.closest('[data-lo]'), los = t.closest('[data-lo-save]');
    if (los) { const i = +los.dataset.loSave; save.loadouts = save.loadouts || []; save.loadouts[i] = { deck: save.deck.slice(), power: save.power, name: 'Deck ' + (i + 1) }; persist(); toast(`Saved your current deck to slot ${i + 1}.`); renderHangar(); return; }
    if (lo) { const L = (save.loadouts || [])[+lo.dataset.lo]; if (L) { const own = {}; save.deck = L.deck.filter(id => { own[id] = (own[id] || 0) + 1; return own[id] <= (save.coll[id] || 0); }).slice(0, size); if (L.power && save.powers.includes(L.power)) save.power = L.power; if (save.deck.length < size) autoFillDeck(save, size); persist(); SFX.click(); toast(`Loaded ${esc(L.name)}.`); renderHangar(); } return; }
    if (md) { Hangar.mode = md.dataset.mode; Hangar.filter = 'all'; renderHangar(); return; }
    if (cr) { craftDialog(cr.dataset.craft, renderHangar); return; }
    if (t.id === 'h-shop') { openShop(Hangar.back); return; } // Done in the Depot returns to where the Hangar was opened from
    if (add) {
      const id = add.dataset.add, d = D(id), used = inDeck[id] || 0;
      if (save.deck.length >= size) toast(`Deck is full (${size}). Remove a card first.`);
      else if (used >= Math.min(save.coll[id], maxCopies(d))) toast(used >= maxCopies(d) ? `Max ${maxCopies(d)} cop${maxCopies(d) > 1 ? 'ies' : 'y'} per deck.` : 'You don\'t own more copies.');
      else { save.deck.push(id); SFX.click(); persist(); renderHangar(); }
      return;
    }
    if (rm) { const i = save.deck.indexOf(rm.dataset.rm); if (i >= 0) save.deck.splice(i, 1); SFX.click(); persist(); renderHangar(); return; }
    if (f) { Hangar.filter = f.dataset.f; renderHangar(); return; }
    if (c) { Hangar.cost = +c.dataset.c; renderHangar(); return; }
    if (pw) { save.power = pw.dataset.pw; persist(); renderHangar(); return; }
    if (t.closest('#h-jump')) { $('.deckpanel').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); return; }
    if (t.id === 'h-auto') { autoFillDeck(save, size); persist(); renderHangar(); toast('Deck filled with your strongest available cards.'); }
    if (t.id === 'h-clear') { save.deck = []; persist(); renderHangar(); }
    if (t.id === 'h-done') {
      if (save.deck.length !== size) toast(`Your deck needs exactly ${size} cards (currently ${save.deck.length}).`);
      Hangar.back();
    }
  };
  const q = $('#h-q');
  q.oninput = () => { Hangar.q = q.value; const pos = q.selectionStart; renderHangar(); const q2 = $('#h-q'); q2.focus(); q2.setSelectionRange(pos, pos); };
}

function loadoutsHTML(save) {
  const n = loadoutSlots(save), sig = stationLv(save, 'armory') >= 2;
  if (!n) return '';
  const L = save.loadouts || [];
  const slots = Array.from({ length: n }, (_, i) => L[i]
    ? `<div class="lo-wrap"><button class="lo" data-lo="${i}" title="Load this deck"><b>${esc(L[i].name)}</b><span>${L[i].deck.length} cards · load</span></button><button class="lo-save" data-lo-save="${i}" title="Overwrite with your current deck">Save here</button></div>`
    : `<button class="lo empty" data-lo-save="${i}"><b>Empty slot</b><span>Save current deck</span></button>`).join('');
  const sd = sig && save.signature ? D(save.signature) : null;
  return `<h3>Loadouts</h3><div class="loadouts">${slots}</div>
    ${sig ? `<h3>Signature card</h3>${sd ? `<div class="sig-slot"><span class="dr-icon" style='background-image:${artPlate(save.signature)}'></span><span><b>${esc(sd.name)}</b><br><span class="muted small">${save.deck.includes(save.signature) ? 'Always in your opening hand' + (stationLv(save, 'armory') >= 3 ? ', 1 cheaper' : '') + '.' : 'Not in this deck, so it has no effect.'}</span></span></div>` : `<p class="muted small">${TOUCH.on ? 'Press and hold' : 'Right-click'} a card in your deck and choose "Make signature card".</p>`}` : ''}`;
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
  if (tab === 'audio') body = slider('master', 'Master volume') + slider('music', 'Music') + slider('sfx', 'Sound effects') + sw('muted', 'Mute all audio', 'Silences music and effects.')
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
  if (tab === 'data') body = save ? `<p class="muted small">${Store.db ? 'Progress saves automatically to your account and this browser.' : 'Progress saves automatically in this browser. Copy a backup code to move it to another device.'}</p>
    <div class="m-actions left"><button class="btn" data-a="export">Copy backup code</button><button class="btn" data-a="import">Restore from code</button><button class="btn danger" data-a="reset">Erase campaign</button></div><div id="set-extra"></div>`
    : '<p class="muted">No campaign yet.</p><div class="m-actions left"><button class="btn" data-a="import">Restore from code</button></div><div id="set-extra"></div>';
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
        <button class="tm" id="t-codex"><span class="tm-k">Archive</span><span class="tm-s">The universe, factions, card lore and rules</span></button>
        <button class="tm" id="t-set"><span class="tm-k">Settings</span><span class="tm-s">Audio, speed, display, saves</span></button>
      </nav>
    </div>
    <aside class="signal" aria-label="Signal readout">
      <div class="sig-h">Incoming transmission</div>
      <div class="sig-wave" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--d:${(i * 0.07).toFixed(2)}s;--a:${(0.3 + Math.abs(Math.sin(i * 0.7)) * 0.7).toFixed(2)}"></i>`).join('')}</div>
      <dl><dt>Origin</dt><dd>Galactic core</dd><dt>Pattern</dt><dd>Harmonic, repeating</dd><dt>Status</dt><dd>${save && save.finished ? 'Silenced' : 'Unresolved'}</dd><dt>Campaign</dt><dd>${save ? `${cleared} / ${ENCOUNTERS.length} missions` : 'Not started'}</dd></dl>
    </aside>
  </div>
  <div class="title-foot">6 sectors · ${ENCOUNTERS.length} battles · ${CARD_LIST.filter(d => !d.token).length} collectible cards</div>`;
  $('#title').onclick = e => {
    SFX.init();
    const b = e.target.closest('.tm'); if (b) SFX.click();
    if (e.target.closest('#t-cont')) openMap();
    if (e.target.closest('#t-new')) newCampaignDialog();
    if (e.target.closest('#t-codex')) openArchive('universe', null);
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
    if (a === 'go') { App.save = newSave($('#nc-name').value.trim() || 'Commander', diff); persist(); closeModal(); openMap(); }
  };
}
