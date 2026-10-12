'use strict';
// ============================================================================
// STARFALL PROTOCOL — settings, sound effects and generative ambient music
// All audio is synthesized live with WebAudio: no sound files.
// ============================================================================

// ---------------------------------------------------------------- settings (per device)
const SETTINGS_KEY = 'starfall_protocol_settings_v1';
const Settings = {
  defaults: {
    master: 80, music: 55, sfx: 75, muted: false,
    speed: 'normal',        // normal | fast | instant
    particles: true, shake: true, hoverZoom: true,
    tips: true, log: true, confirmEnd: false, autoEnd: false,
  },
  v: null,
  load() { let s = null; try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); } catch (e) { s = null; } this.v = Object.assign({}, this.defaults, s || {}); },
  get(k) { if (!this.v) this.load(); return this.v[k]; },
  set(k, val) {
    if (!this.v) this.load();
    this.v[k] = val;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.v)); } catch (e) { /* storage blocked */ }
    AudioBus.applyVolumes();
    document.body.classList.toggle('no-zoom', !this.v.hoverZoom);
  },
};
Settings.load();

const SPEED = { normal: 1, fast: 0.55, instant: 0.12 };

// ---------------------------------------------------------------- audio graph
const AudioBus = {
  ctx: null, master: null, musicBus: null, sfxBus: null, reverb: null, delay: null,
  init() {
    if (!this.ctx) {
      try {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        const c = this.ctx = new C();
        this.master = c.createGain(); this.master.connect(c.destination);
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
        comp.connect(this.master);
        this.musicBus = c.createGain(); this.musicBus.connect(comp);
        this.sfxBus = c.createGain(); this.sfxBus.connect(comp);
        // reverb: synthesized impulse response
        this.reverb = c.createConvolver(); this.reverb.buffer = this.impulse(3.8, 2.6);
        const rvGain = c.createGain(); rvGain.gain.value = 0.9; this.reverb.connect(rvGain).connect(this.musicBus);
        // feedback delay for the arpeggio
        this.delay = c.createDelay(2); const fb = c.createGain(); fb.gain.value = 0.42; const dl = c.createGain(); dl.gain.value = 0.5;
        this.delay.connect(fb).connect(this.delay); this.delay.connect(dl).connect(this.reverb);
        this.applyVolumes();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    Music.ensure();
  },
  impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  },
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, m = Settings.get('muted') ? 0 : Settings.get('master') / 100;
    this.master.gain.setTargetAtTime(m, t, 0.05);
    this.musicBus.gain.setTargetAtTime(Math.pow(Settings.get('music') / 100, 1.5) * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(Settings.get('sfx') / 100, t, 0.05);
  },
};

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- sound effects
const SFX = {
  init() { AudioBus.init(); },
  tone(f, dur, type, vol, slide, delay) {
    const c = AudioBus.ctx; if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + (delay || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(AudioBus.sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* audio is optional */ }
  },
  noise(dur, vol, freq, q, delay) {
    const c = AudioBus.ctx; if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
      const g = c.createGain(); g.gain.value = vol || 0.2;
      const t0 = c.currentTime + (delay || 0);
      s.connect(f).connect(g).connect(AudioBus.sfxBus); s.start(t0);
    } catch (e) { /* audio is optional */ }
  },
  play() { this.tone(380, 0.14, 'triangle', 0.07, 300); this.noise(0.12, 0.08, 2400, 1.5); },
  hit() { this.tone(120, 0.18, 'square', 0.05, -60); this.noise(0.18, 0.25, 900, 0.7); },
  bigHit() { this.tone(80, 0.35, 'sawtooth', 0.06, -40); this.noise(0.4, 0.35, 500, 0.6); },
  death() { this.tone(300, 0.4, 'sawtooth', 0.04, -260); this.noise(0.5, 0.3, 700, 0.5, 0.03); },
  spell() { this.tone(660, 0.3, 'sine', 0.05, 900); this.tone(990, 0.25, 'triangle', 0.03, 600, 0.04); },
  zap() { this.tone(1400, 0.16, 'sawtooth', 0.025, -1100); this.noise(0.12, 0.12, 4000, 2); },
  turn() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.045, 0, i * 0.09)); },
  enemyTurn() { [392, 311].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.04, 0, i * 0.12)); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.055, 0, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.6, 'sawtooth', 0.035, 0, i * 0.22)); },
  click() { this.tone(1100, 0.04, 'square', 0.018); },
  shield() { this.tone(1500, 0.3, 'sine', 0.05, -700); },
  heal() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.035, 0, i * 0.06)); },
  trap() { this.tone(200, 0.4, 'square', 0.045, 500); this.noise(0.3, 0.15, 3000, 3); },
  freeze() { this.noise(0.5, 0.18, 6000, 4); this.tone(2000, 0.3, 'sine', 0.02, 800); },
  phase() { this.tone(55, 2.2, 'sawtooth', 0.08, -20); this.noise(2, 0.3, 300, 0.4); [220, 207, 196].forEach((f, i) => this.tone(f, 1.2, 'sawtooth', 0.03, 0, i * 0.4)); },
};

// ---------------------------------------------------------------- music
// Menu: the original ambient loop. Battles: a sectioned, seeded composer driven by
// sector theme (setTheme), mood (battle | boss | final) and intensity (setIntensity).
const MOODS = {
  menu: { bpm: 56, barsPerChord: 2, arp: 0.32, pulse: false, cutoff: 900, chords: [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [45, 52, 57, 60, 64], [48, 55, 57, 62, 67]] },
};
const MOOD_OK = { menu: 1, battle: 1, boss: 1, final: 1 };

const SCALES = { dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11], aeo: [0, 2, 3, 5, 7, 8, 10],
  loc: [0, 1, 3, 5, 6, 8, 10], hm: [0, 2, 3, 5, 7, 8, 11], hung: [0, 2, 3, 6, 7, 8, 11], phd: [0, 1, 4, 5, 7, 8, 10] };
// bass pattern digits -> chord-relative scale degrees (0 root, 3 third, 5 fifth, 7 seventh, 8 octave, 9 step below, 4 fifth below)
const BOFF = { 0: 0, 2: 1, 3: 2, 5: 4, 7: 6, 8: 7, 9: -1, 4: -3 };
const ARPS = ['up', 'down', 'updown', 'rand'];
const LAYERS = ['drone', 'pad', 'pulse', 'bass', 'perc', 'perc2', 'arp', 'lead', 'counter', 'fx'];
const REV = { drone: 0.9, pad: 0.8, pulse: 0.1, bass: 0.05, perc: 0.15, perc2: 0.15, arp: 0.4, lead: 0.5, counter: 0.6, fx: 0.7 };
const DLY = { arp: 0.5, lead: 0.2, counter: 0.12, fx: 0.5 };
const VOWELS = [[700, 1220, 2600], [450, 800, 2830], [325, 700, 2530], [400, 1700, 2600]]; // ah oh oo eh

