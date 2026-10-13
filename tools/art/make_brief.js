// Builds art/BRIEF.md (the single file handed to the image generator) and
// art/manifest.json (the same list, for the ingest script) from the game data.
// Run from the repo root:  node tools/art/make_brief.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Date, Error });
for (const f of ['engine.js', 'cards.js', 'campaign.js', 'lore.js', 'icons.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
const { CARD_LIST, ENEMY_ART, ENCOUNTERS, LORE, FACTIONS } = vm.runInContext('({ CARD_LIST, ENEMY_ART, ENCOUNTERS, LORE, FACTIONS })', ctx);

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sentences = (t, n) => (t || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g)?.slice(0, n).join(' ').trim() || (t || '').trim();
const plain = t => (t || '').replace(/\*\*/g, '');
const FAC_NAME = { fleet: 'Colonial Fleet', raider: 'Belt Raiders', swarm: 'The Swarm', synth: 'Synthetics (Forge)', psi: 'Psionic Orders', void: 'The Choir', neutral: 'Independent' };
const SECTOR_FAC = ['fleet', 'raider', 'swarm', 'synth', 'psi', 'void'];
const TYPE_NOTE = {
  unit: 'Show the unit itself as the hero of the frame.',
  spell: 'A Protocol (tactical order): show the effect happening as a dramatic moment, not an icon.',
  gear: 'Gear: show the item itself, heroically lit, as if on display or in a soldier\'s hands.',
  trap: 'A hidden Trap: show the device or the moment it springs, with a sense of ambush.',
};
const scale = d => d.type !== 'unit' ? '' : d.cost <= 2 ? 'Small, light unit.' : d.cost <= 4 ? 'Medium unit.' : d.cost <= 6 ? 'Large, heavy unit.' : 'Huge, imposing unit (a capital ship, war machine or giant creature).';

// ---------------------------------------------------------------- entries
const PILOT = ['marine', 'vex', 'hive_reaper', 'calculus', 'nyra', 'herald_of_end'];

const cards = CARD_LIST.map(d => ({
  kind: 'card', id: d.id, file: d.id + '.png', ref: 'reference/' + d.id + '.png', name: d.name,
  faction: d.faction, type: d.type, rarity: d.rarity, token: !!d.token,
  stats: d.type === 'unit' ? `${d.atk} attack / ${d.hp} health` : '',
  rules: plain(d.text), flavor: d.flavor || '',
  look: [sentences(LORE.cards[d.id], 2), scale(d), TYPE_NOTE[d.type]].filter(Boolean).join(' '),
}));

const chars = Object.values(LORE.characters || {});
function charFor(name) {
  const base = name.replace(/\s*\((corrupted)\)/i, '').replace(/ (Reborn|Ascendant|Omega|Unbound)$/, '');
  const key = base.split(',')[0];
  return chars.find(c => c.name === name) || chars.find(c => c.name === base) || chars.find(c => c.name.startsWith(key)) || chars.find(c => c.name.includes(key)) || null;
}
const portraits = Object.keys(ENEMY_ART).map(name => {
  const enc = ENCOUNTERS.find(e => e.enemy.name === name), fac = SECTOR_FAC[enc ? enc.sector : 0];
  const c = charFor(name), echo = /Reborn|Ascendant|Omega|Unbound|Corrupted/.test(name);
  let look = c ? sentences(c.body, 2) : '';
  if (!look && enc) look = sentences(enc.story, 2);
  if (fac === 'fleet' && /^Sim /.test(name)) look = 'A training-simulator opponent at the Fleet Academy: a hard-light hologram of a Fleet officer, slightly translucent with faint scan lines. ' + look;
  if (echo) look += ' This is the Choir\'s rebuilt echo of the original: same silhouette, remade in black glass with cracks of red and magenta light, eyes burning.';
  return { kind: 'portrait', id: name, file: 'portrait-' + slug(name) + '.png', ref: 'reference/portrait-' + slug(name) + '.png', name, faction: echo ? 'void' : fac, role: c ? c.role || '' : (enc && enc.boss ? 'Sector boss' : 'Enemy commander'), look: look.trim() };
});
portraits.push({ kind: 'portrait', id: 'commander', file: 'portrait-commander.png', ref: 'reference/portrait-commander.png', name: 'The Commander (the player)', faction: 'fleet', role: 'Player character', look: 'The player\'s commander: a Colonial Fleet officer in a sealed armoured combat helmet with a glowing blue visor (face never shown, so any player can be them), high-collared navy and white armour, determined stance.' });

const all = [...cards.filter(c => PILOT.includes(c.id)).sort((a, b) => PILOT.indexOf(a.id) - PILOT.indexOf(b.id)), ...cards.filter(c => !PILOT.includes(c.id)), ...portraits];
fs.mkdirSync(path.join(ROOT, 'art', 'incoming'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'art', 'manifest.json'), JSON.stringify(all, null, 1));

// ---------------------------------------------------------------- brief
const row = e => e.kind === 'card'
  ? `### ${e.file}\n- **${e.name}** · ${FAC_NAME[e.faction] || e.faction} · ${e.type}${e.token ? ' (token)' : ''} · ${e.rarity}${e.stats ? ' · ' + e.stats : ''}\n- Reference: \`art/${e.ref}\`\n- Show: ${e.look}\n${e.rules ? `- Rules (for context only, never draw text): ${e.rules}\n` : ''}${e.flavor ? `- Flavour: ${e.flavor}\n` : ''}`
  : `### ${e.file}\n- **${e.name}** · ${FAC_NAME[e.faction] || e.faction} · ${e.role}\n- Reference: \`art/${e.ref}\` (follow its costume, silhouette and colours)\n- Who they are (for expression, costume and attitude): ${e.look}\n`;

const md = `# Starfall Protocol: art brief for the image generator

You are painting the card art and character portraits for **Starfall Protocol**, a single-player sci-fi card game. Read this whole file first, then create every image listed under **The images**, saving each one into the folder given below. One image per file, exactly the file names given.

## Where things are

The game folder is \`${path.resolve(ROOT)}\`. All paths below are relative to it.

- **Save every finished image to:** \`art/incoming/\` (already created).
- **Reference images:** \`art/reference/\`. Each image below lists its reference: the game's current code-drawn art for that card. Use it for **subject, pose, composition, colour palette and lighting direction**. Repaint it as finished concept art; don't copy its flat vector look. The references are rough placeholders drawn by code: match **what** they show, not how crudely they show it. Add the detail, anatomy, materials and environment they lack. **If a reference conflicts with the art direction below (for example a robed figure for a Choir card, or a tiny subject), the art direction wins.**
- **Progress log:** append one line per image to \`art/incoming/_log.csv\` in the form \`file,status,notes\`. Status is \`done\`, \`skipped\` or \`redo\`, and notes should be short.

## Art direction

**One game, one hand.** All ${all.length} images must look like they were painted by the same art team for the same game.

- **Medium:** cinematic painted sci-fi concept art at AAA game key-art quality. Painterly but detailed, with realistic materials and readable shapes. Not photographic, not anime, not cartoon, not 3D-render plastic.
- **Mood:** inspired by the look of the Mass Effect games. Grounded, military, hard sci-fi; cool blue-teal shadows against warm highlights; glowing interfaces and emissive details; atmospheric depth. **Do not copy** any Mass Effect characters, armour designs, ships, creatures or logos. Everything here is original.
- **Lighting:** always a strong key light plus a coloured rim light separating the subject from the background, with atmospheric haze or volumetric light behind. Glows (visors, engines, eyes, energy) have soft bloom. Use lens flare sparingly.
- **Composition:** one clear subject with a strong silhouette, readable even as a small thumbnail. A depth background (environment or space), never an empty void and never a busy pattern.
- **Readability at small size (lessons from the pilot).** These images are mostly seen about 100 px wide on a card or a battlefield token, so:
  - **Make the subject big:** it should fill about **70% of the frame height**, with a medium or medium-close camera, not a wide establishing shot. A soldier runs roughly knee to helmet, or full body only if it still fills the height. A creature or machine fills the centre of the frame.
  - **Keep the background calm:** darker, lower contrast, with a shallow depth of field so it softly blurs, and far less clutter than the subject. No busy cityscapes or dense cathedral architecture competing with the subject.
  - **Make the subject the brightest, sharpest, most saturated thing in the frame.** The background supports it and never competes with it.
- **Variety within a faction.** Many cards share a faction (the Fleet alone has a dozen soldiers), so two cards must never look like the same character in a different pose. Make each one distinct by **role**:
  - **Armour weight:** light training kit, standard plates, bulky power armour or an exo-frame.
  - **Helmet:** sealed visor, visor raised showing a face, open-face with a headset, a sensor dome, a breather mask, or bare-headed.
  - **Weapon class:** sidearm, carbine, long rifle, heavy cannon, flamer, riot shield, tools or medical kit.
  - **Stance:** charging, kneeling, braced, mid-throw, operating equipment, at ease.
  - **Colour accents:** stripe colour, rank markings, camouflage, scorched or pristine.

  - **Ships and vehicles:** vary the **camera angle** (side profile, three-quarter from above, looking up from below, head-on) and the **setting**:
    - over a planet's curve;
    - in battle with tracer fire and explosions;
    - docking at a station;
    - leading or breaking from a formation;
    - in an asteroid field or a nebula;
    - on the ground for vehicles.

    Show the scale with escorts, a station or a planet behind. **Never reuse the "ship diving toward the camera through a blue nebula" shot.** It's been used enough.

  - **Faces:** never reuse a face or character across cards. Each human card shows a different person (age, ethnicity, hair, build, gender), except for named characters, who stay consistent with themselves.
  - **Protocols, gear and traps:** no two cards share a composition. If an earlier card already used a "barrel in the corner firing at a target" shot, choose a different one: point of view, scale, setting, or the moment of impact rather than the shot.

  Use the card's name and description to choose. For example, a Cadet is young, in light training armour with the visor up; a Heavy Trooper is a hulking power-armoured gunner. Compare with the faction's images already in \`art/incoming/\` before painting, and change several of these traits so nothing reads as a duplicate.
- **Faction looks** (the faction is listed on every image):
  - **Colonial Fleet** (human military): white and light-grey armour plates with navy accents and thin blue glowing seams, sealed helmets with glowing visors; ships are sleek grey hulls with blue engines. Palette: navy, steel, white, cyan light.
  - **Belt Raiders** (mercenary pirates): mismatched scavenged armour, orange and yellow paint, hazard stripes, rust, cables, smoke, jury-rigged weapons. Palette: rust orange, amber, oily steel.
  - **The Swarm** (insectile alien hive): chitin plates with a wet glossy sheen, mandibles, many limbs, bioluminescent green glands, organic hive caverns. Palette: olive, brown, bile green glow.
  - **Synthetics** (Forge machines): smooth white and graphite plated bodies, one bright cyan optic, geometric precision, foundry backdrops. Palette: graphite, bone white, cyan.
  - **Psionic Orders** (mystic warrior-scholars): robed and lightly armoured figures with masks, wreathed in violet-blue psionic energy that bends the air around them; halos and floating glyph-light. Palette: indigo, violet, silver. **Vary the silhouettes:** not every psionic is a hooded robe with orbs. Use armoured duellists, bare-headed seers, figures mid-gesture, kneeling meditators and different headwear, so cards in this faction are easy to tell apart.
  - **The Choir** (the final enemy): vast black-glass forms, part machine and part organism, shard-like and cathedral-like, with red and magenta light burning inside. Ominous scale. Palette: obsidian, crimson, magenta. **Never draw a Choir subject as a robed, hooded or human-shaped figure.** They are alien constructs: crystalline shards, glass carapaces, organ-like machinery, many-limbed or limbless, faces made of light if any. The only exceptions are the portraits marked as the Choir's rebuilt echo of an earlier character, which keep that character's silhouette.
  - **Independent:** neutral gear and drones; follow the reference's palette.

## Technical specs

| | Cards (the \`<id>.png\` files) | Portraits (the \`portrait-*.png\` files) |
| --- | --- | --- |
| Size | **1536 x 1024 px, landscape** | **1024 x 1024 px, square** |
| Format | PNG | PNG |
| Framing | Subject centred. **Keep the subject's key features inside the middle 50% of the width.** The game also shows a tall centre crop on the battlefield, so the edges must only hold background. Leave about 6% top and bottom that can be cropped. | Head and shoulders, face or helmet centred slightly above the middle, eyes about 40% down from the top. Shown inside a hexagon and a circle, so keep the corners as background. |
| Background | Full-bleed environment to every edge | Atmospheric, softly blurred background in the faction's palette |

**Never include:** any text, letters, numbers, logos, symbols that read as writing, UI, card frames, borders, stat boxes, watermarks or signatures. No real people's likenesses. Nothing gory: violence is implied, not shown.

## How to work

1. Start with the first six images (one per faction). They are the style pilot; save them and note them in the log.
2. Continue down the list in order. Save each image as soon as it's done, so progress is never lost.
3. **Never overwrite an existing file in \`art/incoming/\`**, unless asked to redo it. If a file already exists, skip it and move on, so the job can be restarted at any time.
4. If an image comes out with text, a frame, a broken limb, or off-style, regenerate it before saving.
5. Keep the style consistent: before each new image, look at two or three you have already saved.

## The images (${cards.length} cards, then ${portraits.length} portraits)

${all.map(row).join('\n')}`;
fs.writeFileSync(path.join(ROOT, 'art', 'BRIEF.md'), md);
console.log(`BRIEF.md ${Math.round(md.length / 1024)} KB, ${all.length} images (${cards.length} cards + ${portraits.length} portraits). Pilot: ${PILOT.join(', ')}`);
