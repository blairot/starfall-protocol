'use strict';
// ============================================================================
// STARFALL PROTOCOL — settings, sound effects and generative ambient music
// All audio is synthesized live with WebAudio: no sound files.
// ============================================================================

// ---------------------------------------------------------------- settings (per device)
const SETTINGS_KEY = 'starfall_protocol_settings_v1';
const Settings = {
  defaults: {
    master: 80, music: 55, sfx: 75, voice: 90, subs: true, muted: false,
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
  ctx: null, master: null, musicBus: null, sfxBus: null, reverb: null, delay: null, keepAlive: null,
  init() {
    // iPhone/iPad treat Web Audio as "ambient" sound, which the silent switch mutes.
    // Ask for media playback (Safari 17+); older iOS needs a playing <audio> element instead.
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !navigator.audioSession) {
      if (!this.keepAlive) { const a = this.keepAlive = new Audio('audio/silence.mp3'); a.loop = true; a.setAttribute('playsinline', ''); }
      if (this.keepAlive.paused) this.keepAlive.play().catch(() => { /* needs a tap; retried on the next one */ });
    }
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
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});   // suspended, or 'interrupted' on iOS after backgrounding
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
// Layered one-shots: a transient, a filtered body and a room tail, built per call from a small
// voice kit (each voice <= 12 nodes, freed when its last source stops). Shared per-context pieces
// (noise buffer, saturation curves, a short dark reverb and a slap echo) are created once.
// Everything lands on AudioBus.sfxBus through an 8 kHz-capped submix, so the sfx volume/mute apply.
const SFX = {
  _R: null, _live: 0, _recent: {},
  init() { AudioBus.init(); },

  // ---- shared resources (rebuilt only if the AudioContext changes)
  _res() {
    const c = AudioBus.ctx; if (!c || !AudioBus.sfxBus) return null;
    if (this._R && this._R.c === c) return this._R;
    try {
      const R = { c }, sr = c.sampleRate;
      const hp = c.createBiquadFilter(), lp = c.createBiquadFilter();
      R.in = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 30; lp.type = 'lowpass'; lp.frequency.value = 8200; lp.Q.value = 0;
      R.in.connect(hp).connect(lp).connect(AudioBus.sfxBus);
      // 2 s of white noise; voices loop it from a random offset so no two hits are identical
      const nb = R.nbuf = c.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const curve = k => { const n = 1024, a = new Float32Array(n), m = Math.tanh(k); for (let i = 0; i < n; i++) a[i] = Math.tanh(k * (i / (n - 1) * 2 - 1)) / m; return a; };
      R.soft = curve(1.6); R.hard = curve(5);
      // short, darkening room (its own IR so tails follow the sfx volume, not the music volume)
      const len = Math.floor(sr * 1.7), ir = c.createBuffer(2, len, sr), pre = Math.floor(sr * 0.012);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch); let y = 0;
        for (let i = pre; i < len; i++) { const p = i / len; y += (0.75 - 0.6 * p) * ((Math.random() * 2 - 1) - y); d[i] = y * Math.pow(1 - p, 2.6); }
      }
      R.verb = c.createConvolver(); R.verb.buffer = ir;
      const vr = c.createGain(); vr.gain.value = 0.7; R.verb.connect(vr).connect(R.in);
      // slap echo with a darkening feedback loop (pings, chimes, klaxons)
      R.echo = c.createDelay(1); R.echo.delayTime.value = 0.135;
      const ef = c.createBiquadFilter(), fb = c.createGain(), eo = c.createGain();
      ef.type = 'lowpass'; ef.frequency.value = 3200; fb.gain.value = 0.3; eo.gain.value = 0.55;
      R.echo.connect(ef).connect(fb).connect(R.echo); ef.connect(eo).connect(R.in);
      this._R = R; return R;
    } catch (e) { return null; }
  },

  // Root note of the music that is playing (sector key), so tonal cues sit in key. Read-only.
  _key(d) {
    let k = d;
    try { if (Music.mood !== 'menu' && Music.T) k = Music.T.root + (Music.sec ? Music.sec.key : 0); } catch (e) { k = d; }
    while (k > 56) k -= 12; while (k < 45) k += 12;
    return k;
  },

  // A voice: creates and tracks nodes, schedules sources, frees everything after the last source ends.
  // name is the rate-limit key: repeats inside 70 ms get quieter and a 4th is dropped.
  _voice(name, lvl) {
    if (Settings.get('muted') || !Settings.get('sfx')) return null;
    const R = this._res(); if (!R) return null;
    const c = R.c, now = c.currentTime, rec = (this._recent[name] || []).filter(x => now - x < 0.07);
    if (rec.length >= 3 || this._live >= 32) return null;
    rec.push(now); this._recent[name] = rec;
    const self = this, nodes = [], srcs = [], add = n => { nodes.push(n); return n; };
    const out = add(c.createGain()); out.gain.value = lvl * [1, 0.6, 0.42][rec.length - 1]; out.connect(R.in);
    const free = () => nodes.forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
    const V = {
      c, out, t: now + 0.01, nodes,
      rv: a => 1 + (Math.random() * 2 - 1) * a,
      osc(type, f, t0, t1) { const o = add(c.createOscillator()); o.type = type; o.frequency.value = f; o.start(t0); o.stop(t1); srcs.push([o, t1]); return o; },
      noise(t0, t1, rate) { const s = add(c.createBufferSource()); s.buffer = R.nbuf; s.loop = true; if (rate) s.playbackRate.value = rate; s.start(t0, Math.random() * 1.8); s.stop(t1); srcs.push([s, t1]); return s; },
      filt(type, f, q) { const b = add(c.createBiquadFilter()); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; },
      gain(v) { const g = add(c.createGain()); g.gain.value = v == null ? 0 : v; return g; },
      pan(p) { const n = add(c.createStereoPanner ? c.createStereoPanner() : c.createGain()); if (n.pan) n.pan.value = p; return n; },
      shaper(hard) { const w = add(c.createWaveShaper()); w.curve = hard ? R.hard : R.soft; w.oversample = '2x'; return w; },
      verb(node, amt) { const g = V.gain(amt); node.connect(g); g.connect(R.verb); return g; },
      echo(node, amt) { const g = V.gain(amt); node.connect(g); g.connect(R.echo); return g; },
      // linear attack to pk, optional hold, exponential decay to silence; returns the end time
      env(p, t, a, pk, d, h) { h = h || 0; pk = Math.max(1e-4, pk); p.setValueAtTime(1e-4, t); p.linearRampToValueAtTime(pk, t + a); if (h) p.setValueAtTime(pk, t + a + h); p.exponentialRampToValueAtTime(1e-4, t + a + h + d); return t + a + h + d; },
      sweep(p, t, v0, v1, d) { p.setValueAtTime(Math.max(1e-4, v0), t); p.exponentialRampToValueAtTime(Math.max(1e-4, v1), t + d); },
      // short random ticks on a gain (debris, crackle), strictly after t0
      ticks(p, t0, span, n, pk) { let tt = t0; for (let i = 0; i < n; i++) { tt += span / n * (0.5 + Math.random()); const v = Math.max(2e-4, pk * (1 - i / n) * (0.3 + Math.random() * 0.7)); p.setValueAtTime(1e-4, tt); p.linearRampToValueAtTime(v, tt + 0.002); p.exponentialRampToValueAtTime(1e-4, tt + 0.02); tt += 0.022; } return tt; },
      done() {
        if (!srcs.length) { free(); return; }
        let last = srcs[0]; srcs.forEach(s => { if (s[1] > last[1]) last = s; });
        self._live++;
        last[0].onended = () => { self._live = Math.max(0, self._live - 1); free(); };
      },
    };
    return V;
  },
  _play(name, lvl, build) {
    let V = null;
    try { V = this._voice(name, lvl); if (V) build(V, V.t); } catch (e) { /* audio is optional */ }
    if (V) try { V.done(); } catch (e) { /* audio is optional */ }
  },

  // ---- legacy one-liners (kept for compatibility)
  tone(f, dur, type, vol, slide, delay) {
    this._play('tone' + Math.round(f), 1, (V, t) => {
      t += delay || 0; dur = Math.max(0.02, dur || 0.2);
      const o = V.osc(type || 'sine', f, t, t + dur + 0.05), g = V.gain();
      if (slide) V.sweep(o.frequency, t, f, Math.max(30, f + slide), dur);
      V.env(g.gain, t, 0.008, vol || 0.05, dur - 0.008); o.connect(g).connect(V.out);
    });
  },
  noise(dur, vol, freq, q, delay) {
    this._play('noise', 1, (V, t) => {
      t += delay || 0; dur = Math.max(0.02, dur || 0.2);
      const n = V.noise(t, t + dur + 0.02), f = V.filt('bandpass', freq || 1200, q || 0.8), g = V.gain();
      V.env(g.gain, t, 0.003, vol || 0.2, dur); n.connect(f).connect(g).connect(V.out);
    });
  },

  // ---- UI
  // crisp holographic tick: tiny falling sine blip + a filtered noise click. Quiet.
  click() {
    this._play('click', 1, (V, t) => {
      const f = 2500 * V.rv(0.05), o = V.osc('sine', f, t, t + 0.06), g = V.gain();
      V.sweep(o.frequency, t, f, f * 0.7, 0.03); V.env(g.gain, t, 0.002, 0.03, 0.035);
      const n = V.noise(t, t + 0.025), bp = V.filt('bandpass', 4000 * V.rv(0.08), 1.4), ng = V.gain();
      V.env(ng.gain, t, 0.001, 0.05, 0.012);
      o.connect(g).connect(V.out); n.connect(bp).connect(ng).connect(V.out);
    });
  },
  // card played: noise whoosh drifting across the stereo field, landing on a soft FM chime
  play() {
    this._play('play', 1, (V, t) => {
      const n = V.noise(t, t + 0.36), bp = V.filt('bandpass', 600, 1.1), wg = V.gain(), p = V.pan(0);
      V.sweep(bp.frequency, t, 450 * V.rv(0.08), 2800, 0.24);
      wg.gain.setValueAtTime(1e-4, t); wg.gain.exponentialRampToValueAtTime(0.14, t + 0.11); wg.gain.exponentialRampToValueAtTime(1e-4, t + 0.33);
      if (p.pan) { const s = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-0.35 * s, t); p.pan.linearRampToValueAtTime(0.3 * s, t + 0.3); }
      n.connect(bp).connect(wg).connect(p).connect(V.out);
      const tc = t + 0.09, f = 1046 * V.rv(0.03);
      const car = V.osc('sine', f, tc, tc + 0.75), mod = V.osc('sine', f * 2, tc, tc + 0.75), mg = V.gain(), cg = V.gain();
      V.sweep(mg.gain, tc, f * 1.1, f * 0.04, 0.3); mod.connect(mg).connect(car.frequency);
      V.env(cg.gain, tc, 0.004, 0.05, 0.6);
      car.connect(cg).connect(V.out); V.verb(cg, 0.35);
    });
  },

  // ---- combat
  // spell: detuned saws climb through a resonant filter, then release as a falling bright tone + air
  spell() {
    this._play('spell', 1, (V, t) => {
      const k = V.rv(0.04), tr = t + 0.3, end = tr + 0.6;
      const a = V.osc('sawtooth', 180 * k, t, tr + 0.08), b = V.osc('sawtooth', 180 * k, t, tr + 0.08), lp = V.filt('lowpass', 350, 7), cg = V.gain();
      a.detune.value = -14; b.detune.value = 14;
      V.sweep(a.frequency, t, 180 * k, 720 * k, 0.3); V.sweep(b.frequency, t, 180 * k, 720 * k, 0.3); V.sweep(lp.frequency, t, 350, 3200, 0.3);
      cg.gain.setValueAtTime(1e-4, t); cg.gain.exponentialRampToValueAtTime(0.04, tr); cg.gain.exponentialRampToValueAtTime(1e-4, tr + 0.07);
      a.connect(lp); b.connect(lp); lp.connect(cg).connect(V.out);
      const s = V.osc('triangle', 1500 * k, tr, end), n = V.noise(tr, end), bp = V.filt('bandpass', 2600, 1.2), rg = V.gain();
      V.sweep(s.frequency, tr, 1500 * k, 380 * k, 0.35);
      n.connect(bp).connect(rg); s.connect(rg);
      V.env(rg.gain, tr, 0.003, 0.07, 0.5);
      rg.connect(V.out); V.verb(rg, 0.45);
    });
  },
  // electric crackle: band noise chopped by an irregular square gate, plus a driven falling arc
  zap() {
    this._play('zap', 1, (V, t) => {
      const d = 0.15 + Math.random() * 0.07, p = V.pan((Math.random() - 0.5) * 0.5);
      const n = V.noise(t, t + d + 0.02), bp = V.filt('bandpass', 3000 * V.rv(0.15), 2.5), am = V.gain(0.5), ng = V.gain();
      const lfo = V.osc('square', 45, t, t + d + 0.02), lg = V.gain(0.5);
      for (let i = 0; i < 6; i++) lfo.frequency.setValueAtTime(30 + Math.random() * 70, t + i * d / 6);
      lfo.connect(lg).connect(am.gain);
      V.env(ng.gain, t, 0.002, 0.7, d);
      n.connect(bp).connect(am).connect(ng).connect(p);
      const f = 1700 * V.rv(0.06), s = V.osc('sawtooth', f, t, t + d), ws = V.shaper(true), lp = V.filt('lowpass', 3600, 1), sg = V.gain();
      V.sweep(s.frequency, t, f, f * 0.16, d); V.env(sg.gain, t, 0.002, 0.05, d * 0.9);
      s.connect(ws).connect(lp).connect(sg).connect(p);
      p.connect(V.out);
    });
  },
  // punchy impact: noise crack + low-passed crunch + saturated falling thump, a touch of room
  hit() {
    this._play('hit', 1, (V, t) => {
      const k = V.rv(0.06), p = V.pan((Math.random() - 0.5) * 0.3);
      const n = V.noise(t, t + 0.24, k), bp = V.filt('bandpass', 1900 * k, 0.9), cg = V.gain(), lp = V.filt('lowpass', 1200 * k, 0.7), bg = V.gain();
      V.env(cg.gain, t, 0.001, 0.7, 0.05); V.env(bg.gain, t, 0.002, 1, 0.2);
      n.connect(bp).connect(cg).connect(p); n.connect(lp).connect(bg).connect(p);
      const o = V.osc('sine', 150 * k, t, t + 0.3), ws = V.shaper(false), og = V.gain();
      V.sweep(o.frequency, t, 220 * k, 50, 0.13); V.env(og.gain, t, 0.003, 0.13, 0.22);
      o.connect(ws).connect(og).connect(p);
      p.connect(V.out); V.verb(p, 0.12);
    });
  },
  // heavy explosion: driven sub drop, closing low-passed blast with a flutter, and debris ticks
  bigHit() {
    this._play('bigHit', 1, (V, t) => {
      const k = V.rv(0.05);
      const o = V.osc('sine', 85 * k, t, t + 0.9), ws = V.shaper(false), og = V.gain();
      V.sweep(o.frequency, t, 85 * k, 30, 0.5); V.env(og.gain, t, 0.004, 0.09, 0.75);
      o.connect(ws).connect(og).connect(V.out);
      const n = V.noise(t, t + 1.5, 0.8 * k), lp = V.filt('lowpass', 3000, 0.5), ng = V.gain(), bp = V.filt('bandpass', 2400 * k, 1.2), cg = V.gain();
      V.sweep(lp.frequency, t, 3200, 180, 1.1);
      ng.gain.setValueAtTime(1e-4, t); ng.gain.linearRampToValueAtTime(0.3, t + 0.006);
      let v = 0.3; for (let i = 1; i <= 14; i++) { v *= 0.74; ng.gain.exponentialRampToValueAtTime(Math.max(1e-4, v * (0.45 + Math.random() * 0.8)), t + 0.02 + i * 0.08); }
      ng.gain.exponentialRampToValueAtTime(1e-4, t + 1.45);
      V.env(cg.gain, t, 0.001, 0.2, 0.06);
      V.ticks(cg.gain, t + 0.09, 0.8, 9, 0.14);
      n.connect(lp).connect(ng).connect(V.out); n.connect(bp).connect(cg).connect(V.out);
      V.verb(ng, 0.3);
    });
  },
  // warm rising shimmer: root, fifth and octave of the music's key bloom upward, with airy sparkle
  heal() {
    this._play('heal', 1, (V, t) => {
      const r = mtof(this._key(48) + 24) * V.rv(0.01);
      [0, 7, 12].forEach((x, i) => {
        const f = r * Math.pow(2, x / 12), t0 = t + i * 0.07, o = V.osc(i === 2 ? 'sine' : 'triangle', f * 0.97, t0, t0 + 0.95), g = V.gain();
        V.sweep(o.frequency, t0, f * 0.97, f * 1.005, 0.3); V.env(g.gain, t0, 0.06, i === 2 ? 0.04 : 0.05, 0.8);
        o.connect(g).connect(V.out);
      });
      const n = V.noise(t, t + 0.9), bp = V.filt('bandpass', 2500, 3), ng = V.gain();
      V.sweep(bp.frequency, t, 2500, 6500, 0.6);
      ng.gain.setValueAtTime(1e-4, t); ng.gain.exponentialRampToValueAtTime(0.09, t + 0.35); ng.gain.exponentialRampToValueAtTime(1e-4, t + 0.88);
      n.connect(bp).connect(ng).connect(V.out);
      V.verb(V.out, 0.5);
    });
  },
  // metallic energy barrier: inharmonic FM ping with slap echo, a low barrier thud and a contact spark
  shield() {
    this._play('shield', 1, (V, t) => {
      const f = 1180 * V.rv(0.04);
      const car = V.osc('sine', f, t, t + 0.9), mod = V.osc('sine', f * 1.414, t, t + 0.9), mg = V.gain(), cg = V.gain();
      V.sweep(mg.gain, t, f * 2.2, f * 0.08, 0.5); mod.connect(mg).connect(car.frequency);
      V.env(cg.gain, t, 0.002, 0.08, 0.75);
      car.connect(cg).connect(V.out); V.echo(cg, 0.4);
      const h = V.osc('sine', 210, t, t + 0.3), hg = V.gain();
      V.sweep(h.frequency, t, 210, 90, 0.2); V.env(hg.gain, t, 0.004, 0.09, 0.22); h.connect(hg).connect(V.out);
      const n = V.noise(t, t + 0.05), bp = V.filt('bandpass', 3600, 3), ng = V.gain();
      V.env(ng.gain, t, 0.001, 0.35, 0.03); n.connect(bp).connect(ng).connect(V.out);
      V.verb(V.out, 0.25);
    });
  },
  // crystalline: ice crack, frost hiss, and two glassy voices hopping between high shard tones
  freeze() {
    this._play('freeze', 1, (V, t) => {
      const n = V.noise(t, t + 0.75), bp = V.filt('bandpass', 1800 * V.rv(0.08), 1.2), cg = V.gain(), hp = V.filt('bandpass', 4500, 0.8), hg = V.gain();
      V.env(cg.gain, t, 0.001, 0.45, 0.05);
      hg.gain.setValueAtTime(1e-4, t); hg.gain.exponentialRampToValueAtTime(0.05, t + 0.08); hg.gain.exponentialRampToValueAtTime(1e-4, t + 0.7);
      n.connect(bp).connect(cg).connect(V.out); n.connect(hp).connect(hg).connect(V.out);
      [0, 1].forEach(j => {
        const o = V.osc('sine', 3000, t, t + 0.75), g = V.gain(); let tt = t + 0.015 + j * 0.035;
        g.gain.setValueAtTime(1e-4, t);
        for (let i = 0; i < 6; i++) {
          o.frequency.setValueAtTime(2200 + Math.random() * 2400, tt);
          g.gain.setValueAtTime(1e-4, tt); g.gain.linearRampToValueAtTime(0.06 * (1 - i / 8), tt + 0.002); g.gain.exponentialRampToValueAtTime(1e-4, tt + 0.05);
          tt += 0.06 + Math.random() * 0.03;
        }
        o.connect(g).connect(V.out);
      });
      V.verb(V.out, 0.4);
    });
  },
  // implosion (noise band sucked downward, power-down saw) into a burst with a falling thump
  death() {
    this._play('death', 1, (V, t) => {
      const k = V.rv(0.06), tb = t + 0.12, n = V.noise(t, tb + 0.75, k);
      const bp = V.filt('bandpass', 3000, 1.5), sg = V.gain();
      V.sweep(bp.frequency, t, 3400 * k, 500, 0.12);
      sg.gain.setValueAtTime(1e-4, t); sg.gain.exponentialRampToValueAtTime(0.12, tb); sg.gain.exponentialRampToValueAtTime(1e-4, tb + 0.03);
      const lp = V.filt('lowpass', 2400, 0.5), bg = V.gain();
      V.sweep(lp.frequency, tb, 2600 * k, 260, 0.6);
      bg.gain.setValueAtTime(1e-4, tb); bg.gain.linearRampToValueAtTime(0.3, tb + 0.005);
      let v = 0.3; for (let i = 1; i <= 8; i++) { v *= 0.66; bg.gain.exponentialRampToValueAtTime(Math.max(1e-4, v * (0.5 + Math.random() * 0.7)), tb + i * 0.075); }
      bg.gain.exponentialRampToValueAtTime(1e-4, tb + 0.72);
      n.connect(bp).connect(sg).connect(V.out); n.connect(lp).connect(bg).connect(V.out);
      const s = V.osc('sawtooth', 340 * k, t, tb + 0.4), sl = V.filt('lowpass', 1400, 2), so = V.gain();
      V.sweep(s.frequency, t, 340 * k, 70, 0.45); V.env(so.gain, t, 0.01, 0.03, 0.45);
      s.connect(sl).connect(so).connect(V.out);
      const o = V.osc('sine', 120 * k, tb, tb + 0.4), og = V.gain();
      V.sweep(o.frequency, tb, 120 * k, 38, 0.25); V.env(og.gain, tb, 0.003, 0.16, 0.3);
      o.connect(og).connect(V.out); V.verb(V.out, 0.2);
    });
  },
  // ominous psionic sting: tritone saw stab with a snapping resonant filter, and a trembling whine
  trap() {
    this._play('trap', 1, (V, t) => {
      const f = mtof(this._key(50) - 12) * V.rv(0.02);
      const a = V.osc('sawtooth', f, t, t + 1.2), b = V.osc('sawtooth', f * 1.4142, t, t + 1.2), lp = V.filt('lowpass', 2500, 9), g = V.gain();
      b.detune.value = 8;
      lp.frequency.setValueAtTime(2800, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.06); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.5); lp.frequency.exponentialRampToValueAtTime(300, t + 1.1);
      V.env(g.gain, t, 0.004, 0.075, 0.95, 0.1);
      a.connect(lp); b.connect(lp); lp.connect(g).connect(V.out);
      const s = V.osc('sine', f * 8, t, t + 1.2), l = V.osc('sine', 7.5, t, t + 1.2), lg = V.gain(40), sg = V.gain();
      l.connect(lg).connect(s.detune); V.sweep(s.frequency, t, f * 8, f * 8.5, 1);
      sg.gain.setValueAtTime(1e-4, t); sg.gain.linearRampToValueAtTime(0.03, t + 0.25); sg.gain.exponentialRampToValueAtTime(1e-4, t + 1.15);
      s.connect(sg).connect(V.out);
      V.verb(V.out, 0.5);
    });
  },

  // ---- turn flow and outcomes (tonal cues follow the music's key)
  // confident amber chime: root then fifth over a warm octave, a low saw body and a tactile click
  turn() {
    this._play('turn', 1, (V, t) => {
      const r = mtof(this._key(50) + 12) * V.rv(0.01), t2 = t + 0.11;
      const o1 = V.osc('triangle', r, t, t + 0.85), o2 = V.osc('sine', r / 2, t, t + 0.85), g = V.gain();
      o1.frequency.setValueAtTime(r * 1.5, t2); o2.frequency.setValueAtTime(r * 0.75, t2);
      g.gain.setValueAtTime(1e-4, t); g.gain.linearRampToValueAtTime(0.05, t + 0.006); g.gain.exponentialRampToValueAtTime(0.02, t2);
      g.gain.linearRampToValueAtTime(0.065, t2 + 0.006); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.8);
      o1.connect(g); o2.connect(g); g.connect(V.out); V.echo(g, 0.3);
      const s = V.osc('sawtooth', r / 4, t, t + 0.7), lp = V.filt('lowpass', 1200, 1), bg = V.gain();
      V.sweep(lp.frequency, t, 1400, 500, 0.6); V.env(bg.gain, t, 0.02, 0.03, 0.6);
      s.connect(lp).connect(bg).connect(V.out);
      const n = V.noise(t, t + 0.03), bp = V.filt('bandpass', 2800, 1.5), ng = V.gain();
      V.env(ng.gain, t, 0.001, 0.12, 0.015); n.connect(bp).connect(ng).connect(V.out);
      V.verb(V.out, 0.3);
    });
  },
  // lower, tenser: root then a minor second up on growling detuned saws, a sub pulse under each note
  enemyTurn() {
    this._play('enemyTurn', 1, (V, t) => {
      const r = mtof(this._key(50)) * V.rv(0.01), t2 = t + 0.16, end = t2 + 0.55, semi = Math.pow(2, 1 / 12);
      const a = V.osc('sawtooth', r, t, end), b = V.osc('sawtooth', r, t, end), lp = V.filt('lowpass', 1600, 5), g = V.gain();
      a.detune.value = -10; b.detune.value = 10;
      a.frequency.setValueAtTime(r * semi, t2); b.frequency.setValueAtTime(r * semi, t2);
      lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(500, t2 - 0.01);
      lp.frequency.setValueAtTime(1800, t2); lp.frequency.exponentialRampToValueAtTime(380, end);
      g.gain.setValueAtTime(1e-4, t); g.gain.linearRampToValueAtTime(0.07, t + 0.008); g.gain.exponentialRampToValueAtTime(0.025, t2);
      g.gain.linearRampToValueAtTime(0.08, t2 + 0.008); g.gain.exponentialRampToValueAtTime(1e-4, end);
      a.connect(lp); b.connect(lp); lp.connect(g).connect(V.out);
      const sub = V.osc('sine', r / 2, t, end), sg = V.gain();
      sg.gain.setValueAtTime(1e-4, t); sg.gain.linearRampToValueAtTime(0.08, t + 0.01); sg.gain.exponentialRampToValueAtTime(1e-4, t + 0.15);
      sg.gain.linearRampToValueAtTime(0.08, t2 + 0.01); sg.gain.exponentialRampToValueAtTime(1e-4, t2 + 0.3);
      sub.connect(sg).connect(V.out);
      const n = V.noise(t, t + 0.04), bp = V.filt('bandpass', 1100, 1), ng = V.gain();
      V.env(ng.gain, t, 0.001, 0.15, 0.025); n.connect(bp).connect(ng).connect(V.out);
      V.verb(V.out, 0.3);
    });
  },
  // triumphant brass swell: five-saw major voicing scooping into pitch as the filter opens
  win() {
    this._play('win', 1, (V, t) => {
      const key = this._key(48), lp = V.filt('lowpass', 300, 2), g = V.gain();
      [0, 7, 12, 16, 19].forEach((x, i) => {
        const o = V.osc('sawtooth', mtof(key + x) * V.rv(0.002), t, t + 2.3), dt = (i % 2 ? 6 : -6);
        o.detune.setValueAtTime(dt - 45, t); o.detune.linearRampToValueAtTime(dt, t + 0.09); o.connect(lp);
      });
      lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.22); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.9); lp.frequency.exponentialRampToValueAtTime(500, t + 2.2);
      g.gain.setValueAtTime(1e-4, t); g.gain.linearRampToValueAtTime(0.035, t + 0.12); g.gain.exponentialRampToValueAtTime(0.024, t + 0.9); g.gain.exponentialRampToValueAtTime(1e-4, t + 2.25);
      lp.connect(g).connect(V.out);
      const n = V.noise(t, t + 0.2), bp = V.filt('bandpass', 1200, 0.8), ng = V.gain();
      V.env(ng.gain, t, 0.003, 0.08, 0.12); n.connect(bp).connect(ng).connect(V.out);
      V.verb(V.out, 0.45);
    });
  },
  // defeat: muffled minor chord sagging in pitch as the filter closes, over a low boom
  lose() {
    this._play('lose', 1, (V, t) => {
      const key = this._key(48), lp = V.filt('lowpass', 1400, 1), g = V.gain();
      [0, 3, 7, 12].forEach((x, i) => {
        const o = V.osc('sawtooth', mtof(key + x) * V.rv(0.002), t, t + 2.4), dt = (i % 2 ? 7 : -7);
        o.detune.setValueAtTime(dt, t + 0.25); o.detune.linearRampToValueAtTime(dt - 200, t + 2.2); o.connect(lp);
      });
      V.sweep(lp.frequency, t, 1400, 220, 2);
      g.gain.setValueAtTime(1e-4, t); g.gain.linearRampToValueAtTime(0.055, t + 0.06); g.gain.exponentialRampToValueAtTime(0.035, t + 0.5); g.gain.exponentialRampToValueAtTime(1e-4, t + 2.3);
      lp.connect(g).connect(V.out);
      const o = V.osc('sine', 70, t, t + 1.2), og = V.gain();
      V.sweep(o.frequency, t, 70, 30, 0.9); V.env(og.gain, t, 0.005, 0.12, 1);
      o.connect(og).connect(V.out);
      V.verb(V.out, 0.4);
    });
  },
  // boss transformation: sub drop and beating saws driven into one roaring filter, a rising formant choir
  phase() {
    this._play('phase', 1, (V, t) => {
      const key = this._key(50), k = V.rv(0.02), root = mtof(key - 12) * k;
      const sub = V.osc('sine', 110, t, t + 2.8), a = V.osc('sawtooth', root, t, t + 2.8), b = V.osc('sawtooth', root * 1.06, t, t + 2.8);
      const ws = V.shaper(true), lp = V.filt('lowpass', 200, 4), g = V.gain();
      V.sweep(sub.frequency, t, 110, 28, 1.6); V.sweep(a.frequency, t, root * 1.3, root, 0.5); V.sweep(b.frequency, t, root * 1.38, root * 1.06, 0.5);
      lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 0.5); lp.frequency.exponentialRampToValueAtTime(700, t + 2.6);
      g.gain.setValueAtTime(1e-4, t); g.gain.linearRampToValueAtTime(0.12, t + 0.05); g.gain.exponentialRampToValueAtTime(0.065, t + 0.4);
      g.gain.linearRampToValueAtTime(0.095, t + 1.2); g.gain.exponentialRampToValueAtTime(1e-4, t + 2.7);
      sub.connect(ws); a.connect(ws); b.connect(ws); ws.connect(lp).connect(g).connect(V.out);
      const tc = t + 0.3, f = mtof(key + 12) * k;
      const c1 = V.osc('sawtooth', f * 0.75, tc, t + 2.95), c2 = V.osc('sawtooth', f * 1.125, tc, t + 2.95), bp = V.filt('bandpass', 750, 3), cg = V.gain();
      c2.detune.value = 9;
      V.sweep(c1.frequency, tc, f * 0.75, f, 2); V.sweep(c2.frequency, tc, f * 1.125, f * 1.5, 2);
      bp.frequency.setValueAtTime(750, tc); bp.frequency.linearRampToValueAtTime(520, t + 2.9);
      cg.gain.setValueAtTime(1e-4, tc); cg.gain.linearRampToValueAtTime(0.11, t + 2); cg.gain.exponentialRampToValueAtTime(1e-4, t + 2.9);
      c1.connect(bp); c2.connect(bp); bp.connect(cg).connect(V.out);
      V.verb(V.out, 0.5);
    });
  },

  // ---- cinematic extras (cutscenes: warp | alarm | hum | static | chime)
  // hyperspace jump: noise and saw risers sweeping across the field, then a sub boom on the jump
  warp() {
    this._play('warp', 1, (V, t) => {
      const tj = t + 1.1, n = V.noise(t, tj + 0.3), bp = V.filt('bandpass', 300, 1.6), ng = V.gain(), p = V.pan(-0.6);
      V.sweep(bp.frequency, t, 300, 5200, 1.1);
      ng.gain.setValueAtTime(1e-4, t); ng.gain.exponentialRampToValueAtTime(0.22, tj); ng.gain.exponentialRampToValueAtTime(1e-4, tj + 0.25);
      if (p.pan) { p.pan.setValueAtTime(-0.6, t); p.pan.linearRampToValueAtTime(0.6, tj); }
      n.connect(bp).connect(ng).connect(p).connect(V.out);
      const s = V.osc('sawtooth', 80, t, tj + 0.05), lp = V.filt('lowpass', 300, 6), sg = V.gain();
      V.sweep(s.frequency, t, 80, 900, 1.1); V.sweep(lp.frequency, t, 300, 3500, 1.1);
      sg.gain.setValueAtTime(1e-4, t); sg.gain.exponentialRampToValueAtTime(0.05, tj); sg.gain.exponentialRampToValueAtTime(1e-4, tj + 0.04);
      s.connect(lp).connect(sg).connect(V.out);
      const o = V.osc('sine', 90, tj, tj + 1.1), og = V.gain();
      V.sweep(o.frequency, tj, 95, 28, 0.8); V.env(og.gain, tj, 0.004, 0.15, 0.95);
      o.connect(og).connect(V.out);
      V.verb(V.out, 0.45);
    });
  },
  // ship klaxon: three falling horn pulses through a band-pass, echoed
  alarm() {
    this._play('alarm', 1, (V, t) => {
      const a = V.osc('sawtooth', 620, t, t + 1.4), b = V.osc('sawtooth', 620, t, t + 1.4), bp = V.filt('bandpass', 1100, 2), g = V.gain();
      b.detune.value = 18; g.gain.setValueAtTime(1e-4, t);
      for (let i = 0; i < 3; i++) {
        const tp = t + i * 0.42;
        V.sweep(a.frequency, tp, 640, 470, 0.34); V.sweep(b.frequency, tp, 640, 470, 0.34);
        g.gain.setValueAtTime(1e-4, tp); g.gain.linearRampToValueAtTime(0.06, tp + 0.02); g.gain.setValueAtTime(0.06, tp + 0.28); g.gain.exponentialRampToValueAtTime(1e-4, tp + 0.36);
      }
      a.connect(bp); b.connect(bp); bp.connect(g).connect(V.out);
      V.echo(g, 0.35); V.verb(g, 0.3);
    });
  },
  // reactor hum: low detuned saws and a sine with a slow filter wobble, swelling in and out
  hum() {
    this._play('hum', 1, (V, t) => {
      const r = mtof(this._key(50) - 24), end = t + 2;
      const a = V.osc('sawtooth', r, t, end), b = V.osc('sawtooth', r * 2, t, end), s = V.osc('sine', r * 4, t, end), lp = V.filt('lowpass', 400, 3), g = V.gain();
      b.detune.value = 6;
      const l = V.osc('sine', 5.5, t, end), lg = V.gain(120); l.connect(lg).connect(lp.frequency);
      lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(900, t + 1); lp.frequency.linearRampToValueAtTime(320, end);
      V.env(g.gain, t, 0.5, 0.06, 0.8, 0.6);
      a.connect(lp); b.connect(lp); s.connect(lp); lp.connect(g).connect(V.out);
      V.verb(g, 0.3);
    });
  },
  // comms static: noise chopped at random then band-passed, a thin high hiss layer
  static() {
    this._play('static', 1, (V, t) => {
      const d = 0.6, n = V.noise(t, t + d + 0.02), bp = V.filt('bandpass', 1800, 0.7), am = V.gain(), g = V.gain(), hp = V.filt('bandpass', 3800, 1.5), hg = V.gain(), lp = V.filt('lowpass', 5000, 0);
      for (let tt = t; tt < t + d; tt += 0.012 + Math.random() * 0.03) am.gain.setValueAtTime(Math.random() < 0.3 ? 0.05 : 0.4 + Math.random() * 0.6, tt);
      V.env(g.gain, t, 0.01, 0.16, 0.3, d - 0.31);
      hg.gain.setValueAtTime(0.025, t); hg.gain.exponentialRampToValueAtTime(1e-4, t + d);
      n.connect(am).connect(bp).connect(g).connect(lp); n.connect(hp).connect(hg).connect(lp); lp.connect(V.out);
    });
  },
  // soft notification: two FM bell notes (fifth up) with echo
  chime() {
    this._play('chime', 1, (V, t) => {
      const f = mtof(this._key(50) + 24) * V.rv(0.01), t2 = t + 0.14;
      const car = V.osc('sine', f, t, t + 1.3), mod = V.osc('sine', f * 3.5, t, t + 1.3), mg = V.gain(), cg = V.gain();
      car.frequency.setValueAtTime(f * 1.5, t2); mod.frequency.setValueAtTime(f * 5.25, t2);
      V.sweep(mg.gain, t, f * 1.5, f * 0.1, 0.13); V.sweep(mg.gain, t2, f * 2, f * 0.05, 0.4);
      cg.gain.setValueAtTime(1e-4, t); cg.gain.linearRampToValueAtTime(0.04, t + 0.004); cg.gain.exponentialRampToValueAtTime(0.012, t2);
      cg.gain.linearRampToValueAtTime(0.05, t2 + 0.004); cg.gain.exponentialRampToValueAtTime(1e-4, t + 1.25);
      mod.connect(mg).connect(car.frequency); car.connect(cg).connect(V.out);
      V.echo(cg, 0.35); V.verb(cg, 0.35);
    });
  },
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
