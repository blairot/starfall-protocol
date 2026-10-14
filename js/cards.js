'use strict';
// ============================================================================
// STARFALL PROTOCOL — cards, keywords, commander powers, boss passives
// Text markup: **word** renders bold. Keyword ids in kw/tags drive tooltips.
// tier = sector where the card first becomes available as a reward.
// ============================================================================

const FACTIONS = {
  neutral: { name: 'Neutral', hue: 210 },
  fleet:   { name: 'Fleet',   hue: 215 },
  raider:  { name: 'Raider',  hue: 22 },
  swarm:   { name: 'Swarm',   hue: 105 },
  synth:   { name: 'Synth',   hue: 185 },
  psi:     { name: 'Psionic', hue: 275 },
  void:    { name: 'Choir',   hue: 320 },
};

// Codex entries. Topics without `card:true` are rules lessons, not card keywords.
const KEYWORDS = {
  basics:   { name: 'Units & Combat', text: 'Spend Energy to deploy units. Units can attack starting the turn after they arrive. When units fight, each deals its Attack as damage to the other. Reduce the enemy commander to 0 Health to win.' },
  energy:   { name: 'Energy', text: 'You gain one Energy crystal each turn, up to 10. Energy refills at the start of your turn.' },
  spells:   { name: 'Protocols (Spells)', text: 'Protocols are one-shot effects. Some need a target: click the card, then click what you want to hit.' },
  deploy:   { name: 'Deploy', card: true, text: 'Triggers when you play the card from your hand.' },
  guardian: { name: 'Guardian', card: true, text: 'Enemies must attack units with Guardian before anything else.' },
  power:    { name: 'Commander Power', text: 'Once per turn your commander can use their power for 2 Energy. Pick a power before each battle in the Hangar.' },
  warp:     { name: 'Warp', card: true, text: 'Can attack the same turn it is deployed.' },
  blitz:    { name: 'Blitz', card: true, text: 'Can attack enemy units (not commanders) the turn it is deployed.' },
  mulligan: { name: 'Opening Hand & Energy Cell', text: 'Before the battle you may swap any cards in your opening hand. Whoever goes second draws an extra card and gets an Energy Cell: a 0-cost card worth 1 Energy this turn.' },
  gear:     { name: 'Gear', card: true, text: 'Equips your commander with a weapon (Attack / Durability). Click your commander to attack. Each attack uses 1 Durability.' },
  salvage:  { name: 'Salvage', card: true, text: 'Triggers when this unit is destroyed.' },
  cloak:    { name: 'Cloak', card: true, text: "Can't be attacked or targeted by the enemy until it attacks." },
  toxic:    { name: 'Toxic', card: true, text: 'Destroys any unit damaged by this.' },
  siphon:   { name: 'Siphon', card: true, text: 'Damage this deals also heals your commander.' },
  barrier:  { name: 'Barrier', card: true, text: 'Blocks the first instance of damage this unit would take.' },
  armor:    { name: 'Armor', card: true, text: "Absorbs damage before your commander's Health." },
  twin:     { name: 'Twin-Fire', card: true, text: 'Can attack twice each turn.' },
  emp:      { name: 'EMP', card: true, text: 'Wipes a unit: removes its card text, buffs and keywords.' },
  overheat: { name: 'Overheat', card: true, text: 'Locks that many of your Energy crystals next turn.' },
  amplify:  { name: 'Amplify', card: true, text: 'Your spells deal extra damage while this unit is on the battlefield.' },
  cryo:     { name: 'Cryo', card: true, text: 'A frozen character loses its next attack.' },
  trap:     { name: 'Trap', card: true, text: "Armed face-down. Fires automatically on your opponent's turn when its condition is met." },
  scan:     { name: 'Scan', card: true, text: 'Choose one of three cards to add to your hand.' },
  control:  { name: 'Mind Control', card: true, text: 'Take an enemy unit for your own. It cannot attack the turn you take it.' },
  packs:    { name: 'Supply Packs & Credits', text: 'Win battles and finish contracts to earn Credits. Spend 100 Credits on a 5-card Supply Pack at the Supply Depot. Every pack has at least one Rare or better. Elites and bosses also award packs.' },
  crafting: { name: 'Scrap & Crafting', text: 'Copies beyond what a deck can hold (2, or 1 for a Legendary) turn into Scrap automatically. Spend Scrap in the Hangar to craft the exact cards you want, or scrap cards you no longer need.' },
};

// ---------------------------------------------------------------- helpers
const dmgTarget = n => (s, c) => damage(s, null, c.target, sp(s, c.pi, n));
const aoeEnemy = n => (s, c) => enemyMinions(s, c.pi).forEach(m => damage(s, null, m, sp(s, c.pi, n)));
const summonN = (id, n) => (s, c) => { for (let k = 0; k < n; k++) summon(s, c.pi, id, c.self ? c.me.board.indexOf(c.self) + 1 : null); };
const collectibles = () => CARD_LIST.filter(d => !d.token);

const CARDS = {};
function card(id, o) { o.id = id; o.kw = o.kw || []; o.tags = o.tags || []; o.faction = o.faction || 'neutral'; o.rarity = o.rarity || 'common'; CARDS[id] = o; }

