'use strict';
// ============================================================================
// STARFALL PROTOCOL: challenge runs (roadmap B), "The Proving Grounds".
// Opens when the campaign is finished. Pick a commander power, draft a 20-card
// deck from every set, then fight 8 battles against campaign enemies, each with
// a random modifier. Three hull points: a loss costs one and the battle is re-rolled.
// Rewards (Credits, packs, one card from the run deck) go to the main collection.
// Pure data and rules (no DOM), so the game and the headless tools share them.
// save.challenge = the run in progress, or null.
// ============================================================================

const CHALLENGE = { battles: 8, lives: 3, picks: 20, hp: 36, maxDeck: 27, winCredits: 20 };
// Battle k draws its enemy from this sector (0-based), the last one from the bosses of the last two sectors.
const CH_SECTORS = [1, 2, 2, 3, 3, 4, 4, 5];
const CH_RARITY = [['common', 58], ['rare', 28], ['epic', 11], ['legendary', 3]];
// Each modifier edits the battle config (see newGame in engine.js).
const CH_MODS = {
  overcharged: { name: 'Overcharged', text: 'Both commanders start with 1 extra Energy crystal.', apply: b => { b.player.startMana = 1; b.enemy.startMana = 1; } },
  fortified:   { name: 'Fortified', text: 'The enemy commander has 30% more Health.', apply: b => { b.enemy.hp = Math.round(b.enemy.hp * 1.3); } },
  glass:       { name: 'Glass Cannons', text: 'Both commanders have 40% less Health.', apply: b => { b.player.hp = Math.round(b.player.hp * 0.6); b.enemy.hp = Math.round(b.enemy.hp * 0.6); } },
  ambush:      { name: 'Ambush', text: 'The enemy starts with one of its units already deployed.',
    apply: b => { const u = b.enemy.deck.filter(id => D(id).type === 'unit' && D(id).cost <= 3); b.enemy.startBoard = (b.enemy.startBoard || []).concat(u.slice(0, 1)); } },
  minefield:   { name: 'Minefield', text: 'The enemy starts with a Trap armed.',
    apply: b => { const t = CARD_LIST.filter(d => d.type === 'trap' && !d.reward); b.enemy.startTraps = (b.enemy.startTraps || []).concat([pick(t).id]); } },
  veterans:    { name: 'Veteran Crews', text: 'Every unit on both sides has +1 Attack.', apply: b => { b.player.passives = (b.player.passives || []).concat('veteran_crew'); b.enemy.passives = (b.enemy.passives || []).concat('veteran_crew'); } },
  plated:      { name: 'Heavy Plating', text: 'Both commanders start with 8 Armor.', apply: b => { b.player.armor = 8; b.enemy.armor = (b.enemy.armor || 0) + 8; } },
  headstart:   { name: 'Head Start', text: 'You start with 1 extra Energy crystal.', apply: b => { b.player.startMana = 1; } },
  swarming:    { name: 'Brood Tide', text: 'At the end of the enemy\'s turn, if it has 3 or more units, a random one gains +1/+1.', apply: b => { b.enemy.passives = (b.enemy.passives || []).concat('brood_growth'); } },
};

function challengeOpen(save) { return !!(save && save.cleared['6-5']); }
function challengeTeaser(save) { return !!(save && !challengeOpen(save) && highestSector(save) >= 4); }

// the draftable pool: every collectible card except the elite mission rewards
function chPool() { return CARD_LIST.filter(d => !d.token && !d.reward); }
function chRarity(rng, bump) {
  const w = CH_RARITY.map(([r, n], i) => [r, i ? n * (1 + (bump || 0)) : n]), tot = w.reduce((a, x) => a + x[1], 0);
  let t = rng() * tot; for (const [r, n] of w) { if ((t -= n) < 0) return r; } return 'common';
}
// three different cards of one rarity that the deck still has room for
function chOffer(run, bump) {
  const rng = Math.random, have = id => run.deck.filter(x => x === id).length;
  for (let tries = 0; tries < 8; tries++) {
    const r = chRarity(rng, bump), pool = chPool().filter(d => d.rarity === r && have(d.id) < maxCopies(d));
    if (pool.length < 3) continue;
    const out = []; while (out.length < 3) { const d = pick(pool); if (!out.includes(d.id)) out.push(d.id); }
    return out;
  }
  return chPool().filter(d => d.rarity === 'common').sort(() => Math.random() - 0.5).slice(0, 3).map(d => d.id);
}
function chFight(k) {
  const final = k === CHALLENGE.battles - 1;
  const pool = ENCOUNTERS.filter(e => !e.fixedDeck && (final ? e.boss && e.sector >= 4 : e.sector === CH_SECTORS[k] && !e.boss && !e.final));
  const enc = pick(pool), keys = Object.keys(CH_MODS);
  const mods = []; while (mods.length < (final ? 2 : 1)) { const m = pick(keys); if (!mods.includes(m) && !(mods.includes('overcharged') && m === 'headstart') && !(mods.includes('headstart') && m === 'overcharged')) mods.push(m); }
  return { enc: enc.id, mods };
}