// Section grammar: level bias, follow-ups, per-layer masks.
const SECS = {
  intro: { bias: -0.3, next: ['A'], mask: { perc2: 0, counter: 0, lead: 0.5 } },
  A: { bias: 0, next: ['B', 'B', 'build', 'break'] },
  B: { bias: 0.08, next: ['A', 'build', 'break', 'build'] },
  break: { bias: -0.45, next: ['build', 'A'], mask: { bass: 0, perc: 0, perc2: 0, pulse: 0.6 } },
  build: { bias: -0.15, ramp: 0.4, next: ['peak'], mask: { lead: 0.4, counter: 0 } },
  peak: { bias: 0.25, next: ['break', 'A', 'B'] },
};

// Sector themes. Patterns are 16 sixteenths: x accent, o normal, - ghost, . rest.
// progs: chord roots as scale degrees; rhy: 2-bar lead rhythm templates (steps 0-31); boss: overrides.
const NEUTRAL = { root: 45, scale: 'aeo', bpm: 84, swing: 0, cpb: 1, cut: 1300, padW: 'sawtooth', bassW: 'sawtooth', bassCut: 380, gate: 0.6,
  leadW: 'triangle', leadCut: 2200, leadOct: 12, arpW: 'triangle', arpOct: 12, arp: 'rand', fx: 'blip', lift: 2, rev: 1,
  progs: [[0, 5, 6, 4], [0, 5, 3, 4], [0, 6, 5, 6], [5, 3, 0, 4]], bass: ['0.......0...0...', '0..0..0.0..0..5.'], pulse: 'x.......x.......',
  drums: [{ k: 'x.......x.......', s: '....x.......x...', h: '..o...o...o...o.' }, { k: 'x.....x.x.......', s: '....x..-....x...', h: 'o.o-o.o-o.o-o.o-' }],
  rhy: [[0, 4, 8, 12, 16, 24], [0, 3, 6, 8, 16, 20, 22]],
  boss: { root: 48, bpm: 72, scale: 'hm', cut: 1000, swell: 1, progs: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 5, 1, 4]] } };
