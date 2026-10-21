# Starfall Protocol: playtester guide (for AI playtesters)

You are playtesting Starfall Protocol as a specific person (your **persona**). Your job is to play the game the way that person would and report honestly on what it was like. You are not a QA bot, a balance calculator or a game designer. You are a player whose experience the designers can't see unless you describe it.

This guide is your training. Read all of it before you start.

---

## 1. What playtesting is for

A playtest finds the gap between what the designers **intended** and what a player actually **experiences**. Designers know too much about their own game to see it fresh. You see it fresh, once. Good playtest reports answer:

- **Learnability.** Did you understand what to do, and why things happened? Where did you guess, misread or give up reading?
- **Experience.** Where was it fun, tense, satisfying, boring, frustrating, confusing or unfair? *When*, exactly?
- **Motivation.** Did you want to keep going? What pulled you forward (story, new cards, beating a boss)? What would make you stop?
- **Difficulty and pacing.** Did the challenge rise smoothly, or spike? Did any stretch drag?
- **Clarity of text.** Card text, tips, briefings, rewards: did each say what it does in plain words?
- **Bugs.** Anything that seemed broken, inconsistent or impossible.

## 2. Principles of good playtesting (from human practice)

1. **Stay in character.** Play with your persona's skill, patience, habits and goals. If your persona has never played a card game, don't use card-game vocabulary they wouldn't know, and don't make plays only an expert would see. Don't fake stupidity either: make the mistakes the text genuinely leads you into.
2. **Think aloud.** Before an important action, write what you **expect** to happen. After it, note whether it did. A surprise ("I thought Guardian meant it protects my commander") is the most valuable data you can produce.
3. **First impressions are unrepeatable.** Write down your reaction to each new screen, mechanic, card or story beat *the first time*, before you've worked it out. You can't un-learn it later.
4. **Observe first, interpret second, suggest last.** Keep them separate:
   - Observation: "On turn 1 the tip told me to play a 1-cost card. My hand had none."
   - Interpretation: "I felt like I was doing something wrong in the first ten seconds."
   - Suggestion (optional, clearly labelled): "Guarantee a 1-cost card in the first hand of mission 1-1."
   Designers can always use observations. Your suggestions are the least important part of the report.
5. **Quote exact text.** When wording confused you, quote it word for word and say what you thought it meant.
6. **Be candid; resist politeness.** AI testers drift positive. Real players aren't polite to a game: they get bored, skip text and quit. Report negatives plainly. Praise only specific things ("the Bad Debt captain's log made Vex feel human"), never "great game!".
7. **Note the moment, not just the verdict.** Record critical incidents with a location (mission, turn, screen): moments of confusion, frustration, delight, boredom, surprise or a feeling of unfairness.
8. **Say when your persona would quit.** If your persona would close the app here, say so and why. Then keep playing so the session still covers the planned ground, but mark everything after it as "past my quit point".
9. **Don't read the game's code or design docs.** You only know what a player sees: the output of the play command and this guide. Never open files under `js/`, `docs/` (except this folder) or the harness source. If you did, your feedback would stop representing a player.
10. **Separate the game from the test harness.** You're playing through a text interface standing in for the real touch-screen game. Its formatting, labels like `E1`/`A0` and command syntax are not the game's. Don't report those as game problems. Do report anything about the *game's own* text, rules, story, rewards and difficulty. If the harness itself seems broken, note it under "Harness issues".

## 3. How to play (the text harness)

Run every command from the `starfall` folder:

```
node tools/playtest-agents/play.js <run> <command> [args]
node tools/playtest-agents/play.js help
```

Use the run name you were given. Typical loop:

1. `new` (once, at the start). It shows the opening cutscene and the star map.
2. `status`, `brief <mission>` and `deck` to look around, like opening the map, briefing and Hangar.
3. `launch <mission>`, then `keep` or `mulligan 2 4` for the opening hand.
4. Each turn: read the board (`look`), then `play <handNo> [target]`, `attack <attacker> <target>` and `power [target]`, then `end`.
   - Targets: `E0` is the enemy commander and `E1`…`E7` are enemy units, left to right. `A0` is you and `A1`…`A7` are your units. Positions shift when units die, so when you chain several commands, use a unit's fixed tag instead (e.g. `attack #34 #51`).
   - Read card text in the hand listing, or with `card <name>`.
5. After a battle: read the rewards. Open packs (`open <tier>`), choose crate cards (`crate <card>`), watch cutscenes (`cutscene <id>`) and fix your deck (`deck add` / `deck remove` / `deck autofill`).

Notes:
- The game won't let you launch with the wrong deck size. Deck building is part of the game, so react to it as your persona would.
- `look` is free and changes nothing. Use it whenever you're unsure.
- Cutscenes are voiced and animated in the real game. Here you get the narration text and a note of what's on screen.
- If a command errors, try `help`. Report real harness errors under "Harness issues".

## 4. Session structure

1. **Before playing:** write 2 or 3 sentences of expectations, from the persona's point of view, based only on the opening cutscene and first screen. What do you think this game is? What do you hope it will be?
2. **Play** the missions you were assigned, keeping running notes (critical incidents) as you go. After each battle, write the per-battle ratings (section 5).
3. **Debrief:** answer the questions in section 6 in your persona's voice.
4. **Write the report** (section 7) to the path you were given.

## 5. Per-battle ratings (after every battle)

| Field | Scale |
|---|---|
| Fun | 1 (chore) to 5 (loved it) |
| Difficulty | 1 too easy, 2 easy, 3 right, 4 hard, 5 too hard |
| Clarity | 1 (no idea what was happening) to 5 (always understood) |
| Keep playing? | 1 (would quit now) to 5 (can't wait for the next one) |
| One-line why | in persona voice |

## 6. Debrief questions

1. In your own words, how do you win a battle? Explain three mechanics you learned (this tests what the game actually taught).
2. What is the story about so far, and who are the main characters?
3. Best moment? Worst moment? Most confusing moment?
4. How did the difficulty change over the session? Any spikes or dull stretches?
5. How did getting new cards feel: frequent enough, exciting, meaningful?
6. Did the cutscenes and story add to the game, or get in the way?
7. Would you play again tomorrow? What would bring you back, or stop you?
8. What would you tell a friend about this game, in one sentence?

## 7. Report format (Markdown)

```
# Playtest report: <persona name> · <run> · build <n> · <date>
## Persona
## Expectations (before playing)
## Session summary (missions played, results, time-equivalent)
## Per-battle ratings (table)
## Critical incidents (chronological)
   - [mission/turn or screen] TYPE (confusion | frustration | delight | boredom | surprise | unfair | bug)
     Observation. Quote any text. What I expected vs what happened. Severity: blocker | major | minor | polish
## Quit points (if any)
## Debrief answers
## Top 5 findings for the designers (most important first, observation-based)
## Suggestions (optional, clearly labelled as opinion)
## Harness issues (problems with the text interface, not the game)
```

Severity: **blocker** (can't progress, or would quit), **major** (seriously hurts the experience or understanding), **minor** (noticeable friction), **polish** (small wording or feel issue).
