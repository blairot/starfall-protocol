'use strict';
// ============================================================================
// STARFALL PROTOCOL — economy: credits, supply packs, scrap, crafting, contracts
// Modeled on Hearthstone: 5-card packs with rarity odds, at least one Rare+,
// pity timers for Epic/Legendary, no duplicate Legendaries until a set is
// complete, and extra copies turned into Scrap for crafting.
// ============================================================================

const ECON = {
  packPrice: 125,
  packSize: 5,
  // chance per card slot
  odds: { common: 0.735, rare: 0.23, epic: 0.028, legendary: 0.007 },
  pityEpic: 15,        // an Epic is guaranteed at least once every 15 packs
  pityLegendary: 35,   // a Legendary at least once every 35 packs
  freshChance: 0,      // chance a Common/Rare/Epic slot avoids cards you already own (Legendaries always avoid duplicates); duplicates become Scrap for crafting
  scrapValue: { common: 5, rare: 20, epic: 100, legendary: 400 },
  craftCost: { common: 40, rare: 100, epic: 400, legendary: 1600 },
  winCredits: { normal: 10, elite: 40, boss: 60 },
  replayCredits: { normal: 15, elite: 30, boss: 45 },
  winPacks: { normal: 0, elite: 1, boss: 1 },
  gradPacks: 1,        // packs for finishing the Academy
  contractSlots: 2,
  // Alloy repairs Anchorage station modules (station.js)
  alloyWin: { normal: 30, elite: 50, boss: 100 },
  alloyReplay: { normal: 10, elite: 20, boss: 30 },
  alloyGraduation: 60,
};

// ---------------------------------------------------------------- Anchorage module effects
// Module data and the station screen live in station.js; the numbers that
// touch the economy and battles live here so the headless sim sees them.
function stationLv(save, id) { return (save && save.station && save.station.mods[id]) || 0; }
function packPriceOf(save) { return stationLv(save, 'dock') >= 3 ? Math.round(ECON.packPrice * 0.9 / 5) * 5 : ECON.packPrice; }
function craftCostOf(save, rarity) { return Math.round(ECON.craftCost[rarity] * (1 - 0.1 * stationLv(save, 'fabricator')) / 5) * 5; }
function contractSlotsOf(save) { const c = stationLv(save, 'comms'); return ECON.contractSlots + (c >= 1 ? 1 : 0) + (c >= 3 ? 1 : 0); }
function contractRewardOf(save, id) { return Math.round(CONTRACTS[id].reward * (stationLv(save, 'comms') >= 2 ? 1.5 : 1)); }
function creditMultOf(save) { return 1 + 0.1 * stationLv(save, 'dock'); }
function medbayHp(save) { return 2 * stationLv(save, 'medbay'); }
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const RARITY_NAME = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

// One pack set per sector; a set contains that sector's tier of cards.
const PACK_SETS = [
  { tier: 1, name: 'Academy Pack', sub: 'Fleet Academy set', hue: 215 },
  { tier: 2, name: 'Scrap Belt Pack', sub: 'Raider set', hue: 22 },
  { tier: 3, name: 'Hive Pack', sub: 'Swarm set', hue: 105 },
  { tier: 4, name: 'Forge Pack', sub: 'Synthetic set', hue: 185 },
  { tier: 5, name: 'Void Pack', sub: 'Psionic set', hue: 275 },
];
function setCards(tier) { return CARD_LIST.filter(d => !d.token && d.tier === tier); }
function setUnlocked(save, tier) { return tier - 1 <= highestSector(save) && tier <= 5; }

// ---------------------------------------------------------------- collection
// Adds one copy; copies beyond the deck limit become Scrap. Returns scrap gained.
function gainCard(save, id) {
  const d = D(id);
  if ((save.coll[id] || 0) >= maxCopies(d)) { const v = ECON.scrapValue[d.rarity]; save.scrap += v; return v; }
  save.coll[id] = (save.coll[id] || 0) + 1;
  return 0;
}
function canCraft(save, id) { const d = D(id); return !d.token && setUnlocked(save, d.tier) && (save.coll[id] || 0) < maxCopies(d) && save.scrap >= craftCostOf(save, d.rarity); }
function craftCard(save, id) { if (!canCraft(save, id)) return false; save.scrap -= craftCostOf(save, D(id).rarity); save.coll[id] = (save.coll[id] || 0) + 1; return true; }
function scrapCard(save, id) {
  const d = D(id); if (!(save.coll[id] > 0)) return false;
  save.coll[id]--; if (!save.coll[id]) delete save.coll[id];
  save.scrap += ECON.scrapValue[d.rarity];
  // keep the deck legal
  const inDeck = save.deck.filter(x => x === id).length;
  if (inDeck > (save.coll[id] || 0)) save.deck.splice(save.deck.lastIndexOf(id), 1);
  return true;
}

