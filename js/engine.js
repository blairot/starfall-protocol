'use strict';
// ============================================================================
// STARFALL PROTOCOL — rules engine
// The whole game state is plain JSON so the AI can clone it and simulate moves.
// Card behaviour lives in CARDS (cards.js) and is looked up by id.
// ============================================================================

const MAX_BOARD = 7, MAX_HAND = 10, MAX_TRAPS = 5;

function D(id) { const d = CARDS[id]; if (!d) throw new Error('Unknown card: ' + id); return d; }
function rnd(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a && a.length ? a[rnd(a.length)] : null; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function ev(s, e) { if (!s.sim) s.events.push(e); }

function mkCard(s, id, costMod) { return { uid: s.uid++, id, costMod: costMod || 0 }; }
function isHero(c) { return !!c && typeof c.uid === 'string'; }
function ownerOf(c) { return isHero(c) ? c.i : c.owner; }
function alive(c) { return !!c && c.hp > 0 && !c.dead; }

function getChar(s, uid) {
  if (uid == null) return null;
  if (typeof uid === 'object') return uid;
  if (typeof uid === 'string') return s.players[+uid[1]];
  for (const p of s.players) for (const m of p.board) if (m.uid === uid) return m;
  return null;
}

function ctx(s, pi, self, x) {
  const c = { pi, op: 1 - pi, me: s.players[pi], them: s.players[1 - pi], self: self || null };
  if (x) Object.assign(c, x);
  return c;
}

// ---------------------------------------------------------------- setup
function newGame(o) {
  const s = { turnNo: 0, active: 0, uid: 1, over: false, winner: -1, sim: false, events: [], choice: null };
  s.players = [o.player, o.enemy].map((x, i) => ({
    i, uid: 'H' + i, name: x.name, hp: x.hp, maxHp: x.hp, armor: x.armor || 0,
    mana: 0, maxMana: x.startMana || 0, manaCap: x.manaCap || 10, overload: 0, locked: 0,
    deck: shuffle(x.deck.map(id => mkCard(s, id))), hand: [], board: [], grave: [],
    fatigue: 0, power: x.power ? { id: x.power, used: 0 } : null,
    weapon: null, heroTempAtk: 0, heroAttacks: 0, frozen: false, frozenAt: 0,
    traps: [], spells: 0, played: 0, deaths: 0,
    passives: (x.passives || []).slice(), phases: (x.phases || []).slice(),
    isAI: !!x.isAI, ai: x.ai == null ? 1 : x.ai, startTraps: x.startTraps || [],
  }));
  s.players.forEach((p, i) => {
    const x = i === 0 ? o.player : o.enemy;
    (x.startBoard || []).forEach(id => { const m = summon(s, i, id); if (m) m.sick = false; });
    (x.startTraps || []).forEach(id => p.traps.push({ id, uid: s.uid++ }));
  });
  // signature card: move one copy to the top of the deck so it is in the opening hand
  if (o.player.signature) {
    const dk0 = s.players[0].deck, k = dk0.findIndex(c => c.id === o.player.signature);
    if (k >= 0) { const [c] = dk0.splice(k, 1); if (o.player.sigDiscount) { c.costMod = (c.costMod || 0) - o.player.sigDiscount; c.sig = 1; } dk0.push(c); }
  }
  s.coin = !!o.coin;
  s.first = o.first == null ? (Math.random() < 0.5 ? 0 : 1) : o.first;
  s.active = s.first;
  draw(s, s.first, o.firstHand || 3);
  draw(s, 1 - s.first, o.secondHand || 4);
  s.events = [];
  return s;
}

function mulligan(s, pi, idxs) {
  const p = s.players[pi];
  const out = idxs.slice().sort((a, b) => b - a).map(i => p.hand.splice(i, 1)[0]).filter(Boolean);
  for (let k = 0; k < out.length; k++) { if (p.deck.length) p.hand.push(p.deck.pop()); }
  p.deck.push(...out); shuffle(p.deck);
}

function aiMulligan(s, pi) {
  const p = s.players[pi]; const idx = [];
  p.hand.forEach((c, i) => { if (D(c.id).cost >= 4) idx.push(i); });
  mulligan(s, pi, idx);
}

function beginPlay(s) {
  if (s.coin) addHand(s, 1 - s.first, 'energy_cell');
  // Boss passives with an onGameStart hook
  s.players.forEach((p, i) => p.passives.forEach(id => { const ps = PASSIVES[id]; if (ps && ps.gameStart) ps.gameStart(s, ctx(s, i)); }));
  startTurn(s);
}

// ---------------------------------------------------------------- turn flow
function startTurn(s) {
  const pi = s.active, p = s.players[pi];
  s.turnNo++;
  if (p.maxMana < p.manaCap) p.maxMana++;
  p.locked = p.overload; p.overload = 0;
  p.mana = Math.max(0, p.maxMana - p.locked);
  if (p.power) p.power.used = 0;
  p.heroAttacks = 0; p.spells = 0; p.played = 0;
  for (const m of p.board) { m.sick = false; m.attacks = 0; }
  ev(s, { t: 'turn', pi });
  draw(s, pi, 1);
  fire(s, 'turnStart', pi);
  resolve(s);
}

function endTurn(s) {
  if (s.over) return;
  const pi = s.active, p = s.players[pi];
  fire(s, 'turnEnd', pi);
  resolve(s);
  if (s.over) return;
  for (const m of p.board) { m.tempAtk = 0; if (m.frozen && m.frozenAt < s.turnNo) m.frozen = false; }
  p.heroTempAtk = 0;
  if (p.frozen && p.frozenAt < s.turnNo) p.frozen = false;
  // enemy minions frozen during their own previous turn stay frozen; nothing to do
  s.active = 1 - pi;
  startTurn(s);
}

// Fire a trigger hook on one player's units, gear and passives.
function fire(s, hook, pi, x) {
  const p = s.players[pi];
  for (const m of p.board.slice()) {
    if (!alive(m) || m.silenced || m.owner !== pi) continue;
    const d = D(m.id); if (d[hook]) d[hook](s, ctx(s, pi, m, x));
  }
  if (p.weapon) { const wd = D(p.weapon.id); if (wd[hook]) wd[hook](s, ctx(s, pi, null, x)); }
  for (const id of p.passives) { const ps = PASSIVES[id]; if (ps && ps[hook]) ps[hook](s, ctx(s, pi, null, x)); }
}

// ---------------------------------------------------------------- stats
function atkOf(s, c) {
  if (!c) return 0;
  if (isHero(c)) return (c.weapon ? c.weapon.atk : 0) + c.heroTempAtk;
  let a = c.atk + c.tempAtk;
  const p = s.players[c.owner];
  for (const o of p.board) {
    if (o === c || o.silenced || !alive(o)) continue;
    const od = D(o.id); if (od.auraAtk) a += od.auraAtk(s, o, c) || 0;
  }
  for (const id of p.passives) { const ps = PASSIVES[id]; if (ps && ps.auraAtk) a += ps.auraAtk(s, c) || 0; }
  return Math.max(0, a);
}

function spellPower(s, pi) {
  let n = 0; const p = s.players[pi];
  for (const m of p.board) if (!m.silenced && alive(m) && m.kw.amplify) n += m.kw.amplify;
  for (const id of p.passives) { const ps = PASSIVES[id]; if (ps && ps.amplify) n += ps.amplify; }
  return n;
}
function sp(s, pi, n) { return n + spellPower(s, pi); }

function costOf(s, pi, card) {
  const d = D(card.id); let c = d.cost + (card.costMod || 0);
  if (d.dynCost) c += d.dynCost(s, ctx(s, pi));
  for (const m of s.players[pi].board) if (!m.silenced && alive(m)) { const md = D(m.id); if (md.costAura) c += md.costAura(d) || 0; }
  for (const id of s.players[pi].passives) { const ps = PASSIVES[id]; if (ps && ps.costAura) c += ps.costAura(d) || 0; }
  return Math.max(0, c);
}

// ---------------------------------------------------------------- targeting
function targetsFor(s, pi, spec, filter, selfUid) {
  if (!spec) return [];
  const me = s.players[pi], op = s.players[1 - pi];
  const out = [];
  const mine = () => me.board.forEach(m => { if (alive(m) && m.uid !== selfUid) out.push(m); });
  const theirs = () => op.board.forEach(m => { if (alive(m) && !m.kw.cloak) out.push(m); });
  switch (spec) {
    case 'any': out.push(me, op); mine(); theirs(); break;
    case 'minion': mine(); theirs(); break;
    case 'enemyMinion': theirs(); break;
    case 'friendlyMinion': mine(); break;
    case 'enemy': out.push(op); theirs(); break;
    case 'friendly': out.push(me); mine(); break;
    case 'enemyHero': out.push(op); break;
  }
  return (filter ? out.filter(c => filter(c, s, pi)) : out).map(c => c.uid);
}

function cardTargets(s, pi, card) {
  const d = D(card.id);
  return d.target ? targetsFor(s, pi, d.target, d.tf) : [];
}

// ---------------------------------------------------------------- core actions
function canPlay(s, pi, hi) {
  if (s.over || s.active !== pi || s.choice) return false;
  const p = s.players[pi], c = p.hand[hi]; if (!c) return false;
  const d = D(c.id);
  if (costOf(s, pi, c) > p.mana) return false;
  if (d.type === 'unit' && p.board.length >= MAX_BOARD) return false;
  if (d.type === 'trap' && (p.traps.some(t => t.id === c.id) || p.traps.length >= MAX_TRAPS)) return false;
  if (d.type === 'spell' && d.target && !d.targetOptional && cardTargets(s, pi, c).length === 0) return false;
  if (d.canPlay && !d.canPlay(s, ctx(s, pi))) return false;
  return true;
}

function whyCantPlay(s, pi, hi) {
  const p = s.players[pi], c = p.hand[hi]; if (!c) return '';
  const d = D(c.id);
  if (s.active !== pi) return 'Wait for your turn.';
  if (costOf(s, pi, c) > p.mana) return 'Not enough energy.';
  if (d.type === 'unit' && p.board.length >= MAX_BOARD) return 'Your battlefield is full (7 units).';
  if (d.type === 'trap' && p.traps.some(t => t.id === c.id)) return 'That Trap is already armed.';
  if (d.type === 'trap') return 'Too many Traps armed.';
  if (d.target && cardTargets(s, pi, c).length === 0) return 'No valid targets.';
  return "Can't play that right now.";
}

function playCard(s, pi, hi, tgt) {
  const p = s.players[pi], c = p.hand[hi], d = D(c.id);
  const cost = costOf(s, pi, c);
  p.hand.splice(hi, 1); p.mana -= cost; p.played++;
  if (d.overheat) p.overload += d.overheat;
  ev(s, { t: 'play', pi, id: c.id, tgt });
  if (d.type === 'unit') {
    const m = summon(s, pi, c.id);
    if (m) {
      if (d.play) d.play(s, ctx(s, pi, m, { target: tgt }));
      resolve(s);
      if (!s.over && alive(m)) trapCheck(s, 1 - pi, 'unit', { unit: m });
    }
  } else if (d.type === 'spell') {
    p.spells++;
    if (trapCheck(s, 1 - pi, 'spell', { card: c })) { ev(s, { t: 'countered', id: c.id }); }
    else {
      d.play(s, ctx(s, pi, null, { target: tgt }));
      resolve(s);
      if (!s.over) fire(s, 'onSpell', pi, { card: c });
    }
    p.grave.push(c.id);
  } else if (d.type === 'gear') {
    equip(s, pi, c.id);
    if (d.play) d.play(s, ctx(s, pi, null, { target: tgt }));
    p.grave.push(c.id);
  } else if (d.type === 'trap') {
    p.traps.push({ id: c.id, uid: c.uid });
  }
  resolve(s);
}

function canAttack(s, pi, uid) {
  if (s.over || s.active !== pi || s.choice) return false;
  const c = getChar(s, uid); if (!c || ownerOf(c) !== pi || !alive(c)) return false;
  if (c.frozen || atkOf(s, c) <= 0) return false;
  if (isHero(c)) {
    const twin = c.weapon && (D(c.weapon.id).kw || []).includes('twin');
    return c.heroAttacks < (twin ? 2 : 1);
  }
  if (c.attacks >= (c.kw.twin ? 2 : 1)) return false;
  if (c.sick && !c.kw.warp && !c.kw.blitz) return false;
  if (c.cantAttack) return false;
  return attackTargets(s, uid).length > 0;
}

function attackTargets(s, uid) {
  const c = getChar(s, uid); const pi = ownerOf(c); const op = s.players[1 - pi];
  const ms = op.board.filter(m => alive(m) && !m.kw.cloak);
  const g = ms.filter(m => m.kw.guardian);
  let out = g.length ? g : [op, ...ms];
  if (!isHero(c) && c.sick && !c.kw.warp) out = out.filter(x => !isHero(x));
  return out.map(x => x.uid);
}

function attack(s, aUid, tUid) {
  const a = getChar(s, aUid), t = getChar(s, tUid); const pi = ownerOf(a);
  ev(s, { t: 'attack', from: a.uid, to: t.uid });
  trapCheck(s, 1 - pi, 'attack', { attacker: a, target: t });
  resolve(s);
  const a2 = getChar(s, aUid), t2 = getChar(s, tUid);
  if (s.over || !alive(a2) || !alive(t2) || (!isHero(a2) && a2.owner !== pi)) {
    if (a2 && !isHero(a2)) a2.attacks++; else if (a2) a2.heroAttacks++;
    resolve(s); return;
  }
  if (!isHero(a)) delete a.kw.cloak;
  const aA = atkOf(s, a), tA = isHero(t) ? 0 : atkOf(s, t);
  damage(s, a.uid, t, aA);
  if (tA > 0) damage(s, t.uid, a, tA);
  if (isHero(a)) {
    a.heroAttacks++;
    if (a.weapon) {
      const wd = D(a.weapon.id);
      if (wd.onAttack) wd.onAttack(s, ctx(s, pi, null, { target: t }));
      a.weapon.dur--;
    }
  } else {
    a.attacks++;
    const d = D(a.id);
    if (!a.silenced && d.onAttack) d.onAttack(s, ctx(s, pi, a, { target: t }));
  }
  fire(s, 'onAnyAttack', pi, { attacker: a, target: t });
  resolve(s);
}

function canPower(s, pi) {
  const p = s.players[pi];
  if (s.over || s.active !== pi || s.choice || !p.power || p.power.used) return false;
  const h = HEROPOWERS[p.power.id];
  if (h.cost > p.mana) return false;
  if (h.target && targetsFor(s, pi, h.target, h.tf).length === 0) return false;
  if (h.canUse && !h.canUse(s, ctx(s, pi))) return false;
  return true;
}
function powerTargets(s, pi) { const h = HEROPOWERS[s.players[pi].power.id]; return h.target ? targetsFor(s, pi, h.target, h.tf) : []; }

function usePower(s, pi, tgt) {
  const p = s.players[pi], h = HEROPOWERS[p.power.id];
  p.mana -= h.cost; p.power.used = 1;
  ev(s, { t: 'power', pi, id: p.power.id, tgt });
  h.use(s, ctx(s, pi, null, { target: tgt }));
  resolve(s);
}

// ---------------------------------------------------------------- traps
function trapCheck(s, owner, kind, info) {
  if (s.sim) return false; // the AI never "sees" hidden traps when planning
  const p = s.players[owner]; let cancel = false;
  for (const t of p.traps.slice()) {
    const d = D(t.id); if (d.trap !== kind) continue;
    if (d.when && !d.when(s, ctx(s, owner, null, info))) continue;
    p.traps.splice(p.traps.indexOf(t), 1);
    ev(s, { t: 'trap', pi: owner, id: t.id });
    p.grave.push(t.id);
    const r = d.fire(s, ctx(s, owner, null, info));
    if (r === 'cancel') cancel = true;
    resolve(s);
    if (cancel || s.over) break;
  }
  return cancel;
}

// ---------------------------------------------------------------- effects API
function damage(s, src, tgt, n) {
  const t = getChar(s, tgt);
  if (!t || n <= 0 || !alive(t)) return 0;
  const sc = src != null ? getChar(s, src) : null;
  if (isHero(t)) {
    const a = Math.min(t.armor, n); t.armor -= a; t.hp -= (n - a);
    ev(s, { t: 'dmg', uid: t.uid, n });
    fire(s, 'onHeroDamaged', t.i, { amount: n });
  } else {
    if (t.kw.barrier) { delete t.kw.barrier; ev(s, { t: 'shield', uid: t.uid }); return 0; }
    t.hp -= n;
    ev(s, { t: 'dmg', uid: t.uid, n });
    if (sc && !isHero(sc) && sc.kw.toxic && !sc.silenced) t.dead = true;
    if (t.hp > 0 && !t.dead && !t.silenced) { const d = D(t.id); if (d.onDamaged) d.onDamaged(s, ctx(s, t.owner, t, { amount: n })); }
  }
  if (sc && !isHero(sc) && sc.kw.siphon && !sc.silenced) heal(s, 'H' + sc.owner, n);
  return n;
}

function heal(s, tgt, n) {
  const t = getChar(s, tgt); if (!t || !alive(t) || n <= 0) return 0;
  const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + n);
  const got = t.hp - before;
  if (got > 0) ev(s, { t: 'heal', uid: t.uid, n: got });
  return got;
}

