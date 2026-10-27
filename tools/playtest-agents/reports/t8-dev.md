# Playtest report: dev (the veteran) · t8-dev · Proving Grounds · 2026-10-27

## Persona
Dev, 34, Hearthstone Legend, plays Admiral. Builds decks deliberately, counts lethal, hunts for broken combos and AI exploits, hates losing to randomness. Started from a typical campaign-complete save (`new --diff admiral --from 7`) and played only the post-campaign Proving Grounds.

## Expectations (before playing)
"A roguelike draft mode after the campaign. That's the Arena mode I actually want: pick 1 of 3 from every set, 8 wins, a lose-3 rule. I expect the draft to be the main skill test, the modifiers to add variety without deciding games, and the last boss to be a real exam. If the draft is shallow or the losses are coin flips, I'm out after one run."

## Session summary
- **Run 1** (Pulse Laser, AoE control: Chain Lightning x2, Hymn x2, Storm Titan x2, Hollow Choir x2, Thornback, Venom Tender, Wraiths): **7 wins, 3 losses**. Lost trial 2 once (Spore Mother), trial 4 once (Defense Matrix, my misplay), then lost the final boss (Nyra) on the last hull point. Reward: about 560 Credits from trials, 1 Singularity Pack (4 duplicates, 20 Scrap), kept Stormcaller Rhee.
- **Run 2** (Data Mine, meant to be a cheap aggressive curve, ended up as an Overheat/Barrier deck: Overclock Relay x2, Storm Titan x2, Deflector Grid x2, Nanoforge x2, Void Oracle x2, Acid Rain): **5 wins, 3 losses**. Lost trial 3 (Hive Overseer) twice, then trial 6 (Cryomancer Vel). Reward: 1 Singularity Pack, kept Void Oracle.
- 26 battles in total, all played turn by turn. Roughly 6 to 7 hours of play if this were the real game.

## Per-battle ratings

| # | Run / trial | Enemy · modifier | Result | Fun | Diff | Clarity | Keep | Why (Dev) |
|---|---|---|---|---|---|---|---|---|
| 1 | R1 T1 | Gunsmith Rourke · Glass Cannons | W (8 HP left) | 4 | 3 | 4 | 4 | Tight. Glass Cannons makes every point of face damage matter. |
| 2 | R1 T2 | Spore Mother · Minefield | L | 3 | 4 | 4 | 3 | My all-rare 5-drop deck gets swarmed. Gravity Snare added +2 to my 2-drop and cost me the tempo. |
| 3 | R1 T2 retry | Spore Mother · Ambush | W (3 HP to spare, at fatigue) | 4 | 4 | 4 | 4 | Real comeback, won with lethal counted exactly. |
| 4 | R1 T3 | Hive Overseer · Ambush | W | 4 | 3 | 4 | 4 | Back-to-back Overheat AoE locked my mana, but the deck held. |
| 5 | R1 T4 | Defense Matrix · Glass Cannons | L | 3 | 4 | 5 | 3 | My fault: I trusted a Guardian and the AI EMP'd it for exact lethal. Good AI. |
| 6 | R1 T4 retry | Defense Matrix · Glass Cannons | W at fatigue | 5 | 4 | 5 | 5 | Best game of the session. Grinding through 40+ armor with the deck running out. |
| 7 | R1 T5 | Jammer Array · Overcharged | W easily | 3 | 2 | 5 | 4 | Easiest trial of the run, at trial 5. |
| 8 | R1 T6 | Cryomancer Vel · Veteran Crews | W | 4 | 3 | 4 | 4 | The freeze-lock was annoying, but I had answers. |
| 9 | R1 T7 | Twin Minds · Glass Cannons | W | 3 | 2 | 5 | 4 | Raced it down. No mind-control gimmick showed up. |
| 10 | R1 T8 | Nyra · Veteran Crews + Minefield | L (run over) | 3 | 5 | 4 | 3 | Two traps, +1 spell damage and stacked Amplify. Frost Lance hit my face for 6 on turn 2. Burned out at 36 HP. |
| 11 | R2 T1 | Rourke · Glass Cannons | W | 3 | 4 | 5 | 3 | Same opponent and modifier as run 1. |
| 12 | R2 T2 | Spore Mother · Minefield | W at fatigue | 4 | 4 | 4 | 4 | Same trial and the same trap (Gravity Snare) as run 1. |
| 13 | R2 T3 | Hive Overseer · Ambush | L | 2 | 4 | 4 | 2 | A full hand burned my Hollow Choir. Toxic 1-drops trade up into everything. |
| 14 | R2 T3 retry | Hive Overseer · Glass Cannons | L | 2 | 5 | 4 | 2 | Seven bodies against no AoE in hand. A normal mission-3-1 enemy is beating me at trial 3. |
| 15 | R2 T3 retry 2 | Hive Overseer · Ambush | W | 5 | 3 | 5 | 4 | Nanoforge plus Deflector Grid put a barriered wide board out. Satisfying engine. |
| 16 | R2 T4 | Defense Matrix · Glass Cannons | W | 5 | 3 | 5 | 5 | The barrier board beat the armor wall. |
| 17 | R2 T5 | Jammer Array · Overcharged | W | 4 | 3 | 5 | 4 | Harder than run 1 thanks to its EMP. Fine. |
| 18 | R2 T6 | Cryomancer Vel · Veteran Crews | L (run over) | 3 | 4 | 4 | 3 | The AI skipped exact lethal once (see AI notes), then Glacial Titan finished me. |

