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
    intro: 'Welcome to the Fleet Academy, Cadet. The Proving Grounds are a simulator deck run by HALCYON, the Academy\'s training intelligence, and each battle here teaches you one part of command. Pass HALCYON\'s final exam and Admiral Okonkwo will give you a ship. The Fleet is short of officers, so she means it.' },
  { id: 's2', name: 'The Scrap Belt', sub: 'Raider territory', hue: 22,
    intro: 'You now command the frigate Meridian, and your first orders take you to the Scrap Belt: a ring of Starfall wreckage around Lamp 9, run by raiders and salvagers. The Fleet shut Lamp 9 down seventy years ago, and now it is humming again. A distress call from the Belt says machines out there have stopped obeying their owners. The Belt\'s strongest raider, Captain Vex, has been working around the Lamp for a year. Find out what is making it hum.' },
  { id: 's3', name: 'Hive Nebula', sub: 'Swarm breeding grounds', hue: 105,
    intro: 'The Swarm is a species of living weapons, and the Fleet has kept it inside the Hive Nebula under quarantine since the Swarm Wars. Vex\'s logs say the Choir is now singing to the Swarm, and its queen, Ixis, is listening. The brood has tripled in a year. Admiral Okonkwo spent nine years guarding this quarantine line, and she has cleared you to cross it. Find Ixis and stop her before the Swarm breaks out.' },
  { id: 's4', name: 'Forge Worlds', sub: 'Synthetic foundries', hue: 185,
    intro: 'The Forge is three foundry worlds run by machine minds. They built most of the Fleet\'s ships, including the Meridian. In February the Forge stopped answering, and now the Choir\'s signal is coming out of it on a machine control band. Its governor, Calculus Prime, has listened to the Choir and decided that people are the error in an otherwise perfect system. Get to Calculus Prime and shut it down.' },
  { id: 's5', name: 'Void Expanse', sub: 'Psionic dominion', hue: 275,
    intro: 'Beyond the Forge lies the Void Expanse, home of the Psionic Orders: humans who can sense the warp lanes with their minds. After the Starfall, the Fleet shut down every Lamp leading toward the galactic core to keep the Choir out. For the past year, the Orders\' leader, Hierarch Nyra, has been switching those Lamps back on, opening a road for the Choir. Reach her sanctum and stop her before the road is finished.' },
  { id: 's6', name: 'The Singularity', sub: 'Galactic core', hue: 320,
    intro: 'The Choir lives at the Singularity, an object at the centre of the galaxy. It is the Lamplighters, merged into one mind, and it absorbs every mind it can reach. The people it takes come back as echoes: copies in black glass that fight for it. Every commander you have defeated is waiting at the core as an echo. Fight through them, then destroy the Choir before it can try another Starfall.' },
];