function gainArmor(s, pi, n) { const p = s.players[pi]; p.armor += n; ev(s, { t: 'armor', uid: p.uid, n }); }

function mkMinion(s, pi, id) {
  const d = D(id); const kw = {};
  (d.kw || []).forEach(k => kw[k] = 1);
  if (d.amplify) kw.amplify = d.amplify;
  return { uid: s.uid++, id, owner: pi, atk: d.atk, hp: d.hp, maxHp: d.hp, kw, sick: true, attacks: 0,
    frozen: false, frozenAt: 0, silenced: false, tempAtk: 0, extraDeath: [], dead: false };
}

function summon(s, pi, id, pos) {
  const p = s.players[pi]; if (p.board.length >= MAX_BOARD) return null;
  const m = mkMinion(s, pi, id);
  if (pos == null || pos > p.board.length) pos = p.board.length;
  p.board.splice(Math.max(0, pos), 0, m);
  ev(s, { t: 'summon', uid: m.uid, pi, id });
  for (const o of p.board.slice()) {
    if (o === m || o.silenced || !alive(o)) continue;
    const od = D(o.id); if (od.onSummon) od.onSummon(s, ctx(s, pi, o, { summoned: m }));
  }
  for (const pid of p.passives) { const ps = PASSIVES[pid]; if (ps && ps.onSummon) ps.onSummon(s, ctx(s, pi, null, { summoned: m })); }
  return m;
}

