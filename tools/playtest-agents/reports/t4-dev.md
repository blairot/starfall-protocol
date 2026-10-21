# Playtest report: dev (the veteran) · t4-dev · build 68 · 2026-10-20

## Persona
Dev, 34, software engineer, Hearthstone Legend and years of Magic. Admiral difficulty from the start. Skips tutorial text, reads card text closely, builds decks on purpose, counts lethal, holds removal, and looks for dominant strategies, misleading wording and AI exploits. Gets bored when there's no real decision and annoyed by losses that come from randomness.

## Expectations (before playing)
"A Hearthstone-style lane-less battler with a sci-fi coat of paint. 'Most cadets fail' on Admiral: prove it. I'm hoping the AI actually punishes sloppy trades and that deck building matters, not just bigger numbers."

## Session summary
- Played every story mission in Sectors 1 to 3 (1-1 to 3-6) plus Elites 1-E and 2-E2. I skipped Elites 2-E (Kade), 3-E2 and 3-E to save time.
- Result: **20 wins, 1 loss** on Admiral. The only loss was 2-E2 Salvage Rights on the first attempt; I won the retry.
- About 21 battles, roughly 4 to 5 hours of real play time.
- Commander power: Pulse Laser for almost all of it. I used Nanite Repair for one game (2-E2, the loss).

## Per-battle ratings

| # | Mission | Result (turn, my HP at end) | Fun | Diff | Clarity | Keep | Why (Dev's voice) |
|---|---|---|---|---|---|---|---|
| 1 | 1-1 First Contact | W T11 | 2 | 1 | 5 | 3 | Fixed training deck and no mulligan. It's a tutorial, fine. |
| 2 | 1-2 Fire Protocols | W T10 | 3 | 2 | 5 | 3 | No mulligan and a 5/6/5 opener, so I did nothing for 2 turns. Exact lethal with Bolt was nice. |
| 3 | 1-3 Hold the Line | W T12 | 3 | 2 | 5 | 3 | Guardian wall plus fatigue gave a little planning. |
| 4 | 1-4 Command Authority | W T9 | 3 | 2 | 5 | 3 | Vale used Pulse on my 1-hp unit, which is correct. I won on an exact count of 17. |
| 5 | 1-E Iron Wall (Elite) | W T12, 23 HP | 4 | 3 | 5 | 4 | First real puzzle. Dig In plus Repair on the enemy's Trooper was smart; spending Repair at full HP wasn't. |
| 6 | 1-5 Blitz Drill | W T8 | 2 | 2 | 5 | 3 | Pulse Laser kills every x/1 Warp unit for 2. There was nothing to fear. |
| 7 | 1-6 HALCYON (boss) | W T11, 13 HP | 4 | 3 | 5 | 4 | It raced me properly. Best fight of Sector 1. |
| 8 | 2-1 Toll Gate | W T10 | 3 | 2 | 5 | 3 | Reckless AI, Pulse eats Boarding Crew. |
| 9 | 2-2 Armed and Dangerous | W T9 | 3 | 2 | 4 | 3 | The weapon AI mostly behaved and never swung into my 8/8. |
| 10 | 2-E2 Salvage Rights (Elite) | **L** T9 | 4 | 4 | 4 | 4 | Fair loss: a reactive hand, I misplayed my Cruiser, and the AI comboed Echo Protocol well. |
| 11 | 2-E2 retry | W T10, 15 HP | 4 | 4 | 4 | 4 | Okonkwo stabilised. The AI's Mine Layer wipe was good. |
| 12 | 2-3 Junkyard Wars | W T10 | 3 | 2 | 4 | 3 | Two 2-for-1 Broadsides. The AI held 6 cards for turns. |
| 13 | 2-4 Ghost Signal | W T11 | 4 | 3 | 4 | 4 | First Cluster Cannon. Cloak forced some sequencing. |
| 14 | 2-5 Wreck Run | W T10 | 4 | 3 | 4 | 4 | The AI threw three units into my Dreadnought to kill it, which was clever. |
| 15 | 2-6 Captain Vex (boss) | W T10, 18 HP | 3 | 2 | 4 | 3 | 46 HP but she used Cannon Volley once all game. Soft for a boss. |
| 16 | 3-1 Venom Fields | W T12, 20 HP | 4 | 3 | 4 | 4 | Seven bugs on board on T7. One Cluster Cannon swing killed 5 of them. |
| 17 | 3-2 Bloodline | W T11 | 4 | 3 | 4 | 4 | Siphon plus Toxic made trading a real puzzle. I lost a turn to my own chaining slip. |
| 18 | 3-3 The Brood | W T12, 17 HP | 4 | 4 | 4 | 4 | Hive Surge snowball was real pressure. Good. |
| 19 | 3-4 Apex Predator | W T15, 27 HP | 3 | 3 | 3 | 3 | The "kill it in one blow" briefing promised a mechanic I never saw. A long grind. |
| 20 | 3-5 Queen's Guard | W T10, 31 HP | 3 | 2 | 4 | 3 | AoE plus Line Sergeant on Okonkwo's marines rolled it. |
| 21 | 3-6 Ixis (boss) | W T16, 15 HP (low 12) | 4 | 4 | 4 | 4 | Best fight of the run: toxic Reapers, Lamprey heals, Hive Surge. |

