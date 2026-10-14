// Builds the private playtest dashboard page from tools/dashboard.src.html,
// baking in mission and card names from the game data.
// Usage: node tools/make_dashboard.js <output.html>
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Date, Error });
for (const f of ['engine.js', 'cards.js', 'campaign.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
const { ENCOUNTERS, SECTORS, CARD_LIST } = vm.runInContext('({ ENCOUNTERS, SECTORS, CARD_LIST })', ctx);
const game = {
  missions: ENCOUNTERS.map(e => ({ id: e.id, name: e.name, sector: e.sector, kind: e.final ? 'final' : e.boss ? 'boss' : e.elite ? 'elite' : 'normal' })),
  sectors: SECTORS.map(s => s.name),
  graduation: (ENCOUNTERS.find(e => e.graduation) || ENCOUNTERS.find(e => e.sector === 0 && e.boss) || {}).id,
  cards: CARD_LIST.filter(d => !d.token).map(d => [d.id, d.name]),
};
const src = fs.readFileSync(path.join(__dirname, 'dashboard.src.html'), 'utf8');
const out = process.argv[2] || path.join(ROOT, 'dashboard.html');
fs.writeFileSync(out, src.replace('/*GAME_DATA*/null', JSON.stringify(game)));
console.log(`wrote ${out}: ${game.missions.length} missions, ${game.cards.length} cards, graduation ${game.graduation}`);