function draw(s, pi, n) {
  const p = s.players[pi]; const got = [];
  for (let k = 0; k < (n == null ? 1 : n); k++) {
    if (!p.deck.length) { p.fatigue++; ev(s, { t: 'fatigue', pi, n: p.fatigue }); damage(s, null, p, p.fatigue); continue; }
    const c = p.deck.pop();
    if (p.hand.length >= MAX_HAND) { ev(s, { t: 'burn', pi, id: c.id }); continue; }
    p.hand.push(c); got.push(c); ev(s, { t: 'draw', pi });
  }
  return got;
}

function addHand(s, pi, id, costMod) {
  const p = s.players[pi]; if (p.hand.length >= MAX_HAND) return null;
  const c = mkCard(s, id, costMod); p.hand.push(c); ev(s, { t: 'gain', pi, id }); return c;
}
function addDeck(s, pi, id) { const p = s.players[pi]; p.deck.splice(rnd(p.deck.length + 1), 0, mkCard(s, id)); }

function buff(s, m, a, h) {
  m = getChar(s, m); if (!alive(m) || isHero(m)) return;
  m.atk += a; m.maxHp += h; m.hp += h;
  if (m.hp <= 0) m.hp = 0;
  ev(s, { t: 'buff', uid: m.uid, a, h });
}
function tempBuff(s, m, a) { m = getChar(s, m); if (alive(m)) { m.tempAtk += a; ev(s, { t: 'buff', uid: m.uid, a, h: 0 }); } }
function giveKw(s, m, k, v) { m = getChar(s, m); if (alive(m) && !isHero(m)) { m.kw[k] = v || 1; ev(s, { t: 'buff', uid: m.uid, a: 0, h: 0 }); } }
function destroy(s, m) { m = getChar(s, m); if (m && !isHero(m)) m.dead = true; }
function freeze(s, t) { t = getChar(s, t); if (!alive(t)) return; t.frozen = true; t.frozenAt = s.turnNo; ev(s, { t: 'freeze', uid: t.uid }); }

