// Save compatibility test: every save from an earlier build must still load and play.
//   node tools/test/saves.js
// For each save in tools/test/saves/ (snapshots of AI-tester saves from earlier builds),
// plus a hand-made save shaped like the very first builds, it:
//   1. runs migrate() (js/campaign.js), the same upgrade every load and restored backup goes through
//   2. checks the fields the game reads exist and every deck card is real
//   3. round-trips the save through the Settings backup code (with a non-ASCII name)
//   4. plays the save's next mission to the end, AI against AI, and opens a pack and the map data
// Exits 1 on any failure. Add a new fixture whenever the save format changes.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = ['build', 'engine', 'cards', 'strategies', 'ai', 'campaign', 'economy', 'station', 'achievements', 'events', 'challenge', 'decks', 'lore', 'cinematics'];
const G = { console, Date, JSON, Math, performance: { now: () => Date.now() }, setTimeout, clearTimeout };
G.window = G; vm.createContext(G);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), G, { filename: f + '.js' });
const fn = n => vm.runInContext(n, G);
const [ENCOUNTERS, CARDS] = [fn('ENCOUNTERS'), fn('CARDS')];

// as the Settings "Copy backup code" / "Restore from code" buttons in js/ui.js
const toCode = save => Buffer.from(JSON.stringify(save), 'utf8').toString('base64');
const fromCode = code => JSON.parse(Buffer.from(code, 'base64').toString('utf8'));

// the shape of a save from the first builds: no station, decks, cutscenes, events, achievements or economy
function legacySave() {
  const s = { v: 1, name: 'Old Timer', diff: 'officer', cleared: { '1-1': true, '1-2': true, '1-3': true }, coll: {}, deck: [], power: null, powers: [],
    codex: [], stats: { wins: 3, losses: 1 }, seenSector: {} };
  'cadet:2 scout_drone:2 marine:2 ion_lancer:2 heavy_trooper:2 patrol_frigate:2 star_cruiser:1'.split(' ').forEach(t => { const [id, n] = t.split(':'); s.coll[id] = +n; for (let i = 0; i < n; i++) s.deck.push(id); });
  s.coll.retired_card = 2; s.deck.push('retired_card');   // a card that was later removed from the game
  return s;
}

function play(save, enc) {
  const s = fn('newGame')(fn('buildBattle')(save, enc));
  s.players[0].isAI = true;
  fn('aiMulligan')(s, 0); fn('aiMulligan')(s, 1); fn('beginPlay')(s);
  for (let n = 0; !s.over && n < 90; n++) {
    for (let k = 0; k < 45 && !s.over; k++) { const a = fn('aiChoose')(s, s.active, 2); if (!a) break; fn('applyAct')(s, s.active, a); if (s.choice) fn('resolveChoice')(s, 0); }
    if (!s.over) fn('endTurn')(s);
    s.events = [];
  }
  return s;
}

const cases = fs.readdirSync(path.join(__dirname, 'saves')).filter(f => f.endsWith('.json'))
  .map(f => ({ name: f.replace('.json', ''), save: JSON.parse(fs.readFileSync(path.join(__dirname, 'saves', f), 'utf8')) }));
cases.unshift({ name: 'legacy-build-1', save: legacySave() });

let fails = 0;
for (const c of cases) {
  const problems = [];
  const check = (ok, msg) => { if (!ok) problems.push(msg); };
  try {
    const save = fn('migrate')(c.save);
    check(save, 'migrate returned nothing');
    for (const k of ['cleared', 'coll', 'deck', 'stats', 'codex', 'powers', 'packs', 'pity', 'contracts', 'station', 'seenCine', 'seenSector'])
      check(save[k] != null, `missing ${k} after migrate`);
    check(typeof save.credits === 'number' && typeof save.scrap === 'number', 'credits or scrap not a number');
    check(save.deck.every(id => CARDS[id]), 'deck has a card that does not exist');
    check(Object.keys(save.coll).every(id => CARDS[id]), 'collection has a card that does not exist');
    check(save.deck.every(id => (save.coll[id] || 0) > 0 || fn('D')(id).reward), 'deck has a card the player does not own');

    // backup code round trip, with a name that needs UTF-8
    save.name = c.name === 'legacy-build-1' ? 'Zoë Ōkami ★' : save.name;
    const back = fn('migrate')(fromCode(toCode(save)));
    check(back && back.name === save.name && JSON.stringify(back.coll) === JSON.stringify(save.coll), 'backup code does not round-trip');

    // the next mission (or the finale, for a finished campaign) plays to the end
    const enc = fn('nextEncounter')(save) || ENCOUNTERS[ENCOUNTERS.length - 1];
    if (save.deck.length < fn('deckSizeFor')(save)) fn('autoFillDeck')(save, fn('deckSizeFor')(save));
    const s = play(save, enc);
    check(s.over, `${enc.id} did not finish in 90 turns`);
    // other code paths a returning player hits straight away
    fn('refillContracts')(save); fn('ensureStation')(save); fn('eventsAvailable')(save, null);
    if (fn('economyOpen')(save)) { save.packs[1] = (save.packs[1] || 0) + 1; fn('openPack')(save, 1); }
    fn('achieve')(save, null);
    if (fn('challengeOpen')(save) && save.challenge) fn('chEnc')(save);
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${c.name.padEnd(16)} ${String(Object.keys(save.cleared).length).padStart(2)} cleared, next ${enc.id}: ${s.winner === 0 ? 'won' : 'lost'} in ${Math.ceil(s.turnNo / 2)} turns`);
  } catch (e) {
    problems.push(e.stack.split('\n').slice(0, 3).join(' | '));
    console.log(`FAIL  ${c.name}`);
  }
  if (problems.length) { fails++; problems.forEach(p => console.log('      ' + p)); }
}
console.log(fails ? `\n${fails} of ${cases.length} saves failed.` : `\nAll ${cases.length} saves load and play.`);
process.exit(fails ? 1 : 0);
