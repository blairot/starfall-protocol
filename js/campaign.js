'use strict';
// ============================================================================
// STARFALL PROTOCOL — campaign: sectors, encounters, rewards, saves
// ============================================================================

const DECK_SIZES = [15, 20, 25, 30, 30, 30];
const PLAYER_HP = 30, HULL_PER_BOSS = 2;
function bossesCleared(save) { return ENCOUNTERS.filter(e => e.boss && save.cleared && save.cleared[e.id]).length; }
function playerMaxHp(save) { return PLAYER_HP + HULL_PER_BOSS * Math.min(5, bossesCleared(save)) + (typeof medbayHp === 'function' ? medbayHp(save) : 0); }

function dk(str) { const out = []; str.trim().split(/\s+/).forEach(tok => { const [id, n] = tok.split(':'); D(id); for (let k = 0; k < (+n || 1); k++) out.push(id); }); return out; }

const SECTORS = [
  { id: 's1', name: 'Fleet Academy', sub: 'Proving Grounds Simulator', hue: 215,
    intro: 'Cadet, welcome to the Proving Grounds. Our training intelligence, HALCYON, will run you through combat simulations until you can command a battle group. Do well and you get a ship.' },
  { id: 's2', name: 'The Scrap Belt', sub: 'Raider territory', hue: 22,
    intro: 'Your first command: the frigate Meridian. A distress call from the Scrap Belt mentions a "singing signal" and machines that stopped answering their owners. The raiders out here will not make the trip easy.' },
  { id: 's3', name: 'Hive Nebula', sub: 'Swarm breeding grounds', hue: 105,
    intro: 'The signal is coming from deeper in. Vex\'s logs point to the Hive Nebula, where the Swarm has started breeding faster than anything we have seen. Something is feeding them.' },
  { id: 's4', name: 'Forge Worlds', sub: 'Synthetic foundries', hue: 185,
    intro: 'The machine worlds of the Forge went silent a month ago. Now their foundries run day and night. Calculus Prime, the mind that governs them, has decided organics are an error to be corrected.' },
  { id: 's5', name: 'Void Expanse', sub: 'Psionic dominion', hue: 275,
    intro: 'Beyond the Forge lies the Void Expanse, home of the Psionic orders. Their Hierarch, Nyra, has opened a door to whatever is singing. You need to close it.' },
  { id: 's6', name: 'The Singularity', sub: 'Galactic core', hue: 320,
    intro: 'At the galactic core, the Choir waits. It has rebuilt every enemy you defeated in its own image. Fight through them, then end this.' },
];