## Critical incidents (chronological)
- [1-1 / 1-2, opening] **frustration**: no mulligan prompt in 1-1 or 1-2 (it first appears in 1-4). In 1-2 the opener was Cruiser/Lancer/Frigate/Lancer and I had nothing to do on T1-T2. That's fine for a tutorial, but on "Admiral" it reads as wasted turns. Severity: minor.
- [After 1-3, 1-5 and 1-6 wins] **frustration**: the victory text says "HALCYON has loaded them into your deck... swapping out Heavy Trooper, Patrol Frigate, Plasma Bolt". It overwrote my deliberate builds three times, and I had to re-add my cards each time. For a deck builder this is the most annoying thing in Sector 1. Severity: minor (major for my persona).
- [1-E T8 to T10] **bug/AI**: Sim Bastion played Medic Bot on itself at 31/31 and "used Nanite Repair" at full Health twice. The log shows no heal line, so that's 4 Energy wasted. Severity: minor.
- [1-5] **boredom**: Pulse Laser (2 Energy: 1 damage) one-shots every Warp/Blitz unit in the drill (Interceptor 3/1, Strike Fighter 2/1, Hover Tank after one chip). The "learn to fear them" lesson has no teeth. Pulse stayed my best power through Sector 3, because the Raider and Swarm decks are full of x/1s, 1/1 Swarmlings and Drones. Severity: minor (balance).
- [Sector 1 overall] **observation**: I went 7-0 on Admiral. Only the Elite and the HALCYON boss made me think. **Admiral is not hard in Sector 1.** It's a tutorial with bigger enemy HP. Severity: major for the "is Admiral hard?" question.
- [2-1 T2] **polish**: the Advisor explained the Energy Cell ("Use the Energy Cell to play a 2-cost card on turn 1") in a game where I went first and had no Cell.
- [2-2 Rourke, weapon AI] **observation (asked to check)**: the enemy commander mostly used weapons sensibly. It went face with Shock Baton/Harpoon when I had no Guardian, used Harpoon ping plus a 2-damage swing to kill my 2/3 Guardian (taking 2), and **never** attacked my 8/8 Dreadnought. One borderline swing: Plasma Cutlass (3) into my damaged Frigate 5/3, taking 5 to kill a 5-drop. One wasted swing: it equipped Harpoon Gun over a Shock Baton that still had durability.
- [2-E2 Jun T6] **observation (weapon AI)**: Jun swung a Heavy Rail Rifle (5/1) into my 4/5 Heavy Trooper and took 4. That's a defensible tempo trade, not a bug. Jun also hit my 3/2 Rifle Squad with Shock Baton and took 3.
- [2-5 T9] **observation (weapon AI)**: at 9 HP the Wing Leader swung Shock Baton into my 2/3 Guardian marine (took 2) after its units had died, which cleared the Guardian for nothing that turn. It's the only weapon attack I'd call self-harm, and it's mild. **Verdict: the old "commander suicides into big units" problem looks fixed.** I saw no swing into anything with 5 or more Attack.
- [2-E2 first attempt, T7 to T9] **delight/unfair-ish**: Jun played Echo Protocol on Shipbreaker Titan (a free 4/4 Hull while keeping the Titan), then Mine Layer plus Echo for a board ping. Strong, legible play. I lost fairly: a reactive opener of 2x Railgun with no early units, plus my own Cruiser misplay. The defeat screen ("What hurt you most: Shipbreaker Titan 14 damage") was useful.
- [2-E2 / Mine Layer] **delight**: the AI sacrifices Mine Layer into my board to trigger its Salvage on purpose. In 2-5 it threw Mine Layer, Smuggler and Interceptor into my Dreadnought to kill it in one turn. The AI does press advantages.
- [2-E2 T5] **polish/log**: when my Harpoon killed Cargo Hauler, its "Salvage: Draw a card" happened with no log line. I only inferred it from the enemy's hand count.
- [2-4 T4 to T5] **surprise/balance**: Cluster Cannon (4 Energy gear 2/2, "After your commander attacks, deal 1 damage to all enemy units"). Swinging at the **enemy commander** costs no Health and still fires the AoE. In 2-4 a face swing killed a Hover Tank for free. With 2 uses it's a 4-Energy, two-turn sweeper that also does 4 face damage.
- [3-1 T7] **delight, then balance concern**: facing 7 enemy units, I equipped Cluster Cannon and swung at a 1/1. The AoE killed four Swarmlings and set up a Pulse kill on Gland Grafter: 5 units for 4 Energy and 1 HP. The next turn the second swing killed a Brood Warrior and a Swarmling. The same thing happened in 3-2 (5 kills from one swing plus Pulse), 3-3 and 3-4. **In Sector 3 Cluster Cannon is the best card in my deck by a distance.** The cut to 2 uses keeps it from being permanent, but against the Swarm it's a must-include and close to dominant. In Sectors 1 and 2 it's merely strong.
- [3-x] **observation**: Broadside and Acid Rain both hit Cloaked units, and Acid Rain doesn't hit Swarmlings that spawn from a Salvage mid-spell. Both are reasonable, but neither is stated on the card. Severity: polish.
- [3-1 and later] **polish/log**: larva transformation prints "    enemy Brood Warrior was transformed." with odd indent and no "Hive Larva became..." wording. Damage on a Larva doesn't carry over when it transforms (my Bolt chip was lost). That's fine, but unstated.
- [3-2 T6] **my error**: I chained `end` after an illegal attack into a non-Guardian, so I skipped a whole turn and took 9. That's on me and the harness, not the game.
- [3-3 T6] **my error**: I miscounted Energy (Cannon 4 + Reaper 5 on 6 Energy). Same category.
- [3-4] **confusion**: the briefing says "Kill it in one blow... If you only hurt it, you just make it angry." The victory text says "The Alpha goes down in one blow". It took me 15 turns of chip damage, and I never saw an enrage mechanic on the commander (its power is Mutagen +1/+1). Either the mechanic is invisible or the text over-promises. Severity: minor.
- [2-6 Vex] **observation**: the boss used Cannon Volley (2 damage to a random enemy) once, on T9. With 46 HP she died on T10 while I was at 18. Her Reckless race was real (Shakedown plus Interceptors), but the identity power barely appeared. Severity: minor (boss feel).
- [3-6 Ixis] **delight**: the best fight of the run. Brood Growth plus Hive Mind turned a 1/2 Spitter into a 4/4 toxic, and the Lamprey Siphon heal mattered. Devourer Worm ate a Spore Carrier for a 7/6. I fell to 12. It finally felt like Admiral.
- [Throughout] **observation**: the Swarm AI largely refuses to attack into a big Guardian (Dreadnought). It just builds board until it can push through or chip with Toxic/Stingers, which is correct play.
- [Economy] **observation**: Alloy reached 610 with nothing to spend it on via this interface. Commander max HP rose 30 > 32 > 34 between sectors without my input.