// ============================================================ TIER 1 — Academy
card('cadet',        { name: 'Fleet Cadet', type: 'unit', cost: 1, atk: 1, hp: 2, faction: 'fleet', tier: 1, text: '' , flavor: 'HALCYON: "Cadet, the safety catch is on the left. It has been on the left all week."'});
card('scout_drone',  { name: 'Scout Drone', type: 'unit', cost: 1, atk: 2, hp: 1, tier: 1, text: '', flavor: 'Fleet procurement lists it under consumables, right next to the coffee.' });
card('marine',       { name: 'Colonial Marine', type: 'unit', cost: 2, atk: 2, hp: 3, faction: 'fleet', tier: 1, text: '', flavor: 'Marine saying: "The ship gets you there. Everything after that is your job."' });
card('heavy_trooper',{ name: 'Heavy Trooper', type: 'unit', cost: 4, atk: 4, hp: 5, faction: 'fleet', tier: 1, text: '' , flavor: 'Heavy trooper: "It takes forty minutes to get into this suit, and it is worth every one of them."'});
card('star_cruiser', { name: 'Star Cruiser', type: 'unit', cost: 6, atk: 6, hp: 7, faction: 'fleet', tier: 1, text: '', flavor: 'Lancer-class crews say the main gun is the only part of the ship that has never broken down.' });
card('ion_lancer',   { name: 'Ion Lancer', type: 'unit', cost: 3, atk: 4, hp: 2, tier: 1, text: '', flavor: 'Ion Lancer pilot: "You get one good shot, so take it before they take theirs."' });
card('patrol_frigate',{ name: 'Patrol Frigate', type: 'unit', cost: 5, atk: 5, hp: 5, faction: 'fleet', tier: 1, text: '' });
card('salvage_crew', { name: 'Salvage Crew', type: 'unit', cost: 2, atk: 3, hp: 2, tier: 1, text: '', flavor: 'Salvager: "We can have her stripped by lunch. Putting her back together costs extra."' });
card('siege_gunner', { name: 'Siege Gunner', type: 'unit', cost: 3, atk: 3, hp: 4, faction: 'fleet', tier: 1, text: '' });
card('assault_drone', { name: 'Assault Drone', type: 'unit', cost: 4, atk: 5, hp: 3, tier: 1, text: '', flavor: 'Fleet logistics orders these by weight, the same way it orders ammunition.' });
card('rhino_tank', { name: 'Rhino Tank', type: 'unit', cost: 5, atk: 6, hp: 4, faction: 'fleet', tier: 1, text: '' });
card('battlecruiser', { name: 'Battlecruiser', type: 'unit', cost: 7, atk: 7, hp: 7, faction: 'fleet', tier: 1, text: '', flavor: 'When a battlecruiser arrives, the Compact considers the negotiation finished.' });
card('medic_bot',    { name: 'Medic Bot', type: 'unit', cost: 2, atk: 2, hp: 2, tier: 1, tags: ['deploy'], target: 'friendly', text: '**Deploy:** Restore 3 Health to a friendly character.', play: (s, c) => heal(s, c.target, 3) });
card('field_engineer',{ name: 'Field Engineer', type: 'unit', cost: 2, atk: 2, hp: 2, faction: 'fleet', tier: 1, tags: ['deploy'], target: 'friendlyMinion', text: '**Deploy:** Give a friendly unit +1/+1.', play: (s, c) => buff(s, c.target, 1, 1) });
card('rifle_squad',  { name: 'Rifle Squad', type: 'unit', cost: 3, atk: 3, hp: 2, faction: 'fleet', tier: 1, tags: ['deploy'], target: 'enemy', text: '**Deploy:** Deal 1 damage to an enemy.', play: (s, c) => damage(s, null, c.target, 1) });
card('recon_officer',{ name: 'Recon Officer', type: 'unit', cost: 3, atk: 2, hp: 2, faction: 'fleet', tier: 1, tags: ['deploy'], text: '**Deploy:** Draw a card.', play: (s, c) => draw(s, c.pi, 1) });
card('sapper',       { name: 'Demolition Sapper', type: 'unit', cost: 4, atk: 3, hp: 3, tier: 1, tags: ['deploy'], target: 'enemyMinion', text: '**Deploy:** Deal 2 damage to an enemy unit.', play: (s, c) => damage(s, null, c.target, 2) });
card('shield_trooper',{ name: 'Shield Trooper', type: 'unit', cost: 2, atk: 1, hp: 4, faction: 'fleet', tier: 1, kw: ['guardian'], text: '**Guardian**' });
card('barricade',    { name: 'Blast Barricade', type: 'unit', cost: 1, atk: 0, hp: 4, tier: 1, kw: ['guardian'], text: '**Guardian**', flavor: 'Marine: "It was the best squadmate I ever had. It never complained and it never moved."' });
card('bulwark_mech', { name: 'Bulwark Mech', type: 'unit', cost: 5, atk: 4, hp: 6, tier: 1, kw: ['guardian'], text: '**Guardian**' });
card('dreadnought',  { name: 'Dreadnought', type: 'unit', cost: 8, atk: 8, hp: 8, faction: 'fleet', rarity: 'rare', tier: 1, kw: ['guardian'], text: '**Guardian**', flavor: 'Most enemy commanders surrender before the dreadnought has finished leaving the lane.' });
card('strike_fighter',{ name: 'Strike Fighter', type: 'unit', cost: 2, atk: 2, hp: 1, tier: 1, kw: ['warp'], text: '**Warp**' });
card('interceptor',  { name: 'Interceptor', type: 'unit', cost: 3, atk: 3, hp: 1, faction: 'fleet', tier: 1, kw: ['warp'], text: '**Warp**' });
card('hover_tank',   { name: 'Hover Tank', type: 'unit', cost: 4, atk: 4, hp: 3, tier: 1, kw: ['blitz'], text: '**Blitz**' });
card('breach_commando',{ name: 'Breach Commando', type: 'unit', cost: 5, atk: 5, hp: 4, faction: 'fleet', rarity: 'rare', tier: 1, kw: ['blitz'], tags: ['deploy'], text: '**Blitz**. **Deploy:** Gain +2 Attack this turn.', play: (s, c) => tempBuff(s, c.self, 2) });
card('fleet_captain',{ name: 'Fleet Captain', type: 'unit', cost: 6, atk: 4, hp: 5, faction: 'fleet', rarity: 'rare', tier: 1, tags: ['deploy'], text: '**Deploy:** Give your other units +1/+1.', play: (s, c) => others(friendlyMinions(s, c.pi), c.self).forEach(m => buff(s, m, 1, 1)) });
card('okonkwo',      { name: 'Admiral Okonkwo', type: 'unit', cost: 7, atk: 6, hp: 6, faction: 'fleet', rarity: 'legendary', tier: 1, tags: ['deploy'], kw: [], text: '**Deploy:** Summon two Colonial Marines with **Guardian**.', play: (s, c) => { for (let k = 0; k < 2; k++) { const m = summon(s, c.pi, 'marine'); if (m) giveKw(s, m, 'guardian'); } }, flavor: 'Okonkwo: "I don\'t lose positions, Commander, and I don\'t lose officers. Don\'t make me start."' });
card('aurora',       { name: 'The Aurora', type: 'unit', cost: 9, atk: 8, hp: 10, faction: 'fleet', rarity: 'legendary', tier: 1, kw: ['guardian'], tags: ['deploy'], text: '**Guardian**. **Deploy:** Give your other units +1/+2.', play: (s, c) => others(friendlyMinions(s, c.pi), c.self).forEach(m => buff(s, m, 1, 2)), flavor: 'Every officer in the Fleet has applied for a berth on the Aurora at least once.' });
card('plasma_bolt',  { name: 'Plasma Bolt', type: 'spell', cost: 1, tier: 1, faction: 'fleet', target: 'any', text: 'Deal 2 damage.', play: dmgTarget(2) });
card('railgun',      { name: 'Railgun Shot', type: 'spell', cost: 3, tier: 1, target: 'any', text: 'Deal 4 damage.', play: dmgTarget(4) });
card('flak_barrage', { name: 'Flak Barrage', type: 'spell', cost: 2, tier: 1, faction: 'fleet', text: 'Deal 1 damage to all enemy units.', play: aoeEnemy(1) });
card('orbital_strike',{ name: 'Orbital Bombardment', type: 'spell', cost: 7, rarity: 'epic', faction: 'fleet', tier: 1, text: 'Deal 4 damage to all enemy units.', play: aoeEnemy(4) });
card('field_repair', { name: 'Field Repair', type: 'spell', cost: 1, tier: 1, target: 'any', text: 'Restore 5 Health.', play: (s, c) => heal(s, c.target, 5) });
card('supply_drop',  { name: 'Supply Drop', type: 'spell', cost: 3, tier: 1, text: 'Draw 2 cards.', play: (s, c) => draw(s, c.pi, 2) });
card('combat_stims', { name: 'Combat Stims', type: 'spell', cost: 1, tier: 1, target: 'friendlyMinion', text: 'Give a friendly unit +2/+1.', play: (s, c) => buff(s, c.target, 2, 1) });
card('reinforcements',{ name: 'Reinforcements', type: 'spell', cost: 2, tier: 1, faction: 'fleet', text: 'Summon two 1/1 Drones.', play: (s, c) => { summon(s, c.pi, 'drone'); summon(s, c.pi, 'drone'); } });
card('dig_in',       { name: 'Dig In', type: 'spell', cost: 2, tier: 1, faction: 'fleet', target: 'friendlyMinion', tags: [], kw: [], kwRef: ['guardian'], text: 'Give a friendly unit +1/+2 and **Guardian**.', play: (s, c) => { buff(s, c.target, 1, 2); giveKw(s, c.target, 'guardian'); } });
card('kill_order',   { name: 'Kill Order', type: 'spell', cost: 5, rarity: 'rare', tier: 1, target: 'enemyMinion', text: 'Destroy an enemy unit.', play: (s, c) => destroy(s, c.target) });
card('drone',        { name: 'Drone', type: 'unit', cost: 1, atk: 1, hp: 1, token: true, text: '' });