function silence(s, m) {
  m = getChar(s, m); if (!alive(m) || isHero(m)) return;
  const d = D(m.id);
  m.silenced = true; m.kw = {}; m.extraDeath = []; m.tempAtk = 0; m.frozen = false; m.cantAttack = false;
  m.atk = d.atk; m.maxHp = d.hp; m.hp = Math.min(m.hp, m.maxHp);
  ev(s, { t: 'silence', uid: m.uid });
}

function equip(s, pi, id) {
  const p = s.players[pi], d = D(id);
  if (p.weapon) { const old = p.weapon; p.weapon = null; ev(s, { t: 'unequip', pi }); const od = D(old.id); if (od.death) od.death(s, ctx(s, pi)); }
  p.weapon = { id, atk: d.atk, dur: d.hp, uid: s.uid++ };
  ev(s, { t: 'equip', pi, id });
  fire(s, 'onEquip', pi, { weapon: p.weapon });
}

function steal(s, m, newOwner) {
  m = getChar(s, m); if (!alive(m) || isHero(m) || m.owner === newOwner) return;
  const from = s.players[m.owner], to = s.players[newOwner];
  from.board.splice(from.board.indexOf(m), 1);
  if (to.board.length >= MAX_BOARD) { from.grave.push(m.id); ev(s, { t: 'death', uid: m.uid, pi: m.owner, id: m.id }); return; }
  m.owner = newOwner; m.sick = true; m.attacks = 0; to.board.push(m);
  ev(s, { t: 'steal', uid: m.uid, pi: newOwner });
}

