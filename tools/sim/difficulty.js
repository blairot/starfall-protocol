#!/usr/bin/env node
'use strict';
// ============================================================================
// STARFALL PROTOCOL: difficulty curve check.
// Walks the whole campaign the way a player progresses (same rewards, packs
// opened as they arrive, packs bought when affordable, crate picks, deck rebuilt
// from what you own) and, at every mission, plays many AI-vs-AI games with the
// player's side at two skill levels. Prints win rates per mission so spikes and
// flat stretches show up.
//
//   node tools/sim/difficulty.js [--diff officer] [--games 40] [--levels 1,2] [--json out.json]
//
// Player AI level 1 ~ an average player, 2 ~ a skilled one (the enemy uses its
// own level from the encounter plus the difficulty setting). Contracts are not
// simulated, so Credits run slightly behind a real campaign.
// ============================================================================
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DIFF = arg('diff', 'officer'), GAMES = +arg('games', 40), LEVELS = arg('levels', '1,2').split(',').map(x => x === 'F' ? 'F' : Number(x)), JSON_OUT = arg('json', null);
// --tune: for missions below their target win rate (at the first level), search the enemy Health that reaches it
const TUNE = process.argv.includes('--tune'), target = e => e.boss ? 55 : e.elite ? 45 : e.sector >= 2 ? 65 : 0;