// ============================================================ TIER 2 — Scrap Belt (Raiders)
card('energy_cell',  { name: 'Energy Cell', type: 'spell', cost: 0, token: true, text: 'Gain 1 Energy this turn only.', play: (s, c) => { c.me.mana++; } });
card('scrap_rat',    { name: 'Scrap Rat', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'raider', tier: 2, tags: ['salvage'], text: '**Salvage:** Summon a 1/1 Junk Drone.', death: (s, c) => summon(s, c.pi, 'junk_drone', c.pos), value: 1.5 });
card('junk_drone',   { name: 'Junk Drone', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'raider', token: true, text: '' });
card('boarding_crew',{ name: 'Boarding Crew', type: 'unit', cost: 2, atk: 3, hp: 1, faction: 'raider', tier: 2, kw: ['blitz'], text: '**Blitz**' });
card('smuggler',     { name: 'Smuggler', type: 'unit', cost: 2, atk: 2, hp: 3, faction: 'raider', tier: 2, kw: ['cloak'], text: '**Cloak**' });
card('det_bot',      { name: 'Det-Bot', type: 'unit', cost: 3, atk: 2, hp: 2, tier: 2, tags: ['salvage'], text: '**Salvage:** Deal 2 damage to a random enemy.', death: (s, c) => { const t = randomEnemy(s, c.pi); if (t) damage(s, null, t, 2); }, value: 2 });
card('gunrunner',    { name: 'Gunrunner', type: 'unit', cost: 3, atk: 2, hp: 3, faction: 'raider', tier: 2, tags: ['deploy', 'gear'], text: '**Deploy:** If you have **Gear** equipped, gain +2/+2.', play: (s, c) => { if (c.me.weapon) buff(s, c.self, 2, 2); } });
card('shadow_corsair',{ name: 'Shadow Corsair', type: 'unit', cost: 3, atk: 4, hp: 2, faction: 'raider', tier: 2, kw: ['cloak'], text: '**Cloak**' });
card('mine_layer',   { name: 'Mine Layer', type: 'unit', cost: 3, atk: 2, hp: 2, faction: 'raider', tier: 2, tags: ['salvage'], text: '**Salvage:** Deal 1 damage to all enemies.', death: (s, c) => enemyChars(s, c.pi).forEach(t => damage(s, null, t, 1)), value: 2 });
card('cargo_hauler', { name: 'Cargo Hauler', type: 'unit', cost: 4, atk: 3, hp: 5, tier: 2, tags: ['salvage'], text: '**Salvage:** Draw a card.', death: (s, c) => draw(s, c.pi, 1), value: 1.5 });
card('quartermaster',{ name: 'Armory Quartermaster', type: 'unit', cost: 4, atk: 3, hp: 4, faction: 'raider', tier: 2, tags: ['deploy', 'gear'], text: '**Deploy:** Give your **Gear** +1/+1. If you have none, equip a 2/2 Shock Baton.', play: (s, c) => { if (c.me.weapon) { c.me.weapon.atk++; c.me.weapon.dur++; } else equip(s, c.pi, 'shock_baton'); } });
card('plunderer',    { name: 'Void Plunderer', type: 'unit', cost: 4, atk: 3, hp: 3, faction: 'raider', rarity: 'rare', tier: 2, kw: ['warp'], text: '**Warp**. After this attacks the enemy commander, draw a card.', onAttack: (s, c) => { if (isHero(c.target)) draw(s, c.pi, 1); }, value: 1.5 });
card('scrap_golem',  { name: 'Scrap Golem', type: 'unit', cost: 5, atk: 4, hp: 5, tier: 2, tags: ['salvage'], text: '**Salvage:** Summon two 1/1 Junk Drones.', death: (s, c) => { summon(s, c.pi, 'junk_drone', c.pos); summon(s, c.pi, 'junk_drone', c.pos); }, value: 2.5 });
card('ghost_operative',{ name: 'Ghost Operative', type: 'unit', cost: 5, atk: 5, hp: 4, faction: 'raider', rarity: 'rare', tier: 2, kw: ['cloak'], tags: ['deploy'], target: 'enemyMinion', text: '**Cloak**. **Deploy:** Deal 1 damage to an enemy unit.', play: (s, c) => damage(s, null, c.target, 1) });
card('shipbreaker',  { name: 'Shipbreaker Titan', type: 'unit', cost: 7, atk: 7, hp: 6, faction: 'raider', rarity: 'epic', tier: 2, tags: ['salvage'], text: '**Salvage:** Summon a 4/4 Salvaged Hull.', death: (s, c) => summon(s, c.pi, 'salvaged_hull', c.pos), value: 4 });
card('salvaged_hull',{ name: 'Salvaged Hull', type: 'unit', cost: 4, atk: 4, hp: 4, faction: 'raider', token: true, text: '' });
card('vex',          { name: 'Vex, Scourge of the Belt', type: 'unit', cost: 6, atk: 5, hp: 5, faction: 'raider', rarity: 'legendary', tier: 2, kw: ['warp'], tags: ['deploy', 'gear'], text: '**Warp**. **Deploy:** Equip a 3/2 Plasma Cutlass.', play: (s, c) => equip(s, c.pi, 'plasma_cutlass'), flavor: 'Vex: "Everything in the Belt belongs to me. Some of it just hasn\'t heard yet."' });
card('mox',          { name: 'Mad Mox, Junk Queen', type: 'unit', cost: 4, atk: 3, hp: 4, faction: 'raider', rarity: 'legendary', tier: 2, tags: ['salvage'], text: 'Whenever another friendly unit is destroyed, add a random **Salvage** card to your hand.', onAnyDeath: (s, c) => { if (c.died.owner === c.pi && c.died !== c.self) addHand(s, c.pi, pick(collectibles().filter(d => d.death && d.type === 'unit').map(d => d.id))); }, value: 3, flavor: 'Mox: "Every wreck in the Belt is a ship I haven\'t finished building yet."' });
card('shock_baton',  { name: 'Shock Baton', type: 'gear', cost: 1, atk: 2, hp: 2, faction: 'raider', tier: 2, tags: ['gear'], text: '' });
card('plasma_cutlass',{ name: 'Plasma Cutlass', type: 'gear', cost: 3, atk: 3, hp: 2, faction: 'raider', tier: 2, tags: ['gear'], text: '' });
card('harpoon_gun',  { name: 'Harpoon Gun', type: 'gear', cost: 2, atk: 2, hp: 2, faction: 'raider', tier: 2, tags: ['gear', 'deploy'], target: 'enemyMinion', targetOptional: true, text: '**Deploy:** Deal 1 damage to an enemy unit.', play: (s, c) => damage(s, null, c.target, 1) });
card('rail_rifle',   { name: 'Heavy Rail Rifle', type: 'gear', cost: 5, atk: 5, hp: 2, rarity: 'rare', tier: 2, tags: ['gear'], text: '' });
card('cluster_cannon',{ name: 'Cluster Cannon', type: 'gear', cost: 4, atk: 2, hp: 3, faction: 'raider', rarity: 'epic', tier: 2, tags: ['gear'], text: 'After your commander attacks, deal 1 damage to all enemy units.', onAttack: (s, c) => enemyMinions(s, c.pi).forEach(m => damage(s, null, m, 1)) });
card('smoke_screen', { name: 'Smoke Screen', type: 'spell', cost: 1, faction: 'raider', tier: 2, target: 'friendlyMinion', tags: [], kwRef: ['cloak'], text: 'Give a friendly unit **Cloak** and +1/+1.', play: (s, c) => { buff(s, c.target, 1, 1); giveKw(s, c.target, 'cloak'); } });
card('echo_protocol',{ name: 'Echo Protocol', type: 'spell', cost: 2, faction: 'raider', tier: 2, tags: ['salvage'], target: 'friendlyMinion', tf: m => !!D(m.id).death && !m.silenced, text: "Trigger a friendly unit's **Salvage** effect.", play: (s, c) => { const m = getChar(s, c.target); if (m) D(m.id).death(s, ctx(s, c.pi, m, { pos: c.me.board.indexOf(m) + 1 })); } });
card('broadside',    { name: 'Broadside', type: 'spell', cost: 4, faction: 'raider', tier: 2, text: 'Deal 2 damage to all enemy units.', play: aoeEnemy(2) });
card('shakedown',    { name: 'Shakedown', type: 'spell', cost: 2, faction: 'raider', tier: 2, target: 'enemyMinion', tf: m => m.hp < m.maxHp, text: 'Destroy a damaged enemy unit.', play: (s, c) => destroy(s, c.target) });
card('black_market', { name: 'Black Market', type: 'spell', cost: 1, faction: 'raider', tier: 2, tags: ['gear'], text: 'Add a random **Gear** card to your hand.', play: (s, c) => addHand(s, c.pi, pick(collectibles().filter(d => d.type === 'gear').map(d => d.id))) });

