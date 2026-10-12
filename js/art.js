'use strict';
// ============================================================================
// STARFALL PROTOCOL — procedural art and particle effects
// Shared helpers for illustrations.js (card art) and the particle layer.
// ============================================================================

function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let a = seed || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const ART_CACHE = {};
// ---------------------------------------------------------------- particles
const FX = {
  cv: null, ctx: null, parts: [], bolts: [], raf: 0,
  attach() { this.cv = document.getElementById('fxc'); this.ctx = this.cv ? this.cv.getContext('2d') : null; },
  on() { return typeof Settings === 'undefined' || Settings.get('particles'); },
  kick() { if (!this.raf) this.raf = requestAnimationFrame(t => this.frame(t)); },
  spark(x, y, o) {
    if (!this.on() || !this.ctx) return;
    const n = o.count || 14;
    for (let i = 0; i < n; i++) {
      const a = (o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1.2) : Math.random() * Math.PI * 2);
      const sp = (o.speed || 4) * (0.35 + Math.random() * 0.9);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.lift || 0), g: o.gravity == null ? 0.06 : o.gravity, life: 0, max: (o.life || 34) * (0.6 + Math.random() * 0.6), size: (o.size || 2.4) * (0.6 + Math.random() * 0.8), color: o.color || '#ffb347', kind: o.kind || 'spark' });
    }
    this.kick();
  },
  ring(x, y, color, r) { if (!this.on() || !this.ctx) return; this.parts.push({ x, y, life: 0, max: 26, r: r || 60, color, kind: 'ring' }); this.kick(); },
  bolt(a, b, color, dur) {
    if (!this.on() || !this.ctx) return Promise.resolve();
    return new Promise(res => {
      let done = false; const finish = () => { if (!done) { done = true; res(); } };
      const bo = { a, b, color, t0: performance.now(), dur: dur || 320, res: finish, trail: [] };
      this.bolts.push(bo); this.kick();
      // rAF pauses in hidden tabs; never let the game wait on it
      setTimeout(() => { const i = this.bolts.indexOf(bo); if (i >= 0) this.bolts.splice(i, 1); finish(); }, (dur || 320) + 200);
    });
  },
  impact(x, y, color, power) {
    this.spark(x, y, { color, count: 10 + power * 3, speed: 3 + power * 0.5, life: 30, size: 2.6 });
    this.spark(x, y, { color: '#fff3d6', count: 6, speed: 2, life: 16, size: 2 });
    this.ring(x, y, color, 30 + power * 6);
  },
  frame(t) {
    this.raf = 0;
    const c = this.ctx; if (!c) return;
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.globalCompositeOperation = 'lighter';
    // bolts
    for (const bo of this.bolts.slice()) {
      const k = Math.min(1, (t - bo.t0) / bo.dur), e = k * k * (3 - 2 * k);
      const x = bo.a.x + (bo.b.x - bo.a.x) * e, y = bo.a.y + (bo.b.y - bo.a.y) * e - Math.sin(k * Math.PI) * 40;
      bo.trail.push({ x, y }); if (bo.trail.length > 14) bo.trail.shift();
      bo.trail.forEach((p, i) => { const f = i / bo.trail.length; c.fillStyle = bo.color; c.globalAlpha = f * 0.7; c.beginPath(); c.arc(p.x, p.y, 2 + f * 7, 0, Math.PI * 2); c.fill(); });
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      if (Math.random() < 0.6) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, g: 0, life: 0, max: 16, size: 2, color: bo.color, kind: 'spark' });
      if (k >= 1) { this.bolts.splice(this.bolts.indexOf(bo), 1); this.impact(bo.b.x, bo.b.y, bo.color, 3); bo.res(); }
    }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life++;
      const f = 1 - p.life / p.max;
      if (f <= 0) { this.parts.splice(i, 1); continue; }
      if (p.kind === 'ring') {
        c.strokeStyle = p.color; c.globalAlpha = f * 0.9; c.lineWidth = 3 * f + 0.5;
        c.beginPath(); c.arc(p.x, p.y, p.r * (1 - f * f) + 4, 0, Math.PI * 2); c.stroke(); continue;
      }
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.97; p.vy *= 0.97;
      c.globalAlpha = f; c.fillStyle = p.color;
      if (p.kind === 'shard') { c.save(); c.translate(p.x, p.y); c.rotate(p.life * 0.2); c.fillRect(-p.size, -p.size * 2.2, p.size * 2, p.size * 4.4); c.restore(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + f * 0.6), 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.parts.length || this.bolts.length) this.kick();
  },
};

function shakeStage(power) {
  if (typeof Settings !== 'undefined' && !Settings.get('shake')) return;
  const st = document.getElementById('stage'); if (!st || REDUCED) return;
  const base = st.style.transform;
  const amp = Math.min(10, 2 + power);
  st.animate([{ transform: base }, { transform: base + ` translate(${amp}px,${-amp / 2}px)` }, { transform: base + ` translate(${-amp}px,${amp / 2}px)` }, { transform: base + ` translate(${amp / 2}px,0)` }, { transform: base }], { duration: 260 });
}
