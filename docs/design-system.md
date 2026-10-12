# Starfall Protocol: Fleet Tactical Interface (FTI)

The design system for every screen in the game. Visual reference since October 2026:
Mass Effect's holographic interfaces (evoke, never copy: no logos or recognisable designs). All tokens live at the top of
`css/style.css`. Anything new must be built from these parts. If a new part
is needed, add it here first.

## 1. Principles

1. **Glass and light.** Every surface is a hologram projected from ship
   equipment: translucent navy glass with a faint hex texture, a lit top
   edge and bright corner brackets. Never a flat rectangle with a 1px
   border. If it looks like a web form, it is wrong.
2. **Light carries meaning.** Colour comes from light sources (lamps, screens,
   glows), never from large flat fills. Each colour has one job (see §2).
   Glow is reserved for things that are live or interactive.
3. **The sector tints the ship.** Chrome picks up the current sector's hue
   (`--sec-h`). Fleet Academy is cold blue, the Scrap Belt rust, the Hive
   Nebula sickly green, and so on. Semantic colours never change.
4. **Cut, never round.** Corners are 45° chamfers (top-left and bottom-right).
   No `border-radius` anywhere except lamps and planets.
5. **Things power on.** Panels and dialogs arrive with a scan/flicker
   (`--ease-out`, 240–420ms), not a web-style fade. Respect reduced motion.
6. **No terminal look.** No monospace fonts, no `>` prompts, no plain grey
   hairline boxes. Data readouts use the label face with tabular numbers.

## 2. Colour

| Token | Use |
| --- | --- |
| `--void` | Page background behind everything |
| `--hull-0 … --hull-3` | Panel fills, from deepest screen to raised metal |
| `--metal-hi / --metal-lo` | Bevel highlights and frame gradients |
| `--edge-1 / --edge-2 / --edge-3` | Hologram-blue frame edges: quiet, normal, active |
| `--holo / --holo-hi` | Hologram light: panel headers, selection bars, orbit rings, glows |
| `--t-1 … --t-4` | Text: primary, secondary, tertiary, disabled |
| `--amber` | **Command.** Your actions, primary buttons, selection, Attack |
| `--cyan` | **Systems.** Energy, information, neutral highlights |
| `--red` | **Hull and hostiles.** Health, damage, enemy side, danger |
| `--green` | **Ready.** Playable cards, units that can attack, success |
| `--violet` | **Psionic and hidden.** Traps, EMP, Psionic faction |
| `--gold` | **Prestige.** Legendary, elite missions, rewards |
| `--sec-h` | Hue (0–360) of the current sector; tints chrome and backdrops |

Rarity: common steel `--r-common`, rare blue `--r-rare`, epic purple `--r-epic`,
legendary amber `--r-legendary`.

Factions keep the hues defined in `FACTIONS` (cards.js) and are passed to
elements as `--h`.

## 3. Type

| Face | Token | Use |
| --- | --- | --- |
| Michroma | `--f-hero` | Big titles only: logo, screen and dialog headings, cutscene titles, banners. Wide, so keep sizes modest and tracking `.05–.1em` |
| Titillium Web 600/700 | `--f-display`, `--f-label` | Buttons, nav, names, labels, tabs, readouts. Uppercase, tracked `.14–.3em` |
| Titillium Web 400 | `--f-body` | Prose, rules text, lore, tips. Sentence case |
| Saira Semi Condensed 600/700 | `--f-card` | Printed on cards, units and commanders: names and stat numbers |

Scale (px): 11 · 12 · 13 · 15 · 17 · 20 · 26 · 34 · 48 · clamp() for the logo.
Body copy is 15–17px with 1.5 line height. Never set prose in uppercase.

## 4. Shape and depth

* Chamfer sizes: `--cut-xs 5px` (chips), `--cut-s 8px` (buttons),
  `--cut-m 14px` (panels), `--cut-l 22px` (dialogs, hero panels).