// ============================================================ TIER 3 — Hive Nebula (Swarm)
card('swarmling',    { name: 'Swarmling', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'swarm', token: true, text: '' });
card('larva',        { name: 'Hive Larva', type: 'unit', cost: 1, atk: 0, hp: 3, faction: 'swarm', tier: 3, text: 'At the start of your turn, transform into a 3/3 Brood Warrior.', turnStart: (s, c) => transform(s, c.self, 'brood_warrior'), value: 3 });
card('brood_warrior',{ name: 'Brood Warrior', type: 'unit', cost: 3, atk: 3, hp: 3, faction: 'swarm', token: true, text: '' });
card('venom_stinger',{ name: 'Venom Stinger', type: 'unit', cost: 2, atk: 1, hp: 2, faction: 'swarm', tier: 3, kw: ['toxic'], text: '**Toxic**' });
card('blood_leech',  { name: 'Blood Leech', type: 'unit', cost: 2, atk: 2, hp: 3, faction: 'swarm', tier: 3, kw: ['siphon'], text: '**Siphon**' });
card('spore_carrier',{ name: 'Spore Carrier', type: 'unit', cost: 2, atk: 1, hp: 2, faction: 'swarm', tier: 3, tags: ['salvage'], text: '**Salvage:** Summon two 1/1 Swarmlings.', death: (s, c) => { summon(s, c.pi, 'swarmling', c.pos); summon(s, c.pi, 'swarmling', c.pos); }, value: 2 });
card('acid_spitter', { name: 'Acid Spitter', type: 'unit', cost: 3, atk: 2, hp: 3, faction: 'swarm', tier: 3, kw: ['toxic'], text: '**Toxic**' });
card('chitin_guard', { name: 'Chitin Guard', type: 'unit', cost: 3, atk: 2, hp: 5, faction: 'swarm', tier: 3, kw: ['guardian'], text: '**Guardian**' });
card('frenzied_ripper',{ name: 'Frenzied Ripper', type: 'unit', cost: 3, atk: 2, hp: 4, faction: 'swarm', tier: 3, kw: ['blitz'], text: '**Blitz**. Whenever this takes damage and survives, gain +2 Attack.', onDamaged: (s, c) => buff(s, c.self, 2, 0), value: 1.5 });
card('hive_mind',    { name: 'Hive Mind', type: 'unit', cost: 3, atk: 2, hp: 4, faction: 'swarm', rarity: 'rare', tier: 3, text: 'Whenever you summon another unit, give it +1 Attack.', onSummon: (s, c) => buff(s, c.summoned, 1, 0), value: 2 });
card('toxic_spitter',{ name: 'Gland Grafter', type: 'unit', cost: 4, atk: 3, hp: 4, faction: 'swarm', tier: 3, tags: ['deploy'], kwRef: ['toxic'], target: 'friendlyMinion', text: '**Deploy:** Give a friendly unit **Toxic**.', play: (s, c) => giveKw(s, c.target, 'toxic') });
card('broodmother',  { name: 'Broodmother', type: 'unit', cost: 4, atk: 2, hp: 5, faction: 'swarm', tier: 3, text: 'At the end of your turn, summon a 1/1 Swarmling.', turnEnd: (s, c) => summon(s, c.pi, 'swarmling', c.me.board.indexOf(c.self) + 1), value: 3 });
card('lamprey',      { name: 'Lamprey Sentinel', type: 'unit', cost: 4, atk: 3, hp: 5, faction: 'swarm', tier: 3, kw: ['guardian', 'siphon'], text: '**Guardian**. **Siphon**' });
card('hive_reaper',  { name: 'Hive Reaper', type: 'unit', cost: 5, atk: 4, hp: 5, faction: 'swarm', rarity: 'rare', tier: 3, kw: ['toxic'], text: '**Toxic**' });
card('devourer_worm',{ name: 'Devourer Worm', type: 'unit', cost: 5, atk: 4, hp: 4, faction: 'swarm', rarity: 'epic', tier: 3, tags: ['deploy'], target: 'friendlyMinion', text: '**Deploy:** Destroy a friendly unit and gain its Attack and Health.', play: (s, c) => { const m = getChar(s, c.target); if (alive(m)) { const a = atkOf(s, m), h = m.hp; destroy(s, m); buff(s, c.self, a, h); } } });
card('ixis',         { name: 'Ixis, Brood Queen', type: 'unit', cost: 7, atk: 5, hp: 6, faction: 'swarm', rarity: 'legendary', tier: 3, kw: ['siphon'], text: '**Siphon**. At the end of your turn, summon a 1/2 Venom Stinger.', turnEnd: (s, c) => summon(s, c.pi, 'venom_stinger', c.me.board.indexOf(c.self) + 1), value: 5, flavor: 'Ixis: "My children are hungry, little captain. How kind of you to visit."' });
card('progenitor',   { name: 'The Progenitor', type: 'unit', cost: 6, atk: 4, hp: 5, faction: 'swarm', rarity: 'legendary', tier: 3, text: 'At the end of your turn, summon a copy of another random friendly unit.', turnEnd: (s, c) => { const m = pick(others(friendlyMinions(s, c.pi), c.self)); if (m) summon(s, c.pi, m.id, c.me.board.indexOf(c.self) + 1); }, value: 4, flavor: 'Fleet biologist: "Every offspring it produces is a different animal. We have stopped trying to name them."' });
card('spawn_surge',  { name: 'Spawn Surge', type: 'spell', cost: 3, faction: 'swarm', tier: 3, text: 'Summon three 1/1 Swarmlings.', play: (s, c) => { for (let k = 0; k < 3; k++) summon(s, c.pi, 'swarmling'); } });
card('rapid_mutation',{ name: 'Rapid Mutation', type: 'spell', cost: 2, faction: 'swarm', tier: 3, target: 'friendlyMinion', text: 'Give a friendly unit +2/+2.', play: (s, c) => buff(s, c.target, 2, 2) });
card('acid_rain',    { name: 'Acid Rain', type: 'spell', cost: 4, faction: 'swarm', rarity: 'rare', tier: 3, text: 'Deal 1 damage to all enemy units twice.', play: (s, c) => { aoeEnemy(1)(s, c); resolve(s); aoeEnemy(1)(s, c); } });
card('life_drain',   { name: 'Life Drain', type: 'spell', cost: 3, faction: 'swarm', tier: 3, target: 'any', kwRef: ['siphon'], text: 'Deal 3 damage. Restore 3 Health to your commander.', play: (s, c) => { damage(s, null, c.target, sp(s, c.pi, 3)); heal(s, c.me, 3); } });
card('hive_surge',   { name: 'Hive Surge', type: 'spell', cost: 4, faction: 'swarm', tier: 3, text: 'Give your units +1/+1.', play: (s, c) => friendlyMinions(s, c.pi).forEach(m => buff(s, m, 1, 1)) });
card('infest',       { name: 'Infest', type: 'spell', cost: 3, faction: 'swarm', rarity: 'epic', tier: 3, tags: ['salvage'], text: 'Give your units "**Salvage:** Summon a 1/1 Swarmling."', play: (s, c) => friendlyMinions(s, c.pi).forEach(m => { m.extraDeath.push('swarmling'); ev(s, { t: 'buff', uid: m.uid, a: 0, h: 0 }); }) });