function bounce(s, m, costMod) {
  m = getChar(s, m); if (!m || isHero(m)) return;
  const p = s.players[m.owner]; const i = p.board.indexOf(m); if (i < 0) return;
  p.board.splice(i, 1);
  ev(s, { t: 'bounce', uid: m.uid });
  if (p.hand.length < MAX_HAND) p.hand.push(mkCard(s, m.id, costMod || 0));
}

function transform(s, m, id) {
  m = getChar(s, m); if (!m || isHero(m)) return null;
  const p = s.players[m.owner]; const i = p.board.indexOf(m); if (i < 0) return null;
  const n = mkMinion(s, m.owner, id); n.sick = m.sick; n.attacks = m.attacks;
  p.board[i] = n; ev(s, { t: 'transform', uid: n.uid, old: m.uid });
  return n;
}

// Scan (discover): the human picks from up to three options; AIs pick the best.
function scan(s, pi, pool, then) {
  const uniq = [...new Set(pool)];
  const opts = shuffle(uniq).slice(0, 3);
  if (!opts.length) return;
  const p = s.players[pi];
  if (s.sim || p.isAI) { opts.sort((a, b) => cardPower(b) - cardPower(a)); addHand(s, pi, opts[0]); return; }
  s.choice = { pi, opts, then: then || null };
}
function resolveChoice(s, idx) {
  const ch = s.choice; s.choice = null;
  const id = ch.opts[idx];
  addHand(s, ch.pi, id, ch.then === 'discount1' ? -1 : 0);
}