const G = { console, Date, JSON, performance: { now: () => Date.now() }, setTimeout, clearTimeout };
// --seed <n>: the same packs, crates and games every run, so two rule versions can be compared fairly (A/B)
if (arg('seed', null) != null) { let st = +arg('seed') | 0; G.Math = Object.create(Math); G.Math.random = () => { st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
G.window = G; vm.createContext(G);
for (const f of ['build', 'engine', 'cards', 'strategies', 'ai', 'campaign', 'economy', 'station', 'decks', 'lore', 'cinematics'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), G, { filename: f + '.js' });
const g = n => vm.runInContext(n, G);
// --patch "<js>": try a rule change in the simulation without editing the game; --only 3-6,3-E: report just these
if (arg('patch', null)) vm.runInContext(arg('patch'), G);
const ONLY = arg('only', null) ? arg('only').split(',') : null;
const [ENCOUNTERS, ECON, D] = [g('ENCOUNTERS'), g('ECON'), g('D')];
const fn = n => g(n);

// 'F' = the face-racer: plays its most expensive affordable card, always attacks the enemy commander when it can
function faceChoose(s, pi) {
  const P = s.players[pi], O = s.players[1 - pi];
  const hand = P.hand.map((c, hi) => ({ c, hi })).filter(x => fn('canPlay')(s, pi, x.hi)).sort((a, b) => D(b.c.id).cost - D(a.c.id).cost);
  if (hand.length) { const x = hand[0], ts = fn('cardTargets')(s, pi, x.c); return { k: 'play', hi: x.hi, t: ts.length ? (ts.includes(O.uid) ? O.uid : ts.find(u => !String(u).startsWith('H') && getC(s, u, pi)) || ts[0]) : null }; }
  for (const c of [...P.board, P]) if (fn('canAttack')(s, pi, c.uid)) { const ts = fn('attackTargets')(s, c.uid); return { k: 'atk', a: c.uid, t: ts.includes(O.uid) ? O.uid : ts[0] }; }
  return null;
}
const getC = (s, u, pi) => s.players[1 - pi].board.some(m => m.uid === u);
function play(save, enc, lvl) {
  const s = fn('newGame')(fn('buildBattle')(save, enc));
  s.players[0].isAI = true;
  fn('aiMulligan')(s, 0); fn('aiMulligan')(s, 1); fn('beginPlay')(s);
  for (let n = 0; !s.over && n < 90; n++) {
    const pi = s.active, L = pi === 0 ? lvl : s.players[1].ai;
    for (let k = 0; k < 45 && !s.over; k++) { const a = L === 'F' ? faceChoose(s, pi) : fn('aiChoose')(s, pi, L); if (!a) break; fn('applyAct')(s, pi, a); if (s.choice) fn('resolveChoice')(s, 0); }
    if (!s.over) fn('endTurn')(s);
    s.events = [];
  }
  return { win: s.winner === 0, turns: Math.ceil(s.turnNo / 2), hp: s.players[0].hp };
}

// rewards after the first clear, as endBattle() in js/ui.js
function clear(save, enc) {
  const rw = fn('battleRewards')(save, enc, true);
  save.cleared[enc.id] = true;
  save.credits += rw.credits;
  if (rw.packs) save.packs[rw.packTier] = (save.packs[rw.packTier] || 0) + rw.packs;
  if (enc.graduation && !fn('economyOpen')(save)) ['packs', 'crafting', 'anchorage'].forEach(k => save.codex.includes(k) || save.codex.push(k));
  if (rw.alloy) fn('ensureStation')(save).alloy += rw.alloy;
  if (rw.scrap) save.scrap += rw.scrap;
  if (rw.legendary) fn('gainCard')(save, rw.legendary);
  const crate = fn('crateChoice')(enc), granted = [];
  if (crate) { const best = crate.slice().sort((a, b) => fn('cardPower')(b) - fn('cardPower')(a))[0]; fn('grantCard')(save, best, fn('crateCopies')(best)); }
  else if (enc.grant) Object.entries(enc.grant).forEach(([id, n]) => { fn('grantCard')(save, id, n); granted.push(id); });
  if (enc.sector === 0 && !enc.elite && granted.length) fn('academyLoad')(save, granted);
  if (enc.unlockPowers) enc.unlockPowers.forEach(p => save.powers.includes(p) || save.powers.push(p));
  if (!save.power && save.powers.length) save.power = save.powers[0];
  // spend: open everything, buy packs of the newest set while affordable
  if (fn('economyOpen')(save)) {
    const tier = Math.min(fn('highestSector')(save) + 1, g('PACK_SETS').length);   // the newest set you can buy (the shop stops at the last set)
    while (save.credits >= ECON.packPrice) { save.credits -= ECON.packPrice; save.packs[tier] = (save.packs[tier] || 0) + 1; }
    Object.keys(save.packs).forEach(t => { while (save.packs[t] > 0) { save.packs[t]--; fn('openPack')(save, +t); } });
  }
}
// a player past the Academy rebuilds their deck from everything they own
function rebuild(save) {
  const size = fn('deckSizeFor')(save);
  if (fn('highestSector')(save) === 0) { if (save.deck.length < size) fn('autoFillDeck')(save, size); return; }
  save.deck = []; fn('autoFillDeck')(save, size);
}

const save = fn('newSave')('Sim', DIFF);
const order = [];
ENCOUNTERS.filter(e => !e.elite).forEach(e => { order.push(e); ENCOUNTERS.filter(x => x.elite && x.after === e.id).forEach(x => order.push(x)); });
const rows = [];
const t0 = Date.now();
console.log(`Difficulty: ${DIFF} · ${GAMES} games per mission per level · player AI levels ${LEVELS.join(', ')}`);
console.log('mission  kind   deck  ' + LEVELS.map(l => `L${l} win%  turns  hpLeft`).join('   ') + '  name');
for (const enc of order) {
  rebuild(save);
  const r = { id: enc.id, name: enc.name, kind: enc.boss ? 'BOSS' : enc.elite ? 'elite' : 'main', sector: enc.sector, deck: enc.fixedDeck ? 'fixed' : save.deck.length + '/' + fn('deckSizeFor')(save), levels: {} };
  if (ONLY && !ONLY.includes(enc.id)) { clear(save, enc); continue; }   // --only: still progress the campaign, skip the games
  for (const L of LEVELS) {
    let w = 0, turns = 0, hp = 0;
    for (let k = 0; k < GAMES; k++) { let res; try { res = play(save, enc, L); } catch (e) { res = { win: false, turns: 0, hp: 0 }; } if (res.win) { w++; hp += res.hp; } turns += res.turns; }
    r.levels[L] = { win: Math.round(100 * w / GAMES), turns: +(turns / GAMES).toFixed(1), hp: w ? Math.round(hp / w) : 0 };
  }
  if (TUNE && r.levels[LEVELS[0]].win < target(enc)) {
    const hp0 = enc.enemy.hp; let lo = Math.round(hp0 * 0.4), hi = hp0, best = hp0;
    while (hi - lo > 1) {
      const mid = Math.round((lo + hi) / 2); enc.enemy.hp = mid;
      let w = 0; const n = Math.max(GAMES, 60);
      for (let k = 0; k < n; k++) { try { if (play(save, enc, LEVELS[0]).win) w++; } catch (e) { /* loss */ } }
      if (100 * w / n >= target(enc)) { best = mid; lo = mid; } else hi = mid;
    }
    enc.enemy.hp = hp0; r.tuneHp = best === hp0 ? Math.round(hp0 * 0.4) : best;
    console.log(`   tune ${enc.id}: target ${target(enc)}%, enemy Health ${hp0} -> ${r.tuneHp}`);
  }
  rows.push(r);
  if (!ONLY || ONLY.includes(enc.id)) console.log(`${enc.id.padEnd(8)} ${r.kind.padEnd(6)} ${String(r.deck).padEnd(5)} ` + LEVELS.map(l => `${String(r.levels[l].win).padStart(6)}%  ${String(r.levels[l].turns).padStart(5)}  ${String(r.levels[l].hp).padStart(6)}`).join('   ') + '  ' + enc.name);
  clear(save, enc);
}
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ diff: DIFF, games: GAMES, levels: LEVELS, rows }, null, 1));