// ============================================================ TIER 4 — Forge Worlds (Synths)
card('shield_drone', { name: 'Shield Drone', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'synth', tier: 4, kw: ['barrier'], text: '**Barrier**' });
card('plating_tech', { name: 'Plating Tech', type: 'unit', cost: 2, atk: 2, hp: 3, faction: 'synth', tier: 4, tags: ['deploy', 'armor'], text: '**Deploy:** Gain 3 **Armor**.', play: (s, c) => gainArmor(s, c.pi, 3) });
card('arc_coil',     { name: 'Arc Coil', type: 'unit', cost: 2, atk: 3, hp: 3, faction: 'synth', tier: 4, overheat: 1, tags: ['overheat'], text: '**Overheat (1)**' });
card('emp_trooper',  { name: 'EMP Trooper', type: 'unit', cost: 3, atk: 2, hp: 2, faction: 'synth', tier: 4, tags: ['deploy', 'emp'], target: 'minion', text: '**Deploy:** **EMP** a unit.', play: (s, c) => silence(s, c.target) });
card('gatling_drone',{ name: 'Gatling Drone', type: 'unit', cost: 3, atk: 2, hp: 3, faction: 'synth', tier: 4, kw: ['twin'], text: '**Twin-Fire**' });
card('overclocked_mech',{ name: 'Overclocked Mech', type: 'unit', cost: 3, atk: 5, hp: 4, faction: 'synth', tier: 4, overheat: 2, tags: ['overheat'], text: '**Overheat (2)**' });
card('repair_drone', { name: 'Repair Drone', type: 'unit', cost: 3, atk: 1, hp: 4, faction: 'synth', tier: 4, text: 'At the end of your turn, restore 2 Health to all friendly characters.', turnEnd: (s, c) => [c.me, ...friendlyMinions(s, c.pi)].forEach(t => heal(s, t, 2)), value: 2 });
card('aegis_sentinel',{ name: 'Aegis Sentinel', type: 'unit', cost: 4, atk: 3, hp: 3, faction: 'synth', tier: 4, kw: ['guardian', 'barrier'], text: '**Guardian**. **Barrier**' });
card('assembler',    { name: 'Assembly Unit', type: 'unit', cost: 4, atk: 3, hp: 4, faction: 'synth', tier: 4, text: 'At the end of your turn, give another random friendly unit +1/+1.', turnEnd: (s, c) => { const m = pick(others(friendlyMinions(s, c.pi), c.self)); if (m) buff(s, m, 1, 1); }, value: 2.5 });
card('nanoforge',    { name: 'Nanoforge', type: 'unit', cost: 4, atk: 2, hp: 5, faction: 'synth', rarity: 'rare', tier: 4, text: 'After you cast a spell, summon a 1/1 Nanobot with **Barrier**.', onSpell: (s, c) => summon(s, c.pi, 'nanobot', c.me.board.indexOf(c.self) + 1), value: 2 });
card('nanobot',      { name: 'Nanobot', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'synth', token: true, kw: ['barrier'], text: '**Barrier**' });
card('reactor_core', { name: 'Reactor Core', type: 'unit', cost: 5, atk: 2, hp: 8, faction: 'synth', tier: 4, kw: ['guardian'], tags: ['armor'], text: '**Guardian**. At the end of your turn, gain 2 **Armor**.', turnEnd: (s, c) => gainArmor(s, c.pi, 2), value: 2 });
card('storm_titan',  { name: 'Storm Titan', type: 'unit', cost: 5, atk: 7, hp: 7, faction: 'synth', rarity: 'rare', tier: 4, overheat: 3, tags: ['overheat'], text: '**Overheat (3)**' });
card('war_walker',   { name: 'Tri-Walker', type: 'unit', cost: 7, atk: 5, hp: 6, faction: 'synth', rarity: 'epic', tier: 4, kw: ['twin', 'barrier'], text: '**Twin-Fire**. **Barrier**' });
card('calculus',     { name: 'Calculus Prime', type: 'unit', cost: 8, atk: 6, hp: 6, faction: 'synth', rarity: 'legendary', tier: 4, tags: ['deploy'], kwRef: ['barrier'], text: '**Deploy:** Give all other friendly units **Barrier** and +1/+1.', play: (s, c) => others(friendlyMinions(s, c.pi), c.self).forEach(m => { buff(s, m, 1, 1); giveKw(s, m, 'barrier'); }), flavor: 'Calculus Prime: "Your Fleet still owes the Forge for most of its ships. Consider this the final invoice."' });
card('unit_zero',    { name: 'Unit Zero', type: 'unit', cost: 5, atk: 4, hp: 5, faction: 'synth', rarity: 'legendary', tier: 4, kw: ['twin', 'barrier'], text: '**Twin-Fire**. **Barrier**. After this attacks, regain **Barrier**.', onAttack: (s, c) => giveKw(s, c.self, 'barrier'), value: 3, flavor: 'Display hall notice: "Please do not ask the exhibit to fight. It will say yes."' });
card('disruptor',    { name: 'Disruptor', type: 'spell', cost: 1, faction: 'synth', tier: 4, tags: ['emp'], target: 'minion', text: '**EMP** a unit.', play: (s, c) => silence(s, c.target) });
card('lightning_arc',{ name: 'Lightning Arc', type: 'spell', cost: 1, faction: 'synth', tier: 4, target: 'any', overheat: 1, tags: ['overheat'], text: 'Deal 3 damage. **Overheat (1)**', play: dmgTarget(3) });
card('chain_lightning',{ name: 'Chain Lightning', type: 'spell', cost: 3, faction: 'synth', rarity: 'rare', tier: 4, overheat: 2, tags: ['overheat'], text: 'Deal 2 damage to all enemy units. **Overheat (2)**', play: aoeEnemy(2) });
card('fortify',      { name: 'Fortify', type: 'spell', cost: 3, faction: 'synth', tier: 4, tags: ['armor'], text: 'Gain 5 **Armor**. Draw a card.', play: (s, c) => { gainArmor(s, c.pi, 5); draw(s, c.pi, 1); } });
card('overdrive',    { name: 'Overdrive', type: 'spell', cost: 2, faction: 'synth', tier: 4, target: 'friendlyMinion', kwRef: ['twin'], text: 'Give a friendly unit +1 Attack and **Twin-Fire**.', play: (s, c) => { buff(s, c.target, 1, 0); giveKw(s, c.target, 'twin'); } });
card('deflector_grid',{ name: 'Deflector Grid', type: 'spell', cost: 4, faction: 'synth', rarity: 'rare', tier: 4, kwRef: ['barrier'], text: 'Give your units **Barrier**.', play: (s, c) => friendlyMinions(s, c.pi).forEach(m => giveKw(s, m, 'barrier')) });
card('vent_heat',    { name: 'Vent Heat', type: 'spell', cost: 1, faction: 'synth', tier: 4, tags: ['overheat'], target: 'any', text: 'Deal 2 damage. Unlock your Overheated Energy.', play: (s, c) => { damage(s, null, c.target, sp(s, c.pi, 2)); c.me.mana += c.me.locked; c.me.locked = 0; c.me.overload = 0; } });
card('emp_blast',    { name: 'EMP Blast', type: 'spell', cost: 4, faction: 'synth', rarity: 'epic', tier: 4, tags: ['emp'], text: '**EMP** all enemy units.', play: (s, c) => enemyMinions(s, c.pi).forEach(m => silence(s, m)) });