(The retries share a row with their trial in the narrative. Every launch is listed here.)

## Critical incidents (chronological)

- **[Draft, pick 1 to 3] bug/surprise. The draft offer does not re-roll after a pick.** Pick 1 offered Dreadnought / Chain Lightning / Hymn of Ending. After I picked Chain Lightning, pick 2 offered the **identical three cards**, with "(in deck x1)" added. The offer changes only when a card hits its 2-copy cap, and then only that slot is replaced. In practice every draft is "take 2 of each card in turn". Expected: three new cards each pick. **Severity: blocker for the mode's core decision.** (It may be the harness: see Harness issues.)
- **[Draft, both runs] bug. The draft is fully deterministic across runs and run names.** Run 2 and a scratch run (`t8-dev-probe`) showed exactly the same power choices, the same pick-1 offer and the same replacement sequence. The trial schedule was also identical in both runs: T1 Rourke+Glass Cannons, T2 Spore Mother+Minefield (same Gravity Snare trap), T3 Hive Overseer+Ambush, T4 Defense Matrix+Glass Cannons, T5 Jammer Array+Overcharged, T6 Vel+Veteran Crews. So did my seat order (run 1 always first, run 2 always second). **Severity: major.** It makes run 2 a replay and lets you scout the whole run.
- **[Draft] rarity spread.** Every one of the 40 draft offers I saw was **Rare**: no commons, no epics, no legendaries. Spoils, by contrast, varied (T1 epics, T4 three legendaries, T6/T7 commons). Expected: a mix, with occasional Epic or Legendary draft picks. **Severity: major** (the draft has no "wow" picks, and offers lean heavily to 4- and 5-drops).
- **[Draft, run 2] observation.** I tried to draft an all-cheap aggro curve and couldn't. Across 20 picks the only 1- and 2-drops offered were Venom Tender, The Unsung and Overclock Relay. Slot 1 showed Dreadnought on all 20 picks, and slot 3 showed Hymn of Ending until I took two. The "different strategy" I could actually reach was an Overheat/Barrier deck. **Severity: major.** The draft as it stands can't express an archetype.
- **[R1 T1] surprise.** Glass Cannons cut my commander to 22 HP, but **Thick Hull armor (Defense Matrix, T4) is not reduced**. That makes Glass Cannons asymmetric against armored bosses: I lose 14 HP and they keep all 8 armor plus Fortify +5s. **Severity: minor** (balance). Glass Cannons came up in 6 of my 18 launches. It is the most frequent modifier and the one that decided the most games.
- **[R1 T2] bug/text.** The Tactical Advisor said "The Spore Mother starts with two Spore Carriers on the board. Clear them early." Under the Minefield modifier there was **one** Carrier, in both runs. Under Ambush there were two, so the second was probably the Ambush unit. The advisor text assumes the original mission setup. **Severity: polish.**
- **[R1 T2] frustration.** Gravity Snare returned my Venom Tender to hand, and it now costs "4 (base 2)". This is fine as a trap, but in a 20-card deck on Admiral it was a two-turn tempo swing. Minefield is the modifier I'd call swingiest, because the trap type decides how much it hurts.
- **[R1 T3, R2 T3] advisor text.** "Cards that hit every enemy unit at once (Flak Barrage, Broadside, Acid Rain) are worth a slot in your deck **for this whole sector**." There is no sector in the Proving Grounds, and you can't edit your deck mid-run. **Severity: polish.**
- **[Every long game] structural.** A 20-card run deck (plus about 1 spoil per win) against enemy decks of 30+ cards means **I hit fatigue in nearly every game that went past turn 12**. Enemy decks showed "deck 26" at the start against my 16 to 21. I won three games at fatigue and lost one to it. **Severity: major** (balance). The draft size punishes control, which is exactly what the AoE-heavy offers push you toward.
- **[R1 T4] delight.** Defense Matrix's AI EMP'd my Guardian with Disruptor and swung for exact lethal. Deflector Grid re-shielded its Aegis Sentinel to block my Toxic. That's a smart opponent.
- **[R1 T5] boredom.** Jammer Array at trial 5 was the easiest fight of the run. The difficulty curve follows the enemy roster, not the trial number (see Debrief).
- **[R1 T8] unfair-feeling.** Nyra (final boss) on **Veteran Crews + Minefield**, on top of her own "Starts with a Trap armed", meant **2 hidden traps** (Sniper Mine killed my 2-drop on deploy, Psionic Null countered my Fortify). Void Resonance gives +1 spell damage, and her two Void Initiates stack Amplify: Frost Lance did **6 to my face on turn 2**, and Mind Spike hit for 4. I went from 36 to 8 by turn 9 without her ever attacking much. Climactic, yes, but the double trap from Minefield on a trap boss looks like an unintended overlap. **Severity: major** (final-boss tuning).
- **[R1 T8] delight.** Cryo Sentry + Shatter, used as freeze-then-destroy on my Storm Titan, is a great boss combo.
- **[R1 T6, R2 T6] text clarity.** In hand, cards don't show the Veteran Crews +1 (Venom Tender reads 1/2 but deploys as 2/2). Hymn's text still says "Deal 2" when Void Oracle's Amplify makes it 4. Both are visible on the board or in the result, but not when you're planning. **Severity: minor.**
- **[R2 T3] frustration.** "You had a full hand and lost Hollow Choir." The 10-card hand limit came into play because my draft was clunky 5-drops. Fair rule, but the run deck drives it.
- **[R2 T6] AI exploit.** At 6 HP I faced a Bulwark Mech (5 attack) plus Mind Spike (1) = **exact lethal**. The AI instead attacked my Void Oracle with the Bulwark and spent two Frost Lances and Mind Spike on my units. I survived a turn I should have lost. Run 1 had the same pattern: Rourke's Colonial Marine traded into my Storm Titan instead of going face when I was at 8, and Rourke left a Harpoon Gun unused. **The AI doesn't reliably check for lethal before clearing the board.** **Severity: major** (for Admiral credibility).
- **[R2 T6] text.** Psionic Horror: "After you cast a spell, deal 2 damage to a random enemy." It hit the **enemy commander**. "Enemy" includes the commander here, while most "enemy unit" cards say "unit". Not wrong, but I expected units only. **Severity: polish.**
- **[R1 T2/T3] defeat screen.** "What hurt you most: … Card effects 6 damage" included **my own Data Mine self-damage**. That's misleading, because it looks like enemy spells. **Severity: polish.**
- **[R1 spoils] balance oddity.** Spoils offered **Orbital Bombardment (Epic, 7 Energy, deal 4 to all enemy units)** and later **Psionic Storm (Rare, 6 Energy, deal 4 to all enemy units)**. Same text, so the Epic is strictly worse. **Severity: minor** (card balance).
- **[Spoils] combo found.** Void Oracle (Amplify +2) + Acid Rain ("1 damage twice") = 3+3 to every enemy unit for 4 Energy, because Amplify applies per instance. Strong but answerable: every AI EMP'd my Oracle on sight. Stormcaller Rhee (1-cost Legendary, Protocols cost 1 less, Amplify +1) is the best spoil I saw for a spell draft.
- **[Run end] confusion (minor).** The intro says "keep one card from your run deck at 3 wins". In practice the keep happens only when the run ends. `challenge keep` also finishes the run, so a following `challenge finish` says "No run in progress". Fine, but say "when the run ends (if you won 3+)".