const THEMES = [
  // 0 Fleet Academy: clean, military, simulator. D dorian, march snares, radar blips.
  { root: 50, scale: 'dor', bpm: 96, swing: 0, cpb: 1, cut: 1700, padW: 'sawtooth', bassW: 'square', bassCut: 520, gate: 0.45,
    leadW: 'square', leadCut: 1600, leadOct: 12, arpW: 'triangle', arpOct: 24, arp: 'up', fx: 'blip', lift: 2, rev: 0.7,
    progs: [[0, 3, 0, 6], [0, 2, 6, 3], [0, 6, 2, 3], [3, 2, 0, 6], [0, 4, 3, 6]],
    bass: ['0...0.0.0...0.0.', '0..0..0.0..0..5.', '0.0.0.0.0.0.0.08'], pulse: 'x.......x.......',
    drums: [{ k: 'x.......x.......', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, { k: 'x.....x.x.......', s: '....x..-....x.--', h: 'o-o-o-o-o-o-o-o-' },
      { k: 'x...x...x...x...', s: '..-.x-.-..-.x-xx', h: 'oooooooooooooooo' }],
    rhy: [[0, 6, 8, 12, 16, 22, 24], [0, 4, 8, 10, 12, 16, 24, 28], [0, 3, 6, 8, 16, 19, 22, 24]],
    boss: { scale: 'aeo', bpm: 90, cut: 1300, swell: 1, progs: [[0, 5, 6, 4], [0, 3, 5, 6], [0, 5, 3, 4]] } },
  // 1 Scrap Belt: raiders, grimy, industrial. E phrygian shuffle, resonant saw bass, metal clanks.
  { root: 52, scale: 'phr', bpm: 104, swing: 0.28, cpb: 1, cut: 1100, padW: 'square', bassW: 'sawtooth', bassCut: 700, bassQ: 9, gate: 0.5,
    leadW: 'sawtooth', leadCut: 1300, leadOct: 0, arpW: 'square', arpOct: 12, arp: 'rand', fx: 'clank', lift: 1, rev: 0.6,
    progs: [[0, 1, 0, 1], [0, 5, 6, 1], [0, 3, 1, 0], [5, 6, 0, 0], [0, 1, 3, 1]],
    bass: ['0..0..0.0.8.0..2', '00.0.00.0.0.00.5', '0.0..0.00.0..0.8'], pulse: 'x.....x...x.....',
    drums: [{ k: 'x..x..x...x..x..', s: '....x.......x...', h: 'o.oo.oo.o.oo.oo.' }, { k: 'x.x...x.x..x....', s: '....x..-.-..x...', h: 'oooooooooooooooo' },
      { k: 'x..x.xx...x..x.x', s: '....x..x....x.-x', h: 'o-oxo-oxo-oxo-ox' }],
    rhy: [[0, 3, 6, 10, 12, 16, 19, 22, 26], [0, 2, 6, 8, 14, 16, 18, 22], [0, 3, 8, 11, 16, 19, 24, 27]],
    boss: { scale: 'phd', bpm: 100, cut: 900, swell: 1, progs: [[0, 1, 0, 1], [0, 6, 1, 0], [0, 3, 1, 1], [0, 5, 1, 0]] } },
  // 2 Hive Nebula: organic, alien swarm. F hungarian minor, wobbling pads, gliding bass, insect chitter.
  { root: 53, scale: 'hung', bpm: 78, swing: 0.12, cpb: 1, cut: 900, wob: 0.35, padW: 'sawtooth', bassW: 'triangle', bassCut: 500, bglide: 0.05, gate: 0.9,
    leadW: 'sine', leadCut: 3000, leadOct: 12, vib: 1, arpW: 'sine', arpOct: 24, arp: 'rand', fx: 'chitter', lift: -1, rev: 1.2, legato: 1,
    progs: [[0, 5, 0, 2], [0, 4, 5, 1], [0, 2, 5, 6], [3, 0, 6, 0]],
    bass: ['0.....0...5.....', '0..0.....3..5...', '0.....9.0..0..2.'], pulse: 'x......x..x.....',
    drums: [{ k: 'x.....x....x....', s: '.......x.......-', h: '..o..o..o..o..o.' }, { k: 'x..x.....x..x...', s: '.....x.......x..', h: 'o..o..o..o..o..o' },
      { k: 'x..x..x...x..x..', s: '...-.x..-..x.-..', h: 'o-oo-oo-oo-oo-oo' }],
    rhy: [[0, 5, 7, 13, 18, 21, 27], [0, 7, 11, 16, 23, 27], [0, 3, 10, 13, 16, 26]],
    boss: { scale: 'loc', bpm: 72, cut: 750, swell: 1, progs: [[0, 0, 5, 5], [0, 1, 0, 4], [0, 6, 5, 1]] } },
  // 3 Forge Worlds: machine, rigid, metallic. C aeolian, straight 16th square bass, anvil hits.
  { root: 48, scale: 'aeo', bpm: 112, swing: 0, cpb: 1, cut: 1200, padW: 'square', bassW: 'square', bassCut: 600, gate: 0.4,
    leadW: 'square', leadCut: 1400, leadOct: 12, arpW: 'square', arpOct: 12, arp: 'updown', fx: 'anvil', lift: 2, rev: 0.6,
    progs: [[0, 0, 5, 6], [0, 5, 2, 6], [0, 3, 4, 0], [5, 6, 0, 0], [0, 6, 5, 4]],
    bass: ['0.000.000.000.00', '0..0..0.0..0..0.', '0080008000800085'], pulse: 'x...x...x...x...',
    drums: [{ k: 'x...x...x...x...', s: '....x.......x...', h: 'oooooooooooooooo' }, { k: 'x..x..x.x..x..x.', s: '....x.......x..x', h: 'x-o-x-o-x-o-x-o-' },
      { k: 'x.xx..x.x.xx..x.', s: '....x..x....x.xx', h: 'xoooxoooxoooxooo' }],
    rhy: [[0, 2, 4, 8, 10, 12, 16, 18, 20, 24], [0, 3, 6, 8, 11, 14, 16, 19, 22, 24], [0, 4, 8, 12, 16, 20, 24, 28]],
    boss: { scale: 'phr', root: 47, bpm: 108, cut: 1000, swell: 1, progs: [[0, 1, 0, 6], [0, 0, 1, 1], [0, 5, 6, 1]] } },
  // 4 Void Expanse: psionic, eerie, wide. B lydian, half-time, theremin lead, glassy panned arps.
  { root: 47, scale: 'lyd', bpm: 70, swing: 0, cpb: 2, cut: 1100, padW: 'triangle', bassW: 'sine', bassCut: 400, gate: 0.95,
    leadW: 'sine', leadCut: 4000, leadOct: 24, vib: 1, lglide: 0.07, arpW: 'sine', arpOct: 24, arp: 'up', wide: 1, fx: 'shimmer', lift: 1, rev: 1.6, legato: 1,
    progs: [[0, 1, 0, 1], [0, 1, 5, 6], [5, 2, 0, 1], [0, 6, 5, 1]],
    bass: ['0...............', '0.......5.......', '0.....0.....5...'], pulse: 'x...............',
    drums: [{ k: 'x...............', s: '........x.......', h: '..o...o...o...o.' }, { k: 'x......x..x.....', s: '........x.......', h: 'o.-.o.-.o.-.o.-.' },
      { k: 'x..x...x..x.....', s: '........x.....-.', h: 'o-o-o-o-o-o-o-o-' }],
    rhy: [[0, 10, 16, 26], [0, 6, 16, 22, 28], [0, 12, 16, 20]],
    boss: { scale: 'loc', bpm: 64, cut: 900, swell: 1, progs: [[0, 1, 0, 4], [0, 6, 1, 0], [0, 1, 5, 1]] } },
  // 5 The Singularity: choir-like, cosmic. D aeolian, formant choir pads, bells, slow epic drums.
  { root: 50, scale: 'aeo', bpm: 76, swing: 0, cpb: 2, cut: 1400, choir: 0.6, padW: 'sawtooth', bassW: 'sawtooth', bassCut: 450, gate: 0.85,
    leadW: 'triangle', leadCut: 2600, leadOct: 12, arpW: 'sine', arpOct: 24, arp: 'updown', fx: 'bell', lift: 3, rev: 1.4, legato: 1,
    progs: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 6, 0, 0], [0, 6, 5, 6], [3, 5, 0, 4]],
    bass: ['0.......0...5...', '0...0...5...8...', '0.....0.0.....5.'], pulse: 'x.......x.......',
    drums: [{ k: 'x.......x.......', s: '........x.......', h: '....o.......o...' }, { k: 'x..x....x.x.....', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' },
      { k: 'x..x..x.x.x..x..', s: '....x..-....x.xx', h: 'o-o-o-o-o-o-o-o-' }],
    rhy: [[0, 8, 16, 24], [0, 6, 8, 16, 22, 24], [0, 4, 8, 16, 20, 24]],
    boss: { scale: 'hm', bpm: 70, cut: 1200, swell: 1, choir: 0.8, progs: [[0, 5, 3, 4], [0, 3, 4, 0], [5, 3, 4, 4]] } },
];
// Final boss (galactic core, "the Choir"): slow, huge, building over ~64 bars.
const FINAL = Object.assign({}, THEMES[5], { root: 50, scale: 'hm', bpm: 56, cpb: 2, choir: 1, cut: 1600, fx: 'timp', lift: 2, lglide: 0.05, boss: null,
  progs: [[0, 5, 2, 4], [0, 3, 5, 4], [5, 2, 3, 4], [0, 5, 3, 6]],
  drums: [{ k: 'x...............', s: '........x.......', h: '................' }, { k: 'x.......x.......', s: '........x.......', h: '....o.......o...' },
    { k: 'x..x....x.x.....', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, { k: 'x..x..x.x.x..x..', s: '....x..-....x.xx', h: 'o-o-o-o-o-o-o-o-' }] });

const rng32 = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (a, b, x) => { x = clamp01((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const unplug = nodes => () => nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });

const Music = {
  mood: 'menu', want: 'menu', wantKey: 'menu', theme: -1, wantTheme: -1, bus: null, nextBar: 0, bar: 0, timer: null,
  target: 0.35, int: 0.35, T: null, sec: null, sb: 0, rng: Math.random, tension: 0, force: null, cprev: 60, lastSt: {},
  ensure() {
    const c = AudioBus.ctx; if (!c || this.timer) return;
    this.duck = c.createGain(); this.duck.connect(AudioBus.musicBus);
    this.bus = c.createGain(); this.bus.gain.value = 0; this.bus.connect(this.duck);
    this.wet = c.createGain(); this.wet.gain.value = 0; this.wet.connect(AudioBus.reverb);
    this.dly = c.createGain(); this.dly.gain.value = 0; this.dly.connect(AudioBus.delay);
    this.sting = c.createGain(); this.sting.connect(AudioBus.musicBus);
    const sw = c.createGain(); sw.gain.value = 0.5; this.sting.connect(sw).connect(AudioBus.reverb);
    // persistent layer strips: gain -> pan -> dry bus, plus reverb and delay sends
    this.L = {};
    LAYERS.forEach(k => {
      const g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : c.createGain(), s = c.createGain(), d = c.createGain();
      g.gain.value = 0; s.gain.value = REV[k]; d.gain.value = DLY[k] || 0;
      g.connect(p).connect(this.bus); p.connect(s).connect(this.wet); p.connect(d).connect(this.dly);
      this.L[k] = { g, p, s, d };
    });
    const len = c.sampleRate * 2, nb = this.nbuf = c.createBuffer(1, len, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    this.fade(1, 1.5);
    this.nextBar = c.currentTime + 0.2;
    this.begin();
    this.timer = setInterval(() => this.schedule(), 200);
  },
  fade(v, tc) { const t = AudioBus.ctx.currentTime; [this.bus, this.wet, this.dly].forEach(n => n.gain.setTargetAtTime(v, t, tc)); },
  key(m, th) { return m === 'battle' || m === 'boss' ? m + th : m; },
  setMood(m) {
    if (!MOOD_OK[m]) return;
    const k = this.key(m, this.wantTheme); if (k === this.wantKey) return;
    this.want = m; this.wantKey = k; this.swap();
  },
  // sector 0-5 (anything else: neutral theme). Takes effect on the next battle/boss mood.
  setTheme(i) {
    this.wantTheme = Number.isInteger(i) && THEMES[i] ? i : -1;
    const k = this.key(this.want, this.wantTheme); if (k === this.wantKey) return;
    this.wantKey = k; this.swap();
  },
  setIntensity(x) { this.target = clamp01(+x || 0); },
  swap() {
    const c = AudioBus.ctx;
    if (!c || !this.bus) { this.mood = this.want; this.theme = this.wantTheme; this.T = null; return; }
    // fade out, swap at the next bar, fade back in
    this.fade(0.0001, 0.6);
    this.swapAt = c.currentTime + 1.6;
  },
  schedule() {
    const c = AudioBus.ctx; if (!c) return;
    if (this.swapAt && c.currentTime >= this.swapAt) {
      this.swapAt = 0; this.mood = this.want; this.theme = this.wantTheme; this.bar = 0; this.nextBar = Math.max(this.nextBar, c.currentTime + 0.1);
      this.begin(); this.fade(1, 1.2);
    }
    if (this.nextBar < c.currentTime - 0.3) this.nextBar = c.currentTime + 0.05; // fell behind (tab slept): skip, never pile up
    while (this.nextBar < c.currentTime + 1.2) { this.nextBar += this.mood === 'menu' ? this.playBar(this.nextBar) : this.tbar(this.nextBar); this.bar++; }
  },
  // new piece: theme params, fresh seed and motifs, delay synced to tempo
  begin() {
    const c = AudioBus.ctx;
    if (this.mood === 'menu') { this.T = null; if (c) AudioBus.delay.delayTime.setTargetAtTime(0, c.currentTime, 0.2); return; }
    const base = this.mood === 'final' ? FINAL : THEMES[this.theme] || NEUTRAL;
    const T = this.T = Object.assign({}, base, this.mood === 'boss' && base.boss || {});
    this.rng = rng32((Math.random() * 4294967296) >>> 0);
    this.motifs = [0, 1, 2].map(() => this.genMotif());
    this.sec = null; this.sb = 0; this.force = null; this.tension = 0; this.seenA = 0; this.cprev = T.root + 16;
    this.int = Math.min(this.target, 0.4);
    if (!c) return;
    const t = c.currentTime;
    AudioBus.delay.delayTime.setTargetAtTime(Math.min(1.9, 45 / T.bpm), t, 0.2);
    for (const k in this.L) { this.L[k].s.gain.setTargetAtTime(REV[k] * T.rev, t, 0.3); if (this.L[k].p.pan) this.L[k].p.pan.setTargetAtTime(k === 'arp' ? 0.25 : k === 'counter' ? -0.3 : k === 'fx' ? -0.15 : 0, t, 0.3); }
  },
  newSec() {
    const r = this.rng, T = this.T, p = this.sec, fin = this.mood === 'final', pick = a => a[r() * a.length | 0];
    const type = this.force || (p ? pick(SECS[p.type].next) : 'intro'); this.force = null;
    const len = type === 'intro' ? (fin ? 8 : 4) : type === 'build' ? 4 : type === 'break' ? pick([4, 8]) : pick(fin ? [8, 16] : [8, 12, 16]);
    let pi = r() * T.progs.length | 0; if (p && pi === p.pi) pi = (pi + 1) % T.progs.length;
    let prog = T.progs[pi]; const pv = r();
    if (pv < 0.2) prog = prog.slice().reverse(); else if (pv < 0.35) prog = prog.slice(2).concat(prog.slice(0, 2));
    const mi = type === 'A' ? 0 : type === 'B' ? 1 : type === 'peak' ? pick([0, 2]) : 2;
    const v = type === 'A' && !this.seenA ? 0 : r() * 6 | 0; if (type === 'A') this.seenA = 1;
    const nd = T.drums.length;
    this.sec = { type, len, pi, prog, mot: this.vary(this.motifs[mi], v),
      tr: type === 'B' ? pick([0, 2, 4, -3]) : type === 'peak' ? pick([0, 0, 7, 2]) : 0,      // motif transposition (degrees)
      dr: fin ? Math.min(nd - 1, Math.min(1, this.bar / 64) * nd | 0) : type === 'peak' ? nd - 1 : type === 'intro' ? 0 : r() * nd | 0,
      bs: r() * T.bass.length | 0, key: type === 'peak' && r() < 0.35 ? T.lift : 0,            // key lift for some peaks
      drop: type === 'build' || (type !== 'intro' && r() < 0.2), crash: !!(p && p.drop), arp: r() < 0.3 ? pick(ARPS) : T.arp };
    this.sb = 0;
  },
  genMotif() {
    const r = this.rng, T = this.T, rh = T.rhy[r() * T.rhy.length | 0], out = []; let d = [0, 2, 4][r() * 3 | 0];
    rh.forEach((k, i) => {
      const nx = i + 1 < rh.length ? rh[i + 1] : 32; out.push([k, d, Math.max(1, Math.min(nx - k, T.legato ? 12 : 4))]);
      d = Math.max(-2, Math.min(8, d + [-2, -1, -1, 1, 1, 2, 0, 3, -3][r() * 9 | 0]));
    });
    return out;
  },
  // motif variations: 1 inversion, 2 retrograde pitches, 3 displaced, 4 fragment + sequence, 5 second half up a third
  vary(m, v) {
    const d0 = m[0][1], n = m.length;
    const out = v === 1 ? m.map(([k, d, l]) => [k, 2 * d0 - d, l]) : v === 2 ? m.map(([k, , l], i) => [k, m[n - 1 - i][1], l])
      : v === 3 ? m.map(([k, d, l]) => [(k + 2) % 32, d, Math.min(l, 32 - (k + 2) % 32)])
      : v === 4 ? m.filter(x => x[0] < 16).reduce((a, [k, d, l]) => a.concat([[k, d, Math.min(l, 16 - k)], [k + 16, d + 1, Math.min(l, 16 - k)]]), [])
      : v === 5 ? m.map(([k, d, l]) => [k, k >= 16 ? d + 2 : d, l]) : m.slice();
    return out.sort((a, b) => a[0] - b[0]);
  },
  levels(e, S, D) {
    const lv = { drone: 1, pad: 0.55 + 0.45 * smooth(0.1, 0.6, e), pulse: 1 - 0.6 * smooth(0.35, 0.65, e), bass: smooth(0.22, 0.5, e), perc: smooth(0.3, 0.55, e),
      perc2: smooth(0.6, 0.85, e), arp: 0.5 + 0.5 * smooth(0.2, 0.7, e), lead: smooth(0.3, 0.55, e), counter: smooth(0.68, 0.9, e), fx: smooth(0.4, 0.7, e) };
    if (D.mask) for (const k in D.mask) lv[k] *= D.mask[k];
    if (S.type === 'build') lv.perc = Math.max(lv.perc, 0.6 * smooth(0.15, 0.45, e)); // build rolls, gentle when calm
    return lv;
  },
  // one themed bar; returns its length
  tbar(t) {
    const T = this.T, r = this.rng, L = this.L, beat = 60 / T.bpm, s = beat / 4, barLen = beat * 4, fin = this.mood === 'final';
    if (!this.sec || this.sb >= this.sec.len) this.newSec();
    const S = this.sec, sb = this.sb++, last = sb === S.len - 1, D = SECS[S.type], arc = fin ? Math.min(1, this.bar / 64) : 0;
    this.int += Math.max(-0.2, Math.min(0.2, this.target - this.int)); // intensity glides, applied per bar
    const e = clamp01((fin ? Math.max(this.int, arc * 0.85) : this.int + (this.mood === 'boss' ? 0.08 : 0)) + D.bias + (D.ramp || 0) * sb / Math.max(1, S.len - 1) + (this.tension > 0 ? 0.12 : 0));
    const lv = this.levels(e, S, D), on = k => lv[k] > 0.02;
    for (const k in lv) L[k].g.gain.setTargetAtTime(lv[k], t, barLen * 0.2);
    const sc = SCALES[T.scale], key = T.root + S.key;
    const nt = (d, base) => { const o = Math.floor(d / 7); return base + sc[d - o * 7] + 12 * o; };
    const cd = S.prog[Math.floor(sb / T.cpb) % S.prog.length], at = k => t + k * s + (k & 1 ? T.swing * s : 0);
    const stop = S.drop && last ? 12 : 16; // drop: last beat goes silent
    let bk = key - 12; while (bk > 40) bk -= 12; while (bk < 31) bk += 12;
    const tones = (base, xs) => { const off = nt(cd, base) > base + 7 ? -12 : 0; return xs.map(x => nt(cd + x, base) + off); };
    // harmony: pad or formant choir on chord change; drone every 4 bars; boss swells
    if (sb % T.cpb === 0) {
      const dur = T.cpb * barLen + 0.8;
      if (T.choir) this.choir(tones(key, [0, 4, 9, -7, 13, 16]).slice(0, fin ? 3 + Math.round(arc * 3) : 4), t, dur + 0.4, T.choir * (fin ? 0.8 + 0.4 * arc : 1));
      else this.tpad(tones(key, [0, 4, 9, 13]), t, dur, { dest: L.pad.g, cut: T.cut, w: T.padW });
    }
    if (sb % 4 === 0) this.drone([bk, bk + 7].concat(fin && arc > 0.4 ? [bk + 12] : []), t, Math.min(4, S.len - sb) * barLen + 1.5, fin ? 1 + arc : 1);
    if (T.swell && sb % 4 === 3) this.swell(mtof(bk - 11), t, barLen, L.drone.g);
    if (S.type === 'build' && sb === 0) this.riser(t, (S.len - 1) * barLen + 12 * s, L.drone.g);
    if (sb === 0 && (S.type === 'peak' || S.crash) && e > 0.4) this.crash(t, L.perc.g);
    // sparse tonal pulse (plus heartbeat under lethal tension)
    if (on('pulse')) {
      const n = [];
      for (let k = 0; k < stop; k++) if (T.pulse[k] === 'x' || (this.tension > 0 && (k === 2 || k === 10))) n.push([at(k), mtof(bk + 12), 0.4, k % 8 ? 0.07 : 0.1]);
      this.mono(L.pulse, 'sine', n, { drop: 0.5, dropT: 0.15 });
    }
    if (this.tension > 0) this.tension--;
    // bass ostinato
    if (on('bass')) {
      const pat = T.bass[S.bs], idx = []; for (let k = 0; k < stop; k++) if (pat[k] !== '.') idx.push(k);
      const off = nt(cd, bk) - bk > 6 ? -12 : 0;
      this.mono(L.bass, T.bassW, idx.map((k, i) => [at(k), mtof(nt(cd + BOFF[pat[k]], bk) + off), ((i + 1 < idx.length ? idx[i + 1] : 16) - k) * s * T.gate, 0.075]),
        { cut: T.bassCut, q: T.bassQ || 2, fenv: 3, glide: T.bglide, sus: 1 });
    }
    // percussion: kick/hat/backbeat (perc), ghosts and extra hats (perc2), fills, build rolls
    if (on('perc')) {
      const Dr = T.drums[S.dr], kick = [], hat = [], hat2 = [], sn = [], vel = ch => ch === 'x' ? 1 : ch === 'o' ? 0.7 : ch === '-' ? 0.35 : 0;
      const fill = last && !S.drop && e > 0.45 && S.type !== 'intro' && r() < 0.65 ? 1 + (r() * 3 | 0) : 0, g2 = smooth(0.6, 0.85, e);
      for (let k = 0; k < stop; k++) {
        const kv = vel(Dr.k[k]), sv = vel(Dr.s[k]), hv = vel(Dr.h[k]);
        if (!(fill && k >= 8)) {
          if (kv >= 0.7 || (kv && e > 0.75)) kick.push([at(k), 110, 0.35, 0.13 * kv]);
          if (S.type === 'build') { const step = 16 / [4, 8, 16, 16][Math.min(sb, 3)]; if (k % step === 0) sn.push([at(k), 0, 0.12, 0.025 + 0.06 * (sb * 16 + k) / 64]); }
          else if (sv >= 0.7 || (sv && g2 > 0)) sn.push([at(k), 0, 0.16, 0.07 * sv * (sv < 0.7 ? g2 : 1)]);
        }
        if (hv >= 0.7) hat.push([at(k), 0, 0.05, 0.022 * hv]); else if (hv && g2 > 0) hat2.push([at(k), 0, 0.04, 0.015]);
        else if (!hv && e > 0.85 && k & 1) hat2.push([at(k), 0, 0.03, 0.009]);
      }
      if (fill === 1) for (let k = 8; k < 16; k++) sn.push([at(k), 0, 0.12, 0.03 + 0.006 * k]);
      if (fill === 2) [8, 10, 12, 14].forEach((k, i) => kick.push([at(k), [230, 190, 155, 125][i], 0.3, 0.1]));
      if (fill === 3) { [8, 13].forEach(k => kick.push([at(k), 110, 0.3, 0.12])); [10, 11, 14, 15].forEach(k => sn.push([at(k), 0, 0.14, 0.07])); }
      this.mono(L.perc, 'sine', kick, { drop: 0.4, dropT: 0.12 });
      this.noiseV(L.perc, sn, { type: 'bandpass', f: 1800, q: 0.9 });
      this.mono(L.perc, 'triangle', sn.map(n => [n[0], 190, 0.08, n[3] * 0.6]), { drop: 0.7, dropT: 0.06 });
      this.noiseV(L.perc, hat, { type: 'highpass', f: 7000 });
      if (on('perc2')) this.noiseV(L.perc2, hat2, { type: 'highpass', f: 8000 });
    }
    // arpeggio: eighths, sixteenths when hot
    if (on('arp')) {
      const fast = e > 0.68, n = fast ? 16 : 8, step = 16 / n, p = 0.12 + 0.6 * e, tn = tones(key + T.arpOct, [0, 2, 4, 7]), notes = [];
      for (let i = 0; i < n; i++) {
        const k = i * step; if (k >= stop || r() > p * (i % 2 && !fast ? 0.7 : 1)) continue;
        const j = S.arp === 'up' ? i % 4 : S.arp === 'down' ? 3 - i % 4 : S.arp === 'updown' ? [0, 1, 2, 3, 2, 1][i % 6] : r() * 4 | 0;
        notes.push([at(k), mtof(tn[j]), step * s * 2, 0.026]);
        if (T.wide && L.arp.p.pan) L.arp.p.pan.setValueAtTime(i % 2 ? 0.7 : -0.7, at(k));
      }
      this.mono(L.arp, T.arpW, notes, { cut: 3200 });
    }
    // lead motif (2-bar phrase, follows the chord root); sparse in breaks
    if (on('lead')) {
      const h = (sb & 1) * 16, top = key + T.leadOct + 19, notes = [];
      S.mot.forEach(([k, d, l]) => {
        if (k < h || k >= h + 16 || k - h >= stop || (S.type === 'break' && k % 8)) return;
        let m = nt(cd + d + S.tr, key + T.leadOct); while (m > top) m -= 12;
        notes.push([at(k - h), mtof(m), l * s * 0.95, 0.03]);
      });
      this.mono(L.lead, T.leadW, notes, { cut: T.leadCut, sus: 1, glide: T.lglide, vib: T.vib });
    }
    // countermelody: long chord tones, nearest voice-leading, high intensity only
    if (on('counter')) {
      const cnt = e > 0.88 ? 4 : 2, cands = tones(key + 12, [0, 2, 4, 7, 9]), notes = [];
      for (let i = 0; i < cnt; i++) {
        const k = i * 16 / cnt; if (k >= stop) break;
        let best = cands[0], bd = 99; cands.forEach(m => { const dd = Math.abs(m - this.cprev - (i % 2 ? -2 : 2)); if (m !== this.cprev && dd < bd) { bd = dd; best = m; } });
        this.cprev = best; notes.push([at(k), mtof(best), 16 / cnt * s * 0.98, 0.022]);
      }
      this.mono(L.counter, T.padW === 'sawtooth' ? 'triangle' : 'sawtooth', notes, { cut: 1800, sus: 1, glide: 0.04, att: 0.08 });
    }
    if (on('fx')) this.fx(t, at, stop, cd, key, nt, bk, arc);
    return barLen;
  },
  // theme colour: radar blips, scrap clanks, swarm chitter, anvils, psionic shimmer, bells, timpani
  fx(t, at, stop, cd, key, nt, bk, arc) {
    const T = this.T, r = this.rng, L = this.L.fx, n = [];
    switch (T.fx) {
      case 'blip': for (let i = 0; i < 2; i++) if (r() < 0.55) n.push([at(r() * stop | 0), mtof(key + 36 + [0, 7, 12][r() * 3 | 0]), 0.09, 0.016]); return this.mono(L, 'sine', n);
      case 'clank': [2, 6, 10, 14].forEach(k => { if (k < stop && r() < 0.45) n.push([at(k), 1600 + r() * 2800, 0.14, 0.09]); }); return this.noiseV(L, n, { type: 'bandpass', f: 2500, q: 14 });
      case 'chitter': { const k0 = r() * 10 | 0; for (let k = k0; k < Math.min(stop, k0 + 7); k++) if ((k - k0) % 3 < 2) n.push([at(k), 4000 + r() * 3000, 0.03, 0.05]); return this.noiseV(L, n, { type: 'bandpass', f: 5000, q: 5 }); }
      case 'anvil': [0, 3, 6, 10, 12].forEach(k => { if (k < stop && r() < 0.5) n.push([at(k), mtof(key + 31) * (r() < 0.5 ? 1 : 1.414), 0.22, 0.03]); }); return this.mono(L, 'square', n, { cut: 2400, bp: 1, q: 8 });
      case 'shimmer': for (let i = 0; i < 3; i++) if (r() < 0.6) n.push([at((r() * stop / 2 | 0) * 2), mtof(nt(cd + [0, 2, 4, 7][r() * 4 | 0], key + 36)), 1.1, 0.014]); return this.mono(L, 'sine', n);
      case 'bell': [0, 8].forEach(k => { if (k < stop && r() < 0.7) n.push([at(k), mtof(nt(cd + [0, 2, 4][r() * 3 | 0], key + 24)), 1.6, 0.02]); }); return this.mono(L, 'sine', n);
      case 'timp': n.push([at(0), mtof(bk + 12), 0.9, 0.12]); if (arc > 0.5 && stop > 14) n.push([at(12), mtof(bk + 12), 0.25, 0.06], [at(14), mtof(bk + 12), 0.6, 0.09]);
        return this.mono(L, 'sine', n, { drop: 0.8, dropT: 0.3 });
    }
  },
  // One oscillator plays a whole bar of notes [t, freq, dur, vol] for one layer: a cheap mono synth.
  mono(L, type, notes, o) {
    if (!notes.length) return;
    o = o || {}; notes.sort((a, b) => a[0] - b[0]);
    const c = AudioBus.ctx, osc = c.createOscillator(), g = c.createGain(), nodes = [osc, g], n = notes.length;
    osc.type = type; let src = osc, f = null;
    if (o.cut) { f = c.createBiquadFilter(); f.type = o.bp ? 'bandpass' : 'lowpass'; f.frequency.value = o.cut; f.Q.value = o.q || 1; osc.connect(f); src = f; nodes.push(f); }
    src.connect(g).connect(L.g);
    const t0 = notes[0][0], tl = Math.max.apply(null, notes.map(x => x[0] + x[2])) + 0.05;
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.2; lg.gain.value = 14; l.connect(lg).connect(osc.detune); l.start(t0); l.stop(tl + 0.05); nodes.push(l, lg); }
    g.gain.setValueAtTime(0.0001, t0);
    notes.forEach(([t, fr, d, v], i) => {
      const nx = i + 1 < n ? notes[i + 1][0] : Infinity, end = Math.min(t + d, nx - 0.004); if (end - t < 0.012) return;
      const a = Math.min(o.att || 0.006, (end - t) * 0.3); v = Math.max(v, 0.0002);
      if (o.glide && i) osc.frequency.setTargetAtTime(fr, t, o.glide); else osc.frequency.setValueAtTime(fr, t);
      if (o.drop) osc.frequency.exponentialRampToValueAtTime(fr * o.drop, t + Math.min(o.dropT, end - t));
      if (f && o.fenv) { f.frequency.setValueAtTime(o.cut * o.fenv, t); f.frequency.exponentialRampToValueAtTime(o.cut, t + Math.min(0.18, end - t)); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a);
      if (o.sus) g.gain.setValueAtTime(v, Math.max(t + a, end - Math.min(0.08, (end - t) * 0.3)));
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    });
    osc.onended = unplug(nodes); osc.start(t0); osc.stop(tl);
  },
  // one looping noise source per bar, gated by an envelope per hit [t, filterFreq|0, dur, vol]
  noiseV(L, notes, o) {
    if (!notes.length) return;
    notes.sort((a, b) => a[0] - b[0]);
    const c = AudioBus.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), n = notes.length;
    src.buffer = this.nbuf; src.loop = true; f.type = o.type; f.frequency.value = o.f; f.Q.value = o.q || 0.7;
    src.connect(f).connect(g).connect(L.g);
    const t0 = notes[0][0]; g.gain.setValueAtTime(0.0001, t0);
    notes.forEach(([t, ff, d, v], i) => {
      const end = Math.min(t + d, i + 1 < n ? notes[i + 1][0] - 0.003 : Infinity); if (end - t < 0.008) return;
      if (ff) f.frequency.setValueAtTime(ff, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, end);
    });
    src.onended = unplug([src, f, g]); src.start(t0, Math.random() * 1.5); src.stop(notes[n - 1][0] + notes[n - 1][2] + 0.05);
  },
  // chord pad: two detuned oscillators per note through one shared filter + envelope
  tpad(notes, t, dur, o) {
    const c = AudioBus.ctx, flt = c.createBiquadFilter(), g = c.createGain(), nodes = [flt, g], cut = o.cut, T = this.T || {};
    const vol = o.vol || (o.w === 'square' ? 0.022 : o.w === 'sawtooth' ? 0.032 : 0.045), att = o.att || Math.min(2.2, dur * 0.35), rel = Math.min(1.4, dur * 0.3);
    flt.type = 'lowpass'; flt.Q.value = 0.8;
    flt.frequency.setValueAtTime(o.cut0 || cut * 0.5, t); flt.frequency.linearRampToValueAtTime(cut, t + dur * 0.5); flt.frequency.linearRampToValueAtTime(cut * 0.6, t + dur);
    if (T.wob && o.dest !== this.sting) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = T.wob; lg.gain.value = cut * 0.4; l.connect(lg).connect(flt.frequency); l.start(t); l.stop(t + dur + 0.1); nodes.push(l, lg); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, Math.max(t + att, t + dur - rel)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    flt.connect(g).connect(o.dest);
    let first = null;
    notes.forEach(n => [-7, 7].forEach(det => { const x = c.createOscillator(); x.type = o.w; x.frequency.value = mtof(n); x.detune.value = det; x.connect(flt); x.start(t); x.stop(t + dur + 0.1); nodes.push(x); first = first || x; }));
    first.onended = unplug(nodes);
  },
  // choir: detuned saw stack with shared vibrato through three formant bandpasses morphing between vowels
  choir(notes, t, dur, amt) {
    const c = AudioBus.ctx, r = this.rng, sum = c.createGain(), env = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), nodes = [sum, env, lfo, lg];
    const v0 = VOWELS[r() * 4 | 0], v1 = VOWELS[r() * 4 | 0], end = t + dur;
    sum.gain.value = 1 / Math.sqrt(notes.length); lfo.frequency.value = 4.4 + r() * 0.8; lg.gain.value = 10; lfo.connect(lg);
    notes.forEach(n => [-9, 9].forEach(det => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det + (r() - 0.5) * 6; lg.connect(o.detune); o.connect(sum); o.start(t); o.stop(end + 0.1); nodes.push(o); }));
    v0.forEach((f, i) => {
      const bp = c.createBiquadFilter(), fg = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 6 + i * 3;
      bp.frequency.setValueAtTime(f, t); bp.frequency.linearRampToValueAtTime(v1[i], end); fg.gain.value = [3.2, 2, 1.2][i];
      sum.connect(bp).connect(fg).connect(env); nodes.push(bp, fg);
    });
    const pk = 0.05 * amt; env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(pk, t + dur * 0.4); env.gain.setValueAtTime(pk, t + dur - 1.2); env.gain.linearRampToValueAtTime(0.0001, end);
    env.connect(this.L.pad.g); lfo.start(t); lfo.stop(end + 0.1); lfo.onended = unplug(nodes);
  },
  drone(ms, t, dur, amt) {
    const c = AudioBus.ctx, flt = c.createBiquadFilter(), g = c.createGain(), nodes = [flt, g], pk = 0.04 * amt;
    flt.type = 'lowpass'; flt.frequency.setValueAtTime(170, t); flt.frequency.linearRampToValueAtTime(420, t + dur * 0.5); flt.frequency.linearRampToValueAtTime(190, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + 1.5); g.gain.setValueAtTime(pk, t + dur - 1.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    flt.connect(g).connect(this.L.drone.g);
    ms.forEach((m, i) => { const o = c.createOscillator(); o.type = i === 1 ? 'sawtooth' : 'triangle'; o.frequency.value = mtof(m); o.detune.value = i * 4; o.connect(flt); o.start(t); o.stop(t + dur + 0.1); nodes.push(o); });
    nodes[2].onended = unplug(nodes);
  },
  riser(t, dur, dest) {
    const c = AudioBus.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.nbuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
    s.connect(f).connect(g).connect(dest); s.onended = unplug([s, f, g]); s.start(t); s.stop(t + dur + 0.05);
  },
  crash(t, dest) {
    const c = AudioBus.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.nbuf; s.loop = true; f.type = 'highpass'; f.frequency.value = 3500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    s.connect(f).connect(g).connect(dest); s.onended = unplug([s, f, g]); s.start(t, Math.random()); s.stop(t + 1.85);
  },
  // Short musical one-shots on the music bus: victory | defeat | phase | lethal. Quantized to the next eighth.
  stinger(kind) {
    const c = AudioBus.ctx; if (!c) return; if (!this.timer) this.ensure();
    const D = { victory: 3, defeat: 3.6, phase: 3.1, lethal: 2.8 }[kind]; if (!D || !this.sting) return;
    const now = c.currentTime; if (now - (this.lastSt[kind] || -9) < 0.8) return; this.lastSt[kind] = now;
    const T = this.mood !== 'menu' ? this.T : null, S = { g: this.sting };
    let t = now + 0.03;
    if (T) { const e8 = 30 / T.bpm, q = this.nextBar + Math.ceil((t - this.nextBar) / e8) * e8; if (q - t < 0.25) t = q; }
    const key = T ? T.root + (this.sec ? this.sec.key : 0) : 45;
    this.duck.gain.cancelScheduledValues(now); this.duck.gain.setTargetAtTime(kind === 'lethal' ? 0.6 : 0.35, t, 0.04); this.duck.gain.setTargetAtTime(1, t + D * 0.6, 0.6);
    if (kind === 'victory') { // impact, bright major bloom, rising bell arpeggio
      this.mono(S, 'sine', [[t, 90, 0.7, 0.12]], { drop: 0.45, dropT: 0.3 });
      this.tpad([key - 12, key - 5, key + 4, key + 7, key + 11, key + 14], t, D, { dest: this.sting, cut: 3200, cut0: 500, w: 'sawtooth', vol: 0.026, att: 0.25 });
      this.mono(S, 'triangle', [0, 4, 7, 11, 14, 19].map((x, i) => [t + 0.12 + i * 0.11, mtof(key + 24 + x), 0.6, 0.03]), { cut: 4000 });
    } else if (kind === 'defeat') { // boom, falling minor line, low beating drone
      this.mono(S, 'sine', [[t, 70, 1.4, 0.14]], { drop: 0.4, dropT: 0.8 });
      this.mono(S, 'sawtooth', [7, 5, 3, 2, 0, -5].map((x, i) => [t + 0.15 + i * 0.42, mtof(key + x), 0.5, 0.03]), { cut: 1200, sus: 1, glide: 0.03, att: 0.04 });
      this.tpad([key - 24, key - 23, key - 17], t, D, { dest: this.sting, cut: 320, w: 'sawtooth', vol: 0.03, att: 0.3 });
    } else if (kind === 'phase') { // riser into impact + tritone braam; music jumps to a peak section
      this.riser(t, 0.9, this.sting);
      this.mono(S, 'sine', [[t + 0.9, 120, 1.6, 0.16]], { drop: 0.25, dropT: 1.2 });
      this.crash(t + 0.9, this.sting);
      this.tpad([key - 24, key - 12, key - 6], t + 0.9, D - 0.9, { dest: this.sting, cut: 1800, cut0: 200, w: 'sawtooth', vol: 0.05, att: 0.05 });
      if (T) { this.force = 'peak'; if (this.sec) this.sec.len = Math.min(this.sec.len, this.sb); }
    } else { // lethal: double heartbeat + beating high cluster; tension raises the groove for a few bars
      this.mono(S, 'sine', [0, 0.26, 0.9, 1.16, 1.8, 2.06].map((d, i) => [t + d, i % 2 ? 50 : 62, 0.3, i % 2 ? 0.08 : 0.12]), { drop: 0.6, dropT: 0.1 });
      this.tpad([key + 24, key + 25, key + 30], t, D - 0.2, { dest: this.sting, cut: 2500, w: 'sine', vol: 0.022, att: 1.6 });
      this.tension = 4;
    }
  },
  // ---- menu loop (original ambient generator)
  playBar(t) {
    const M = MOODS[this.mood] || MOODS.menu, beat = 60 / M.bpm, barLen = beat * 4;
    const chord = M.chords[Math.floor(this.bar / M.barsPerChord) % M.chords.length];
    const firstOfChord = this.bar % M.barsPerChord === 0;
    if (firstOfChord) {
      const len = barLen * M.barsPerChord;
      chord.slice(1).forEach((n, i) => this.pad(mtof(n), t + i * 0.04, len + 0.6, M));
      this.bass(mtof(chord[0] - 12), t, len, M);
    }
    // arpeggio on eighth notes, sparse and random, through the delay
    for (let k = 0; k < 8; k++) {
      if (Math.random() > M.arp * (k % 2 ? 0.6 : 1)) continue;
      const n = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + (Math.random() < 0.5 ? 12 : 24);
      this.pluck(mtof(n), t + k * beat / 2, M);
    }
    if (M.pulse) for (let k = 0; k < 4; k++) if (k % 2 === 0 || Math.random() < 0.25) this.thump(t + k * beat, k === 0 ? 1 : 0.6, M);
    if (M.dark && this.bar % 4 === 3) this.swell(mtof(chord[0] - 24 + 1), t, barLen);
    return barLen;
  },
  pad(f, t, dur, M) {
    const c = AudioBus.ctx, g = c.createGain(), flt = c.createBiquadFilter(), nodes = [g, flt];
    flt.type = 'lowpass'; flt.frequency.setValueAtTime(M.cutoff * 0.5, t); flt.frequency.linearRampToValueAtTime(M.cutoff, t + dur * 0.5); flt.frequency.linearRampToValueAtTime(M.cutoff * 0.6, t + dur); flt.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + Math.min(2.2, dur * 0.35)); g.gain.setValueAtTime(0.035, t + dur - 1.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    flt.connect(g); g.connect(AudioBus.reverb); g.connect(this.bus);
    [-7, 7].forEach(det => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(flt); o.start(t); o.stop(t + dur + 0.1); nodes.push(o); });
    nodes[2].onended = unplug(nodes);
  },
  bass(f, t, dur) {
    const c = AudioBus.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.setValueAtTime(0.09, t + dur - 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.bus); o.onended = unplug([o, g]); o.start(t); o.stop(t + dur + 0.1);
  },
  pluck(f, t) {
    const c = AudioBus.ctx, o = c.createOscillator(), g = c.createGain(), flt = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; flt.type = 'lowpass'; flt.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(flt).connect(g); g.connect(this.bus); g.connect(AudioBus.delay); o.onended = unplug([o, flt, g]); o.start(t); o.stop(t + 1);
  },
  thump(t, acc) {
    const c = AudioBus.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * acc, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(this.bus); o.onended = unplug([o, g]); o.start(t); o.stop(t + 0.45);
  },
  swell(f, t, dur, dest) {
    const c = AudioBus.ctx, o = c.createOscillator(), g = c.createGain(), flt = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; flt.type = 'lowpass'; flt.frequency.setValueAtTime(120, t); flt.frequency.linearRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(flt).connect(g); g.connect(dest || this.bus); if (!dest) g.connect(AudioBus.reverb); o.onended = unplug([o, flt, g]); o.start(t); o.stop(t + dur + 0.1);
  },
};
