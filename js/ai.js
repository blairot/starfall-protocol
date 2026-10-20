'use strict';
// ============================================================================
// STARFALL PROTOCOL — enemy AI
// Greedy search: try every legal action on a cloned state, score the result,
// take the best one, repeat until nothing improves the position.
//   level 0  rookie   — noisy, often picks a merely-okay move
//   level 1  pilot    — light noise
//   level 2  veteran  — no noise
//   level 3  ace      — no noise + looks one follow-up action ahead
// ============================================================================

const AI_NOISE = [6, 2.5, 0.4, 0];

// ---------------------------------------------------------------- personas
// Each enemy commander plays in its faction's style (campaign.js picks one per
// encounter; s.players[i].persona holds the key). A persona is only a set of
// weights for evaluate() plus two cheap rules in aiChoose(): no extra search.
// The defaults below are the original evaluation, so `drill` (and any player
// without a persona, including yours in the simulations) plays exactly as before.
const AI_W0 = {
  self: 0.85,       // own commander health (heroValue)
  face: 1.0,        // enemy commander health (heroValue)
  faceRace: 0,      // face weight instead of `face` when the damage race is close (0 = off)
  faceLethal: 0,    // face weight instead of `face` when two-turn lethal is in sight (0 = off)
  mine: 1.0,        // multiplier on own units' value
  theirs: 1.1,      // multiplier on enemy units' value (higher = trades and clears more)
  wide: 0,          // bonus per own unit on the battlefield
  atk: 1.0, hp: 0.9, base: 0.6,   // unit value: Attack, Health, flat body
  guardian: 1, barrier: 1, toxic: 1,  // keyword value multipliers
  warp: 0, blitz: 0,                  // flat bonus for Warp / Blitz units
  hand: 1, handCost: 0.12,          // card in hand: (0.6 + cost * handCost) * hand
  gear: 0.5,        // own Gear: Attack * Durability * gear
  gearOn: 0,        // flat bonus while Gear is equipped (wants it on, still happy to swing)
  traps: 1.5,       // per armed Trap
  armor: 0,         // extra per point of own Armor
  danger: 1,        // multiplier on the "I could die next turn" penalty
  ff: 0.5,          // focus fire must beat the best single action by this much
  hold: 0, holdMin: 0,  // removal held for the best enemy unit: penalty, minimum target value
  eager: 0,         // also plays cards and power when the result is up to this much worse than passing
};
const AI_PERSONAS = {
  drill: { name: 'By the book', text: 'Plays the textbook line: trades when it should, attacks when it can.', w: {} },
  raider: { name: 'Reckless', text: 'Races for your commander whenever the fight looks close, loves Warp, Blitz and Gear weapons, and throws units away to keep up the pressure.',
    w: { face: 1.2, faceRace: 2.4, mine: 0.9, theirs: 1.0, warp: 1.5, blitz: 1.0, gearOn: 1.5, danger: 0.8, ff: 1.5 } },
  swarm: { name: 'Swarming', text: 'Floods the battlefield with cheap units before big ones and sacrifices them freely. Area damage hurts it most.',
    w: { wide: 1.6, mine: 0.85, theirs: 1.22, atk: 0.9, hp: 0.75, base: 1.2, guardian: 0.6, hand: 0.7, handCost: 0.3 } },
  forge: { name: 'Methodical', text: 'Clears the board first, protects its Guardians and Barrier units, and rarely hits you until lethal is close.',
    w: { face: 0.6, faceLethal: 1.2, self: 1.0, theirs: 1.3, guardian: 2.5, barrier: 2, armor: 0.3, danger: 1.3, ff: 0 } },
  psionic: { name: 'Cunning', text: 'Saves its removal and mind control for your best unit, and would rather build up cards and Traps than rush you.',
    w: { face: 0.95, theirs: 1.1, hand: 1.1, traps: 2.2, hold: 10, holdMin: 7 } },
  choir: { name: 'Relentless', text: 'Balanced, but always pressing: it fights hard for the board and spends every card and power it can each turn.',
    w: { face: 1.1, mine: 1.1, theirs: 1.35, hand: 0.75, danger: 0.8, eager: 4 } },
};
Object.values(AI_PERSONAS).forEach(p => { p.w = Object.assign({}, AI_W0, p.w); });

function personaKey(s, pi) { const k = s.players[pi].persona; return AI_PERSONAS[k] ? k : 'drill'; }
function aiWeights(s, pi) { return AI_PERSONAS[personaKey(s, pi)].w; }