### Sector 6 Choir cards and elite Legendaries
- **Hollow Choir** (5 Energy 4/5, Siphon, Deploy: EMP an enemy unit): the best card I drafted. It answers Toxic, Guardian and buffed units, and the Siphon heals won two games. It plays fine with no target ("No valid target right now, so Hollow Choir's targeted effect does nothing"). Clear text.
- **Hymn of Ending** (5 Energy, 2 to all enemy units, draw): solid, and it scales well with Amplify.
- **The Unsung** (2 Energy 1/3, draws at end of turn if hand ≤1): almost never triggered in an AoE-control deck. Weak in this draft.
- **Resonance Wraith** (4 Energy 4/3 Cloak, draw after attacking): strong, and good fuel against fatigue too.
- **Choir Singer, Black-Glass Sentinel** (from the Singularity Pack): no issues spotted.
- **Elite Legendaries offered in spoils:** Stormcaller Rhee, Ixis Brood Queen, Calculus Prime (all at once, T4). Rhee was the obvious pick for my deck. Getting three Legendaries as one spoil felt great, but random: my run-2 T4 spoils were three Rares.

## Quit points
- Run 2, trial 3 second loss (hull 1): "I'm losing to the sector-3 bug mission with a deck the draft forced on me. If I knew the draft was fixed, I wouldn't start a third run." I kept playing, and that run's final retry was a highlight (Nanoforge + Grid). **I would not start a third run** while the draft offers repeat.

