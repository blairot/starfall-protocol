'use strict';
// ============================================================================
// STARFALL PROTOCOL: achievements (the "Service record").
// Pure data + checks, no DOM: the game (ui.js, shop.js, station.js) and the
// headless tools both call achieve(save, battle) and get back what unlocked.
// Each pays a small Credit reward. save.ach = { id: time unlocked }.
// battle (optional) = { won, enc, s, easy } for checks about the battle just played.
// ============================================================================

const ACHIEVEMENTS = [
  // campaign
  { id: 'grad', group: 'Campaign', name: 'Commissioned', text: 'Graduate the Fleet Academy.', reward: 25, test: sv => !!sv.cleared['1-6'] },
  { id: 'vex', group: 'Campaign', name: 'Debt Settled', text: 'Defeat Captain Vex.', reward: 50, test: sv => !!sv.cleared['2-6'] },
  { id: 'ixis', group: 'Campaign', name: "Queen's Fall", text: 'Defeat Ixis, Brood Queen.', reward: 50, test: sv => !!sv.cleared['3-6'] },
  { id: 'calculus', group: 'Campaign', name: 'Fault Tolerance', text: 'Defeat Calculus Prime.', reward: 50, test: sv => !!sv.cleared['4-6'] },
  { id: 'nyra', group: 'Campaign', name: 'Lights Out', text: 'Defeat Nyra, Void Hierarch.', reward: 50, test: sv => !!sv.cleared['5-6'] },
  { id: 'finale', group: 'Campaign', name: 'The Last Note', text: 'Finish the campaign.', reward: 100, test: sv => !!sv.cleared['6-5'] },
  { id: 'elites', group: 'Campaign', name: 'Off the Books', text: 'Clear every optional Elite mission.', reward: 100,
    test: sv => ENCOUNTERS.filter(e => e.elite).every(e => sv.cleared[e.id]), progress: sv => [ENCOUNTERS.filter(e => e.elite && sv.cleared[e.id]).length, ENCOUNTERS.filter(e => e.elite).length] },
  // mastery
  { id: 'untouched', group: 'Mastery', name: 'Untouched', text: 'Win a battle without your commander taking damage.', reward: 50,
    test: (sv, b) => b && b.won && !b.enc.fixedDeck && !Object.values(b.s.hurt || {}).reduce((a, n) => a + n, 0) },
  { id: 'thread', group: 'Mastery', name: 'By a Thread', text: 'Win a battle with 3 Health or less.', reward: 25, test: (sv, b) => b && b.won && b.s.players[0].hp <= 3 },
  { id: 'swift', group: 'Mastery', name: 'Short Engagement', text: 'Win a battle outside the Academy by your 6th turn.', reward: 25,
    test: (sv, b) => b && b.won && b.enc.sector >= 1 && Math.ceil(b.s.turnNo / 2) <= 6 },
  { id: 'admiral', group: 'Mastery', name: "Admiral's Honours", text: 'Defeat a boss on Admiral difficulty.', reward: 75, test: (sv, b) => b && b.won && b.enc.boss && sv.diff === 'admiral' && !b.easy },
  { id: 'clean', group: 'Mastery', name: 'Clean Sweep', text: 'Clear a whole sector without losing a battle in it.', reward: 75,
    test: sv => SECTORS.some((x, i) => i > 0 && ENCOUNTERS.filter(e => e.sector === i && !e.elite).every(e => sv.cleared[e.id]) && !(sv.lostIn || {})[i]) },
  // battle feats
  { id: 'clear7', group: 'Battle', name: 'Clear Skies', text: 'Destroy 7 enemy units in one battle.', reward: 25, test: (sv, b) => b && b.won && ((b.s.tally || {}).kills || 0) >= 7 },
  { id: 'protocols', group: 'Battle', name: 'Protocol Officer', text: 'Cast 10 Protocols in one battle.', reward: 25, test: (sv, b) => b && b.won && ((b.s.tally || {}).spells || 0) >= 10 },
  { id: 'face40', group: 'Battle', name: 'Overwhelming Force', text: 'Deal 40 damage to an enemy commander in one battle.', reward: 25, test: (sv, b) => b && b.won && ((b.s.tally || {}).face || 0) >= 40 },
  // collection and Anchorage
  { id: 'legend', group: 'Collection', name: 'Legend in the Making', text: 'Own a Legendary card.', reward: 25, test: sv => Object.keys(sv.coll).some(id => D(id).rarity === 'legendary') },
  { id: 'coll100', group: 'Collection', name: 'Quartermaster', text: 'Own 100 different cards.', reward: 75,
    test: sv => Object.keys(sv.coll).length >= 100, progress: sv => [Math.min(100, Object.keys(sv.coll).length), 100] },
  { id: 'collall', group: 'Collection', name: 'Complete Manifest', text: 'Own every card at least once.', reward: 200,
    test: sv => CARD_LIST.every(d => d.token || sv.coll[d.id]), progress: sv => [CARD_LIST.filter(d => !d.token && sv.coll[d.id]).length, CARD_LIST.filter(d => !d.token).length] },
  { id: 'packs25', group: 'Collection', name: 'Supply Line', text: 'Open 25 Supply Packs.', reward: 50,
    test: sv => (sv.stats.packsOpened || 0) >= 25, progress: sv => [Math.min(25, sv.stats.packsOpened || 0), 25] },
  { id: 'craft', group: 'Collection', name: 'Made to Order', text: 'Craft a card with Scrap.', reward: 25, test: sv => (sv.stats.crafted || 0) >= 1 },
  { id: 'contracts10', group: 'Anchorage', name: 'Contractor', text: 'Complete 10 contracts.', reward: 50,
    test: sv => (sv.stats.contracts || 0) >= 10, progress: sv => [Math.min(10, sv.stats.contracts || 0), 10] },
  { id: 'module', group: 'Anchorage', name: 'Home Port', text: 'Fully upgrade an Anchorage module.', reward: 50,
    test: sv => !!sv.station && STATION.order.some(id => id !== 'command' && stationLv(sv, id) >= STATION.mods[id].max) },
  { id: 'station', group: 'Anchorage', name: 'Fully Operational', text: 'Fully upgrade every Anchorage module.', reward: 150,
    test: sv => !!sv.station && STATION.order.every(id => stationLv(sv, id) >= STATION.mods[id].max),
    progress: sv => [STATION.order.reduce((a, id) => a + stationLv(sv, id), 0), STATION.order.reduce((a, id) => a + STATION.mods[id].max, 0)] },
  { id: 'records', group: 'Anchorage', name: 'Archivist', text: 'Recover every Archive record.', reward: 50,
    test: sv => typeof LORE !== 'undefined' && (LORE.archive || []).length > 0 && archiveLimit(sv) >= (LORE.archive || []).length },
];

// Check everything; unlock and pay for what's newly earned. Returns the newly unlocked achievements.
function achieve(save, battle) {
  if (!save) return [];
  save.ach = save.ach || {};
  if (battle && !battle.won && battle.enc) (save.lostIn = save.lostIn || {})[battle.enc.sector] = true;
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (save.ach[a.id]) continue;
    let ok = false; try { ok = !!a.test(save, battle); } catch (e) { ok = false; }
    if (ok) { save.ach[a.id] = Date.now(); save.credits = (save.credits || 0) + a.reward; got.push(a); }
  }
  return got;
}
function achievementCount(save) { return Object.keys((save && save.ach) || {}).length; }