// Damage I could deal with what's on the battlefield now (units + Gear).
function boardDamage(s, pi) {
  const P = s.players[pi];
  let n = P.weapon ? P.weapon.atk : 0;
  for (const m of P.board) if (alive(m) && !m.frozen) n += atkOf(s, m) * (m.kw.twin ? 2 : 1);
  return n;
}

// Per-decision weights: the race and lethal switches are read from the position
// before the move, so a single action can't flip the scale it is judged on.
function decisionWeights(s, pi) {
  const W = aiWeights(s, pi);
  if (!W.faceRace && !W.faceLethal) return W;
  const P = s.players[pi], O = s.players[1 - pi];
  const mine = boardDamage(s, pi), theirs = boardDamage(s, 1 - pi);
  const oHp = O.hp + O.armor, pHp = P.hp + P.armor;
  let face = W.face;
  if (W.faceRace && Math.ceil(oHp / Math.max(1, mine)) <= Math.ceil(pHp / Math.max(1, theirs)) + 1) face = W.faceRace;
  if (W.faceLethal && oHp <= mine * 2 + 3) face = W.faceLethal;
  return face === W.face ? W : Object.assign({}, W, { face });
}

function cloneState(s) {
  const c = JSON.parse(JSON.stringify({ ...s, events: [] }));
  c.sim = true; return c;
}

function minionValue(s, m, w = AI_W0) {
  if (!alive(m)) return 0;
  const a = atkOf(s, m), d = D(m.id);
  let v = a * w.atk + m.hp * w.hp + w.base;
  if (m.kw.guardian) v += (0.8 + m.hp * 0.15) * w.guardian;
  if (m.kw.barrier) v += (a * 0.6 + 1) * w.barrier;
  if (m.kw.toxic) v += 2.5 * w.toxic;
  if (w.warp && m.kw.warp) v += w.warp;
  if (w.blitz && m.kw.blitz) v += w.blitz;
  if (m.kw.twin) v += a * 0.6;
  if (m.kw.cloak) v += 0.8;
  if (m.kw.siphon) v += a * 0.4;
  if (m.kw.amplify) v += m.kw.amplify * 1.2;
  // value: a number, or (s, m) => number for effects whose worth depends on the board or hand
  if (!m.silenced && d.value) v += typeof d.value === 'function' ? d.value(s, m) : d.value;
  if (m.extraDeath.length) v += m.extraDeath.length * 1.2;
  if (m.frozen) v -= a * 0.4;
  return v;
}

function heroValue(h) { return h + Math.max(0, 12 - h) * 0.7 + Math.max(0, 6 - h) * 1.5; }

// How much health I'd have left if the opponent swung everything at me next turn.
function lethalMargin(s, me) {
  const P = s.players[me], O = s.players[1 - me];
  let danger = O.weapon ? O.weapon.atk : 0;
  for (const m of O.board) if (alive(m) && !m.frozen) danger += atkOf(s, m) * (m.kw.twin ? 2 : 1);
  const myGuard = P.board.filter(m => alive(m) && m.kw.guardian).reduce((a, m) => a + m.hp, 0);
  return P.hp + P.armor - (danger - myGuard * 0.5);
}

// w: the acting player's persona weights (aiChoose passes per-decision weights).
function evaluate(s, me, w = aiWeights(s, me)) {
  const P = s.players[me], O = s.players[1 - me];
  if (P.hp <= 0) return -1e7;
  if (O.hp <= 0) return 1e7;
  let v = heroValue(P.hp + P.armor) * w.self - heroValue(O.hp + O.armor) * w.face;
  if (O.phases.length) v -= O.phases.length * 120;
  for (const m of P.board) v += minionValue(s, m, w) * w.mine;
  if (w.wide) for (const m of P.board) if (alive(m)) v += w.wide;
  for (const m of O.board) v -= minionValue(s, m, w) * w.theirs;
  for (const c of P.hand) v += c.id === 'energy_cell' ? 1.6 : (0.6 + Math.min(D(c.id).cost, 6) * w.handCost) * w.hand;
  if (P.weapon) v += P.weapon.atk * P.weapon.dur * w.gear;
  if (w.gearOn && P.weapon) v += w.gearOn;
  if (O.weapon) v -= O.weapon.atk * O.weapon.dur * 0.5;
  v -= P.overload * 0.6;
  v += P.traps.length * w.traps;
  if (w.armor) v += P.armor * w.armor;
  const margin = lethalMargin(s, me);
  if (margin <= 0) v -= (45 + Math.min(20, -margin * 2)) * w.danger;   // dead next turn unless something changes
  else if (margin <= 4) v -= (5 - margin) * 3 * w.danger;              // uncomfortably close
  return v;
}