// ============================================================ TIER 5 — Void Expanse (Psionics)
card('void_initiate',{ name: 'Void Initiate', type: 'unit', cost: 1, atk: 1, hp: 2, faction: 'psi', tier: 5, kw: ['amplify'], amplify: 1, text: '**Amplify +1**' });
card('psi_adept',    { name: 'Psi Adept', type: 'unit', cost: 3, atk: 3, hp: 3, faction: 'psi', tier: 5, kw: ['amplify'], amplify: 1, text: '**Amplify +1**' });
card('probe_unit',   { name: 'Probe Unit', type: 'unit', cost: 2, atk: 2, hp: 1, faction: 'psi', tier: 5, tags: ['deploy', 'scan'], text: '**Deploy:** **Scan** a unit.', play: (s, c) => scan(s, c.pi, collectibles().filter(d => d.type === 'unit').map(d => d.id)) });
card('cryo_sentry',  { name: 'Cryo Sentry', type: 'unit', cost: 3, atk: 2, hp: 3, faction: 'psi', tier: 5, tags: ['deploy', 'cryo'], target: 'enemy', text: '**Deploy:** **Cryo** an enemy.', play: (s, c) => freeze(s, c.target) });
card('mind_seer',    { name: 'Mind Seer', type: 'unit', cost: 3, atk: 2, hp: 3, faction: 'psi', tier: 5, tags: ['deploy', 'scan'], text: '**Deploy:** **Scan** a spell.', play: (s, c) => scan(s, c.pi, collectibles().filter(d => d.type === 'spell' || d.type === 'trap').map(d => d.id)) });
card('telepath',     { name: 'Telepath', type: 'unit', cost: 4, atk: 3, hp: 4, faction: 'psi', tier: 5, tags: ['deploy'], text: "**Deploy:** Copy a random card from your opponent's hand.", play: (s, c) => { const x = pick(c.them.hand); if (x) addHand(s, c.pi, x.id); } });
card('phase_stalker',{ name: 'Phase Stalker', type: 'unit', cost: 4, atk: 4, hp: 3, faction: 'psi', tier: 5, kw: ['cloak', 'siphon'], text: '**Cloak**. **Siphon**' });
card('void_oracle',  { name: 'Void Oracle', type: 'unit', cost: 5, atk: 4, hp: 5, faction: 'psi', rarity: 'rare', tier: 5, kw: ['amplify'], amplify: 2, text: '**Amplify +2**' });
card('psionic_horror',{ name: 'Psionic Horror', type: 'unit', cost: 6, atk: 5, hp: 5, faction: 'psi', rarity: 'rare', tier: 5, text: 'After you cast a spell, deal 2 damage to a random enemy.', onSpell: (s, c) => { const t = randomEnemy(s, c.pi); if (t) damage(s, c.self.uid, t, 2); }, value: 2.5 });
card('glacial_titan',{ name: 'Glacial Titan', type: 'unit', cost: 7, atk: 6, hp: 7, faction: 'psi', rarity: 'epic', tier: 5, tags: ['deploy', 'cryo'], text: '**Deploy:** **Cryo** all enemy units.', play: (s, c) => enemyMinions(s, c.pi).forEach(m => freeze(s, m)) });
card('nyra',         { name: 'Nyra, Void Hierarch', type: 'unit', cost: 8, atk: 6, hp: 6, faction: 'psi', rarity: 'legendary', tier: 5, kw: ['amplify'], amplify: 2, tags: ['deploy', 'control'], text: '**Amplify +2**. **Deploy:** Take control of a random enemy unit.', play: (s, c) => { const m = randomEnemyMinion(s, c.pi); if (m) steal(s, m, c.pi); }, flavor: 'Nyra: "The Choir is offering us peace, Commander. All I did was open the door."' });
card('archivist',    { name: 'The Archivist', type: 'unit', cost: 6, atk: 4, hp: 6, faction: 'psi', rarity: 'legendary', tier: 5, text: 'At the start of your turn, add a random Protocol to your hand. It costs 2 less.', turnStart: (s, c) => addHand(s, c.pi, pick(collectibles().filter(d => d.type === 'spell').map(d => d.id)), -2), value: 3, flavor: 'Archive keeper: "Ask it politely and it will find you any record. Ask it rudely and it will find you a very long one."' });
card('frost_lance',  { name: 'Frost Lance', type: 'spell', cost: 2, faction: 'psi', tier: 5, tags: ['cryo'], target: 'any', text: 'Deal 3 damage and **Cryo** the target.', play: (s, c) => { damage(s, null, c.target, sp(s, c.pi, 3)); freeze(s, c.target); } });
card('cryo_nova',    { name: 'Cryo Nova', type: 'spell', cost: 3, faction: 'psi', tier: 5, tags: ['cryo'], text: '**Cryo** all enemy units.', play: (s, c) => enemyMinions(s, c.pi).forEach(m => freeze(s, m)) });
card('void_shards',  { name: 'Void Shards', type: 'spell', cost: 1, faction: 'psi', tier: 5, text: 'Deal 3 damage split randomly among enemies.', play: (s, c) => { const n = sp(s, c.pi, 3); for (let k = 0; k < n; k++) { const t = randomEnemy(s, c.pi); if (t) damage(s, null, t, 1); } } });
card('mind_blast',   { name: 'Mind Blast', type: 'spell', cost: 3, faction: 'psi', tier: 5, text: 'Deal 5 damage to the enemy commander.', play: (s, c) => damage(s, null, c.them, sp(s, c.pi, 5)) });
card('foresight',    { name: 'Foresight', type: 'spell', cost: 1, faction: 'psi', tier: 5, tags: ['scan'], text: '**Scan** a spell.', play: (s, c) => scan(s, c.pi, collectibles().filter(d => d.type === 'spell' || d.type === 'trap').map(d => d.id)) });
card('psionic_storm',{ name: 'Psionic Storm', type: 'spell', cost: 6, faction: 'psi', rarity: 'rare', tier: 5, text: 'Deal 4 damage to all enemy units.', play: aoeEnemy(4) });
card('dominate',     { name: 'Dominate', type: 'spell', cost: 9, faction: 'psi', rarity: 'epic', tier: 5, tags: ['control'], target: 'enemyMinion', text: 'Take control of an enemy unit.', play: (s, c) => steal(s, c.target, c.pi) });
card('grav_snare',   { name: 'Gravity Snare', type: 'trap', cost: 2, faction: 'psi', tier: 5, tags: ['trap'], trap: 'attack', when: (s, c) => !isHero(c.attacker), text: "**Trap:** When an enemy unit attacks, return it to its owner's hand. It costs 2 more.", fire: (s, c) => bounce(s, c.attacker, 2) });
card('mirror_field', { name: 'Mirror Field', type: 'trap', cost: 3, faction: 'psi', rarity: 'rare', tier: 5, tags: ['trap'], trap: 'unit', text: '**Trap:** After your opponent plays a unit, summon a copy of it.', fire: (s, c) => summon(s, c.pi, c.unit.id) });
card('psionic_null', { name: 'Psionic Null', type: 'trap', cost: 3, faction: 'psi', rarity: 'rare', tier: 5, tags: ['trap'], trap: 'spell', text: '**Trap:** When your opponent casts a spell, cancel it.', fire: () => 'cancel' });
card('kinetic_barrier',{ name: 'Kinetic Barrier', type: 'trap', cost: 2, faction: 'psi', tier: 5, tags: ['trap', 'armor'], trap: 'attack', when: (s, c) => isHero(c.target), text: '**Trap:** When your commander is attacked, gain 8 **Armor**.', fire: (s, c) => gainArmor(s, c.pi, 8) });
card('sniper_mine',  { name: 'Sniper Mine', type: 'trap', cost: 2, faction: 'psi', tier: 5, tags: ['trap'], trap: 'unit', text: '**Trap:** After your opponent plays a unit, deal 4 damage to it.', fire: (s, c) => damage(s, null, c.unit, 4) });