// ---------------------------------------------------------------- packs
function rollRarity() {
  let r = Math.random();
  for (const k of ['legendary', 'epic', 'rare']) { if (r < ECON.odds[k]) return k; r -= ECON.odds[k]; }
  return 'common';
}

function openPack(save, tier) {
  const cards = setCards(tier);
  const byR = {}; RARITIES.forEach(r => byR[r] = cards.filter(d => d.rarity === r));
  const pity = save.pity[tier] || (save.pity[tier] = { epic: 0, legendary: 0 });
  let rar = Array.from({ length: ECON.packSize }, rollRarity);
  if (!rar.some(r => r !== 'common')) rar[ECON.packSize - 1] = 'rare';
  if (pity.legendary >= ECON.pityLegendary - 1 && !rar.includes('legendary')) rar[ECON.packSize - 1] = 'legendary';
  if (pity.epic >= ECON.pityEpic - 1 && !rar.includes('epic') && !rar.includes('legendary')) rar[ECON.packSize - 2] = 'epic';
  pity.legendary = rar.includes('legendary') ? 0 : pity.legendary + 1;
  pity.epic = rar.some(r => r === 'epic' || r === 'legendary') ? 0 : pity.epic + 1;
  const out = [];
  for (const r of rar) {
    let pool = byR[r].length ? byR[r] : byR.common;
    // no duplicate Legendaries (or any card already maxed) while unowned ones remain at that rarity
    const fresh = pool.filter(d => (save.coll[d.id] || 0) < maxCopies(d) && !out.some(o => o.id === d.id && d.rarity === 'legendary'));
    if (r === 'legendary' && fresh.length) pool = fresh;
    else if (fresh.length && Math.random() < (ECON.freshChance || 0)) pool = fresh; // soft duplicate protection for the rest
    const d = pick(pool);
    const wasNew = !(save.coll[d.id] > 0);
    const scrap = gainCard(save, d.id);
    out.push({ id: d.id, rarity: d.rarity, isNew: wasNew && !scrap, scrap });
  }
  save.stats.packsOpened = (save.stats.packsOpened || 0) + 1;
  return out;
}

function buyPack(save, tier) {
  if (save.credits < packPriceOf(save) || !setUnlocked(save, tier)) return false;
  save.credits -= packPriceOf(save);
  save.packs[tier] = (save.packs[tier] || 0) + 1;
  return true;
}
function unopenedPacks(save) { return Object.values(save.packs).reduce((a, b) => a + b, 0); }

function setProgress(save, tier) {
  const cards = setCards(tier);
  const have = cards.reduce((a, d) => a + Math.min(save.coll[d.id] || 0, maxCopies(d)), 0);
  const total = cards.reduce((a, d) => a + maxCopies(d), 0);
  return { have, total };
}

// ---------------------------------------------------------------- contracts (quests)
// stat: which battle tally counts toward it. avail: when it can be offered.
const CONTRACTS = {
  wins3:    { text: 'Win 3 battles', stat: 'wins', goal: 3, reward: 40 },
  units25:  { text: 'Deploy 25 units', stat: 'units', goal: 25, reward: 40 },
  kills30:  { text: 'Destroy 30 enemy units', stat: 'kills', goal: 30, reward: 50 },
  face60:   { text: 'Deal 60 damage to enemy commanders', stat: 'face', goal: 60, reward: 50 },
  spells12: { text: 'Cast 12 Protocols', stat: 'spells', goal: 12, reward: 40, avail: s => s.codex.includes('spells') },
  power15:  { text: 'Use your commander power 15 times', stat: 'powers', goal: 15, reward: 30, avail: s => s.powers.length > 0 },
  strike8:  { text: 'Attack with your commander 8 times', stat: 'heroAttacks', goal: 8, reward: 35, avail: s => s.codex.includes('gear') },
  elite1:   { text: 'Defeat an Elite or Boss', stat: 'bigWins', goal: 1, reward: 60, avail: s => ENCOUNTERS.some(e => (e.elite || e.boss) && encUnlocked(s, e)) },
  raider15: { text: 'Play 15 Raider cards', stat: 'f_raider', goal: 15, reward: 45, avail: s => sectorUnlocked(s, 1) },
  swarm15:  { text: 'Play 15 Swarm cards', stat: 'f_swarm', goal: 15, reward: 45, avail: s => sectorUnlocked(s, 2) },
  synth15:  { text: 'Play 15 Synth cards', stat: 'f_synth', goal: 15, reward: 45, avail: s => sectorUnlocked(s, 3) },
  psi15:    { text: 'Play 15 Psionic cards', stat: 'f_psi', goal: 15, reward: 45, avail: s => sectorUnlocked(s, 4) },
  fleet20:  { text: 'Play 20 Fleet cards', stat: 'f_fleet', goal: 20, reward: 40 },
};

