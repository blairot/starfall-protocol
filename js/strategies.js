'use strict';
// ============================================================================
// STARFALL PROTOCOL — faction strategies: two clear decks to build around per
// faction. Cards opt in with `strat: ['key']` in cards.js; `engine: true` marks
// the cheap Rare/Epic/Legendary card a strategy is built on. The Hangar uses
// this to suggest what to build and to filter the collection.
// ============================================================================

const STRATEGIES = {
  shieldwall: { name: 'Shield Wall', faction: 'fleet', text: 'Guardians hold the line while Armor and repairs keep them standing. Win the long game.' },
  combined:   { name: 'Combined Arms', faction: 'fleet', text: 'Flood the board with cheap troops, then make every one of them stronger.' },
  gear:       { name: 'Gunslinger', faction: 'raider', text: 'Arm your commander and attack with Gear every turn. Your weapons do the work.' },
  salvage:    { name: 'Scrapyard', faction: 'raider', text: 'Units that pay off when they die. Trade them away freely and profit from every loss.' },
  brood:      { name: 'Brood', faction: 'swarm', text: 'Endless Swarmlings. Go wide and bury the enemy in bodies.' },
  venom:      { name: 'Venom', faction: 'swarm', text: 'Toxic units destroy anything they damage, so a cheap bug can take down a titan.' },
  overclock:  { name: 'Overclock', faction: 'synth', text: 'Spend Overheat for huge early turns, and pay the bill later.' },
  fortress:   { name: 'Fortress', faction: 'synth', text: 'Barrier and Armor make your machines very hard to remove.' },
  storm:      { name: 'Spellstorm', faction: 'psi', text: 'Cheap Protocols, made deadly by Amplify. Control the board with spells.' },
  freeze:     { name: 'Deep Freeze', faction: 'psi', text: 'Freeze the enemy with Cryo, then punish them while they are stuck.' },
};

// Cards in a strategy (owned or not), engines first.
function strategyCards(key) {
  return CARD_LIST.filter(d => !d.token && (d.strat || []).includes(key)).sort((a, b) => (b.engine ? 1 : 0) - (a.engine ? 1 : 0) || a.cost - b.cost);
}

// How many of each strategy's cards are in a deck: [{ key, n, engine }] sorted, strongest first.
function deckStrategies(deck) {
  const out = {};
  deck.forEach(id => { const d = D(id); (d.strat || []).forEach(k => { const o = out[k] || (out[k] = { key: k, n: 0, engine: false }); o.n++; if (d.engine) o.engine = true; }); });
  return Object.values(out).sort((a, b) => b.n - a.n);
}