* **Frame recipe** (`.frame` and the panel list in style.css): translucent
  sector-tinted glass with a faint hex texture and grain, a thin hologram
  edge, a lit top line, two diagonal corner strokes on the cut corners, bright
  L-shaped corner brackets on the other two (`--brk`), and an optional accent
  tab (`--tab`) on the top edge.
* **Selection is light.** Hover and active states are light bars sweeping in
  from the left (`.tm`), glowing text, and small amber markers. Not boxes
  changing colour.
* **Circles for places, hexes for things.** Star systems on the map are
  ringed circles (orbit ring, spinning dashed ring on the next mission);
  station modules, commanders and powers stay hexagonal.
* Elevation is light, not shadow: raised = brighter top bevel; active =
  coloured edge (`--edge-3` or a semantic colour) plus a soft outer glow.
* Screens inside frames (`.screen-inset`) are darker, with faint scanlines.

## 5. Motion

| Token | Value | Use |
| --- | --- | --- |
| `--d-fast` | 120ms | Hover, press |
| `--d-med` | 240ms | Panel state changes, tabs |
| `--d-slow` | 420ms | Dialog power-on, screen change |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | Almost everything |
| `--ease-snap` | `cubic-bezier(.2,1.3,.4,1)` | Cards and units landing |

Patterns: `powerOn` (scaleY from a scanline plus a brightness flash) for
dialogs; `riseIn` (12px rise plus fade) for staggered lists; hover sweep (a
diagonal sheen across buttons). All animations collapse under
`prefers-reduced-motion`.

## 6. Components

| Component | Class | Notes |
| --- | --- | --- |
| Panel | `.frame` (`.frame.glass`, `.frame.inset`, `.frame.alert`) | Default container. `--tab` adds the accent tab |
| Panel header | `.ph` | Label face, lamp at the left, rule running right, optional meta at the right |
| Button | `.btn` + `.primary` `.danger` `.ghost` `.small` `.big` `.wide` | Chamfered metal plate. Primary is lit amber glass |
| Command bar | `.cmd-bar` / `.cn` | Top navigation on menu screens |
| Tabs | `.tabs` | Label face; active tab has an amber underglow |
| Segmented | `.seg` | Mutually exclusive options |
| Switch | `.switch` | Toggle with a lamp |
| Chip / pill | `.chip` `.pill` | Small labels; `.pill.new` is lit |
| Badge | `.badge` | Red count lamp |
| Readout | `.readout` | Label over a big tabular number |
| Meter | `.meter` (`.ct-bar`, `.st-prog`) | Segmented progress bar |
| Lamp | `.lamp` (`.ok` `.warn` `.bad`) | Status light |
| Dialog | `.modal > .m-box` | Holo dialog with power-on; content scrolls inside `.m-in` |
| Toast | `.toast` | Top-centre notice |
| Tooltip | `#tooltip` `.tip-side` | Enlarged card beside a details panel |
| Inspect | `.inspect` | Full card dossier: large card, rules, keywords, lore |
| Game card | `.card` | Fixed proportions, scales with `font-size` |
| Unit token | `.unit` | On-board unit |
| Commander | `.hero` | Portrait hex plus nameplate |

## 7. Battle layout

* Backdrop: the sector's painted space scene (`Scene.backdrop(hue)`) under a
  perspective holo-table. Enemy half is tinted red, player half cyan.
* Left wing: mission plate, Tactical Advisor (comm panel), combat feed.
* Right wing: enemy intel, END TURN, energy crystals, deck.
* Both commanders show their energy, so you can always see what the enemy
  can afford.

## 8. Writing in the UI

Plain English, short and concrete. Labels are nouns ("Energy", "Deck").
Buttons are verbs ("Launch", "Repair", "Inspect"). Lore and story text is
in-world, so no game terms like "click". Rules text is game terms, so no lore.
