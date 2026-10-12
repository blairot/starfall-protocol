# Starfall Protocol

A single-player sci-fi card game in the style of Hearthstone: a 41-battle campaign across six sectors that teaches one mechanic at a time and builds to a final boss. Plain HTML, CSS and JavaScript with no build step.

## Run it

Serve the folder with any static server and open `index.html`:

```bash
python -m http.server 8765
```

The published build is a claude.ai artifact (private link). To publish, the page is `index.html` with its doctype, html, head and body tags stripped, plus every file in `css/` and `js/`.

## Layout

| Path | What it is |
| --- | --- |
| `js/engine.js` | Game rules: state, cards in play, combat, triggers |
| `js/cards.js` | Every card, keyword, commander power, boss passive and phase |
| `js/ai.js` | Enemy AI (greedy search with focus-fire planning) |
| `js/campaign.js` | Sectors, the 41 encounters, decks, saves |
| `js/economy.js` | Credits, packs, Scrap, crafting, contracts, Alloy |
| `js/station.js` | Anchorage station modules and screen |
| `js/lore.js` | Universe lore, records and card dossiers (data only) |
| `js/ui.js`, `shop.js`, `inspect.js` | Screens: battle, map, hangar, depot, inspector, Archive |
| `js/art.js`, `illustrations.js`, `icons.js`, `scene.js` | Procedural art, icons and the animated backdrop |
| `js/audio.js` | Settings, sound effects and generative music |
| `css/style.css` | All styling, built on the design system |
| `docs/design-system.md` | Style guide: follow it for any new UI |
| `docs/story-bible.md` | Canon and tone rules for any new story content |
| `tools/preview.html` | Dev harness that stages a screen for screenshots (not published) |

## Versions

Each build sent to playtesters gets a tag (`v0.1-core`, `v0.2-alpha`, ...).