function startChallenge(save) {
  const powers = PLAYER_POWERS.filter(p => HEROPOWERS[p]).sort(() => Math.random() - 0.5).slice(0, 3);
  save.challenge = { step: 'power', powers, power: null, deck: [], offer: null, at: 0, wins: 0, lives: CHALLENGE.lives,
    fights: Array.from({ length: CHALLENGE.battles }, (_, k) => chFight(k)), started: Date.now() };
  return save.challenge;
}
function chChoosePower(save, id) {
  const run = save.challenge; if (!run || run.step !== 'power' || !run.powers.includes(id)) return false;
  run.power = id; run.step = 'draft'; run.offer = chOffer(run); return true;
}
function chDraft(save, id) {
  const run = save.challenge; if (!run || run.step !== 'draft' || !run.offer.includes(id)) return false;
  run.deck.push(id);
  if (run.deck.length >= CHALLENGE.picks) { run.step = 'fight'; run.offer = null; } else run.offer = chOffer(run);
  return true;
}
// after a win: add one of three cards (better odds than the draft), or skip
function chReward(save, id) {
  const run = save.challenge; if (!run || run.step !== 'reward') return false;
  if (id && run.offer.includes(id) && run.deck.length < CHALLENGE.maxDeck) run.deck.push(id);
  run.offer = null; run.step = 'fight'; return true;
}

// the encounter object the battle screen uses for the current fight
function chEnc(save) {
  const run = save.challenge, f = run && run.fights[run.at]; if (!f) return null;
  const base = ENC[f.enc];
  return Object.assign({}, base, { id: 'challenge', challenge: true, base: base.id, boss: false, elite: false, final: false, graduation: false,
    grant: null, victory: null, unlockPowers: null, noPower: false, noMulligan: false, mods: f.mods, trial: run.at + 1, first: base.first, story: base.story });
}
function challengeBattle(save) {
  const run = save.challenge, enc = chEnc(save);
  const b = buildBattle(Object.assign({}, save, { deck: run.deck, power: run.power, signature: null }), ENC[enc.base]);
  b.player.hp = CHALLENGE.hp; b.player.signature = null; b.player.sigDiscount = 0;
  b.enemy.deck = b.enemy.deck.slice();
  enc.mods.forEach(m => CH_MODS[m].apply(b));
  return b;
}

// Record a finished fight. Returns { won, credits, over } for the result screen.
function chResult(save, won) {
  const run = save.challenge; if (!run || run.step !== 'fight') return null;
  const res = { won, credits: 0, over: false };
  if (won) {
    run.wins++; run.at++; res.credits = CHALLENGE.winCredits * run.wins; save.credits += res.credits;
    if (run.at >= CHALLENGE.battles) { run.step = 'keep'; res.over = true; } else { run.step = 'reward'; run.offer = chOffer(run, 1.5); }
  } else {
    run.lives--;
    if (run.lives <= 0) { run.step = run.wins >= 3 ? 'keep' : 'done'; res.over = true; }
    else run.fights[run.at] = Object.assign(chFight(run.at), run.at === CHALLENGE.battles - 1 ? {} : { enc: run.fights[run.at].enc });
  }
  return res;
}
// End-of-run rewards (applied once): packs of the newest set and a card from the run deck.
function chPrize(wins) { return { packs: wins >= 8 ? 2 : wins >= 4 ? 1 : 0, keep: wins >= 3 }; }
function chFinish(save, keepId) {
  const run = save.challenge; if (!run || (run.step !== 'keep' && run.step !== 'done')) return null;
  const pr = chPrize(run.wins), out = { wins: run.wins, packs: pr.packs, kept: null, scrap: 0 };
  const tier = PACK_SETS.length;
  if (pr.packs) save.packs[tier] = (save.packs[tier] || 0) + pr.packs;
  if (pr.keep && keepId && run.deck.includes(keepId)) { out.kept = keepId; out.scrap = gainCard(save, keepId); }
  save.stats.challenges = (save.stats.challenges || 0) + 1;
  save.stats.chBest = Math.max(save.stats.chBest || 0, run.wins);
  save.challenge = null;
  return out;
}
function chAbandon(save) { const run = save.challenge; if (!run) return; if (run.step === 'fight' || run.step === 'reward' || run.step === 'draft' || run.step === 'power') { run.lives = 0; run.step = run.wins >= 3 ? 'keep' : 'done'; } }