function refillContracts(save) {
  while (save.contracts.length < contractSlotsOf(save)) {
    const taken = new Set(save.contracts.map(c => c.id));
    const opts = Object.keys(CONTRACTS).filter(id => !taken.has(id) && id !== save.lastContract && (!CONTRACTS[id].avail || CONTRACTS[id].avail(save)));
    if (!opts.length) break;
    save.contracts.push({ id: pick(opts), progress: 0 });
  }
}

// Apply one battle's tally. Returns the contracts finished this battle.
function applyContracts(save, tally) {
  if (!economyOpen(save)) return [];
  const done = [];
  for (const c of save.contracts) {
    const def = CONTRACTS[c.id];
    c.progress = Math.min(def.goal, c.progress + (tally[def.stat] || 0));
    if (c.progress >= def.goal) done.push(c);
  }
  for (const c of done) {
    save.credits += contractRewardOf(save, c.id);
    save.contracts.splice(save.contracts.indexOf(c), 1);
    save.lastContract = c.id;
    save.stats.contracts = (save.stats.contracts || 0) + 1;
  }
  refillContracts(save);
  return done;
}

// ---------------------------------------------------------------- battle payouts
function encKind(enc) { return enc.boss ? 'boss' : enc.elite ? 'elite' : 'normal'; }
function packTierFor(enc) { return Math.min(5, enc.sector + 1); }

// The economy opens when the Academy is complete (HALCYON defeated), so the
// tutorial only hands out the cards it is teaching.
function economyOpen(save) { return save.codex.includes('packs'); }

function battleRewards(save, enc, firstClear) {
  const kind = encKind(enc);
  const r = { credits: 0, packs: 0, packTier: packTierFor(enc), legendary: firstClear && enc.bossCard ? enc.bossCard : null };
  if (enc.graduation && firstClear) { r.credits = 100; r.packs = ECON.gradPacks; r.alloy = ECON.alloyGraduation; return r; }
  if (!economyOpen(save)) return r;
  r.credits = Math.round((firstClear ? ECON.winCredits[kind] : ECON.replayCredits[kind]) * creditMultOf(save));
  r.alloy = firstClear ? ECON.alloyWin[kind] : ECON.alloyReplay[kind];
  if (firstClear) { r.packs = ECON.winPacks[kind]; if (enc.final) r.scrap = 1600; }
  return r;
}
// Missions from Sector 2 on offer a choice: keep one of up to three cards from the supply crate.
// Academy missions hand out their teaching cards; optional missions give their named cards.
function crateChoice(enc) { return enc.grant && enc.sector >= 1 && !enc.elite ? Object.keys(enc.grant).slice(0, 3) : null; }
// A Common from the crate comes as a full pair for your deck; anything rarer is a single copy.
function crateCopies(id) { return D(id).rarity === 'common' ? 2 : 1; }

function describeEncReward(enc, save) {
  const bits = [];
  if (enc.graduation && !save.cleared[enc.id]) bits.push(`Supply Depot and Anchorage station unlocked: ${ECON.gradPacks} Academy Pack${ECON.gradPacks > 1 ? 's' : ''} + 100 Credits + 60 Alloy`);
  else if (economyOpen(save)) {
    const k = encKind(enc);
    bits.push(`${Math.round(ECON.winCredits[k] * creditMultOf(save))} Credits`, `${ECON.alloyWin[k]} Alloy`);
    if (ECON.winPacks[k]) bits.push(`${ECON.winPacks[k]} ${PACK_SETS[packTierFor(enc) - 1].name}${ECON.winPacks[k] > 1 ? 's' : ''}`);
    if (enc.final) bits.push('1600 Scrap');
  }
  if (enc.bossCard) bits.push(`${D(enc.bossCard).name} (Legendary)`);
  return bits.join(' + ');
}