function cardPower(id) { const d = D(id); const r = { common: 0, rare: 1, epic: 2, legendary: 3 }[d.rarity] || 0; return d.cost * 0.5 + r + Math.random(); }

// ---------------------------------------------------------------- queries
function enemyMinions(s, pi) { return s.players[1 - pi].board.filter(alive); }
function friendlyMinions(s, pi) { return s.players[pi].board.filter(alive); }
function allMinions(s) { return [...s.players[s.active].board, ...s.players[1 - s.active].board].filter(alive); }
function enemyChars(s, pi) { return [s.players[1 - pi], ...enemyMinions(s, pi)].filter(alive); }
function randomEnemy(s, pi) { return pick(enemyChars(s, pi)); }
function randomEnemyMinion(s, pi) { return pick(enemyMinions(s, pi)); }
function others(list, self) { return list.filter(m => m !== self); }

// ---------------------------------------------------------------- resolution
function resolve(s) {
  for (let guard = 0; guard < 60; guard++) {
    const dying = [];
    for (const pi of [s.active, 1 - s.active]) for (const m of s.players[pi].board) if (m.hp <= 0 || m.dead) dying.push(m);
    if (!dying.length) break;
    const info = dying.map(m => ({ m, pos: s.players[m.owner].board.indexOf(m) }));
    for (const { m } of info) {
      const p = s.players[m.owner]; const i = p.board.indexOf(m);
      if (i >= 0) p.board.splice(i, 1);
      p.grave.push(m.id); p.deaths++;
      ev(s, { t: 'death', uid: m.uid, pi: m.owner, id: m.id });
    }
    for (const { m, pos } of info) {
      const pi = m.owner;
      if (!m.silenced) { const d = D(m.id); if (d.death) d.death(s, ctx(s, pi, m, { pos })); }
      for (const id of m.extraDeath) summon(s, pi, id, pos);
      for (const p2 of s.players) for (const o of p2.board.slice()) {
        if (o.silenced || !alive(o)) continue;
        const od = D(o.id); if (od.onAnyDeath) od.onAnyDeath(s, ctx(s, o.owner, o, { died: m }));
      }
      for (let k = 0; k < 2; k++) for (const id of s.players[k].passives) { const ps = PASSIVES[id]; if (ps && ps.onAnyDeath) ps.onAnyDeath(s, ctx(s, k, null, { died: m })); }
    }
  }
  for (const p of s.players) if (p.weapon && p.weapon.dur <= 0) {
    const w = p.weapon; p.weapon = null; ev(s, { t: 'unequip', pi: p.i });
    const wd = D(w.id); if (wd.death) wd.death(s, ctx(s, p.i));
  }
  if (checkOver(s)) resolve(s);
}

// Returns true when a boss changed phase (the caller resolves again).
function checkOver(s) {
  if (s.over) return false;
  let phased = false;
  for (const p of s.players) if (p.hp <= 0 && p.phases.length) { nextPhase(s, p); phased = true; }
  const d0 = s.players[0].hp <= 0, d1 = s.players[1].hp <= 0;
  if (d0 || d1) { s.over = true; s.winner = d0 ? 1 : 0; ev(s, { t: 'over', winner: s.winner }); }
  return phased;
}

function nextPhase(s, p) {
  const ph = PHASES[p.phases.shift()];
  p.hp = p.maxHp = ph.hp; p.armor = ph.armor || 0; p.name = ph.name;
  p.power = ph.power ? { id: ph.power, used: 0 } : p.power;
  p.passives = (ph.passives || []).slice();
  p.frozen = false;
  ev(s, { t: 'phase', pi: p.i, name: ph.name, text: ph.text });
  if (ph.enter) ph.enter(s, ctx(s, p.i));
}