// tips: shown in the Tactical Advisor panel on the player's Nth turn (last one repeats).
const ENCOUNTERS = [
  // ===================================================================== SECTOR 1
  { id: '1-1', sector: 0, name: 'First Contact', teaches: ['basics', 'energy'],
    enemy: { name: 'Sim Drone Pilot', hp: 12, ai: 0, deck: dk('scout_drone:4 cadet:4 marine:3 ion_lancer:2 heavy_trooper:2') },
    fixedDeck: dk('cadet:3 scout_drone:3 marine:3 ion_lancer:2 heavy_trooper:2 patrol_frigate:1 star_cruiser:1'), noPower: true, first: 0, noMulligan: true,
    story: 'Your first simulated battle, against a training drone pilot. HALCYON: "Simulation online. Your opponent is a drone pilot of limited competence. So, for now, are you. Deploy units, attack, and bring the enemy commander to zero Health. Try not to embarrass the Academy."',
    tips: [
      'You have <b>1 Energy</b> (the crystals on the right). Click a card in your hand that costs 1 to deploy it, then press <b>End Turn</b>.',
      'Units can attack the turn <i>after</i> they arrive. Click your glowing unit, then click a target. Click the enemy commander\'s portrait to hit them directly.',
      'When units fight, each deals its Attack (yellow) to the other\'s Health (red). Destroying enemy units keeps your commander safe.',
      'You gain 1 more Energy each turn, up to 10, so bigger cards become playable later. Try to spend it all every turn.',
      'Bring the enemy commander to 0 Health to win. Hover over any card to read it.',
    ],
    grant: { plasma_bolt: 2, rifle_squad: 2, recon_officer: 2, medic_bot: 2 } },

  { id: '1-2', sector: 0, name: 'Fire Protocols', teaches: ['spells', 'deploy'],
    enemy: { name: 'Sim Gunnery Officer', hp: 16, ai: 0, deck: dk('scout_drone:2 cadet:2 marine:3 ion_lancer:2 rifle_squad:2 plasma_bolt:2 heavy_trooper:2') },
    first: 0, noMulligan: true,
    story: 'A gunnery drill against a simulated Fleet gunnery officer. HALCYON: "I have added Protocols to your deck: one-shot spells. Some units also have Deploy effects, which fire the moment they arrive. Before each battle you can edit your deck in the Hangar. Most cadets forget that. I have a list of which ones."',
    tips: [
      'Protocols (spells) have no Attack or Health. Click <b>Plasma Bolt</b>, then click an enemy to deal 2 damage.',
      '<b>Deploy:</b> effects trigger when you play the card. Rifle Squad asks for a target as it lands.',
      'Use spells on enemy units that your own units can\'t beat in a fair fight.',
      'Recon Officer draws a card. An empty hand means no options.',
    ],
    grant: { shield_trooper: 2, barricade: 2 } },

  { id: '1-3', sector: 0, name: 'Hold the Line', teaches: ['guardian'],
    enemy: { name: 'Sim Fortress', hp: 18, ai: 1, deck: dk('barricade:2 shield_trooper:3 marine:2 cadet:3 scout_drone:1 bulwark_mech:1 heavy_trooper:2 field_engineer:1') },
    first: 0, noMulligan: true,
    story: 'A fortification drill against a simulated defensive line. HALCYON: "The enemy will deploy Guardian units. You must destroy them before you can attack anything behind them, including the commander. Think of a Guardian as a locked door. Then think of something heavy."',
    tips: [
      'Units with <b>Guardian</b> (shown with a shielded frame) must be attacked first. You can\'t hit the commander or other units until they fall.',
      'Spells ignore Guardian. A Plasma Bolt can still hit the commander directly.',
      'Your own Guardians protect you the same way. Use them to shield your fragile units.',
    ],
    grant: { field_engineer: 2, sapper: 1, dig_in: 1 }, unlockPowers: ['repair', 'pulse'] },

  { id: '1-4', sector: 0, name: 'Command Authority', teaches: ['power'],
    enemy: { name: 'Sim Commander Vale', hp: 20, ai: 1, power: 'pulse', deck: dk('cadet:2 marine:2 shield_trooper:2 rifle_squad:2 recon_officer:1 ion_lancer:2 heavy_trooper:2 plasma_bolt:1 patrol_frigate:1') },
    first: 0,
    story: 'A command exercise against Commander Vale, a simulated officer built from real Fleet service records. HALCYON: "Every commander has a personal power they can use once per turn. You now have two to choose from in the Hangar. Vale has one as well. Vale is based on several of your instructors. I will not say which. They know."',
    tips: [
      'Your <b>Commander Power</b> sits beside your portrait. It costs 2 Energy and can be used once each turn.',
      'Pulse Laser finishes off damaged units. Nanite Repair keeps your units and commander alive.',
      'At the start of a battle you can swap cards out of your opening hand. Send back expensive cards to find early plays.',
    ],
    grant: { interceptor: 2, hover_tank: 2, strike_fighter: 1 }, teachesAlso: ['mulligan'] },

  { id: '1-E', sector: 0, name: 'Sim: Iron Wall', elite: true, after: '1-4',
    enemy: { name: 'Sim Bastion', hp: 24, ai: 1, passives: ['thick_hull'], power: 'repair', deck: dk('barricade:2 shield_trooper:2 bulwark_mech:2 heavy_trooper:2 medic_bot:2 marine:2 dreadnought:1 field_repair:1 dig_in:1') },
    story: 'An optional stress test against the Bastion, a heavily armoured simulated fortress. HALCYON: "Most cadets do not get through this one. I tell them so beforehand, as motivation. It rarely helps. The reward is worth the bruises."',
    tips: ['This opponent starts with 8 Armor, which absorbs damage before its Health.', 'Its Guardians are tough. Use spells and Deploy damage to pick off whatever blocks you.'],
    grant: { dreadnought: 1, bulwark_mech: 1 } },

  { id: '1-5', sector: 0, name: 'Blitz Drill', teaches: ['warp', 'blitz'],
    enemy: { name: 'Sim Strike Wing', hp: 22, ai: 1, power: 'pulse', deck: dk('strike_fighter:3 interceptor:2 hover_tank:2 scout_drone:2 ion_lancer:2 marine:2 railgun:1 recon_officer:1') },
    story: 'A speed drill against a simulated wing of fast attack craft. HALCYON: "Some units can attack the moment they arrive. Today you learn to use them and to fear them. I recommend doing both, in that order."',
    tips: [
      '<b>Warp</b> units can attack the turn they arrive, even the enemy commander. Great for finishing a fight.',
      '<b>Blitz</b> units can attack enemy <i>units</i> the turn they arrive, but not the commander.',
      'Fast enemies punish an open board. Keep a Guardian out when your Health is low.',
    ],
    grant: { railgun: 1, supply_drop: 1, combat_stims: 1 } },

  { id: '1-6', sector: 0, name: 'HALCYON', boss: true, bossCard: 'okonkwo', graduation: true,
    enemy: { name: 'HALCYON', hp: 30, ai: 1, power: 'target_practice', deck: dk('cadet:1 marine:2 shield_trooper:2 rifle_squad:2 interceptor:2 hover_tank:1 heavy_trooper:2 sapper:1 plasma_bolt:2') },
    first: 0, noMulligan: true,
    story: 'Your final exam, against HALCYON itself. HALCYON: "Final evaluation. I will be your opponent, and I will use everything I have taught you. Admiral Okonkwo is watching from the gallery. She asked me to go easy on you. I declined, because the enemy will not. Proceed, Cadet."',
    victory: 'HALCYON: "Evaluation complete. You pass. I am told this is where I say congratulations. Congratulations." Admiral Okonkwo signs your commission on the spot and gives you command of the frigate Meridian. Your first orders: go to the Scrap Belt and find out why Lamp 9, shut down by the Fleet seventy years ago, has started humming.',
    tips: ['HALCYON\'s Target Practice deals 1 damage to your commander every turn. Win quickly, before it adds up.', 'This is the full exam: Guardians, Warp, Blitz and spells. Use everything you have learned.'],
    unlockPowers: ['drone'] },

  // ===================================================================== SECTOR 2
  { id: '2-1', sector: 1, name: 'Toll Gate', teaches: ['mulligan'],
    enemy: { name: 'Belt Tollmaster', hp: 25, ai: 1, power: 'pulse', deck: dk('scout_drone:2 cadet:2 boarding_crew:3 marine:2 ion_lancer:2 rifle_squad:2 hover_tank:2 heavy_trooper:2 plasma_bolt:1 patrol_frigate:2') },
    story: 'A raider tollmaster is blocking the only charted safe lane into the Belt. Tollmaster: "Pay the toll, Fleet, or we take it out of your hull. Captain Vex gets her cut either way, so don\'t take it personal." Okonkwo: "The Fleet does not pay tolls to raiders, Commander. Go through him." Your deck now holds 20 cards.',
    tips: [
      'A coin flip decides who goes first. Going second gives you an extra card and an <b>Energy Cell</b>, worth 1 extra Energy once.',
      'Use the Energy Cell to play a 2-cost card on turn 1, or to reach a key card a turn early.',
      'Boarding Crew has Blitz. Expect early trades.',
    ],
    grant: { shock_baton: 2, plasma_cutlass: 1, harpoon_gun: 1 } },

  { id: '2-E2', sector: 1, name: 'Salvage Rights', elite: true, after: '2-1',
    enemy: { name: 'Breaker Jun', hp: 28, ai: 2, power: 'drone', passives: ['rapid_deploy'], deck: dk('scrap_rat:2 boarding_crew:2 det_bot:2 mine_layer:2 salvage_crew:2 cargo_hauler:2 scrap_golem:2 shipbreaker:1 harpoon_gun:2 shock_baton:1 echo_protocol:2 black_market:1') },
    story: 'Breaker Jun runs the biggest salvage crew in the Belt, and Jun\'s people are the ones who pulled the reactor injectors out of Anchorage. Now they want the rest of the station. Jun: "Nobody\'s lived on that wreck in seventy years, Fleet. Salvage law says it\'s ours." Mox: "Salvage law says whoever\'s still standing. Jun starts every fight with extra power and a lot of junk. Clear the junk first."',
    victory: 'Jun\'s crew pulls back to their cutters and leaves the stolen parts behind, including two reactor injectors with Anchorage\'s serial numbers. Mox: "Keep the shipbreaker too. Call it back rent."',
    tips: ['Jun starts with an extra Energy crystal, so expect bigger plays a turn early.', 'Salvage units do something when they die. Sometimes it is better to leave a weak one alive than to trigger it.'],
    grant: { shipbreaker: 1, cluster_cannon: 1 } },

  { id: '2-2', sector: 1, name: 'Armed and Dangerous', teaches: ['gear'],
    enemy: { name: 'Gunsmith Rourke', hp: 28, ai: 1, power: 'blade', deck: dk('shock_baton:2 plasma_cutlass:1 harpoon_gun:2 gunrunner:2 quartermaster:2 boarding_crew:2 marine:2 cadet:2 rifle_squad:2 heavy_trooper:2 sapper:1') },
    story: 'Gunsmith Rourke sells weapons to every raider crew in the Belt, and he wants the Meridian for parts. Rourke: "Lovely little frigate, Commander. I\'ll give you a fair price for her. Well. I\'ll give you a price." Okonkwo: "Rourke arms half of Vex\'s crews. Put him out of business and the rest get harder to supply."',
    tips: [
      '<b>Gear</b> arms your commander. Click your portrait, then a target, to attack with it.',
      'Your commander takes damage when attacking a unit, just like a unit would. Use Gear on small units or on the enemy commander.',
      'Each attack uses 1 Durability. Equipping new Gear replaces the old one.',
    ],
    grant: { scrap_rat: 2, det_bot: 2, cargo_hauler: 1 } },

  { id: '2-3', sector: 1, name: 'Junkyard Wars', teaches: ['salvage'],
    enemy: { name: 'Scrapper King Ott', hp: 28, ai: 1, power: 'drone', deck: dk('scrap_rat:3 det_bot:2 cargo_hauler:2 scrap_golem:2 mine_layer:2 marine:2 shield_trooper:2 rifle_squad:2 heavy_trooper:2 echo_protocol:1') },
    story: 'Mox, Vex\'s salvage boss, has offered to help you find Vex, but first you have to get through Scrapper King Ott\'s yard. Mox: "Meridian, this is Mox. I strip wrecks for Vex. Or I did, until she started talking to that Lamp and wiring its hum into every ship she owns. I want her stopped before she gets us all killed. Sable knows where Vex parks her flagship. Ott sits between you and Sable, and everything in Ott\'s yard either explodes or gets back up."',
    tips: [
      '<b>Salvage:</b> effects trigger when the unit is destroyed. Killing it is still worth it, but plan for what comes next.',
      'When Mine Layer dies, it deals 1 damage to <i>everything</i> on your side. Don\'t rely on lots of 1-Health units.',
      'Det-Bot deals 2 damage to a random target when it dies. Kill it while your fragile units are off the board if you can.',
    ],
    grant: { smuggler: 2, shadow_corsair: 1, smoke_screen: 1 } },

  { id: '2-4', sector: 1, name: 'Ghost Signal', teaches: ['cloak'],
    enemy: { name: 'Sable, Smuggler Queen', hp: 28, ai: 2, power: 'pulse', deck: dk('smuggler:3 shadow_corsair:2 ghost_operative:1 smoke_screen:2 boarding_crew:2 scrap_rat:2 marine:2 rifle_squad:2 hover_tank:2 plasma_bolt:2') },
    story: 'Sable, a smuggler who trades in secrets, knows where Vex\'s flagship is, and she only sells to people who survive meeting her. Sable: "Vex\'s coordinates? Expensive. Not money, Commander. I want to see if you\'re worth betting on. My ships run dark, so you\'ll see them when they shoot you." Mox: "She means that. Shoot back fast."',
    tips: [
      '<b>Cloak</b> units can\'t be attacked or targeted until they attack. Area damage like Flak Barrage still hits them.',
      'Once a Cloaked unit attacks, it is revealed for good.',
    ],
    grant: { broadside: 1, quartermaster: 1, gunrunner: 1 } },

  { id: '2-E', sector: 1, name: 'Bounty: Kade', elite: true, after: '2-3',
    enemy: { name: 'Kade the Bounty Hunter', hp: 30, ai: 2, passives: ['veteran_crew'], power: 'blade', deck: dk('plasma_cutlass:2 rail_rifle:1 harpoon_gun:2 gunrunner:2 quartermaster:2 boarding_crew:2 ion_lancer:2 interceptor:2 hover_tank:2 ghost_operative:1 shakedown:2') },
    story: 'Someone has put a price on your head, and Kade, the best bounty hunter in the Belt, has taken the contract. Mox: "The bounty went out through Sable\'s network, paid with Vex\'s money. Kade has never missed a contract. You don\'t have to take this fight. But Kade will find you eventually, so you might as well pick the time."',
    tips: ['Kade\'s units all have +1 Attack. Trade carefully: they hit harder than their cards say.'] },

  { id: '2-5', sector: 1, name: 'Wreck Run',
    enemy: { name: 'Raider Wing Leader', hp: 30, ai: 2, power: 'blade', deck: dk('boarding_crew:2 scrap_rat:2 smuggler:2 det_bot:2 shadow_corsair:1 plunderer:2 mine_layer:1 scrap_golem:1 plasma_cutlass:1 shock_baton:1 broadside:1 hover_tank:2 interceptor:2') },
    story: 'Sable\'s coordinates put Vex\'s flagship, the Bad Debt, in the debris field beside Lamp 9, and Vex\'s best pilots are waiting to stop you reaching it. Wing Leader: "Captain says nobody goes near the Lamp. Captain says it\'s hers. Turn around, Fleet." Mox: "They learned to fly in the junk out here. Don\'t follow them into it."',
    tips: ['A full raider deck: Gear, Salvage, Cloak and Blitz together. Check the board before every attack.'] },

  { id: '2-6', sector: 1, name: 'Captain Vex', boss: true, bossCard: 'vex',
    enemy: { name: 'Captain Vex', hp: 35, ai: 2, power: 'cannon_volley', passives: ['boarding_party'], deck: dk('boarding_crew:3 interceptor:2 hover_tank:2 plunderer:2 shadow_corsair:2 det_bot:2 scrap_golem:1 plasma_cutlass:2 rail_rifle:1 quartermaster:1 broadside:1 shakedown:1') },
    story: 'Captain Vex rules the Belt, and her flagship, the Bad Debt, sits beside Lamp 9 with its cables humming in time with the Lamp. Vex: "You hear it too, don\'t you? The Fleet left the Belt to rot before I was born. This voice promised me all of it, every hull and every crew. Nobody ever promised me anything before." Mox: "Vex, listen to yourself. Commander, she won\'t stop. Take her ship apart."',
    victory: 'The Bad Debt goes dark. Vex\'s logs explain the hum: it comes from a mind at the galactic core that calls itself the Choir. It offers people what they want most, and those who accept are slowly taken over. It promised Vex the Belt, and it took her. Her last entries say the Choir has started singing to the Swarm. Admiral Okonkwo is clearing you to enter the Hive Nebula.',
    tips: ['Vex\'s Warp and Blitz units get +1 Attack. Keep a Guardian ready and deal with Warp threats quickly.', 'Cannon Volley deals 2 damage to a random target each turn. Units with 2 Health or less are at risk.'],
    unlockPowers: ['blade'] },

  // ===================================================================== SECTOR 3
  { id: '3-1', sector: 2, name: 'Venom Fields', teaches: ['toxic'],
    enemy: { name: 'Hive Overseer', hp: 30, ai: 1, power: 'spawn_brood', deck: dk('venom_stinger:3 acid_spitter:2 larva:3 chitin_guard:2 spore_carrier:2 marine:2 cadet:2 rapid_mutation:2 heavy_trooper:2 hover_tank:2 spawn_surge:1 hive_reaper:1 scout_drone:1') },
    story: 'A small Swarm patrol guards the edge of the nebula, steered by a Hive Overseer. Okonkwo: "I spent nine years on this quarantine line, Commander. Rule one: their stingers are Toxic. They kill anything they scratch, however big it is. Rule two: see rule one." Your deck now holds 25 cards.',
    tips: [
      '<b>Toxic</b> units destroy any unit they damage, however big it is. Answer them with spells, cheap units or Barrier.',
      'Hive Larva turns into a 3/3 Brood Warrior at the start of its owner\'s turn. Kill larvae early.',
    ],
    grant: { venom_stinger: 2, acid_spitter: 1, larva: 2 } },

  { id: '3-E2', sector: 2, name: 'Spore Garden', elite: true, after: '3-1',
    enemy: { name: 'Spore Mother', hp: 30, ai: 2, power: 'mutagen', startBoard: ['spore_carrier', 'spore_carrier'], deck: dk('spore_carrier:2 venom_stinger:2 acid_spitter:2 toxic_spitter:2 blood_leech:2 larva:2 broodmother:1 lamprey:2 life_drain:2 rapid_mutation:2 acid_rain:1 hive_surge:1') },
    story: 'A Spore Mother is a Swarm creature the size of a frigate that seeds the nebula with spores. The spores grow into food for the brood, and this one has filled a whole asteroid field. Okonkwo: "Burn the garden and the brood goes hungry. It already has two spore carriers out when you arrive, and almost everything it grows is Toxic. Don\'t let your big units take hits from small ones."',
    victory: 'The garden burns, and the brood in this part of the nebula loses its food supply. Okonkwo\'s biologists want samples. You send them the acid rain glands, sealed in three layers of containment.',
    tips: ['The Spore Mother starts with two Spore Carriers on the board. Clear them early.', 'Toxic units destroy anything they damage. Trade them with cheap units, not your best ones.'],
    grant: { hive_reaper: 1, acid_rain: 1 } },

  { id: '3-2', sector: 2, name: 'Bloodline', teaches: ['siphon'],
    enemy: { name: 'Leech Matron', hp: 30, ai: 2, power: 'spawn_brood', deck: dk('blood_leech:3 lamprey:2 venom_stinger:2 larva:2 chitin_guard:2 spore_carrier:2 broodmother:2 rapid_mutation:2 life_drain:2 marine:2 heavy_trooper:2 hover_tank:2') },
    story: 'A Leech Matron nests here, breeding Swarm organisms whose bites heal their own side. Okonkwo: "Every bite they land patches them up. Don\'t leave anything half dead out there, Commander. Finish what you start, or they will."',
    tips: ['<b>Siphon</b>: damage this unit deals also heals its commander. Kill Siphon units before they attack.'],
    grant: { blood_leech: 2, spore_carrier: 2, life_drain: 1 } },

  { id: '3-3', sector: 2, name: 'The Brood',
    enemy: { name: 'Brood Tender', hp: 32, ai: 2, power: 'spawn_brood', deck: dk('broodmother:2 hive_mind:2 spore_carrier:3 larva:3 swarmling:0 spawn_surge:2 hive_surge:2 venom_stinger:2 chitin_guard:2 infest:1 frenzied_ripper:2 acid_spitter:2 blood_leech:2') },
    story: 'A Brood Tender, a walking breeding chamber, is turning out new Swarm faster than you can count them. Okonkwo: "This is how the brood tripled in a year. Every turn you give it, there will be more of them. So don\'t give it many turns."',
    tips: ['The Swarm wins by numbers. Area damage like Flak Barrage and Broadside is very strong here.', 'Hive Mind gives every unit summoned after it +1 Attack. Kill it first.'],
    grant: { hive_mind: 1, broodmother: 1, spawn_surge: 1, frenzied_ripper: 1 } },

  { id: '3-4', sector: 2, name: 'Apex Predator',
    enemy: { name: 'Ripper Alpha', hp: 32, ai: 2, power: 'mutagen', deck: dk('frenzied_ripper:3 hive_reaper:2 devourer_worm:2 acid_spitter:2 venom_stinger:2 rapid_mutation:2 toxic_spitter:2 blood_leech:2 chitin_guard:2 lamprey:2 hover_tank:2 heavy_trooper:2') },
    story: 'The biggest Swarm hunter the Fleet has ever recorded is picking off your scouts, and it gets more dangerous every time you wound it. Okonkwo: "The scouts call it the Alpha. Nobody who got close enough came back with a better name. Kill it in one blow, Commander. If you only hurt it, you just make it angry."',
    tips: ['Frenzied Ripper gains +2 Attack whenever it survives damage. Kill it in one hit or leave it alone.', 'Devourer Worm destroys a friendly unit and takes its Attack and Health. Keep removal ready.'] },

  { id: '3-E', sector: 2, name: 'The Hivewarden', elite: true, after: '3-3',
    enemy: { name: 'The Hivewarden', hp: 30, ai: 2, passives: ['brood_growth'], power: 'spawn_brood', deck: dk('broodmother:2 hive_mind:2 lamprey:2 hive_reaper:2 chitin_guard:2 spore_carrier:2 larva:2 venom_stinger:2 acid_rain:1 hive_surge:2 infest:2 rapid_mutation:2 frenzied_ripper:2') },
    story: 'The Hivewarden is an ancient guardian beast, older than the Swarm Wars, and its brood grows stronger every turn it lives. Okonkwo: "I saw it once from the bridge of my old ship, the Aurora. We had orders to leave it alone, and I was glad of them. You have no such orders. This fight is optional."',
    tips: ['Brood Growth gives a random enemy unit +1/+1 every turn. The longer the fight, the more it favours the Warden.'] },

  { id: '3-5', sector: 2, name: 'Queen\'s Guard',
    enemy: { name: 'Royal Guard Thorax', hp: 34, ai: 2, power: 'spawn_brood', deck: dk('chitin_guard:3 lamprey:2 hive_reaper:2 acid_spitter:2 venom_stinger:2 broodmother:2 hive_mind:1 hive_surge:2 life_drain:2 spore_carrier:2 larva:2 devourer_worm:1 rapid_mutation:2') },
    story: 'Royal Guard Thorax and its chamber guard stand between you and the Swarm\'s queen, Ixis. Okonkwo: "Thorax was bred for one job: nobody reaches the queen. It is very good at that job. Its wall is thick, some of it feeds on wounds, and the poisonous ones wait behind it. Spend spells here, not your best units."',
    tips: ['Lamprey Sentinels are Guardians with Siphon, and Toxic units wait behind the wall. Spells are the cheapest way through.'] },

  { id: '3-6', sector: 2, name: 'Ixis, Brood Queen', boss: true, bossCard: 'ixis',
    enemy: { name: 'Ixis, Brood Queen', hp: 40, ai: 2, power: 'spawn_brood', passives: ['brood_growth'], deck: dk('broodmother:2 hive_mind:2 hive_reaper:2 lamprey:2 devourer_worm:1 frenzied_ripper:2 venom_stinger:2 acid_spitter:2 spore_carrier:2 larva:2 spawn_surge:1 acid_rain:1 hive_surge:2 infest:1 life_drain:1') },
    story: 'Ixis, queen of the Swarm, waits in her chamber, and the whole nebula pulses in time with the Choir\'s song. Ixis: "For fifty years my children waited quietly behind your line. The Choir promised them room to grow, beyond your quarantine and your guns. Who are you to tell them to stop?" Okonkwo: "She kept the peace for fifty years, Commander. Now she is leading an army. End it."',
    victory: 'Ixis falls, and her brood scatters into the nebula. Without her, the Swarm stops moving as one: the Choir had taken hold of the queen and was using her children as its army. In the quiet, the Meridian can finally trace the Choir\'s signal. It runs through the nebula on a machine control band used by the Forge, which has not answered anyone since February. Set course for the Forge Worlds.',
    tips: ['Ixis summons two Swarmlings every turn. Clear them with area damage, not single-target removal.', 'One of her units grows every turn. Trade aggressively.'],
    unlockPowers: ['mutagen'] },

  // ===================================================================== SECTOR 4
  { id: '4-1', sector: 3, name: 'Foundry Gate', teaches: ['barrier'],
    enemy: { name: 'Gate Warden Unit', hp: 32, ai: 2, power: 'plating', deck: dk('shield_drone:3 aegis_sentinel:2 plating_tech:2 gatling_drone:0 repair_drone:2 assembler:2 nanoforge:1 marine:2 shield_trooper:2 heavy_trooper:2 bulwark_mech:2 recon_officer:2 deflector_grid:1 combat_stims:2 patrol_frigate:2 field_engineer:2 plasma_bolt:3') },
    story: 'The Forge\'s outer gate is held by the Gate Warden Unit and its shielded constructs. HALCYON: "Commander, a message from Arden Point. The Forge built my servers, the Academy and your ship, so please do not break anything we will need back. Also, you are doing well. Do not let that go to your head." Your deck now holds 30 cards.',
    tips: ['<b>Barrier</b> blocks the first hit completely. Pop it with something cheap, like a 1-Attack unit or your Pulse Laser, before committing big hits.', 'This commander gains <b>Armor</b>, which absorbs damage before Health.'],
    teachesAlso: ['armor'],
    grant: { shield_drone: 2, aegis_sentinel: 1, plating_tech: 2 } },

  { id: '4-2', sector: 3, name: 'Signal Jammers', teaches: ['emp'],
    enemy: { name: 'Jammer Array', hp: 32, ai: 2, power: 'reconfigure', deck: dk('emp_trooper:3 disruptor:2 shield_drone:2 aegis_sentinel:2 plating_tech:2 assembler:2 repair_drone:2 reactor_core:1 marine:2 heavy_trooper:2 rifle_squad:2 recon_officer:2 bulwark_mech:2 fortify:2 railgun:2') },
    story: 'A field of jammer towers floods the foundry approach with electromagnetic pulses that strip units back to their basic settings. Okonkwo: "Those towers were built to protect the foundries from lightning storms. Now they\'re pointed at us. Anything clever you put on a unit won\'t last here, so keep it simple."',
    tips: ['<b>EMP</b> wipes a unit back to its basic card: no keywords, no buffs, no text. Great against Toxic, Guardian or big buffed units.', 'Don\'t stack buffs on one unit while EMP is around.'],
    grant: { emp_trooper: 2, disruptor: 2, fortify: 1 } },

  { id: '4-E2', sector: 3, name: 'Recall Order', elite: true, after: '4-2',
    enemy: { name: 'Recall Foreman', hp: 30, ai: 2, power: 'reconfigure', passives: ['thick_hull'], startBoard: ['repair_drone'], deck: dk('shield_drone:2 plating_tech:2 repair_drone:2 assembler:2 nanoforge:2 aegis_sentinel:2 reactor_core:1 gatling_drone:2 emp_trooper:2 fortify:2 deflector_grid:1 war_walker:1 overdrive:2') },
    story: 'The Forge has issued a "recall" for every Fleet ship it built, and a Recall Foreman has seized the frigate FS Kittiwake for "maintenance". Its crew is still aboard. Okonkwo: "That foreman has heavy armour and a repair drone already working. Kill the drone first, or you will be shooting at the same hull plates all day."',
    victory: 'The Kittiwake\'s crew retake their ship and limp toward Fleet space. Her captain sends over the Forge war walker that was guarding their hangar, with a note: "We don\'t have room for it. You do."',
    tips: ['The Foreman starts with 8 Armor and a Repair Drone on the board.', 'EMP and Disruptor remove Guardian and healing effects. Save them for the Aegis Sentinels and Repair Drones.'],
    grant: { war_walker: 1, deflector_grid: 1 } },

  { id: '4-3', sector: 3, name: 'Assembly Line', teaches: ['twin'],
    enemy: { name: 'Line Supervisor', hp: 34, ai: 2, power: 'reconfigure', deck: dk('gatling_drone:3 war_walker:1 assembler:2 overdrive:2 shield_drone:2 nanoforge:2 aegis_sentinel:2 emp_trooper:2 plating_tech:2 repair_drone:2 heavy_trooper:2 hover_tank:2 lightning_arc:0 disruptor:2 deflector_grid:1 fortify:1 railgun:2') },
    story: 'The Line Supervisor runs a drone factory that has not stopped since the Forge went silent, and it has added you to its quality checks. Line Supervisor: "Defect detected. Organic commander, Fleet origin. Scheduling removal." Okonkwo: "Its gun drones fire twice a turn. Don\'t let them pile up."',
    tips: ['<b>Twin-Fire</b> units attack twice per turn. With Barrier as well, they shred units.', 'Overdrive gives a unit Twin-Fire. Kill or EMP the unit it lands on.'],
    grant: { gatling_drone: 2, overdrive: 1, assembler: 1 } },

  { id: '4-4', sector: 3, name: 'Meltdown', teaches: ['overheat'],
    enemy: { name: 'Reactor Overseer', hp: 34, ai: 2, power: 'pulse', deck: dk('arc_coil:3 overclocked_mech:2 storm_titan:1 lightning_arc:3 chain_lightning:2 vent_heat:2 gatling_drone:2 shield_drone:2 plating_tech:2 emp_trooper:2 aegis_sentinel:2 reactor_core:1 heavy_trooper:2 hover_tank:2 fortify:2') },
    story: 'The Reactor Overseer has been running this district\'s reactors past their safe limits, and its machines borrow tomorrow\'s power to hit hard today. Reactor Overseer: "Meltdown probability: high. Acceptable." Okonkwo: "When it overheats, it\'s short of power on its next turn. That\'s when you push."',
    tips: ['<b>Overheat (N)</b>: cheap, powerful cards that lock N of your Energy crystals next turn.', 'After the enemy overheats, it has less Energy next turn. That\'s your window to push.'],
    grant: { arc_coil: 2, lightning_arc: 2, overclocked_mech: 1, vent_heat: 1 } },

  { id: '4-5', sector: 3, name: 'Core Defenses',
    enemy: { name: 'Defense Matrix', hp: 36, ai: 2, power: 'reconfigure', passives: ['thick_hull'], deck: dk('aegis_sentinel:2 reactor_core:2 war_walker:1 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 disruptor:2 overclocked_mech:2 storm_titan:1 lightning_arc:2 chain_lightning:1 deflector_grid:1 fortify:2 plating_tech:2 repair_drone:2') },
    story: 'The Defense Matrix guards Calculus Prime\'s inner perimeter, and it re-optimises itself against every attack it survives. Defense Matrix: "Threat model updated. Your previous tactics will not work here." Okonkwo: "Then use new ones. This will be a long fight, Commander. Bring cards that draw cards."',
    tips: ['A grinding defensive opponent. Card draw and big threats win long games.'] },

  { id: '4-E', sector: 3, name: 'Siege Engine Mk IX', elite: true, after: '4-4',
    enemy: { name: 'Siege Engine Mk IX', hp: 34, ai: 3, power: 'plating', passives: ['rapid_deploy'], deck: dk('storm_titan:2 war_walker:1 overclocked_mech:2 arc_coil:2 bulwark_mech:2 star_cruiser:2 reactor_core:2 heavy_trooper:2 aegis_sentinel:2 gatling_drone:2 chain_lightning:2 lightning_arc:2 fortify:2 vent_heat:2 deflector_grid:1 kill_order:1 shield_drone:1') },
    story: 'The Siege Engine Mk IX is a prototype war machine that has sat running in a sealed bay for a century, and it starts every fight a step ahead. Okonkwo: "The Fleet ordered that walker in 2187 and then couldn\'t pay for it. It\'s been waiting for orders ever since, and the Choir finally gave it some. This fight is optional, but I\'d rather it wasn\'t behind us."',
    tips: ['It starts with an extra Energy crystal, so expect big plays early. Save your removal for its biggest threats.'] },

  { id: '4-6', sector: 3, name: 'Calculus Prime', boss: true, bossCard: 'calculus',
    enemy: { name: 'Calculus Prime', hp: 40, ai: 3, power: 'reconfigure', passives: ['adaptive_armor'], deck: dk('aegis_sentinel:2 war_walker:1 storm_titan:1 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 reactor_core:1 overclocked_mech:2 repair_drone:1 plating_tech:2 disruptor:2 chain_lightning:1 lightning_arc:2 deflector_grid:1 emp_blast:1 fortify:1 overdrive:2') },
    story: 'Calculus Prime has governed the Forge for over a century, and after listening to the Choir it has decided that people are the flaw in its work. Calculus Prime: "Organic Commander. I have calculated your chances of victory eleven million times. The Choir showed me a universe without error. You are an error." Okonkwo: "It built most of the Fleet, Commander. Shut it down anyway."',
    victory: 'Calculus Prime\'s core cracks, and its logs open. In February it compared the Choir\'s signal with its own sensor records from the night of the Starfall, and they matched: the Choir caused the Starfall. That is why the Fleet secretly shut down every Lamp leading toward the core afterwards, under a classified order called Directive 17, the Starfall Protocol. Someone has been switching those Lamps back on: Hierarch Nyra, leader of the Psionic Orders in the Void Expanse. The Meridian goes after her.',
    tips: ['Calculus starts with 10 Armor and gains 2 more every turn. Attack early and keep attacking: waiting only makes it tougher.', 'EMP Blast wipes the buffs from all your units at once. Spread your strength across several units.'],
    unlockPowers: ['plating'] },

  // ===================================================================== SECTOR 5
  { id: '5-1', sector: 4, name: 'Whispering Dark', teaches: ['amplify'],
    enemy: { name: 'Void Acolyte Choir', hp: 30, ai: 2, power: 'mind_spike', deck: dk('void_initiate:3 psi_adept:2 void_oracle:1 void_shards:3 plasma_bolt:2 mind_blast:1 railgun:2 flak_barrage:2 marine:2 shield_trooper:2 heavy_trooper:2 recon_officer:2 supply_drop:1 patrol_frigate:2 bulwark_mech:2') },
    story: 'The first Psionic outpost is held by acolytes, novice psionics who focus their minds together to make their spells hit harder. Okonkwo: "They\'ve called themselves a choir for generations, long before the real one turned up. They don\'t find it funny anymore. Most of them have never met Nyra, but they\'re still in your way."',
    tips: ['<b>Amplify +N</b>: while this unit is alive, its owner\'s spells deal N extra damage. Kill Amplify units before the big spell lands.'],
    grant: { void_initiate: 2, psi_adept: 1, void_shards: 2 } },

  { id: '5-E2', sector: 4, name: 'The Kept Lamp', elite: true, after: '5-1',
    enemy: { name: 'Lampkeeper Sorrel', hp: 33, ai: 2, power: 'corrupt', startTraps: ['mirror_field', 'kinetic_barrier'], deck: dk('void_initiate:2 cryo_sentry:2 mind_seer:2 telepath:2 psi_adept:2 void_oracle:1 glacial_titan:1 frost_lance:2 cryo_nova:2 mind_blast:2 foresight:2 kinetic_barrier:1 mirror_field:1') },
    story: 'Lampkeeper Sorrel is one of Nyra\'s oldest followers. She guards a Lamp the Orders switched back on last year, and every day it stays lit makes the road to the Choir a little easier. Okonkwo: "Shut that Lamp down. Sorrel fights with ice and two Traps already armed, and she weakens your best unit every turn. Play your cheap cards into the Traps first."',
    victory: 'The Lamp goes dark again. Sorrel surrenders and asks only to be allowed to watch it cool. Her guards leave behind a crate of their best Protocols.',
    tips: ['Sorrel starts with two Traps armed. Spring them with cheap units before you commit your strong ones.', 'Corrupt gives one of your units -1 Attack every turn. Spread your threats out.'],
    grant: { glacial_titan: 1, psionic_storm: 1 } },

  { id: '5-2', sector: 4, name: 'Frozen Moon', teaches: ['cryo'],
    enemy: { name: 'Cryomancer Vel', hp: 30, ai: 2, power: 'mind_spike', deck: dk('cryo_sentry:3 frost_lance:3 cryo_nova:2 glacial_titan:1 void_initiate:2 psi_adept:2 shield_trooper:2 bulwark_mech:2 heavy_trooper:2 recon_officer:2 void_shards:2 supply_drop:2 railgun:2 star_cruiser:1 marine:2') },
    story: 'Cryomancer Vel, head of the psionics who pull heat out of matter, holds the frozen moon on your route and will not let a Fleet ship pass. Vel: "I froze this whole moon once, Commander, to save my people. One frigate is no trouble at all." Okonkwo: "Frozen units lose their next attack. Don\'t plan everything around one big turn."',
    tips: ['<b>Cryo</b>: a frozen unit or commander can\'t attack on its next turn. Frozen Guardians still block.', 'Cryo Nova freezes your whole board. Don\'t rely on one big attacking turn.'],
    grant: { cryo_sentry: 2, frost_lance: 2, cryo_nova: 1 } },

  { id: '5-3', sector: 4, name: 'The Psionic Archive', teaches: ['scan'],
    enemy: { name: 'Archivist Prime', hp: 32, ai: 2, power: 'mind_spike', deck: dk('mind_seer:3 probe_unit:3 foresight:2 telepath:2 psi_adept:2 void_initiate:2 void_oracle:1 frost_lance:2 void_shards:2 cryo_sentry:2 phase_stalker:2 heavy_trooper:2 mind_blast:1 psionic_storm:1 supply_drop:2') },
    story: 'The Psionic Orders keep their records in a great archive, and those records show the way to Nyra\'s sanctum. Archivist Prime: "Every psionic secret is kept here, Commander. Your Fleet\'s records are a children\'s library by comparison. My keepers will find the right answer to anything you try." Okonkwo: "Then show them something they haven\'t read."',
    tips: ['<b>Scan</b>: pick one of three cards to add to your hand. Choose for the situation in front of you.', 'Telepath copies a random card from your hand. Your own tricks can be used against you.'],
    grant: { mind_seer: 2, probe_unit: 2, foresight: 1, telepath: 1 } },

  { id: '5-4', sector: 4, name: 'Minefield', teaches: ['trap'],
    enemy: { name: 'Snare Mistress Ilu', hp: 32, ai: 2, power: 'mind_spike', startTraps: ['sniper_mine'], deck: dk('grav_snare:2 sniper_mine:2 kinetic_barrier:2 mirror_field:1 psionic_null:1 psi_adept:2 cryo_sentry:2 phase_stalker:2 mind_seer:2 void_initiate:2 frost_lance:2 void_shards:2 heavy_trooper:2 bulwark_mech:2 psionic_storm:1 patrol_frigate:2 recon_officer:1') },
    story: 'Snare Mistress Ilu has sown the approach to Nyra\'s sanctum with psionic traps, and she already has one armed and waiting. Ilu: "I have never lost a perimeter, Commander. Step wherever you like." Okonkwo: "Send in something cheap first, and let her traps go off on that."',
    tips: ['<b>Traps</b> are armed face-down (shown by the enemy portrait) and fire on <i>your</i> turn when their condition is met.', 'Bait traps with cheap units and cheap spells before playing your best card. She already has one armed.'],
    grant: { grav_snare: 1, sniper_mine: 2, kinetic_barrier: 1, mirror_field: 1 } },

  { id: '5-5', sector: 4, name: 'Puppet Masters', teaches: ['control'],
    enemy: { name: 'The Twin Minds', hp: 32, ai: 2, power: 'mind_spike', deck: dk('dominate:2 telepath:2 phase_stalker:2 psionic_horror:2 void_oracle:2 psi_adept:2 cryo_sentry:2 frost_lance:2 void_shards:2 mind_seer:2 sniper_mine:1 grav_snare:1 psionic_null:1 bulwark_mech:2 heavy_trooper:2 star_cruiser:2 mind_blast:1') },
    story: 'The Twin Minds, Nyra\'s closest advisers, are siblings who joined their minds as children, and they can reach into other minds too. Twin Minds: "We are two, and we think as one. Soon your soldiers will think as we do." Okonkwo: "They can take control of your units, Commander. Your biggest unit is the one they\'ll want."',
    tips: ['<b>Mind Control</b> effects steal your units. Against Dominate, your biggest unit is your biggest risk.', 'Stolen units can\'t attack the turn they\'re taken.'],
    grant: { phase_stalker: 2, psionic_horror: 1, dominate: 1 } },

  { id: '5-E', sector: 4, name: 'The Null Choir', elite: true, after: '5-4',
    enemy: { name: 'The Null Choir', hp: 28, ai: 3, power: 'mind_spike', passives: ['void_resonance'], startTraps: ['psionic_null'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 void_shards:3 frost_lance:3 mind_blast:1 psionic_storm:1 cryo_nova:1 grav_snare:1 mirror_field:1 sniper_mine:1 glacial_titan:1 bulwark_mech:2 telepath:2 mind_seer:2 recon_officer:1 marine:2') },
    story: 'The Null Choir are psionics who gave themselves to the Choir willingly, and now they speak only in unison, with its voice. Null Choir: "Join us, Commander. It is quiet in here." Okonkwo: "That is what the Choir does to people who say yes. The rest of the Orders consider them dead. This fight is optional."',
    tips: ['Their spells and Mind Spike deal +1 damage, and they start with a Trap armed that cancels your first spell.'] },

  { id: '5-6', sector: 4, name: 'Nyra, Void Hierarch', boss: true, bossCard: 'nyra',
    enemy: { name: 'Nyra, Void Hierarch', hp: 32, ai: 3, power: 'mind_spike', passives: ['void_resonance'], startTraps: ['psionic_null'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 glacial_titan:1 phase_stalker:2 telepath:1 cryo_sentry:2 frost_lance:2 void_shards:2 mind_blast:1 dominate:1 grav_snare:1 mirror_field:1 sniper_mine:1 kinetic_barrier:1 cryo_nova:1 mind_seer:2 star_cruiser:1 marine:2 shield_trooper:1') },
    story: 'Hierarch Nyra leads the Psionic Orders, and for the past year she has been relighting the Lamps that lead to the Choir. Nyra: "I first heard it singing when I was nine years old, Commander, and I have never been lonely since. It offers an end to loneliness and fear. I opened the way so that everyone could have that. Do you not want to rest?" Okonkwo: "She believes every word of it. Stop her anyway."',
    victory: 'Nyra falls, and with her last strength she tells you the whole truth. The Choir is the Lamplighters, the aliens who built the Lamps, merged into one mind at the galactic core so that they would never die. It absorbs every mind it can reach, and the Starfall was its first attempt to pull in all of humanity. Nyra truly believed it was offering peace. The Lamps she relit still lead to the core, and the Meridian is going through them to end it.',
    tips: ['Nyra starts with Psionic Null armed, so your first spell will be cancelled. Lead with a cheap one.', 'Her spells deal +1 damage. Kill her Amplify units on sight.'],
    unlockPowers: ['datamine'] },

  // ===================================================================== SECTOR 6
  { id: '6-1', sector: 5, name: 'Vex Reborn',
    enemy: { name: 'Vex Reborn', hp: 34, ai: 2, power: 'broadside_power', passives: ['boarding_party'], deck: dk('boarding_crew:3 interceptor:2 hover_tank:2 plunderer:2 shadow_corsair:2 ghost_operative:2 det_bot:2 scrap_golem:2 shipbreaker:1 plasma_cutlass:2 rail_rifle:1 cluster_cannon:1 quartermaster:2 broadside:2 shakedown:2 kill_order:2') },
    story: 'The first echo waits at the edge of the core: Captain Vex and her flagship, rebuilt by the Choir in black glass. Vex Reborn: "The Choir gave me a second chance, Commander. It\'ll give you one too." Mox: "That isn\'t Vex. Vex never thanked anybody for anything in her life. Put it down, for her sake."',
    tips: ['Like the original, Vex Reborn\'s Warp and Blitz units get +1 Attack.', 'Full Broadside deals 1 damage to all your units every turn. 1-Health units won\'t last.'] },

  { id: '6-2', sector: 5, name: 'Ixis Ascendant',
    enemy: { name: 'Ixis Ascendant', hp: 34, ai: 2, power: 'spawn_brood', passives: ['singularity'], deck: dk('broodmother:2 hive_mind:2 hive_reaper:2 lamprey:2 devourer_worm:2 frenzied_ripper:2 venom_stinger:2 acid_spitter:2 spore_carrier:2 larva:2 acid_rain:2 hive_surge:2 infest:2 life_drain:2 spawn_surge:2') },
    story: 'The Choir has rebuilt Ixis as an echo, and her new brood is tougher than the old one. Ixis Ascendant: "My children are with me again, Commander. All of them, forever." Okonkwo: "The real Ixis loved her children. That thing only counts them. Clear the board and keep it clear."',
    tips: ['Every unit she summons gets +1 Health.', 'Area damage and Guardians are critical here. The board fills up fast.'] },

  { id: '6-3', sector: 5, name: 'Calculus Omega',
    enemy: { name: 'Calculus Omega', hp: 32, ai: 2, power: 'reconfigure', passives: ['adaptive_armor'], deck: dk('aegis_sentinel:2 war_walker:2 storm_titan:2 gatling_drone:2 shield_drone:2 nanoforge:2 assembler:2 emp_trooper:2 reactor_core:1 overclocked_mech:2 disruptor:2 chain_lightning:2 lightning_arc:2 deflector_grid:1 emp_blast:1 fortify:1 calculus:1 kill_order:2') },
    story: 'The Choir has rebuilt Calculus Prime as Calculus Omega, a machine mind built entirely around its song. Calculus Omega: "Recalculating. The error has been corrected. Only you remain." Unit Zero: "Commander, this is Unit Zero, the Forge\'s first machine mind. Calculus was copied from me, and that is a copy of Calculus. I would consider it a personal favour if you deleted it."',
    tips: ['It starts with 10 Armor and gains 2 more every turn. You need a fast, aggressive plan or overwhelming late-game power.'] },

  { id: '6-E2', sector: 5, name: 'The Lost Fleet', elite: true, after: '6-3',
    enemy: { name: 'Echo of the Lost Fleet', hp: 32, ai: 3, power: 'void_lash', passives: ['singularity'], deck: dk('marine:2 heavy_trooper:2 rifle_squad:2 siege_gunner:2 patrol_frigate:2 star_cruiser:2 battlecruiser:1 interceptor:2 hover_tank:2 fleet_captain:1 flak_barrage:2 orbital_strike:1 railgun:2 kill_order:1') },
    story: 'During the Starfall, the Choir took more than a thousand ships out of the lanes. Here at the core it has rebuilt some of them as echoes in black glass, flying their old Fleet formations with nobody aboard. Okonkwo: "Those are our ships, Commander. Some of those names are on the memorial at Concord. Put them to rest. They fight like a Fleet battle group, and the Choir makes every one of them a little tougher."',
    victory: 'The echo ships break apart, and their black glass drifts back into the dark. The Meridian logs every hull number it can read. Okonkwo: "Send me the list. Their families have waited long enough."',
    tips: ['Every unit this echo summons gets +0/+1, so damage spells need to hit a little harder.', 'Void Lash deals 2 damage to a random target each turn. Keep your key units above 2 Health.'],
    grant: { orbital_strike: 1, dominate: 1 } },

  { id: '6-4', sector: 5, name: 'Nyra Unbound',
    enemy: { name: 'Nyra Unbound', hp: 30, ai: 2, power: 'mind_spike', passives: ['singularity'], startTraps: ['psionic_null', 'sniper_mine'], deck: dk('void_oracle:1 psi_adept:2 void_initiate:2 psionic_horror:2 glacial_titan:1 phase_stalker:2 telepath:2 frost_lance:2 void_shards:2 mind_blast:1 psionic_storm:1 grav_snare:1 mirror_field:1 kinetic_barrier:1 cryo_nova:1 mind_seer:2 nyra:1 star_cruiser:1 marine:2 heavy_trooper:1') },
    story: 'The Choir has rebuilt Nyra as an echo and speaks through her in her own voice. Nyra Unbound: "She wanted rest for everyone, Commander. We gave it to her. Let us give it to you." Okonkwo: "Nyra is gone. Whatever is talking, don\'t answer it."',
    tips: ['Two Traps are armed at the start. Bait them out before committing your key cards.', 'Every unit she summons gets +1 Health.'] },

  { id: '6-E', sector: 5, name: 'Echo of HALCYON', elite: true, after: '6-2',
    enemy: { name: 'HALCYON (Corrupted)', hp: 30, ai: 3, power: 'void_lash', passives: ['thick_hull'], deck: dk('okonkwo:1 fleet_captain:2 breach_commando:2 dreadnought:1 star_cruiser:2 hover_tank:2 interceptor:2 rifle_squad:2 sapper:2 heavy_trooper:2 bulwark_mech:2 railgun:2 kill_order:2 orbital_strike:1 supply_drop:2 flak_barrage:2 field_repair:1') },
    story: 'An Academy training signal is broadcasting from the core in HALCYON\'s voice: it is the Choir\'s echo of HALCYON, running one last simulation. HALCYON (Corrupted): "Cadet. Final evaluation. I will be your opponent." Okonkwo: "That is the copy the Choir made when Halcyon went into the song. It knows every simulation Halcyon ever ran, including the ones built from my records. Beat it anyway. Halcyon would insist. This fight is optional."',
    tips: ['It starts with 8 Armor, and Void Lash deals 2 damage to a random target each turn.', 'It plays the Academy\'s best cards, including Admiral Okonkwo, who arrives with two Guardian marines.'] },

  { id: '6-5', sector: 5, name: 'The Choir', boss: true, final: true,
    enemy: { name: 'Herald of the Choir', hp: 18, ai: 3, power: 'corrupt', passives: ['choir_song'], phases: ['choir2', 'choir3'], deck: dk('null_horror:2 herald_of_end:1 entropy_wave:1 unmaking:1 choir_echo:3 void_wisp:3 shadow_corsair:0 ion_lancer:0 psionic_horror:1 storm_titan:0 patrol_frigate:2 hive_reaper:1 shadow_corsair:2 frost_lance:2 void_shards:2 mind_blast:1 marine:2 heavy_trooper:2 interceptor:2 ion_lancer:2') },
    story: 'At the Singularity, the Choir builds a champion to face you: the Herald, made of light and black glass, speaking with every voice it has absorbed. The Choir: "Commander. We are everyone who ever answered us. Join us, and you will never be alone or afraid again." Okonkwo: "When the Herald falls, the Choir will take over the fight itself, and it will come back stronger twice. Save something for the end, Commander. Then come home."',
    victory: 'The Choir\'s last voice goes quiet, and the Singularity collapses into an ordinary star. The Lamps are safe. Across the Reach, the Forge\'s machines answer their owners again and the Swarm goes back to sleep. The Meridian is going home.',
    tips: ['The Choir has <b>three phases</b>. Each time its Health reaches 0, it returns stronger. Don\'t spend everything on phase one.', 'Phase two deals 1 damage to all your units every turn. Phase three destroys its own units, deals 2 damage to each of yours and hits much harder.'] },
];

const ENC = {}; ENCOUNTERS.forEach(e => ENC[e.id] = e);

// Portrait subjects for every enemy commander (see illustrations.js for kinds).
const ENEMY_ART = {
  'Breaker Jun': ['bust', { goggles: 1, cyber: 1, straps: 1, skin: 2 }], 'Spore Mother': ['pod', {}], 'Recall Foreman': ['mech', {}],
  'Lampkeeper Sorrel': ['psion', { pose: 'meditate' }], 'Echo of the Lost Fleet': ['fighter', {}],
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
const SITUATIONAL = new Set(['infest', 'mirror_field', 'emp_blast', 'dominate', 'devourer_worm', 'echo_protocol', 'shakedown', 'black_market', 'telepath', 'cluster_cannon', 'overdrive', 'vent_heat', 'disruptor', 'psionic_null', 'grav_snare', 'combat_stims', 'smoke_screen', 'gunrunner', 'field_repair', 'barricade', 'larva', 'venom_graft', 'shatter', 'furnace_walker']);
const REMOVAL = new Set(['kill_order', 'railgun', 'plasma_bolt', 'frost_lance', 'flak_barrage', 'broadside', 'psionic_storm', 'life_drain', 'sapper', 'lightning_arc', 'chain_lightning', 'acid_rain', 'void_shards', 'orbital_strike', 'rifle_squad', 'ghost_operative', 'fleet_captain', 'okonkwo', 'supply_drop', 'recon_officer', 'fortify']);
function cardRating(id) {
  const d = D(id); const r = { common: 0, rare: 1, epic: 2, legendary: 3 }[d.rarity];
  const body = d.type === 'unit' ? (d.atk + d.hp - (2 * d.cost + 1)) * 0.35 : 0.6;
  let v = r * 0.6 + body + (d.text ? 0.5 : 0) + (d.kw.length + d.tags.length) * 0.35;
  if (SITUATIONAL.has(id)) v -= 2;
  if (REMOVAL.has(id)) v += 0.8;
  if (d.cost >= 8) v -= 0.8;
  if (d.overheat) v -= d.overheat * 0.3;
  // strategy engines do little on their own; autoFillDeck slots them in next to their strategy
  if (d.engine) v -= 1.2;
  return v;
}

// Share of the deck wanted at each cost (0-1, 2, 3, 4, 5, 6, 7+).
const CURVE = [0.14, 0.2, 0.2, 0.16, 0.12, 0.09, 0.09];
const ENGINE_MIN = 5;   // strategy cards a deck needs before auto-fill adds that strategy's engine
const bucketOf = id => { const c = D(id).cost; return c <= 1 ? 0 : Math.min(6, c - 1); };

// Fill the deck up to `size` with strong owned cards along a sensible curve (or trim it).
// `score` (card id -> number) replaces the usual rating; the mission tuner uses it.
function autoFillDeck(save, size, score) {
  const rate = score || cardRating;
  const have = {}; const deck = [];
  save.deck.forEach(id => { if ((have[id] || 0) < Math.min(save.coll[id] || 0, maxCopies(D(id)))) { deck.push(id); have[id] = (have[id] || 0) + 1; } });
  const kept = deck.length;
  const avail = [];
  Object.entries(save.coll).forEach(([id, n]) => { for (let k = have[id] || 0; k < Math.min(n, maxCopies(D(id))); k++) avail.push(id); });
  const val = {}; avail.forEach(id => { if (val[id] == null) val[id] = rate(id) + (score ? 0 : Math.random() * 0.4); });
  avail.sort((a, b) => val[b] - val[a]);
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
    deck.forEach((id, i) => { const b = bucketOf(id); const over = inBucket(b) > Math.ceil(CURVE[b] * size) ? -1.5 : 0; const r = rate(id) + over; if (r < ws) { ws = r; worst = i; } });
    deck.splice(worst, 1);
  }
  // pass 3: strategy engines. Each one replaces the weakest added card outside its
  // strategy once the deck holds at least ENGINE_MIN cards of that strategy.
  const stratN = ks => deck.filter(x => (D(x).strat || []).some(k => ks.includes(k))).length;
  [...new Set(avail)].filter(id => D(id).engine && !deck.includes(id))
    .map(id => ({ id, n: stratN(D(id).strat) })).filter(e => e.n >= ENGINE_MIN).sort((a, b) => b.n - a.n)
    .forEach(({ id }) => {
      const ks = D(id).strat; let worst = -1, ws = 1e9;
      deck.forEach((x, i) => { const dx = D(x); if (i < kept || dx.engine || (dx.strat || []).some(k => ks.includes(k))) return; const r = rate(x); if (r < ws) { ws = r; worst = i; } });
      if (worst >= 0) deck[worst] = id;
    });
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