// ============================================================ Commander gear tokens
card('combat_knife', { name: 'Combat Knife', type: 'gear', cost: 1, atk: 1, hp: 2, token: true, text: '' });

// ============================================================ VOID — enemy-only (final sector)
card('void_wisp',    { name: 'Void Wisp', type: 'unit', cost: 1, atk: 1, hp: 1, faction: 'void', token: true, text: '' });
card('choir_echo',   { name: 'Choir Echo', type: 'unit', cost: 3, atk: 3, hp: 3, faction: 'void', token: true, kw: ['cloak'], text: '**Cloak**' });
card('null_horror',  { name: 'Null Horror', type: 'unit', cost: 4, atk: 4, hp: 4, faction: 'void', token: true, tags: ['deploy', 'emp'], target: 'enemyMinion', text: '**Deploy:** **EMP** an enemy unit.', play: (s, c) => silence(s, c.target) });
card('abyssal_maw',  { name: 'Abyssal Maw', type: 'unit', cost: 6, atk: 5, hp: 7, faction: 'void', token: true, kw: ['guardian', 'siphon'], text: '**Guardian**. **Siphon**' });
card('herald_of_end',{ name: 'Herald of Ending', type: 'unit', cost: 5, atk: 3, hp: 6, faction: 'void', token: true, text: 'At the end of your turn, deal 1 damage to all enemies.', turnEnd: (s, c) => enemyChars(s, c.pi).forEach(t => damage(s, c.self.uid, t, 1)), value: 4 });
card('entropy_wave', { name: 'Entropy Wave', type: 'spell', cost: 5, faction: 'void', token: true, text: 'Deal 3 damage to all units.', play: (s, c) => allMinions(s).forEach(m => damage(s, null, m, sp(s, c.pi, 3))) });
card('unmaking',     { name: 'Unmaking', type: 'spell', cost: 4, faction: 'void', token: true, target: 'enemyMinion', text: 'Destroy an enemy unit. Your commander takes 2 damage.', play: (s, c) => { destroy(s, c.target); damage(s, null, c.me, 2); } });
card('devouring_dark',{ name: 'The Devouring Dark', type: 'unit', cost: 9, atk: 8, hp: 8, faction: 'void', token: true, tags: ['deploy'], text: '**Deploy:** Destroy all other units.', play: (s, c) => allMinions(s).forEach(m => { if (m !== c.self) destroy(s, m); }) });
card('target_dummy', { name: 'Target Dummy', type: 'unit', cost: 0, atk: 0, hp: 2, token: true, kw: ['guardian'], text: '**Guardian**' });

const CARD_LIST = Object.values(CARDS);

