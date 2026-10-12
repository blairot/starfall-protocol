'use strict';
// ============================================================================
// STARFALL PROTOCOL — line icon set (24×24, stroke = currentColor)
// ============================================================================

const ICONS = {
  alloy: '<path d="M3 15l5-9h8l5 9-5 4H8z"/><path d="M8 6l4 9 4-9M3 15h18"/>',
  station: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>',
  reactor: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6 8.6 4 6 4.6 4.2 5 4 7.6 5.4 9.6M14.2 12.4c4.2.2 6.7 1 6.9 3.6.1 1.9-2.2 3-4.6 2.5M10.6 13.8c-2.2 3.6-3.9 5.5-6.3 4.6-1.7-.7-1.6-3.2-.1-5"/>',
  medbay: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  antenna: '<path d="M12 11v10M8 21h8M12 11l-5-7M12 11l5-7"/><path d="M6.5 8.5a7.5 7.5 0 0 1 11 0"/>',
  scope: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  dock: '<path d="M3 17h18M5 17V9l7-5 7 5v8"/><path d="M9 17v-5h6v5"/>',
  book: '<path d="M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5z"/><path d="M12 6v13.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  command: '<path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"/><path d="M9 12l2 2 4-4"/>',
  credits: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 7.5v9M9.3 9.6h5.4M9.3 14.4h5.4"/>',
  scrap: '<circle cx="12" cy="12" r="3.4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  pack: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  elite: '<path d="M5 9l7-5 7 5M5 14l7-5 7 5M5 19l7-5 7 5"/>',
  boss: '<path d="M3 19h18M4 19L3 8l5 4 4-7 4 7 5-4-1 11z"/>',
  contract: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V2.5h6V4M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  toxic: '<path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  siphon: '<path d="M12 3c2.5 3.8 5 6.5 5 9.5a5 5 0 0 1-10 0c0-3 2.5-5.7 5-9.5z"/><path d="M12 9v6M9.5 12.5L12 15l2.5-2.5"/>',
  twin: '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
  amplify: '<path d="M3 12h3l3-7 4 14 3-7h5"/>',
  salvage: '<path d="M4 19l5-9 3 5 2-3 6 7z"/><path d="M14 7l2-2M18 10l2.5-1M10 6V3"/>',
  effect: '<rect x="7" y="7" width="10" height="10"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  cryo: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
  trap: '<path d="M12 3l9 9-9 9-9-9z"/><circle cx="12" cy="12" r="1.6"/>',
  hidden: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M10 10a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.6M12 16v.4"/>',
  wrench: '<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3 6.7 20l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
  bolt: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  drone: '<circle cx="12" cy="12" r="3"/><path d="M9.8 9.8L6.5 6.5M14.2 9.8l3.3-3.3M9.8 14.2l-3.3 3.3M14.2 14.2l3.3 3.3M3 6.5h7M14 6.5h7M3 17.5h7M14 17.5h7"/>',
  blade: '<path d="M4 20l3-3M5.5 14.5l4 4M8 16L20 4l-2 6-8 8"/>',
  helix: '<path d="M8 3c0 6 8 6 8 9s-8 3-8 9M16 3c0 6-8 6-8 9s8 3 8 9M9.2 6.5h5.6M9.2 17.5h5.6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5M10 10h4v4h-4z"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  burst: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M5 19l3.5-3.5M15.5 8.5L19 5"/>',
  swarm: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><circle cx="12" cy="16" r="3"/>',
  cube: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 12l8.5-5M12 12L3.5 7M12 12v10"/>',
  psi: '<path d="M12 4a7 7 0 0 1 7 7c0 3-2 4.5-2 7H7c0-2.5-2-4-2-7a7 7 0 0 1 7-7z"/><path d="M9 21h6M12 8v5M9.5 10.5L12 13l2.5-2.5"/>',
  corrupt: '<path d="M12 4v14M6 12l6 6 6-6"/><path d="M4 4l3 3M20 4l-3 3"/>',
  lash: '<path d="M2 12c3-6 5-6 8 0s5 6 8 0 3-4 4-4"/>',
  void: '<circle cx="12" cy="12" r="3.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/>',
  flag: '<path d="M5 21V4M5 4h12l-3 4 3 4H5"/>',
  growth: '<path d="M12 21V10M12 10c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
  hull: '<path d="M3 7h18v10H3z"/><path d="M3 11h18M8 7v10M16 7v10"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.3 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  song: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  entropy: '<path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9"/>',
  hunger: '<path d="M3 8c3 4 15 4 18 0M3 16c3-4 15-4 18 0"/><path d="M7.5 10.2l.8 1.8M12 10.9v1.9M16.5 10.2l-.8 1.8M7.5 13.8l.8-1.8M16.5 13.8l-.8-1.8"/>',
  armor: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12h7M12 8.5v7"/>',
  deck: '<rect x="7" y="3" width="12" height="17" rx="1"/><path d="M4 6v14a1 1 0 0 0 1 1h11"/>',
  heal: '<path d="M12 5v14M5 12h14"/>',
  ice: '<path d="M12 2l3 6-3 14-3-14z"/>',
};

function ico(name, cls) { return `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.effect}</svg>`; }

const POWER_GLYPH = { repair: 'wrench', pulse: 'bolt', drone: 'drone', blade: 'blade', mutagen: 'helix', plating: 'shield', datamine: 'chip',
  target_practice: 'target', cannon_volley: 'burst', broadside_power: 'burst', spawn_brood: 'swarm', reconfigure: 'cube', mind_spike: 'psi',
  corrupt: 'corrupt', void_lash: 'lash', unmake: 'void' };
const PASSIVE_GLYPH = { boarding_party: 'flag', brood_growth: 'growth', adaptive_armor: 'armor', void_resonance: 'psi', thick_hull: 'hull',
  veteran_crew: 'star', rapid_deploy: 'clock', singularity: 'void', choir_song: 'song', entropy: 'entropy', hunger: 'hunger' };
const powerIco = id => ico(POWER_GLYPH[id] || 'effect');
const passiveIco = id => ico(PASSIVE_GLYPH[id] || 'effect');

// Portrait subjects for commanders, bosses, sectors and pack sets.
const SECTOR_ART = [['ship', { size: 1 }], ['ship', { wreck: 1 }], ['bug', { queen: 1 }], ['structure', { type: 'factory' }], ['psion', { halo: 2 }], ['horror', { maw: 1, giant: 1 }]];
const PLAYER_ART = ['bust', { helm: 1 }];
