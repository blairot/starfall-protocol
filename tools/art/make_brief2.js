// Builds art/BRIEF2.md and art/manifest2.json: the second art pass (packs, cutscene
// stills, Anchorage station, sector vistas, end screens, card back, app icon).
// Run from the repo root:  node tools/art/make_brief2.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Date, Error });
for (const f of ['engine.js', 'cards.js', 'campaign.js', 'economy.js', 'lore.js', 'cinematics.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
const { LORE, SECTORS, PACK_SETS, CINEMATICS } = vm.runInContext('({ LORE, SECTORS, PACK_SETS, CINEMATICS })', ctx);
const first = (t, n) => ((t || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [t || '']).slice(0, n).join(' ').trim();
const L = 'landscape 1536 x 1024', P = 'portrait 1024 x 1536', S = 'square 1024 x 1024';

const items = [];
const add = (kind, id, size, title, show, refs) => items.push({ kind, id, file: id + '.png', size, title, show, refs: refs || [] });

// ---------------------------------------------------------------- 1. pack fronts
const packLook = [
  ['Fleet Academy', 'A Colonial Fleet frigate launching from a bright orbital academy station over a blue world, a squad of white-armoured cadets in the foreground silhouette.', ['marine.png', 'star_cruiser.png']],
  ['The Scrap Belt', 'A rust-orange raider gunship bursting out of a debris field of wrecked hulls, salvage drones and sparks, a masked raider silhouette in the foreground.', ['vex.png', 'shadow_corsair.png']],
  ['The Hive Nebula', 'A towering Swarm creature rearing up in a glowing green hive cavern, eggs pulsing, many smaller creatures swarming below.', ['hive_reaper.png', 'broodmother.png']],
  ['The Forge Worlds', 'A massive white-and-graphite Synthetic war machine with a single cyan optic striding out of a burning foundry, drones overhead.', ['calculus.png', 'storm_titan.png']],
  ['The Void Expanse', 'A Psionic Hierarch rising in a dark violet void, psionic energy tearing space around her, crystal shards orbiting.', ['nyra.png', 'psionic_storm.png']],
];
PACK_SETS.forEach((set, i) => add('pack', `pack-${set.tier}`, P, `${set.name} (Supply Pack front)`,
  `Vertical key art for the front of a card booster pack for the ${packLook[i][0]} set. ${packLook[i][1]} Dramatic, iconic, poster-like. **Keep the bottom 25% darker and simpler**: the game prints the pack's name there. No text.`, packLook[i][2]));

// ---------------------------------------------------------------- 2. cutscene stills (replace the flat ship silhouettes)
const STILLS = {
  'opening-2': 'The Starfall, the year 2219. An enormous ancient alien ring-gate (a "Lamp", the structure that anchors a warp lane) flares blindingly white and dies. Ships are torn out of the lane around it, and over the colony of New Lagos far below, burning ships fall through the night sky like meteors. Tragic, vast scale.',
  'opening-5': 'Arden Point, the Colonial Fleet Academy: a large orbital station high above the blue world Concord, with a lit ring and docking arms. Small shuttles of new cadets arrive. Hopeful, orderly, military.',
  's1-5': 'The frigate Meridian (the player\'s ship: a Kestrel-class Fleet frigate, sleek white-grey hull with navy stripes, one dorsal turret, about 60 crew) departing Arden Point under full burn, blue engine plumes, the station behind. A new command.',
  's2-1': 'Captain Vex\'s flagship the Bad Debt (a huge patched-together rust-orange raider capital ship) dying in the Scrap Belt: lights going out deck by deck, hull breaches venting, debris and small fires, the Meridian small in the distance.',
  's3-3': 'After the Brood Queen\'s death: the Swarm scattering. Streams of thousands of insectile creatures pour away through the sickly green Hive Nebula, the nebula\'s glow fading behind them.',
  's5-6': 'The Meridian, alone and tiny, setting course for the galactic core: ahead, a colossal blazing accretion disc around a black centre, violet and magenta light. Awe and dread.',
  'finale-6': 'Epilogue, peace. A Lamp ring-gate burning steadily and quietly with soft light, the Meridian passing through it, a Forge world\'s city lights below and dawn breaking over the planet\'s edge. Calm, earned, beautiful.',
};
for (const [cid, cine] of Object.entries(CINEMATICS)) cine.shots.forEach((s, i) => {
  const key = `${cid}-${i}`; if (s.type !== 'ship' || !STILLS[key]) return;
  const said = (s.lines || []).map(l => l.text).join(' ');
  add('still', `still-${key}`, L, `Cutscene still: "${cine.title}"`, `${STILLS[key]} The narration over this shot says: "${said}" Cinematic widescreen composition; the camera slowly pans across it, so keep the subject in the middle 60%.`, ['star_cruiser.png', 'patrol_frigate.png', 'battlecruiser.png']);
});

// ---------------------------------------------------------------- 3. Anchorage station
add('station', 'station-exterior', L, 'Anchorage station: exterior', `${first(LORE.places.anchorage && LORE.places.anchorage.body, 3)} Show the whole station from outside: an old Fleet waystation with a central hub, docking spars and a big ring, scarred and partly stripped by raiders, a few sections lit as the Commander restores it. Asteroids of the Scrap Belt and a distant ring-gate (Lamp Nine) behind.`, ['salvaged_hull.png', 'cargo_hauler.png']);
for (const [id, m] of Object.entries(LORE.station || {})) add('module', `module-${id}`, L, `Anchorage module: ${m.name}`, `Interior of the ${m.name} aboard Anchorage station. ${first(m.body, 3)} Lived-in, battered Fleet engineering, half restored: some panels dark and damaged, others newly lit in cyan. No people or one small figure for scale.`, ['field_engineer.png', 'reactor_core.png']);

// ---------------------------------------------------------------- 4. sector vistas
SECTORS.forEach((sec, i) => {
  const pl = LORE.places[sec.id] || {};
  add('sector', `sector-${sec.id}`, L, `Sector ${i + 1} vista: ${sec.name}`, `An establishing landscape of ${sec.name} (${sec.sub}). ${first(pl.body, 3)} A sweeping location shot (orbit, surface or space), no characters in the foreground. It's used as a banner and in the game's Archive, so make the location itself the star.`, []);
});

// ---------------------------------------------------------------- 5. end screens
add('screen', 'screen-victory', L, 'Victory screen', 'Triumph after a battle: Fleet ships holding formation as the smoke clears, the Meridian in front catching a sunrise over a planet\'s edge, debris of the beaten enemy drifting away. Heroic, warm light.', ['star_cruiser.png']);
add('screen', 'screen-defeat', L, 'Defeat screen', 'A hard loss: the damaged Meridian withdrawing through smoke and debris, hull sparking, emergency lights red, the enemy force looming behind. Sombre, cold, but not hopeless.', ['patrol_frigate.png']);
add('screen', 'screen-ending', L, 'Campaign ending', 'The war is over. At the galactic core the vast black disc has collapsed into a small, quiet star. The Meridian turns for home, silhouetted against its gentle light, with the whole galaxy spread behind. Peaceful and awe-filled.', []);

// ---------------------------------------------------------------- 6. card back + app icon
add('cardback', 'card-back', P, 'Card back', 'The back of every card: a symmetrical emblem centred on a dark navy field. The emblem is a falling star streaking diagonally across a hexagonal badge with an amber rim and a thin cyan inner line, engraved metal frame details around the edge, subtle hex-pattern texture. Symmetric, iconic, no text.', []);
add('icon', 'app-icon', S, 'App icon', 'The game\'s home-screen icon: a bold falling star streaking diagonally across a hexagonal badge (amber rim, dark glass inside, cyan inner line), deep-space background with a warm nebula glow. It must read clearly at 60 px: big simple shapes and strong contrast. Keep the whole emblem inside the middle 80% (phones crop the corners into a rounded square or a circle). No text.', []);

fs.writeFileSync(path.join(ROOT, 'art', 'manifest2.json'), JSON.stringify(items, null, 1));
const md = `# Starfall Protocol: art brief, part 2 (${items.length} images)

The card art and portraits are done (see \`art/BRIEF.md\` and the finished images in \`art/incoming/\`). This second pass replaces the last code-drawn images: Supply Pack fronts, cutscene stills, Anchorage station, sector vistas, end screens, the card back and the app icon.

## Before you start

1. Read **art/BRIEF.md**, sections "Art direction" and "Readability at small size". Everything there applies here too: the same painterly AAA concept-art finish, Mass Effect-like mood, key plus rim lighting, faction looks, no text, logos, frames or watermarks.
2. Open 6–8 finished images in \`art/incoming/\` (for example marine, vex, star_cruiser, battlecruiser, hive_reaper, calculus, nyra, herald_of_end) and match their style exactly. Each item below also lists a couple of existing images as style references.
3. Save every image to **art/incoming/** with the exact file name given. Never overwrite an existing file unless asked to redo it. Append a line per image to \`art/incoming/_log.csv\` (\`file,status,notes\`).

## Sizes

| Kind | Size | Notes |
| --- | --- | --- |
| Pack fronts | ${P} | Bottom 25% darker and simpler (the pack name is printed there) |
| Cutscene stills, station, modules, sectors, end screens | ${L} | Shown full-screen and slowly panned, so keep key subjects in the middle 60% |
| Card back | ${P} | Symmetrical emblem, centred |
| App icon | ${S} | Emblem inside the middle 80% |

## The images

${items.map(e => `### ${e.file}\n- **${e.title}** · ${e.size}\n- Show: ${e.show}\n${e.refs.length ? `- Style references: ${e.refs.map(r => '`art/incoming/' + r + '`').join(', ')}\n` : ''}`).join('\n')}`;
fs.writeFileSync(path.join(ROOT, 'art', 'BRIEF2.md'), md);
console.log(`BRIEF2.md ${Math.round(md.length / 1024)} KB, ${items.length} images`);