// tips: shown in the Tactical Advisor panel on the player's Nth turn (last one repeats).
const ENCOUNTERS = [
  // ===================================================================== SECTOR 1
  { id: '1-1', sector: 0, name: 'First Contact', teaches: ['basics', 'energy'],
    enemy: { name: 'Sim Drone Pilot', hp: 12, ai: 0, deck: dk('scout_drone:4 cadet:4 marine:3 ion_lancer:2 heavy_trooper:2') },
    fixedDeck: dk('cadet:3 scout_drone:3 marine:3 ion_lancer:2 heavy_trooper:2 patrol_frigate:1 star_cruiser:1'), noPower: true, first: 0, noMulligan: true,
    story: 'HALCYON: "Simulation online. Opposition: one drone pilot, limited competence. Deploy units, attack, and reduce the enemy commander to zero. Try not to embarrass the Academy."',
    tips: [
      'You have <b>1 Energy</b> (the crystals at right). Click a card in your hand that costs 1 to deploy it. Then press <b>End Turn</b>.',
      'Units can attack the turn <i>after</i> they arrive. Click your glowing unit, then click a target. Hitting the enemy commander\'s portrait damages them directly.',
      'When units fight, each deals its Attack (yellow) to the other\'s Health (red). Destroying enemy units protects your commander.',
      'Energy grows by 1 each turn up to 10, so bigger units become playable later. Spend it every turn.',
      'Reduce the enemy commander to 0 Health to win. Hover any card to read it.',
    ],
    grant: { plasma_bolt: 2, rifle_squad: 2, recon_officer: 2, medic_bot: 2 } },

  { id: '1-2', sector: 0, name: 'Fire Protocols', teaches: ['spells', 'deploy'],
    enemy: { name: 'Sim Gunnery Officer', hp: 16, ai: 0, deck: dk('scout_drone:2 cadet:2 marine:3 ion_lancer:2 rifle_squad:2 plasma_bolt:2 heavy_trooper:2') },
    first: 0, noMulligan: true,
    story: 'HALCYON: "I have added Protocols to your deck: one-shot spells. Some units also have Deploy effects that fire as they arrive. Before each battle you can edit your deck in the Hangar."',
    tips: [
      'Protocol cards (spells) have no Attack or Health. Click <b>Plasma Bolt</b>, then click an enemy to deal 2 damage.',
      '<b>Deploy:</b> effects trigger when you play the card. Rifle Squad asks for a target as it lands.',
      'Use spells to remove enemy units your own units can\'t trade with efficiently.',
      'Recon Officer draws a card. Running out of cards in hand means running out of options.',
    ],
    grant: { shield_trooper: 2, barricade: 2 } },

  { id: '1-3', sector: 0, name: 'Hold the Line', teaches: ['guardian'],
    enemy: { name: 'Sim Fortress', hp: 18, ai: 1, deck: dk('barricade:2 shield_trooper:3 marine:2 cadet:3 scout_drone:1 bulwark_mech:1 heavy_trooper:2 field_engineer:1') },
    first: 0, noMulligan: true,
    story: 'HALCYON: "Fortification drill. The enemy deploys Guardian units. You must break through them before you can reach the commander behind."',
    tips: [
      'Units with <b>Guardian</b> (shielded frame) must be attacked first. You can\'t hit the commander or other units until they fall.',
      'Spells ignore Guardian. A Plasma Bolt can still hit the commander directly.',
      'Your own Guardians protect you the same way. Put them in front of your fragile units.',
    ],
    grant: { field_engineer: 2, sapper: 1, dig_in: 1 }, unlockPowers: ['repair', 'pulse'] },

  { id: '1-4', sector: 0, name: 'Command Authority', teaches: ['power'],
    enemy: { name: 'Sim Commander Vale', hp: 20, ai: 1, power: 'pulse', deck: dk('cadet:2 marine:2 shield_trooper:2 rifle_squad:2 recon_officer:1 ion_lancer:2 heavy_trooper:2 plasma_bolt:1 patrol_frigate:1') },
    first: 0,
    story: 'HALCYON: "Commanders carry a personal power usable once per turn. You now have two to choose from in the Hangar. Your opponent has one as well."',
    tips: [
      'Your <b>Commander Power</b> sits beside your portrait. It costs 2 Energy and can be used once each turn.',
      'Pulse Laser finishes off damaged units. Nanite Repair keeps your units and commander alive.',
      'Before the battle you could swap cards from your opening hand. Send back expensive cards to find early plays.',
    ],
    grant: { interceptor: 2, hover_tank: 2, strike_fighter: 1 }, teachesAlso: ['mulligan'] },

  { id: '1-E', sector: 0, name: 'Sim: Iron Wall', elite: true, after: '1-4',
    enemy: { name: 'Sim Bastion', hp: 24, ai: 1, passives: ['thick_hull'], power: 'repair', deck: dk('barricade:2 shield_trooper:2 bulwark_mech:2 heavy_trooper:2 medic_bot:2 marine:2 dreadnought:1 field_repair:1 dig_in:1') },
    story: 'HALCYON: "An optional stress test. Most cadets never get through it. The reward is worth the bruises."',
    tips: ['This opponent starts with 8 Armor. Armor soaks up damage before Health.', 'Their Guardians are thick. Spells and Deploy damage let you pick off what blocks you.'],
    grant: { dreadnought: 1, bulwark_mech: 1 } },

  { id: '1-5', sector: 0, name: 'Blitz Drill', teaches: ['warp', 'blitz'],
    enemy: { name: 'Sim Strike Wing', hp: 22, ai: 1, power: 'pulse', deck: dk('strike_fighter:3 interceptor:2 hover_tank:2 scout_drone:2 ion_lancer:2 marine:2 railgun:1 recon_officer:1') },
    story: 'HALCYON: "Speed drill. Some units are fast enough to strike the moment they arrive. Learn to use them and to fear them."',
    tips: [
      '<b>Warp</b> units can attack immediately, even the enemy commander. Great for finishing a fight.',
      '<b>Blitz</b> units can attack enemy <i>units</i> the turn they arrive, but not the commander.',
      'Fast enemies punish an open board. Keep a Guardian up when you\'re low.',
    ],
    grant: { railgun: 1, supply_drop: 1, combat_stims: 1 } },

  { id: '1-6', sector: 0, name: 'HALCYON', boss: true, bossCard: 'okonkwo', graduation: true,
    enemy: { name: 'HALCYON', hp: 30, ai: 1, power: 'target_practice', deck: dk('cadet:1 marine:2 shield_trooper:2 rifle_squad:2 interceptor:2 hover_tank:1 heavy_trooper:2 sapper:1 plasma_bolt:2') },
    first: 0, noMulligan: true,
    story: 'HALCYON: "Final evaluation. I will be your opponent." The simulator flickers. Under the training intelligence\'s voice, something else is humming a tune no one wrote. "...proceed, Cadet."',
    victory: 'HALCYON: "Evaluation complete. You pass." A pause. "Cadet, there is a signal in my memory I did not put there. It is singing. Please find out why." You are given command of the frigate Meridian.',
    tips: ['HALCYON\'s power pings your commander for 1 every turn. Close the game before it adds up.', 'This is a full exam: Guardians, Warp, Blitz, spells. Use everything.'],
    unlockPowers: ['drone'] },

  // ===================================================================== SECTOR 2
  { id: '2-1', sector: 1, name: 'Toll Gate', teaches: ['mulligan'],
    enemy: { name: 'Belt Tollmaster', hp: 25, ai: 1, power: 'pulse', deck: dk('scout_drone:2 cadet:2 boarding_crew:3 marine:2 ion_lancer:2 rifle_squad:2 hover_tank:2 heavy_trooper:2 plasma_bolt:1 patrol_frigate:2') },
    story: 'A raider tollmaster blocks the Belt\'s only safe lane. "Pay the toll or pay in hull plating." Your deck now holds 20 cards.',
    tips: [
      'Real battles: a coin flip decides who goes first. Going second gives you an extra card and an <b>Energy Cell</b> worth 1 Energy once.',
      'Use the Energy Cell to play a 2-cost card on turn 1, or to reach a key card a turn early.',
      'Boarding Crew has Blitz. Expect early trades.',
    ],
    grant: { shock_baton: 2, plasma_cutlass: 1, harpoon_gun: 1 } },

  { id: '2-2', sector: 1, name: 'Armed and Dangerous', teaches: ['gear'],
    enemy: { name: 'Gunsmith Rourke', hp: 28, ai: 1, power: 'blade', deck: dk('shock_baton:2 plasma_cutlass:1 harpoon_gun:2 gunrunner:2 quartermaster:2 boarding_crew:2 marine:2 cadet:2 rifle_squad:2 heavy_trooper:2 sapper:1') },
    story: 'Rourke runs guns to every crew in the Belt. He has heard about your ship and wants it for parts.',
    tips: [
      '<b>Gear</b> arms your commander. Click your portrait, then a target, to attack with it.',
      'Your commander takes damage when attacking a unit, just like a unit would. Use Gear on small targets or the enemy commander.',
      'Each attack costs 1 Durability. New Gear replaces the old.',
    ],
    grant: { scrap_rat: 2, det_bot: 2, cargo_hauler: 1 } },

  { id: '2-3', sector: 1, name: 'Junkyard Wars', teaches: ['salvage'],
    enemy: { name: 'Scrapper King Ott', hp: 28, ai: 1, power: 'drone', deck: dk('scrap_rat:3 det_bot:2 cargo_hauler:2 scrap_golem:2 mine_layer:2 marine:2 shield_trooper:2 rifle_squad:2 heavy_trooper:2 echo_protocol:1') },
    story: 'Ott\'s scrapyard is a maze of wrecks that keep getting back up. Everything here explodes or reassembles when it breaks.',
    tips: [
      '<b>Salvage:</b> effects trigger when the unit is destroyed. Killing them is still worth it, but plan for what comes next.',
      'Mine Layer hits <i>everything</i> on your side for 1 when it dies. Don\'t clump 1-Health units.',
      'Det-Bot\'s explosion is random. Kill it while your fragile units are off the board if you can.',
    ],
    grant: { smuggler: 2, shadow_corsair: 1, smoke_screen: 1 } },

  { id: '2-4', sector: 1, name: 'Ghost Signal', teaches: ['cloak'],
    enemy: { name: 'Sable, Smuggler Queen', hp: 28, ai: 2, power: 'pulse', deck: dk('smuggler:3 shadow_corsair:2 ghost_operative:1 smoke_screen:2 boarding_crew:2 scrap_rat:2 marine:2 rifle_squad:2 hover_tank:2 plasma_bolt:2') },
    story: 'Sable\'s ships run dark. Your sensors pick up hulls only when they open fire. She knows something about the signal and will sell it if you survive.',
    tips: [
      '<b>Cloak</b> units can\'t be attacked or targeted until they attack. Area damage like Flak Barrage still hits them.',
      'Once a Cloaked unit attacks, it is revealed for good.',
    ],
    grant: { broadside: 1, quartermaster: 1, gunrunner: 1 } },

  { id: '2-E', sector: 1, name: 'Bounty: Kade', elite: true, after: '2-3',
    enemy: { name: 'Kade the Bounty Hunter', hp: 30, ai: 2, passives: ['veteran_crew'], power: 'blade', deck: dk('plasma_cutlass:2 rail_rifle:1 harpoon_gun:2 gunrunner:2 quartermaster:2 boarding_crew:2 ion_lancer:2 interceptor:2 hover_tank:2 ghost_operative:1 shakedown:2') },
    story: 'Someone put a price on your head. Kade is the best in the Belt and has never missed a contract.',
    tips: ['Kade\'s units all have +1 Attack. Trade carefully: they hit harder than their cards say.'] },

  { id: '2-5', sector: 1, name: 'Wreck Run',
    enemy: { name: 'Raider Wing Leader', hp: 30, ai: 2, power: 'blade', deck: dk('boarding_crew:2 scrap_rat:2 smuggler:2 det_bot:2 shadow_corsair:1 plunderer:2 mine_layer:1 scrap_golem:1 plasma_cutlass:1 shock_baton:1 broadside:1 hover_tank:2 interceptor:2') },
    story: 'Sable\'s coordinates lead to Vex\'s flagship. A wing of raiders tries to cut you off in the debris field.',
    tips: ['A full raider deck: Gear, Salvage, Cloak and Blitz all together. Watch the board before every attack.'] },

  { id: '2-6', sector: 1, name: 'Captain Vex', boss: true, bossCard: 'vex',
    enemy: { name: 'Captain Vex', hp: 35, ai: 2, power: 'cannon_volley', passives: ['boarding_party'], deck: dk('boarding_crew:3 interceptor:2 hover_tank:2 plunderer:2 shadow_corsair:2 det_bot:2 scrap_golem:1 plasma_cutlass:2 rail_rifle:1 quartermaster:1 broadside:1 shakedown:1') },
    story: 'Vex\'s flagship is half pirate ship, half something else. Cables hum the same tune you heard in HALCYON. "You hear it too, don\'t you? It promised me the whole Belt."',
    victory: 'Vex\'s ship goes dark. In her logs: coordinates to the Hive Nebula, and one line repeated a thousand times. THE CHOIR IS COMING.',
    tips: ['Vex\'s fast units get +1 Attack. Keep Guardians ready and clear Warp threats quickly.', 'Cannon Volley deals 2 damage randomly each turn. Units with 2 Health are at risk.'],
    unlockPowers: ['blade'] },

  // ===================================================================== SECTOR 3
  { id: '3-1', sector: 2, name: 'Venom Fields', teaches: ['toxic'],
    enemy: { name: 'Hive Overseer', hp: 30, ai: 1, power: 'spawn_brood', deck: dk('venom_stinger:3 acid_spitter:2 larva:3 chitin_guard:2 spore_carrier:2 marine:2 cadet:2 rapid_mutation:2 heavy_trooper:2 hover_tank:2 spawn_surge:1 hive_reaper:1 scout_drone:1') },
    story: 'The nebula is thick with spores. Your deck now holds 25 cards. The first Swarm patrol is small, but its stingers can kill anything.',
    tips: [
      '<b>Toxic</b> units destroy any unit they damage, no matter how big. Answer them with spells, small units, or Barrier.',
      'Hive Larva hatches into a 3/3 at the start of its owner\'s turn. Kill eggs early.',
    ],
    grant: { venom_stinger: 2, acid_spitter: 1, larva: 2 } },

  { id: '3-2', sector: 2, name: 'Bloodline', teaches: ['siphon'],
    enemy: { name: 'Leech Matron', hp: 30, ai: 2, power: 'spawn_brood', deck: dk('blood_leech:3 lamprey:2 venom_stinger:2 larva:2 chitin_guard:2 spore_carrier:2 broodmother:2 rapid_mutation:2 life_drain:2 marine:2 heavy_trooper:2 hover_tank:2') },
    story: 'Organisms in this region feed on the wounded. Every bite closes their own wounds.',
    tips: ['<b>Siphon</b>: damage dealt by the unit heals its commander. Kill Siphon units before they swing.'],
    grant: { blood_leech: 2, spore_carrier: 2, life_drain: 1 } },

  { id: '3-3', sector: 2, name: 'The Brood',
    enemy: { name: 'Brood Tender', hp: 32, ai: 2, power: 'spawn_brood', deck: dk('broodmother:2 hive_mind:2 spore_carrier:3 larva:3 swarmling:0 spawn_surge:2 hive_surge:2 venom_stinger:2 chitin_guard:2 infest:1 frenzied_ripper:2 acid_spitter:2 blood_leech:2') },
    story: 'A breeding chamber. Every turn there are more of them.',
    tips: ['The Swarm wins by numbers. Area damage like Flak Barrage and Broadside is very strong here.', 'Hive Mind gives every new unit +1 Attack. Kill it first.'],
    grant: { hive_mind: 1, broodmother: 1, spawn_surge: 1, frenzied_ripper: 1 } },

  { id: '3-4', sector: 2, name: 'Apex Predator',
    enemy: { name: 'Ripper Alpha', hp: 32, ai: 2, power: 'mutagen', deck: dk('frenzied_ripper:3 hive_reaper:2 devourer_worm:2 acid_spitter:2 venom_stinger:2 rapid_mutation:2 toxic_spitter:2 blood_leech:2 chitin_guard:2 lamprey:2 hover_tank:2 heavy_trooper:2') },
    story: 'Something big is hunting your scouts. It grows every time you wound it.',
    tips: ['Frenzied Ripper gains +2 Attack whenever it survives damage. Kill it in one hit or not at all.', 'Devourer Worm eats a friendly unit to grow huge. Keep removal ready.'] },

  { id: '3-E', sector: 2, name: 'The Hivewarden', elite: true, after: '3-3',
    enemy: { name: 'The Hivewarden', hp: 30, ai: 2, passives: ['brood_growth'], power: 'spawn_brood', deck: dk('broodmother:2 hive_mind:2 lamprey:2 hive_reaper:2 chitin_guard:2 spore_carrier:2 larva:2 venom_stinger:2 acid_rain:1 hive_surge:2 infest:2 rapid_mutation:2 frenzied_ripper:2') },
    story: 'An ancient guardian-beast of the nebula. Its brood grows stronger every turn it lives.',
    tips: ['Brood Growth buffs a random unit each turn. A long fight favours the Warden.'] },

  { id: '3-5', sector: 2, name: 'Queen\'s Guard',
    enemy: { name: 'Royal Guard Thorax', hp: 34, ai: 2, power: 'spawn_brood', deck: dk('chitin_guard:3 lamprey:2 hive_reaper:2 acid_spitter:2 venom_stinger:2 broodmother:2 hive_mind:1 hive_surge:2 life_drain:2 spore_carrier:2 larva:2 devourer_worm:1 rapid_mutation:2') },
    story: 'The Queen\'s chamber lies behind a wall of chitin and poison.',
    tips: ['Guardians with Toxic or Siphon make expensive walls. EMP and spells are your friends... once you find them.'] },

  { id: '3-6', sector: 2, name: 'Ixis, Brood Queen', boss: true, bossCard: 'ixis',
    enemy: { name: 'Ixis, Brood Queen', hp: 40, ai: 2, power: 'spawn_brood', passives: ['brood_growth'], deck: dk('broodmother:2 hive_mind:2 hive_reaper:2 lamprey:2 devourer_worm:1 frenzied_ripper:2 venom_stinger:2 acid_spitter:2 spore_carrier:2 larva:2 spawn_surge:1 acid_rain:1 hive_surge:2 infest:1 life_drain:1') },
    story: 'Ixis is vast, and around her the nebula pulses in rhythm with the signal. "The Choir sang to my children. It told them to grow. Who are you to tell them to stop?"',
    victory: 'Ixis falls and the nebula falls silent. Her brood scatters. In the quiet you can finally trace the signal: it comes from the Forge Worlds, broadcast on a machine frequency.',
    tips: ['Ixis spawns two Swarmlings every turn. Area damage clears them; spending single-target removal on them is a waste.', 'Her units grow each turn. Trade aggressively.'],
    unlockPowers: ['mutagen'] },

  // ===================================================================== SECTOR 4
  { id: '4-1', sector: 3, name: 'Foundry Gate', teaches: ['barrier'],
    enemy: { name: 'Gate Warden Unit', hp: 32, ai: 2, power: 'plating', deck: dk('shield_drone:3 aegis_sentinel:2 plating_tech:2 gatling_drone:0 repair_drone:2 assembler:2 nanoforge:1 marine:2 shield_trooper:2 heavy_trooper:2 bulwark_mech:2 recon_officer:2 deflector_grid:1 combat_stims:2 patrol_frigate:2 field_engineer:2 plasma_bolt:3') },
    story: 'The Forge\'s outer gate is held by shielded constructs. Your deck now holds 30 cards.',
    tips: ['<b>Barrier</b> blocks the first hit completely. Pop it with something cheap, like a 1-Attack unit or your Pulse Laser, before committing big hits.', 'This commander gains <b>Armor</b>, which soaks damage before Health.'],
    teachesAlso: ['armor'],
    grant: { shield_drone: 2, aegis_sentinel: 1, plating_tech: 2 } },

  { id: '4-2', sector: 3, name: 'Signal Jammers', teaches: ['emp'],
    enemy: { name: 'Jammer Array', hp: 32, ai: 2, power: 'reconfigure', deck: dk('emp_trooper:3 disruptor:2 shield_drone:2 aegis_sentinel:2 plating_tech:2 assembler:2 repair_drone:2 reactor_core:1 marine:2 heavy_trooper:2 rifle_squad:2 recon_officer:2 bulwark_mech:2 fortify:2 railgun:2') },
    story: 'Jammer towers flood the area with electromagnetic pulses. Your buffs and keywords will not last long here.',
    tips: ['<b>EMP</b> wipes a unit back to a plain body: no keywords, no buffs, no text. Great against Toxic, Guardian or big buffed units.', 'Don\'t over-invest buffs in one unit while EMP is around.'],
    grant: { emp_trooper: 2, disruptor: 2, fortify: 1 } },

  { id: '4-3', sector: 3, name: 'Assembly Line', teaches: ['twin'],
    enemy: { name: 'Line Supervisor', hp: 34, ai: 2, power: 'reconfigure', deck: dk('gatling_drone:3 war_walker:1 assembler:2 overdrive:2 shield_drone:2 nanoforge:2 aegis_sentinel:2 emp_trooper:2 plating_tech:2 repair_drone:2 heavy_trooper:2 hover_tank:2 lightning_arc:0 disruptor:2 deflector_grid:1 fortify:1 railgun:2') },
    story: 'An endless production line, guarded by rapid-fire drones.',
    tips: ['<b>Twin-Fire</b> units attack twice per turn. Combined with Barrier, they shred units.', 'Overdrive grants Twin-Fire to a unit. Kill or EMP the target.'],
    grant: { gatling_drone: 2, overdrive: 1, assembler: 1 } },

  { id: '4-4', sector: 3, name: 'Meltdown', teaches: ['overheat'],
    enemy: { name: 'Reactor Overseer', hp: 34, ai: 2, power: 'pulse', deck: dk('arc_coil:3 overclocked_mech:2 storm_titan:1 lightning_arc:3 chain_lightning:2 vent_heat:2 gatling_drone:2 shield_drone:2 plating_tech:2 emp_trooper:2 aegis_sentinel:2 reactor_core:1 heavy_trooper:2 hover_tank:2 fortify:2') },
    story: 'The reactor district runs hot. Its machines borrow power from tomorrow to hit hard today.',
    tips: ['<b>Overheat (N)</b>: cheap, powerful cards that lock N of your Energy crystals next turn.', 'After the enemy overheats, they have less Energy next turn. That\'s your window to push.'],
    grant: { arc_coil: 2, lightning_arc: 2, overclocked_mech: 1, vent_heat: 1 } },

  { id: '4-5', sector: 3, name: 'Core Defenses',
    enemy: { name: 'Defense Matrix', hp: 36, ai: 2, power: 'reconfigure', passives: ['thick_hull'], deck: dk('aegis_sentinel:2 reactor_core:2 war_walker:1 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 disruptor:2 overclocked_mech:2 storm_titan:1 lightning_arc:2 chain_lightning:1 deflector_grid:1 fortify:2 plating_tech:2 repair_drone:2') },
    story: 'Calculus Prime\'s inner defenses. Every system here has been optimised against you.',
    tips: ['A grinding defensive opponent. Card draw and big threats win long games.'] },

  { id: '4-E', sector: 3, name: 'Siege Engine Mk IX', elite: true, after: '4-4',
    enemy: { name: 'Siege Engine Mk IX', hp: 34, ai: 3, power: 'plating', passives: ['rapid_deploy'], deck: dk('storm_titan:2 war_walker:1 overclocked_mech:2 arc_coil:2 bulwark_mech:2 star_cruiser:2 reactor_core:2 heavy_trooper:2 aegis_sentinel:2 gatling_drone:2 chain_lightning:2 lightning_arc:2 fortify:2 vent_heat:2 deflector_grid:1 kill_order:1 shield_drone:1') },
    story: 'A prototype war machine, left running in an abandoned bay. It starts every fight a step ahead.',
    tips: ['It starts with an extra Energy crystal. Expect big plays early. Hold removal for its biggest threats.'] },

  { id: '4-6', sector: 3, name: 'Calculus Prime', boss: true, bossCard: 'calculus',
    enemy: { name: 'Calculus Prime', hp: 40, ai: 3, power: 'reconfigure', passives: ['adaptive_armor'], deck: dk('aegis_sentinel:2 war_walker:1 storm_titan:1 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 reactor_core:1 overclocked_mech:2 repair_drone:1 plating_tech:2 disruptor:2 chain_lightning:1 lightning_arc:2 deflector_grid:1 emp_blast:1 fortify:1 overdrive:2') },
    story: '"Organic Commander. I have run your probability of victory eleven million times. The Choir showed me a universe without error. You are an error."',
    victory: 'Calculus Prime\'s core cracks. In its last broadcast, it releases the signal\'s true source: the Void Expanse, where the Psionic Hierarch Nyra amplifies the song from the edge of the galactic core.',
    tips: ['Calculus starts with 10 Armor and gains 2 every turn. Pressure early and keep pressure on. Waiting only makes it tougher.', 'EMP Blast can wipe your buffs. Spread your strength across several units.'],
    unlockPowers: ['plating'] },

  // ===================================================================== SECTOR 5
  { id: '5-1', sector: 4, name: 'Whispering Dark', teaches: ['amplify'],
    enemy: { name: 'Void Acolyte Choir', hp: 30, ai: 2, power: 'mind_spike', deck: dk('void_initiate:3 psi_adept:2 void_oracle:1 void_shards:3 plasma_bolt:2 mind_blast:1 railgun:2 flak_barrage:2 marine:2 shield_trooper:2 heavy_trooper:2 recon_officer:2 supply_drop:1 patrol_frigate:2 bulwark_mech:2') },
    story: 'The first Psionic outpost hums with focused minds. Their spells hit harder than they should.',
    tips: ['<b>Amplify +N</b>: while this unit is alive, its owner\'s spells deal N extra damage. Kill Amplify units before the big spell lands.'],
    grant: { void_initiate: 2, psi_adept: 1, void_shards: 2 } },

  { id: '5-2', sector: 4, name: 'Frozen Moon', teaches: ['cryo'],
    enemy: { name: 'Cryomancer Vel', hp: 30, ai: 2, power: 'mind_spike', deck: dk('cryo_sentry:3 frost_lance:3 cryo_nova:2 glacial_titan:1 void_initiate:2 psi_adept:2 shield_trooper:2 bulwark_mech:2 heavy_trooper:2 recon_officer:2 void_shards:2 supply_drop:2 railgun:2 star_cruiser:1 marine:2') },
    story: 'A moon locked in ice. The Cryomancers here freeze anything that moves.',
    tips: ['<b>Cryo</b>: a frozen character can\'t attack on its next turn. Frozen units still block as Guardians.', 'Cryo Nova freezes your whole board. Don\'t rely on one big swing turn.'],
    grant: { cryo_sentry: 2, frost_lance: 2, cryo_nova: 1 } },

  { id: '5-3', sector: 4, name: 'The Archive', teaches: ['scan'],
    enemy: { name: 'Archivist Prime', hp: 32, ai: 2, power: 'mind_spike', deck: dk('mind_seer:3 probe_unit:3 foresight:2 telepath:2 psi_adept:2 void_initiate:2 void_oracle:1 frost_lance:2 void_shards:2 cryo_sentry:2 phase_stalker:2 heavy_trooper:2 mind_blast:1 psionic_storm:1 supply_drop:2') },
    story: 'An archive of every psionic secret. Its keepers pull the perfect answer out of thin air.',
    tips: ['<b>Scan</b>: pick one of three cards to add to your hand. Choose for the situation in front of you.', 'Telepath copies a card from your hand. Your own tricks can be used against you.'],
    grant: { mind_seer: 2, probe_unit: 2, foresight: 1, telepath: 1 } },

  { id: '5-4', sector: 4, name: 'Minefield', teaches: ['trap'],
    enemy: { name: 'Snare Mistress Ilu', hp: 32, ai: 2, power: 'mind_spike', startTraps: ['sniper_mine'], deck: dk('grav_snare:2 sniper_mine:2 kinetic_barrier:2 mirror_field:1 psionic_null:1 psi_adept:2 cryo_sentry:2 phase_stalker:2 mind_seer:2 void_initiate:2 frost_lance:2 void_shards:2 heavy_trooper:2 bulwark_mech:2 psionic_storm:1 patrol_frigate:2 recon_officer:1') },
    story: 'The approach to Nyra\'s sanctum is sown with hidden psionic traps.',
    tips: ['<b>Traps</b> are armed face-down (shown by the enemy portrait) and fire on <i>your</i> turn when their condition is met.', 'Bait traps with cheap units and cheap spells before playing your best card. She already has one armed.'],
    grant: { grav_snare: 1, sniper_mine: 2, kinetic_barrier: 1, mirror_field: 1 } },

  { id: '5-5', sector: 4, name: 'Puppet Masters', teaches: ['control'],
    enemy: { name: 'The Twin Minds', hp: 32, ai: 2, power: 'mind_spike', deck: dk('dominate:2 telepath:2 phase_stalker:2 psionic_horror:2 void_oracle:2 psi_adept:2 cryo_sentry:2 frost_lance:2 void_shards:2 mind_seer:2 sniper_mine:1 grav_snare:1 psionic_null:1 bulwark_mech:2 heavy_trooper:2 star_cruiser:2 mind_blast:1') },
    story: 'Two psionics who share one mind, and want yours as well.',
    tips: ['<b>Mind Control</b> effects steal your units. Your biggest unit is your biggest liability against Dominate.', 'Stolen units can\'t attack the turn they\'re taken.'],
    grant: { phase_stalker: 2, psionic_horror: 1, dominate: 1 } },

  { id: '5-E', sector: 4, name: 'The Null Choir', elite: true, after: '5-4',
    enemy: { name: 'The Null Choir', hp: 28, ai: 3, power: 'mind_spike', passives: ['void_resonance'], startTraps: ['psionic_null'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 void_shards:3 frost_lance:3 mind_blast:1 psionic_storm:1 cryo_nova:1 grav_snare:1 mirror_field:1 sniper_mine:1 glacial_titan:1 bulwark_mech:2 telepath:2 mind_seer:2 recon_officer:1 marine:2') },
    story: 'Psionics who gave their voices to the Choir. Now they sing its spells.',
    tips: ['Their spells and Mind Spike deal +1 damage, and they start with a Trap armed that cancels your first spell.'] },

  { id: '5-6', sector: 4, name: 'Nyra, Void Hierarch', boss: true, bossCard: 'nyra',
    enemy: { name: 'Nyra, Void Hierarch', hp: 32, ai: 3, power: 'mind_spike', passives: ['void_resonance'], startTraps: ['psionic_null'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 glacial_titan:1 phase_stalker:2 telepath:1 cryo_sentry:2 frost_lance:2 void_shards:2 mind_blast:1 dominate:1 grav_snare:1 mirror_field:1 sniper_mine:1 kinetic_barrier:1 cryo_nova:1 mind_seer:2 star_cruiser:1 marine:2 shield_trooper:1') },
    story: 'Nyra floats at the heart of a psionic storm. "I opened the door because I heard it singing, Commander. It sings of an ending. Do you not want to rest?"',
    victory: 'Nyra falls, and the door she held open begins to close. Through the gap you see the galactic core, and the shape of the Choir. It has noticed you. The Meridian sets course for the Singularity.',
    tips: ['Nyra starts with Psionic Null armed: your first spell will be cancelled. Lead with a cheap one.', 'Her spells deal +1 damage. Kill her Amplify units on sight.'],
    unlockPowers: ['datamine'] },

  // ===================================================================== SECTOR 6
  { id: '6-1', sector: 5, name: 'Vex Reborn',
    enemy: { name: 'Vex Reborn', hp: 34, ai: 2, power: 'broadside_power', passives: ['boarding_party'], deck: dk('boarding_crew:3 interceptor:2 hover_tank:2 plunderer:2 shadow_corsair:2 ghost_operative:2 det_bot:2 scrap_golem:2 shipbreaker:1 plasma_cutlass:2 rail_rifle:1 cluster_cannon:1 quartermaster:2 broadside:2 shakedown:2 kill_order:2') },
    story: 'At the edge of the core, a familiar ship drifts toward you, rebuilt in black glass. "The Choir gave me a second chance, Commander. It will give you one too."',
    tips: ['The Choir\'s champions are stronger copies of bosses you have beaten. Their units have +1 Health.', 'Full Broadside pings all your units for 1 every turn. 1-Health units won\'t last.'] },

  { id: '6-2', sector: 5, name: 'Ixis Ascendant',
    enemy: { name: 'Ixis Ascendant', hp: 34, ai: 2, power: 'spawn_brood', passives: ['singularity'], deck: dk('broodmother:2 hive_mind:2 hive_reaper:2 lamprey:2 devourer_worm:2 frenzied_ripper:2 venom_stinger:2 acid_spitter:2 spore_carrier:2 larva:2 acid_rain:2 hive_surge:2 infest:2 life_drain:2 spawn_surge:2') },
    story: 'The Queen returns, wreathed in void-light. Her new brood does not die quietly.',
    tips: ['Area damage and Guardians are critical here. The board fills up fast.'] },

  { id: '6-3', sector: 5, name: 'Calculus Omega',
    enemy: { name: 'Calculus Omega', hp: 32, ai: 2, power: 'reconfigure', passives: ['adaptive_armor'], deck: dk('aegis_sentinel:2 war_walker:2 storm_titan:2 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 reactor_core:1 overclocked_mech:2 disruptor:2 chain_lightning:2 lightning_arc:2 deflector_grid:1 emp_blast:1 fortify:1 calculus:1 kill_order:2') },
    story: '"Recalculating." The machine mind has rebuilt itself around the Choir\'s song.',
    tips: ['Armor stacks every turn. You need a fast, aggressive plan or overwhelming late-game power.'] },

  { id: '6-4', sector: 5, name: 'Nyra Unbound',
    enemy: { name: 'Nyra Unbound', hp: 30, ai: 2, power: 'mind_spike', passives: ['singularity'], startTraps: ['psionic_null', 'sniper_mine'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 glacial_titan:1 phase_stalker:2 telepath:2 frost_lance:2 void_shards:2 mind_blast:1 psionic_storm:1 grav_snare:1 mirror_field:1 kinetic_barrier:1 cryo_nova:1 mind_seer:2 nyra:1 star_cruiser:1 marine:2 heavy_trooper:1') },
    story: 'Nyra no longer speaks. The Choir speaks through her.',
    tips: ['Two Traps armed at the start. Bait them before committing your key cards.'] },

  { id: '6-E', sector: 5, name: 'Echo of HALCYON', elite: true, after: '6-2',
    enemy: { name: 'HALCYON (Corrupted)', hp: 30, ai: 3, power: 'void_lash', passives: ['thick_hull'], deck: dk('okonkwo:1 fleet_captain:2 breach_commando:2 dreadnought:1 star_cruiser:2 hover_tank:2 interceptor:2 rifle_squad:2 sapper:2 heavy_trooper:2 bulwark_mech:2 railgun:2 kill_order:2 orbital_strike:1 supply_drop:2 flak_barrage:2 field_repair:1') },
    story: 'A familiar voice crackles over the comm. "Cadet. I found the singing. I am so sorry." HALCYON, or what the Choir left of it, runs one last simulation.',
    tips: ['Its units have +1 Attack and it starts with 8 Armor. It plays the Academy\'s best cards.'] },

  { id: '6-5', sector: 5, name: 'The Choir', boss: true, final: true,
    enemy: { name: 'Herald of the Choir', hp: 18, ai: 3, power: 'corrupt', passives: ['choir_song'], phases: ['choir2', 'choir3'], deck: dk('null_horror:2 herald_of_end:1 entropy_wave:1 unmaking:1 choir_echo:3 void_wisp:3 shadow_corsair:0 ion_lancer:0 psionic_horror:1 storm_titan:0 patrol_frigate:2 hive_reaper:1 shadow_corsair:2 frost_lance:2 void_shards:2 mind_blast:1 marine:2 heavy_trooper:2 interceptor:2 ion_lancer:2') },
    story: 'At the heart of the galaxy, the Choir takes shape: a Herald of light and teeth, singing with every voice it has stolen. Three times it will rise. Three times you must cut it down.',
    victory: 'The last note dies. The Singularity collapses into a quiet star. Across the galaxy, machines answer their owners again, the Swarm sleeps, and HALCYON\'s last log entry reads: "Evaluation complete. Commander, you pass."',
    tips: ['The Choir has <b>three phases</b>. Each time its Health hits 0, it returns stronger. Don\'t spend everything on phase one.', 'Phase two damages all your units every turn. Phase three sacrifices its own units, scorches yours, and hits much harder.'] },
];

const ENC = {}; ENCOUNTERS.forEach(e => ENC[e.id] = e);

// Portrait subjects for every enemy commander (see illustrations.js for kinds).
const ENEMY_ART = {
  'Sim Drone Pilot': ['drone', { plan: 'gunship', gun: 1 }], 'Sim Gunnery Officer': ['bust', { helm: 1 }], 'Sim Fortress': ['structure', { type: 'wall' }], 'Sim Commander Vale': ['bust', { cap: 1, boards: 1, skin: 2, hair: 'short' }],
  'Sim Bastion': ['mech', { heavy: 1 }], 'Sim Strike Wing': ['fighter', {}], 'HALCYON': ['structure', { type: 'core' }],
  'Belt Tollmaster': ['bust', { beard: 1, straps: 1, hair: 'none', skin: 1 }], 'Gunsmith Rourke': ['bust', { goggles: 1, gogglesUp: 1, cyber: 1, straps: 1, skin: 0 }], 'Scrapper King Ott': ['bust', { hat: 1, beard: 1, straps: 1, skin: 2 }], 'Sable, Smuggler Queen': ['bust', { hood: 1, bandana: 1, hair: 'none', skin: 1 }],
  'Kade the Bounty Hunter': ['bust', { hat: 1, scar: 1, coat: 1, skin: 3 }], 'Raider Wing Leader': ['fighter', { raider: 1 }], 'Captain Vex': ['bust', { hat: 1, patch: 1, hair: 'long', coat: 1, skin: 0 }],
  'Hive Overseer': ['bug', { plan: 'beetle' }], 'Leech Matron': ['worm', {}], 'Brood Tender': ['pod', { big: 1 }], 'Ripper Alpha': ['bug', { plan: 'raptor' }],
  'The Hivewarden': ['bug', { plan: 'beetle', big: 1 }], 'Royal Guard Thorax': ['bug', { plan: 'mantis' }], 'Ixis, Brood Queen': ['bug', { plan: 'queen' }],
  'Gate Warden Unit': ['mech', { wall: 1 }], 'Jammer Array': ['structure', { type: 'coil' }], 'Line Supervisor': ['structure', { type: 'factory' }], 'Reactor Overseer': ['structure', { type: 'reactor' }],
  'Defense Matrix': ['structure', { type: 'core' }], 'Siege Engine Mk IX': ['mech', { plan: 'walker', heavy: 1 }], 'Calculus Prime': ['structure', { type: 'core' }],
  'Void Acolyte Choir': ['psion', { pose: 'meditate', halo: 1 }], 'Cryomancer Vel': ['psion', { pose: 'raise', halo: 1 }], 'Archivist Prime': ['psion', { book: 1, reveal: 1 }], 'Snare Mistress Ilu': ['psion', { mask: 1, tendrils: 1 }],
  'The Twin Minds': ['psion', { mask: 1, halo: 1, runes: 1 }], 'The Null Choir': ['psion', { herald: 1, pose: 'raise' }], 'Nyra, Void Hierarch': ['psion', { pose: 'spread', crown: 1, halo: 1 }],
  'Vex Reborn': ['bust', { hat: 1, patch: 1, cyber: 1, hair: 'long', coat: 1, skin: 0 }], 'Ixis Ascendant': ['bug', { plan: 'queen' }], 'Calculus Omega': ['structure', { type: 'core', red: 1 }], 'Nyra Unbound': ['psion', { pose: 'spread', crown: 1, halo: 2, runes: 1 }],
  'HALCYON (Corrupted)': ['structure', { type: 'core', red: 1 }], 'Herald of the Choir': ['psion', { herald: 1, pose: 'spread' }], 'The Choir Awakened': ['horror', {}], 'The Devourer Eternal': ['horror', { maw: 1, giant: 1 }],
};


// ---------------------------------------------------------------- difficulty
const DIFFICULTY = {
  cadet:   { name: 'Cadet', hp: 0.75, ai: -1, text: 'Weaker enemies. For learning the game.' },
  officer: { name: 'Officer', hp: 1.0, ai: 0, text: 'The intended challenge.' },
  admiral: { name: 'Admiral', hp: 1.2, ai: 1, text: 'Tougher, smarter enemies.' },
};

// ---------------------------------------------------------------- progression
function encUnlocked(save, e) {
  if (save.cleared[e.id]) return true;
  if (e.elite) return !!save.cleared[e.after];
  const main = ENCOUNTERS.filter(x => !x.elite);
  const i = main.indexOf(e);
  return i === 0 || !!save.cleared[main[i - 1].id];
}
function sectorUnlocked(save, si) { return si === 0 || !!save.cleared[ENCOUNTERS.find(e => e.sector === si - 1 && e.boss).id]; }
function highestSector(save) { let h = 0; for (let i = 0; i < SECTORS.length; i++) if (sectorUnlocked(save, i)) h = i; return h; }
function deckSizeFor(save) { return DECK_SIZES[highestSector(save)]; }
function nextEncounter(save) { return ENCOUNTERS.find(e => !e.elite && !save.cleared[e.id]) || null; }

function maxCopies(d) { return d.rarity === 'legendary' ? 1 : 2; }

function grantCard(save, id, n) { let scrap = 0; for (let k = 0; k < (n || 1); k++) scrap += gainCard(save, id); return scrap; }

function collectionCount(save) { return Object.values(save.coll).reduce((a, b) => a + b, 0); }

// Rough card quality, used by auto-fill and when slotting in new cards.
const SITUATIONAL = new Set(['infest', 'mirror_field', 'emp_blast', 'dominate', 'devourer_worm', 'echo_protocol', 'shakedown', 'black_market', 'telepath', 'cluster_cannon', 'overdrive', 'vent_heat', 'disruptor', 'psionic_null', 'grav_snare', 'combat_stims', 'smoke_screen', 'gunrunner', 'field_repair', 'barricade', 'larva']);
const REMOVAL = new Set(['kill_order', 'railgun', 'plasma_bolt', 'frost_lance', 'flak_barrage', 'broadside', 'psionic_storm', 'life_drain', 'sapper', 'lightning_arc', 'chain_lightning', 'acid_rain', 'void_shards', 'orbital_strike', 'rifle_squad', 'ghost_operative', 'fleet_captain', 'okonkwo', 'supply_drop', 'recon_officer', 'fortify']);
function cardRating(id) {
  const d = D(id); const r = { common: 0, rare: 1, epic: 2, legendary: 3 }[d.rarity];
  const body = d.type === 'unit' ? (d.atk + d.hp - (2 * d.cost + 1)) * 0.35 : 0.6;
  let v = r * 0.6 + body + (d.text ? 0.5 : 0) + (d.kw.length + d.tags.length) * 0.35;
  if (SITUATIONAL.has(id)) v -= 2;
  if (REMOVAL.has(id)) v += 0.8;
  if (d.cost >= 8) v -= 0.8;
  if (d.overheat) v -= d.overheat * 0.3;
  return v;
}

// Share of the deck wanted at each cost (0-1, 2, 3, 4, 5, 6, 7+).
const CURVE = [0.14, 0.2, 0.2, 0.16, 0.12, 0.09, 0.09];
const bucketOf = id => { const c = D(id).cost; return c <= 1 ? 0 : Math.min(6, c - 1); };

// Fill the deck up to `size` with strong owned cards along a sensible curve (or trim it).
function autoFillDeck(save, size) {
  const have = {}; const deck = [];
  save.deck.forEach(id => { if ((have[id] || 0) < Math.min(save.coll[id] || 0, maxCopies(D(id)))) { deck.push(id); have[id] = (have[id] || 0) + 1; } });
  const avail = [];
  Object.entries(save.coll).forEach(([id, n]) => { for (let k = have[id] || 0; k < Math.min(n, maxCopies(D(id))); k++) avail.push(id); });
  const jitter = {}; avail.forEach(id => { if (jitter[id] == null) jitter[id] = Math.random() * 0.4; });
  avail.sort((a, b) => (cardRating(b) + jitter[b]) - (cardRating(a) + jitter[a]));
  const inBucket = b => deck.filter(id => bucketOf(id) === b).length;
  const spells = () => deck.filter(id => D(id).type !== 'unit').length;
  // pass 1: respect the curve and keep at least ~60% units
  for (let i = 0; i < avail.length && deck.length < size; i++) {
    const id = avail[i], b = bucketOf(id);
    if (inBucket(b) >= Math.ceil(CURVE[b] * size)) continue;
    if (D(id).type !== 'unit' && spells() >= Math.ceil(size * 0.35)) continue;
    if (D(id).type === 'trap' && deck.filter(x => D(x).type === 'trap').length >= 2) continue;
    deck.push(id); avail.splice(i, 1); i--;
  }
  // pass 2: whatever is best
  while (deck.length < size && avail.length) deck.push(avail.shift());
  while (deck.length > size) {
    let worst = 0, ws = 1e9;
    deck.forEach((id, i) => { const b = bucketOf(id); const over = inBucket(b) > Math.ceil(CURVE[b] * size) ? -1.5 : 0; const r = cardRating(id) + over; if (r < ws) { ws = r; worst = i; } });
    deck.splice(worst, 1);
  }
  save.deck = deck;
}

function newSave(name, diff) {
  const save = { v: 1, name: name || 'Commander', diff: diff || 'officer', cleared: {}, coll: {}, deck: [], power: null, powers: [],
    codex: [], stats: { wins: 0, losses: 0, started: Date.now(), playMs: 0 }, seenSector: {}, updated: Date.now(),
    credits: 0, scrap: 0, packs: {}, pity: {}, contracts: [], station: { alloy: 0, mods: { command: 1 }, seen: false } };
  dk('cadet:2 scout_drone:2 marine:2 ion_lancer:2 heavy_trooper:2 patrol_frigate:2 star_cruiser:1').forEach(id => grantCard(save, id));
  autoFillDeck(save, DECK_SIZES[0]);
  refillContracts(save);
  return save;
}

function buildBattle(save, enc) {
  const diff = DIFFICULTY[save.diff] || DIFFICULTY.officer;
  const e = enc.enemy;
  const ai = Math.max(0, Math.min(3, e.ai + diff.ai));
  const deck = enc.fixedDeck ? enc.fixedDeck.slice() : save.deck.slice();
  return {
    player: { name: save.name, hp: enc.sector === 0 ? PLAYER_HP : playerMaxHp(save), deck, power: enc.noPower ? null : save.power,
      // Armory: a signature card starts in the opening hand (Mk II), 1 cheaper (Mk III)
      signature: !enc.fixedDeck && save.signature && deck.includes(save.signature) && typeof stationLv === 'function' && stationLv(save, 'armory') >= 2 ? save.signature : null,
      sigDiscount: typeof stationLv === 'function' && stationLv(save, 'armory') >= 3 ? 1 : 0 },
    enemy: { name: e.name, hp: Math.round(e.hp * diff.hp), deck: e.deck.slice(), power: e.power, passives: e.passives, phases: e.phases,
      startTraps: e.startTraps, startBoard: e.startBoard, isAI: true, ai },
    first: enc.first != null ? enc.first : null,
    coin: enc.first == null,
  };
}
