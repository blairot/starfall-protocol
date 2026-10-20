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
const DIFF = arg('diff', 'officer'), GAMES = +arg('games', 40), LEVELS = arg('levels', '1,2').split(',').map(Number), JSON_OUT = arg('json', null);

const G = { console, Date, JSON, performance: { now: () => Date.now() }, setTimeout, clearTimeout };
G.window = G; vm.createContext(G);
for (const f of ['build', 'engine', 'cards', 'strategies', 'ai', 'campaign', 'economy', 'station', 'decks', 'lore', 'cinematics'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), G, { filename: f + '.js' });
const g = n => vm.runInContext(n, G);
const [ENCOUNTERS, ECON, D] = [g('ENCOUNTERS'), g('ECON'), g('D')];
const fn = n => g(n);

function play(save, enc, lvl) {
  const s = fn('newGame')(fn('buildBattle')(save, enc));
  s.players[0].isAI = true;
  fn('aiMulligan')(s, 0); fn('aiMulligan')(s, 1); fn('beginPlay')(s);
  for (let n = 0; !s.over && n < 90; n++) {
    const pi = s.active, L = pi === 0 ? lvl : s.players[1].ai;
    for (let k = 0; k < 45 && !s.over; k++) { const a = fn('aiChoose')(s, pi, L); if (!a) break; fn('applyAct')(s, pi, a); if (s.choice) fn('resolveChoice')(s, 0); }
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
  for (const L of LEVELS) {
    let w = 0, turns = 0, hp = 0;
    for (let k = 0; k < GAMES; k++) { let res; try { res = play(save, enc, L); } catch (e) { res = { win: false, turns: 0, hp: 0 }; } if (res.win) { w++; hp += res.hp; } turns += res.turns; }
    r.levels[L] = { win: Math.round(100 * w / GAMES), turns: +(turns / GAMES).toFixed(1), hp: w ? Math.round(hp / w) : 0 };
  }
  rows.push(r);
  console.log(`${enc.id.padEnd(8)} ${r.kind.padEnd(6)} ${String(r.deck).padEnd(5)} ` + LEVELS.map(l => `${String(r.levels[l].win).padStart(6)}%  ${String(r.levels[l].turns).padStart(5)}  ${String(r.levels[l].hp).padStart(6)}`).join('   ') + '  ' + enc.name);
  clear(save, enc);
}
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ diff: DIFF, games: GAMES, levels: LEVELS, rows }, null, 1));