// Cunning: a removal or control spell aimed at anything but the best enemy unit
// (or a weak one) is marked down, unless we're in danger or the hand is nearly full.
function holdRemoval(s, pi, w, scored) {
  const P = s.players[pi], O = s.players[1 - pi];
  if (P.hand.length >= MAX_HAND - 1 || lethalMargin(s, pi) <= 2) return;
  let best = -Infinity;
  for (const m of O.board) if (alive(m)) best = Math.max(best, minionValue(s, m, w));
  for (const x of scored) {
    if (x.a.k !== 'play' || x.a.t == null || x.v >= 1e6) continue;
    const t = getChar(s, x.a.t);
    if (!t || isHero(t) || ownerOf(t) === pi || D(x.a.id).type !== 'spell') continue;
    const tv = minionValue(s, t, w);
    if (tv < w.holdMin || tv < best - 0.5) x.v -= w.hold;
  }
}

// The first attack of a sequence that kills the enemy commander this turn, or null.
function lethalNow(s, pi) {
  const O = s.players[1 - pi], P = s.players[pi];
  let dmg = 0; const hitters = [];
  for (const c of [...P.board, P]) {
    if (!canAttack(s, pi, c.uid) || !attackTargets(s, c.uid).includes(O.uid)) continue;
    const swings = isHero(c) ? 1 : (c.kw.twin ? 2 : 1) - (c.attacks || 0);
    dmg += atkOf(s, c) * Math.max(1, swings); hitters.push(c.uid);
  }
  return hitters.length && dmg >= O.hp + O.armor ? { k: 'atk', a: hitters[0], t: O.uid } : null;
}

function aiActions(s, pi) {
  const acts = [], p = s.players[pi];
  p.hand.forEach((c, hi) => {
    if (!canPlay(s, pi, hi)) return;
    const ts = cardTargets(s, pi, c);
    if (ts.length) ts.forEach(t => acts.push({ k: 'play', hi, t, id: c.id }));
    else acts.push({ k: 'play', hi, t: null, id: c.id });
  });
  if (canPower(s, pi)) {
    const ts = powerTargets(s, pi);
    if (ts.length) ts.forEach(t => acts.push({ k: 'pow', t })); else acts.push({ k: 'pow', t: null });
  }
  for (const c of [p, ...p.board]) if (canAttack(s, pi, c.uid)) for (const t of attackTargets(s, c.uid)) acts.push({ k: 'atk', a: c.uid, t });
  return acts;
}

function applyAct(s, pi, a) {
  if (a.k === 'play') playCard(s, pi, a.hi, a.t);
  else if (a.k === 'pow') usePower(s, pi, a.t);
  else attack(s, a.a, a.t);
  if (s.choice) resolveChoice(s, 0);
}

function simulate(s, pi, a) { const c = cloneState(s); applyAct(c, pi, a); return c; }

// Focus fire: a single attack into a big unit usually looks bad on its own
// (we lose the attacker, they keep the unit), so the greedy pass never starts
// it. Plan whole sequences of attacks that kill one target and compare the end
// state instead. The rest of a chosen sequence is replayed on later calls.
let AI_PLAN = null;

function subsets(arr, max) {
  const out = [];
  const rec = (i, cur) => { if (cur.length) out.push(cur.slice()); if (cur.length >= max) return; for (let k = i; k < arr.length; k++) { cur.push(arr[k]); rec(k + 1, cur); cur.pop(); } };
  rec(0, []); return out;
}