// ============================================================ Commander powers
const HEROPOWERS = {
  repair:   { name: 'Nanite Repair', cost: 2, target: 'any', text: 'Restore 2 Health.', use: (s, c) => heal(s, c.target, 2) },
  pulse:    { name: 'Pulse Laser', cost: 2, target: 'any', text: 'Deal 1 damage.', use: (s, c) => damage(s, null, c.target, 1) },
  drone:    { name: 'Launch Drone', cost: 2, text: 'Summon a 1/1 Drone.', canUse: (s, c) => c.me.board.length < MAX_BOARD, use: (s, c) => summon(s, c.pi, 'drone') },
  blade:    { name: 'Arm Blade', cost: 2, text: 'Equip a 1/2 Combat Knife.', use: (s, c) => equip(s, c.pi, 'combat_knife') },
  mutagen:  { name: 'Mutagen', cost: 2, target: 'friendlyMinion', text: 'Give a friendly unit +1/+1.', use: (s, c) => buff(s, c.target, 1, 1) },
  plating:  { name: 'Reinforce Plating', cost: 2, text: 'Gain 2 Armor.', use: (s, c) => gainArmor(s, c.pi, 2) },
  datamine: { name: 'Data Mine', cost: 2, text: 'Draw a card. Take 2 damage.', use: (s, c) => { draw(s, c.pi, 1); damage(s, null, c.me, 2); } },
  // enemy-only
  target_practice: { name: 'Target Practice', cost: 2, text: 'Deal 1 damage to the enemy commander.', use: (s, c) => damage(s, null, c.them, 1) },
  cannon_volley:   { name: 'Cannon Volley', cost: 2, text: 'Deal 2 damage to a random enemy.', use: (s, c) => { const t = randomEnemy(s, c.pi); if (t) damage(s, null, t, 2); } },
  broadside_power: { name: 'Full Broadside', cost: 2, text: 'Deal 1 damage to all enemy units.', use: (s, c) => enemyMinions(s, c.pi).forEach(t => damage(s, null, t, 1)) },
  spawn_brood:     { name: 'Spawn Brood', cost: 2, text: 'Summon two 1/1 Swarmlings.', canUse: (s, c) => c.me.board.length < MAX_BOARD, use: (s, c) => { summon(s, c.pi, 'swarmling'); summon(s, c.pi, 'swarmling'); } },
  reconfigure:     { name: 'Reconfigure', cost: 2, text: 'Gain 2 Armor. Give a random friendly unit +1/+1.', use: (s, c) => { gainArmor(s, c.pi, 2); const m = pick(friendlyMinions(s, c.pi)); if (m) buff(s, m, 1, 1); } },
  mind_spike:      { name: 'Mind Spike', cost: 2, target: 'any', text: 'Deal 1 damage. Amplify increases this.', use: (s, c) => damage(s, null, c.target, sp(s, c.pi, 1)) },
  corrupt:         { name: 'Corrupt', cost: 2, target: 'enemyMinion', text: 'Give an enemy unit -1 Attack.', use: (s, c) => buff(s, c.target, -Math.min(1, getChar(s, c.target).atk), 0) },
  void_lash:       { name: 'Void Lash', cost: 2, text: 'Deal 2 damage to a random enemy.', use: (s, c) => { const t = randomEnemy(s, c.pi); if (t) damage(s, null, t, 2); } },
  unmake:          { name: 'Unmake', cost: 3, text: 'Deal 3 damage to a random enemy unit. If there are none, deal 2 damage to the enemy commander.', use: (s, c) => { const m = randomEnemyMinion(s, c.pi); if (m) damage(s, null, m, 3); else damage(s, null, c.them, 2); } },
};
const PLAYER_POWERS = ['repair', 'pulse', 'drone', 'blade', 'mutagen', 'plating', 'datamine'];

// ============================================================ Boss passives
const PASSIVES = {
  boarding_party: { name: 'Boarding Party', text: 'Units with Warp or Blitz have +1 Attack.', auraAtk: (s, m) => (m.kw.warp || m.kw.blitz) ? 1 : 0 },
  brood_growth:   { name: 'Brood Growth', text: 'At the end of this commander\'s turn, a random friendly unit gains +1/+1.', turnEnd: (s, c) => { const m = pick(friendlyMinions(s, c.pi)); if (m) buff(s, m, 1, 1); } },
  adaptive_armor: { name: 'Adaptive Armor', text: 'Starts with 10 Armor. Gains 2 Armor each turn.', gameStart: (s, c) => { c.me.armor += 10; }, turnStart: (s, c) => gainArmor(s, c.pi, 2) },
  void_resonance: { name: 'Void Resonance', text: 'Spells and Mind Spike deal +1 damage. Starts with a Trap armed.', amplify: 1 },
  thick_hull:     { name: 'Thick Hull', text: 'Starts with 8 Armor.', gameStart: (s, c) => { c.me.armor += 8; } },
  veteran_crew:   { name: 'Veteran Crew', text: 'Units have +1 Attack.', auraAtk: () => 1 },
  rapid_deploy:   { name: 'Rapid Deployment', text: 'Starts with 1 extra Energy crystal.', gameStart: (s, c) => { c.me.maxMana += 1; } },
  singularity:    { name: 'Singularity-Touched', text: 'Units it summons gain +0/+1.', onSummon: (s, c) => { c.summoned.maxHp += 1; c.summoned.hp += 1; } },
  choir_song:     { name: 'Choir Song', text: 'At the end of its turn, if it has fewer than 3 units, summon a 1/1 Void Wisp.', turnEnd: (s, c) => { if (friendlyMinions(s, c.pi).length < 3) summon(s, c.pi, 'void_wisp'); } },
  entropy:        { name: 'Entropy', text: 'At the start of its turn, deal 1 damage to all enemy units.', turnStart: (s, c) => enemyMinions(s, c.pi).forEach(m => damage(s, null, m, 1)) },
  hunger:         { name: 'Endless Hunger', text: 'Its units have +1 Attack.', auraAtk: () => 1 },
};

// ============================================================ Multi-phase boss stages
const PHASES = {
  choir2: { name: 'The Choir Awakened', hp: 18, power: 'void_lash', passives: ['entropy'], text: 'The shell cracks. A thousand voices sing at once. HALCYON reroutes power to you: +8 Health, +1 card.',
    enter: (s, c) => { heal(s, c.them, 8); draw(s, c.op, 1); enemyMinions(s, c.pi).forEach(m => damage(s, null, m, 1)); summon(s, c.pi, 'choir_echo'); ['herald_of_end', 'entropy_wave'].forEach(id => addDeck(s, c.pi, id)); } },
  choir3: { name: 'The Devourer Eternal', hp: 20, armor: 0, power: 'unmake', passives: ['hunger'], text: 'Everything goes quiet. Then the dark opens its mouth. HALCYON gives you everything it has left: +8 Health, +2 cards.',
    enter: (s, c) => { heal(s, c.them, 8); draw(s, c.op, 2); friendlyMinions(s, c.pi).forEach(m => destroy(s, m)); enemyMinions(s, c.pi).forEach(m => damage(s, null, m, 2)); draw(s, c.pi, 2); addDeck(s, c.pi, 'devouring_dark'); } },
};
