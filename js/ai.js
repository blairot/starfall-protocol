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

function cloneState(s) {
  const c = JSON.parse(JSON.stringify({ ...s, events: [] }));
  c.sim = true; return c;
}

function minionValue(s, m) {
  if (!alive(m)) return 0;
  const a = atkOf(s, m), d = D(m.id);
  let v = a * 1.0 + m.hp * 0.9 + 0.6;
  if (m.kw.guardian) v += 0.8 + m.hp * 0.15;
  if (m.kw.barrier) v += a * 0.6 + 1;
  if (m.kw.toxic) v += 2.5;
  if (m.kw.twin) v += a * 0.6;
  if (m.kw.cloak) v += 0.8;
  if (m.kw.siphon) v += a * 0.4;
  if (m.kw.amplify) v += m.kw.amplify * 1.2;
  if (!m.silenced && d.value) v += d.value;
  if (m.extraDeath.length) v += m.extraDeath.length * 1.2;
  if (m.frozen) v -= a * 0.4;
  return v;
}

function heroValue(h) { return h + Math.max(0, 12 - h) * 0.7 + Math.max(0, 6 - h) * 1.5; }

function evaluate(s, me) {
  const P = s.players[me], O = s.players[1 - me];
  if (P.hp <= 0) return -1e7;
  if (O.hp <= 0) return 1e7;
  let v = heroValue(P.hp + P.armor) * 0.85 - heroValue(O.hp + O.armor);
  if (O.phases.length) v -= O.phases.length * 120;
  for (const m of P.board) v += minionValue(s, m);
  for (const m of O.board) v -= minionValue(s, m) * 1.1;
  for (const c of P.hand) v += c.id === 'energy_cell' ? 1.6 : 0.6 + Math.min(D(c.id).cost, 6) * 0.12;
  if (P.weapon) v += P.weapon.atk * P.weapon.dur * 0.5;
  if (O.weapon) v -= O.weapon.atk * O.weapon.dur * 0.5;
  v -= P.overload * 0.6;
  v += P.traps.length * 1.5;
  // Danger: can the opponent kill me next turn?
  let danger = O.weapon ? O.weapon.atk : 0;
  for (const m of O.board) if (alive(m) && !m.frozen) danger += atkOf(s, m) * (m.kw.twin ? 2 : 1);
  const myGuard = P.board.filter(m => alive(m) && m.kw.guardian).reduce((a, m) => a + m.hp, 0);
  const margin = P.hp + P.armor - (danger - myGuard * 0.5);
  if (margin <= 0) v -= 45 + Math.min(20, -margin * 2);   // dead next turn unless something changes
  else if (margin <= 4) v -= (5 - margin) * 3;            // uncomfortably close
  return v;
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

function focusFire(s, pi) {
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
      const v = evaluate(c, pi);
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
  const base = evaluate(s, pi);
  const acts = aiActions(s, pi);
  if (!acts.length) return null;
  const noise = AI_NOISE[level];
  let scored = acts.map(a => { const c = simulate(s, pi, a); return { a, v: evaluate(c, pi), c }; });
  if (level >= 3) {
    scored.sort((x, y) => y.v - x.v);
    for (const sc of scored.slice(0, 5)) {
      if (sc.c.over) continue;
      let best2 = sc.v;
      for (const a2 of aiActions(sc.c, pi).slice(0, 60)) best2 = Math.max(best2, evaluate(simulate(sc.c, pi, a2), pi));
      sc.v = sc.v * 0.5 + best2 * 0.5;
    }
  }
  scored.forEach(x => { if (x.v < 1e6) x.v += (Math.random() - 0.5) * noise; });
  scored.sort((x, y) => y.v - x.v);
  // rookies don't coordinate; everyone else considers ganging up on a threat
  if (level >= 1 && !s.sim) {
    const ff = focusFire(s, pi);
    if (ff && ff.v > Math.max(base, scored[0].v) + 0.5) {
      AI_PLAN = { pi, turn: s.turnNo, steps: ff.steps.slice(1) };
      return ff.steps[0];
    }
  }
  const good = scored.filter(x => x.v > base + 0.05);
  if (!good.length) return null;
  if (level === 0 && good.length > 1 && Math.random() < 0.3 && good[0].v < 1e6) return pick(good).a;
  return good[0].a;
}