function focusFire(s, pi, w = aiWeights(s, pi)) {
  const P = s.players[pi], O = s.players[1 - pi];
  const attackers = [P, ...P.board].filter(c => canAttack(s, pi, c.uid)).map(c => c.uid);
  if (attackers.length < 2) return null;
  let best = null;
  for (const t of O.board) {
    if (!alive(t)) continue;
    const legal = attackers.filter(a => attackTargets(s, a).includes(t.uid));
    if (legal.length < 2) continue;
    const need = t.hp + (t.kw.barrier ? 1 : 0);
    for (const combo of subsets(legal, 4)) {
      if (combo.length < 2) continue;
      const total = combo.reduce((n, u) => n + atkOf(s, getChar(s, u)), 0);
      if (total < need) continue;
      if (total - Math.min(...combo.map(u => atkOf(s, getChar(s, u)))) >= need) continue;   // only minimal combos
      // smallest hit first so it pops Barrier; commander last so it takes the least return damage
      const order = combo.slice().sort((a, b) => (typeof a === 'string') - (typeof b === 'string') || atkOf(s, getChar(s, a)) - atkOf(s, getChar(s, b)));
      const c = cloneState(s); let ok = true;
      for (const a of order) { if (!getChar(c, t.uid) || !alive(getChar(c, t.uid))) break; if (!canAttack(c, pi, a) || !attackTargets(c, a).includes(t.uid)) { ok = false; break; } attack(c, a, t.uid); }
      if (!ok || (getChar(c, t.uid) && alive(getChar(c, t.uid)))) continue;
      const v = evaluate(c, pi, w);
      if (!best || v > best.v) best = { v, steps: order.map(a => ({ k: 'atk', a, t: t.uid })) };
    }
  }
  return best;
}

function aiChoose(s, pi, level) {
  level = Math.max(0, Math.min(3, level));
  if (AI_PLAN && AI_PLAN.pi === pi && AI_PLAN.turn === s.turnNo && AI_PLAN.steps.length) {
    const a = AI_PLAN.steps.shift();
    const tgt = getChar(s, a.t);
    if (tgt && alive(tgt) && canAttack(s, pi, a.a) && attackTargets(s, a.a).includes(a.t)) return a;
    AI_PLAN = null;
  }
  AI_PLAN = null;
  // Battles saved before personas existed: look the enemy commander up by name.
  if (pi === 1 && s.players[1].persona === undefined && !s.sim && typeof personaOf === 'function') s.players[1].persona = personaOf(s.players[1]).key;
  // Lethal on the board: if everything that can reach the enemy commander adds up to a kill, take it.
  // Greedy one-step scoring can't see a kill that needs several attacks, so check it first, at every level.
  const kill = lethalNow(s, pi);
  if (kill) return kill;
  const w = decisionWeights(s, pi);
  const base = evaluate(s, pi, w);
  // A commander swinging its weapon into a unit takes that unit's Attack back: don't trade
  // a big chunk of your own Health for it (testers farmed enemy commanders this way).
  const me = s.players[pi];
  const acts = aiActions(s, pi).filter(a => !(a.k === 'atk' && a.a === me.uid && a.t !== s.players[1 - pi].uid
    && atkOf(s, getChar(s, a.t)) * 3 > me.hp + me.armor));
  if (!acts.length) return null;
  const noise = AI_NOISE[level];
  let scored = acts.map(a => { const c = simulate(s, pi, a); return { a, v: evaluate(c, pi, w), c }; });
  if (level >= 3) {
    scored.sort((x, y) => y.v - x.v);
    for (const sc of scored.slice(0, 5)) {
      if (sc.c.over) continue;
      let best2 = sc.v;
      for (const a2 of aiActions(sc.c, pi).slice(0, 60)) best2 = Math.max(best2, evaluate(simulate(sc.c, pi, a2), pi, w));
      sc.v = sc.v * 0.5 + best2 * 0.5;
    }
  }
  if (w.hold) holdRemoval(s, pi, w, scored);
  scored.forEach(x => { if (x.v < 1e6) x.v += (Math.random() - 0.5) * noise; });
  scored.sort((x, y) => y.v - x.v);
  // Ganging up on a threat (e.g. a big Guardian walling the board): every level but rookies.
  if (level >= 1 && !s.sim) {
    const ff = focusFire(s, pi, w);
    if (ff && ff.v > Math.max(base, scored[0].v) + w.ff) {
      AI_PLAN = { pi, turn: s.turnNo, steps: ff.steps.slice(1) };
      return ff.steps[0];
    }
  }
  // Relentless: also spends cards and power on moves that look slightly worse than passing.
  // Relentless commanders also spend cards on slightly-worse-than-passing moves; a power is only
  // used when it helps (no wasted heals at full Health, no hitting your own side).
  const good = scored.filter(x => x.v > base + (x.a.k === 'pow' ? 0.001 : 0.05) || (w.eager && x.a.k === 'play' && x.v > base - w.eager));
  if (!good.length) return null;
  if (level === 0 && good.length > 1 && Math.random() < 0.3 && good[0].v < 1e6) return pick(good).a;
  return good[0].a;
}