## Quit points
None. Sector 1 nearly bored me (7-0 with no decisions until the Elite and boss). If I weren't testing, I'd have checked out around 1-5. The Elites and Sector 3 pulled me back.

## Debrief answers
1. **How do you win?** Bring the enemy commander to 0 with unit attacks and spells. Three mechanics I learned: **Guardian** (must be attacked first; spells and AoE ignore it); **Toxic** (destroys any unit it damages, so you answer it with spells, cheap units or your own Toxic blocker like Thornback); **Salvage** (death triggers like Mine Layer's 1 damage to all, Det-Bot's random 2, Spore Carrier's two Swarmlings, so kill order matters and Echo Protocol can fire them without a death).
2. **Story**: The Lamps went dark 70 years ago (the Starfall). A signal from the core, the Choir, is corrupting things. HALCYON trained me; Admiral Okonkwo commands. In the Scrap Belt, Captain Vex was wiring a Lamp's hum into her ships; Mox and Sable helped me reach her. In the Hive Nebula the Choir had hijacked Queen Ixis. Next is the Forge Worlds. I skimmed it, but it was coherent and the Okonkwo lines are tight.
3. **Best**: the Ixis boss and the 2-E2 retry. **Worst**: Sector 1's auto-deck swaps, plus 1-5 being trivial to Pulse Laser. **Most confusing**: the Apex Predator "one blow" framing.
4. **Difficulty curve**: flat and easy through 1-5, with spikes at 1-E, 1-6 and 2-E2. Sector 2 story missions were easy to medium; the Vex boss was soft. Sector 3 is where Admiral starts to bite (3-3, 3-6). No dull stretch after Sector 1.
5. **New cards**: frequent enough, and the crates (pick 1 of 3) are good decisions. Shakedown, Life Drain and Acid Rain all earned slots. The packs' duplicate-to-Scrap is clean. Legendaries (Okonkwo, Ixis) arrive at the right moments, and Okonkwo plus Line Sergeant was a real synergy find.
6. **Cutscenes/story**: didn't get in the way. Briefings are short, and the tactical hints in them are useful ("Clear the junk first").
7. **Play again?** Yes, for Sector 4 and the Elites I skipped. I'd stop if Cluster Cannon plus Pulse stays the answer to everything.
8. **One sentence**: "Solid Hearthstone-lite with a surprisingly competent AI, but Admiral doesn't get hard until Sector 3, and one 4-cost weapon solves the Swarm."

## Top 5 findings for the designers
1. **Cluster Cannon is still dominant against the Swarm (Sector 3), even at 2 uses.** Swinging at the enemy commander takes no counter-damage, so the AoE is free. Single swings killed 4 to 5 units in 3-1, 3-2 and 3-3. It's strong but fair against Sectors 1 and 2. Against swarm boards it's the single best card I found.
2. **Admiral is not hard in Sector 1.** I went 7-0 with no losses. Only Elite 1-E and the HALCYON boss asked for real decisions, and 1-1 to 1-5 played like Officer. The first loss came at 2-E2, and story missions don't push back until Sector 3.
3. **Enemy weapon self-damage looks fixed.** No enemy commander swung into a unit with 5 or more Attack. The worst cases were Cutlass into a damaged 5/3 Frigate (took 5 to kill a 5-drop) and a 2-damage Baton swing into a 2/3 Guardian at 9 HP. One AI waste: replacing a Shock Baton that still had durability.
4. **The AI takes lethal and presses advantages well, with small wastes.** Good: sacrificial Mine Layer wipes, Echo Protocol on Titan, three units thrown into a Dreadnought to kill it, Stinger into Thornback to open the path, refusing bad attacks into big Guardians. Bad: Bastion used Nanite Repair and Medic Bot at full Health (1-E), Vex used Cannon Volley once in a whole boss fight, and the Reckless AI sometimes sat on 6 cards.
5. **The game overwrites deliberate decks after Academy wins.** "HALCYON has loaded them into your deck... swapping out Heavy Trooper, Patrol Frigate..." removed my picks three times in Sector 1. Pulse Laser also trivialises the 1-5 Blitz Drill and most x/1 threats. Nanite Repair (heal 3) did not feel dominant in my one game with it; Pulse was the better power everywhere.

## Suggestions (opinion)
- Cluster Cannon: make the AoE trigger only when the commander attacks a **unit**, or have it deal its AoE before the swing. Either way it keeps its identity but costs Health.
- Admiral in Sector 1: give Admiral sims extra starting cards or Armor, or a mulligan in 1-1 and 1-2. Or simply make the Academy auto-swap ask first ("Load HALCYON's lesson cards? Y/N"), which matters most to Admiral players.
- Bosses: guarantee the signature power gets used. Vex should Cannon Volley every turn she has spare Energy.
- AI: don't cast heals or Repair at full Health.
- Card text: say "Hits Cloaked units" on AoE, and give Cluster Cannon an explicit "including attacks on the enemy commander" if that's intended.
- Fix the 3-4 Apex Predator briefing and victory text, or add the enrage mechanic it implies.

## Harness issues (not the game)
- `card <id>` failed for several cards because the id differs from the name (`demolition_sapper` is `sapper`, `blast_barricade` is `barricade`, `shipbreaker_titan` is `shipbreaker`). Using the display name in quotes works.
- In Git Bash, unit tags like `#31` must be quoted, or the shell treats them as comments. The first chained attack failed silently, so it looked like a usage error.
- Chaining `attack ... ; end` will end the turn even if the attack was illegal (Guardian). That's how I lost a turn in 3-2.
- There's no Anchorage command, so I couldn't spend 610 Alloy or see what raised my max HP.
- In 1-E and 3-4 I was told "you go second", but I got the first visible turn with no "Before your first turn" enemy action shown. Probably the enemy just had nothing to play, but it reads oddly.
- Victory text is easy to lose when the lethal attack's output is truncated. That was my piping; I recovered via `status`.