## Debrief answers
1. **How you win:** reduce the enemy commander to 0. Three mechanics that mattered: **Overheat** (locks crystals next turn, so two Overheat cards back to back starve you; Overclock Relay offsets it), **EMP** (wipes keywords and buffs, and the AI uses it relentlessly on Guardians, Toxic and Amplify units), and **Barrier** (absorbs one hit, including the Toxic counter-damage. Deflector Grid + Nanoforge is a real engine).
2. **Story:** not relevant to this mode. The trials are a greatest-hits of the war, which is a nice touch (Rourke, Spore Mother, Defense Matrix, Nyra).
3. **Best:** R1 T4 retry, grinding through Defense Matrix's 40+ armor with my deck empty and winning on exact lethal. **Worst:** the draft offering the same three cards pick after pick. **Most confusing:** working out whether the stuck draft was intended.
4. **Difficulty:** follows the enemy roster, not the trial number. In both runs the hardest fights were T2 (Spore Mother elite), T3 (Hive Overseer) and T8 (Nyra). T5 (Jammer Array) and T7 (Twin Minds) were the easiest. The Hive enemies (Toxic 1-drops plus swarm) are much harder for a draft deck than mechs or psionics. The final boss is a fitting climax in strength, but Minefield stacking on Nyra's own trap felt like double-dipping. Admiral is hard but mostly fair. The unfair parts are the 20-card fatigue squeeze and Glass Cannons against armor.
5. **Rewards:** 20 × wins Credits adds up to 560 for 7 wins, which is about 4.5 Supply Packs, generous. The keep-a-card is nice (I took two cards I didn't own). The Singularity Pack at 4 wins was **4 duplicates and 20 Scrap** for me, because a veteran's collection is nearly complete. Contracts and Service Record also progressed during runs, a pleasant surprise. Overall: worth it for Credits, not for packs.
6. **Cutscenes:** none in this mode, which is right.
7. **Play again tomorrow?** Only if the draft offers re-roll each pick and vary between runs. The combat side (modifiers, AI, enemy roster) is good enough to keep me coming back.
8. **One sentence:** "Solid Arena-style mode with a smart AI and great elite spoils, but the draft is currently a fixed list, so every run is the same run."

## Top 5 findings for the designers
1. **The draft offer doesn't re-roll between picks, and the draft, trial order, modifiers, traps and seat order are identical every run** (observed in two runs plus a scratch run). That removes the core decision and all replay variety. Check whether the game's run seed is constant, or whether the harness reseeds the RNG per command (see Harness issues). Either way the real game needs a fresh seed per run and a new offer every pick.
2. **Every draft offer was Rare** (40 of 40 seen). There's no rarity spread and few cheap cards, so archetypes like aggro can't be drafted. Spoils show proper variety, so the draft pool or weighting is probably at fault.
3. **The AI sometimes skips exact lethal** to trade into or remove my units (R2 T6: a 5+1 lethal ignored; R1 T1: Marine traded into Titan at 8 HP). On Admiral this is the one AI weakness I could reliably lean on.
4. **A 20-card run deck against 30-card enemy decks means routine fatigue** in control games. That's 4 of my 13 wins or losses decided near or at fatigue. Consider a 25 to 30 card draft, or smaller trial-enemy decks.
5. **Modifier tuning:** Glass Cannons appeared in 6 of 18 launches and decided the most games. It doesn't reduce boss armor, which makes it asymmetric against armored bosses. Minefield on Nyra stacks with her innate trap, so the final boss gets 2 traps. Overcharged and Veteran Crews felt fair and symmetric, and Ambush was mild. (I only saw 5 of the 9 modifiers because the schedule repeated: Glass Cannons, Minefield, Ambush, Overcharged, Veteran Crews.)

## Suggestions (opinion)
- Re-roll the whole offer after every pick, and seed each run freshly.
- Rarity mix per pick, for example 70% Common/Rare, an Epic every ~4 picks and a Legendary offer at picks 10 and 20.
- Scale the draft deck to 25, or give trial enemies 20-card decks.
- Have Glass Cannons reduce armor too, or exclude it from armored bosses. Don't roll Minefield on trap bosses.
- Make the Singularity Pack reward duplicate-protected, or offer Scrap or Alloy at 8 wins for completionists.
- Show modifier-adjusted stats and Amplify-adjusted spell damage in the hand.
- Fix the Orbital Bombardment (Epic) vs Psionic Storm (Rare) strict-dominance.

## Harness issues (text interface, not the game)
- **Possible cause of finding 1:** if the harness reseeds `Math.random` with a constant on each process, an offer generated at command time comes out the same until the pool changes, which matches exactly what I saw. A designer should check this before treating it as a game bug. Either way, the same seed across new runs (`t8-dev-probe`) points to determinism somewhere.
- `play "Venom Tender"` matched the **first** copy in hand, which was the one Gravity Snare had made cost 4, so the play failed with "Not enough energy" while a 2-cost copy was in hand. Name matching should prefer the playable or cheapest copy.
- `play 8` after earlier plays shifted the hand failed **silently** when output was suppressed (the index was out of range). The error message exists, but it's easy to miss.
- `attack "Void Plunderer" E0` (attacking by name) isn't supported. It shows the usage line. Only A-slots and `#tags` work for attackers.
- `card <enemy-only card id>` returns "No such card" for ids like `gland_grafter` (the actual id is `toxic_spitter`). Card names work.
- The first `challenge finish` after abandoning a run paid out 11 pending campaign Service Record achievements at once (Commissioned, Debt Settled, and so on). That looks like `--from 7` setup leftovers flushing on the first reward screen.
- `challenge keep` also completes the run, so a following `challenge finish` says "No run in progress". Minor.
