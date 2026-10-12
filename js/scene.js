'use strict';
// ============================================================================
// STARFALL PROTOCOL — animated space backdrop for the menus
// Nebula and planet are painted once per mood into offscreen canvases (value
// noise), then composited each frame with parallax star layers, passing ships
// and warp streaks. Pauses during battle and when the tab is hidden.
// ============================================================================

const Scene = (() => {
  // ---------------------------------------------------------------- noise
  const P = new Uint8Array(512);
  (() => { const p = [...Array(256).keys()]; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const fade = t => t * t * (3 - 2 * t);
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => P[(P[a & 255] + b) & 511] / 255;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct) { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < (oct || 5); i++) { s += amp * vnoise(x * f, y * f); f *= 2.02; amp *= 0.5; } return s; }
  const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return [0, 8, 4].map(n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))); };
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ---------------------------------------------------------------- moods
  const MOODS = {
    title:  { hue: 200, hue2: 32, planet: { x: 0.5, y: 1.62, r: 1.05, hue: 205, kind: 'gas' }, seed: 3 },
    map:    { hue: 215, hue2: 280, planet: { x: 1.02, y: 0.62, r: 0.42, hue: 30, kind: 'rock' }, seed: 11 },
    hangar: { hue: 205, hue2: 190, planet: { x: -0.08, y: 0.08, r: 0.3, hue: 210, kind: 'ice' }, seed: 7 },
    shop:   { hue: 34, hue2: 15, planet: { x: 0.05, y: 1.05, r: 0.5, hue: 28, kind: 'gas' }, seed: 5 },
  };
  const cache = {};

  function paintNebula(m, w, h) {
    const W = 320, H = Math.round(320 * h / w) || 180;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const c1 = hsl(m.hue, 55, 38), c2 = hsl(m.hue2, 60, 42), dark = [4, 6, 10];
    const o = m.seed * 37.1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = x / W * 3.2 + o, ny = y / W * 3.2 + o * 0.7;
      const n = fbm(nx, ny, 5), t = fbm(nx * 0.7 + 9.1, ny * 0.7 - 3.3, 4), dust = fbm(nx * 1.8 - 5, ny * 1.8 + 2, 4);
      const dens = smooth(0.42, 0.82, n) * (1 - smooth(0.5, 0.75, dust) * 0.75);
      const mix = smooth(0.3, 0.7, t), i = (y * W + x) * 4;
      d[i] = c1[0] + (c2[0] - c1[0]) * mix; d[i + 1] = c1[1] + (c2[1] - c1[1]) * mix; d[i + 2] = c1[2] + (c2[2] - c1[2]) * mix;
      d[i + 3] = Math.round(255 * Math.min(0.75, dens * 0.8));
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function paintPlanet(pl, size) {
    const S = Math.min(420, Math.max(160, Math.round(size)));
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    const L = [-0.62, -0.5, 0.6], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    const base = hsl(pl.hue, pl.kind === 'ice' ? 25 : 38, pl.kind === 'ice' ? 62 : 46), deep = hsl(pl.hue + 15, 40, 14);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x / S) * 2 - 1, ny = (y / S) * 2 - 1, rr = nx * nx + ny * ny, i = (y * S + x) * 4;
      if (rr > 1) { d[i + 3] = 0; continue; }
      const nz = Math.sqrt(1 - rr), lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const u = Math.atan2(nx, nz) * 1.2, v = ny;
      let t = pl.kind === 'gas' ? fbm(u * 1.5 + 4, v * 9, 5) * 0.75 + Math.sin(v * 22 + fbm(u * 3, v * 3, 3) * 6) * 0.12 : fbm(u * 2.4 + 2, v * 2.4, 6);
      if (pl.kind === 'rock') t = smooth(0.35, 0.7, t);
      const shade = 0.05 + Math.pow(lam, 0.9) * 0.95, edge = 1 - Math.pow(rr, 6) * 0.4;
      d[i] = (deep[0] + (base[0] - deep[0]) * t) * shade * edge; d[i + 1] = (deep[1] + (base[1] - deep[1]) * t) * shade * edge; d[i + 2] = (deep[2] + (base[2] - deep[2]) * t) * shade * edge;
      d[i + 3] = rr > 0.985 ? Math.round(255 * (1 - (rr - 0.985) / 0.015)) : 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------------------------------------------------------------- state
  let cv, ctx, W = 0, H = 0, cur = null, prev = null, blend = 1, running = false, last = 0;
  let stars = [], ships = [], streaks = [], mx = 0, my = 0, tx = 0, ty = 0, nextShip = 2000, nextStreak = 5000;

  function build(name) {
    const key = name + ':' + W + 'x' + H + ':' + (MOODS[name].hueOverride || '');
    if (cache[key]) return cache[key];
    const m = MOODS[name], R = m.planet.r * Math.min(W, H) * (name === 'title' ? 1 : 1);
    const L = { name, m, neb: paintNebula(m, W, H), planet: paintPlanet(m.planet, R * 2), R };
    bakeLayer(L);
    L.neb = L.planet = null; // only the baked composite is kept
    return (cache[key] = L);
  }

  function resize() {
    W = cv.width = Math.round(window.innerWidth); H = cv.height = Math.round(window.innerHeight);
    const n = Math.round(W * H / 2600);
    stars = Array.from({ length: n }, () => { const z = Math.random(); return { x: Math.random() * W, y: Math.random() * H, z, s: z < 0.7 ? 0.6 + z : 1.2 + z * 1.4, t: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.6, flare: z > 0.985, tint: Math.random() }; });
    if (cur) cur = build(cur.name);
    prev = null;
  }

  function spawnShip() {
    const far = Math.random() < 0.6, dir = Math.random() < 0.5 ? 1 : -1;
    ships.push({ x: dir > 0 ? -60 : W + 60, y: H * (0.15 + Math.random() * 0.55), v: dir * (far ? 0.012 : 0.03) * (0.7 + Math.random() * 0.6), len: far ? 10 + Math.random() * 10 : 26 + Math.random() * 22, a: far ? 0.45 : 0.85, dir });
  }

  function drawShip(s) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.dir, 1); ctx.globalAlpha = s.a;
    const L = s.len;
    const g = ctx.createRadialGradient(-L * 0.55, 0, 0, -L * 0.55, 0, L * 0.7);
    g.addColorStop(0, 'rgba(160,220,255,.9)'); g.addColorStop(1, 'rgba(90,170,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-L * 1.3, -L * 0.35, L * 0.9, L * 0.7);
    ctx.fillStyle = '#0b1016'; ctx.strokeStyle = 'rgba(160,190,220,.35)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(L * 0.6, 0); ctx.lineTo(L * 0.25, -L * 0.09); ctx.lineTo(-L * 0.45, -L * 0.12); ctx.lineTo(-L * 0.5, -L * 0.2); ctx.lineTo(-L * 0.58, -L * 0.2); ctx.lineTo(-L * 0.58, L * 0.2); ctx.lineTo(-L * 0.5, L * 0.2); ctx.lineTo(-L * 0.45, L * 0.12); ctx.lineTo(L * 0.25, L * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,110,.9)'; for (let k = 0; k < 4; k++) ctx.fillRect(-L * 0.3 + k * L * 0.14, -0.4, 0.9, 0.8);
    ctx.restore();
  }

  // Sky, nebula, planet and atmosphere composited once into an oversized canvas;
  // each frame just blits it with a small parallax offset.
  function bakeLayer(L) {
    const c = document.createElement('canvas'); c.width = W + 80; c.height = H + 60;
    const g = c.getContext('2d'), m = L.m;
    const sky = g.createLinearGradient(0, 0, 0, c.height);
    sky.addColorStop(0, `hsl(${m.hue},40%,4%)`); sky.addColorStop(1, `hsl(${m.hue + 20},35%,7%)`);
    g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    g.drawImage(L.neb, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    L.back = c;
    // planet on its own transparent layer so stars sit behind it
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const gf = f.getContext('2d');
    const p = m.planet, R = L.R, px = p.x * W + 40, py = p.y * H + 30;
    const atm = gf.createRadialGradient(px, py, R * 0.92, px, py, R * 1.18);
    atm.addColorStop(0, `hsla(${p.hue + 180},70%,70%,0)`); atm.addColorStop(0.35, `hsla(${p.hue === 30 ? 200 : p.hue},80%,65%,.28)`); atm.addColorStop(1, 'hsla(0,0%,0%,0)');
    gf.fillStyle = atm; gf.beginPath(); gf.arc(px, py, R * 1.18, 0, Math.PI * 2); gf.fill();
    gf.drawImage(L.planet, px - R, py - R, R * 2, R * 2);
    gf.strokeStyle = `hsla(${p.hue === 30 ? 195 : p.hue},85%,75%,.55)`; gf.lineWidth = 1.4;
    gf.beginPath(); gf.arc(px, py, R * 0.995, Math.PI * 0.95, Math.PI * 1.65); gf.stroke();
    L.front = f;
  }

  function drawLayer(L, alpha, pdx, pdy, part) {
    if (!L || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(L[part], -40 - pdx * (part === 'front' ? 56 : 40), -30 - pdy * (part === 'front' ? 36 : 26));
    ctx.globalAlpha = 1;
  }

  let acc = 0; const stats = { frames: 0, cost: 0 };
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(80, now - last); last = now; acc += dt;
    if (acc < 32) return; // ~30fps is plenty for a slow backdrop
    const step = acc; acc = 0; const t0 = performance.now(); stats.frames++;
    tx += (mx - tx) * 0.08; ty += (my - ty) * 0.08;
    const pdx = tx - 0.5, pdy = ty - 0.5;
    const fading = prev && blend < 1;
    if (fading) { blend = Math.min(1, blend + step / 1400); drawLayer(prev, 1, pdx, pdy, 'back'); drawLayer(cur, blend, pdx, pdy, 'back'); }
    else drawLayer(cur, 1, pdx, pdy, 'back');
    // stars, batched by colour
    const cols = ['rgba(225,235,250,', 'rgba(170,205,255,', 'rgba(255,214,170,'];
    for (let c = 0; c < 3; c++) {
      for (const s of stars) {
        const sc = s.tint > 0.85 ? 2 : s.tint > 0.7 ? 1 : 0; if (sc !== c) continue;
        if (!REDUCED) { s.x -= s.z * step * 0.004; if (s.x < -4) { s.x = W + 4; s.y = Math.random() * H; } s.t += step * 0.001 * s.sp; }
        const x = s.x - pdx * s.z * 24, y = s.y - pdy * s.z * 16, a = 0.25 + s.z * 0.6 + Math.sin(s.t) * 0.18;
        ctx.fillStyle = cols[c] + a.toFixed(2) + ')';
        ctx.fillRect(x, y, s.s, s.s);
        if (s.flare) { ctx.fillStyle = cols[c] + (a * 0.35).toFixed(2) + ')'; ctx.fillRect(x - 6, y + s.s / 2 - 0.3, 12 + s.s, 0.6); ctx.fillRect(x + s.s / 2 - 0.3, y - 6, 0.6, 12 + s.s); }
      }
    }
    if (fading) { drawLayer(prev, 1 - blend, pdx, pdy, 'front'); drawLayer(cur, blend, pdx, pdy, 'front'); if (blend >= 1) prev = null; }
    else drawLayer(cur, 1, pdx, pdy, 'front');
    if (!REDUCED) {
      nextShip -= step; if (nextShip < 0) { spawnShip(); nextShip = 7000 + Math.random() * 9000; }
      nextStreak -= step; if (nextStreak < 0) { streaks.push({ x: Math.random() * W, y: Math.random() * H * 0.6, a: 1, len: 80 + Math.random() * 140, ang: 0.3 + Math.random() * 0.3 }); nextStreak = 6000 + Math.random() * 10000; }
    }
    for (const s of ships.slice()) { s.x += s.v * step; drawShip(s); if (s.x < -120 || s.x > W + 120) ships.splice(ships.indexOf(s), 1); }
    for (const s of streaks.slice()) {
      s.a -= step / 700; if (s.a <= 0) { streaks.splice(streaks.indexOf(s), 1); continue; }
      const gx = Math.cos(s.ang) * s.len, gy = Math.sin(s.ang) * s.len, lg = ctx.createLinearGradient(s.x, s.y, s.x + gx, s.y + gy);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(220,240,255,${s.a * 0.8})`);
      ctx.strokeStyle = lg; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + gx, s.y + gy); ctx.stroke();
      s.x += Math.cos(s.ang) * step * 0.5; s.y += Math.sin(s.ang) * step * 0.5;
    }
    stats.cost = stats.cost * 0.9 + (performance.now() - t0) * 0.1;
  }

  // Static painted backdrop for a battle in sector si (no animation cost).
  const BD = {};
  const BD_LOOK = [
    { planet: { x: 0.88, y: 0.1, r: 0.2, kind: 'ice', dh: 0 }, seed: 21 },
    { planet: { x: 0.1, y: 0.98, r: 0.42, kind: 'rock', dh: 8 }, seed: 29 },
    { planet: { x: 0.92, y: 0.2, r: 0.24, kind: 'gas', dh: 40 }, seed: 33 },
    { planet: { x: 0.12, y: 0.06, r: 0.26, kind: 'rock', dh: -150 }, seed: 41 },
    { planet: { x: 0.86, y: 0.92, r: 0.36, kind: 'ice', dh: -40 }, seed: 47 },
    { planet: null, seed: 53 },
  ];
  function backdrop(si, hue) {
    if (BD[si]) return BD[si];
    const BW = 1280, BH = 760, look = BD_LOOK[si] || BD_LOOK[0];
    const m = { hue, hue2: hue + 55, seed: look.seed };
    const c = document.createElement('canvas'); c.width = BW; c.height = BH;
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, BH);
    sky.addColorStop(0, `hsl(${hue},45%,5%)`); sky.addColorStop(1, `hsl(${hue + 25},40%,7%)`);
    g.fillStyle = sky; g.fillRect(0, 0, BW, BH);
    g.globalCompositeOperation = 'lighter'; g.drawImage(paintNebula(m, BW, BH), 0, 0, BW, BH); g.globalCompositeOperation = 'source-over';
    let seed = look.seed * 7919; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 900; k++) { const z = rnd(); g.fillStyle = `rgba(${z > 0.9 ? '255,220,190' : '215,230,255'},${(0.2 + z * 0.7).toFixed(2)})`; const sz = z > 0.97 ? 2 : z > 0.8 ? 1.4 : 0.9; g.fillRect(rnd() * BW, rnd() * BH, sz, sz); }
    if (look.planet) {
      const p = Object.assign({ hue: hue + look.planet.dh }, look.planet), R = p.r * BH, px = p.x * BW, py = p.y * BH;
      const atm = g.createRadialGradient(px, py, R * 0.9, px, py, R * 1.25);
      atm.addColorStop(0, 'hsla(0,0%,0%,0)'); atm.addColorStop(0.3, `hsla(${p.hue},80%,62%,.3)`); atm.addColorStop(1, 'hsla(0,0%,0%,0)');
      g.fillStyle = atm; g.beginPath(); g.arc(px, py, R * 1.25, 0, Math.PI * 2); g.fill();
      g.drawImage(paintPlanet(p, R * 2), px - R, py - R, R * 2, R * 2);
    } else {
      // the galactic core: a bright accretion disc around a black centre
      const cx = BW * 0.5, cy = BH * 0.42;
      g.save(); g.translate(cx, cy); g.scale(1, 0.32);
      const disc = g.createRadialGradient(0, 0, 40, 0, 0, 520);
      disc.addColorStop(0, `hsla(${hue + 20},90%,85%,.95)`); disc.addColorStop(0.18, `hsla(${hue},85%,62%,.6)`); disc.addColorStop(0.5, `hsla(${hue - 30},70%,40%,.18)`); disc.addColorStop(1, 'hsla(0,0%,0%,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = disc; g.beginPath(); g.arc(0, 0, 520, 0, Math.PI * 2); g.fill(); g.restore();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 46, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `hsla(${hue + 30},100%,85%,.8)`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 48, 0, Math.PI * 2); g.stroke();
    }
    return (BD[si] = c.toDataURL('image/jpeg', 0.85));
  }

  return {
    stats: () => stats,
    backdrop,
    start() {
      cv = document.getElementById('stars'); if (!cv) return;
      ctx = cv.getContext('2d');
      resize();
      window.addEventListener('resize', () => { clearTimeout(this._rt); this._rt = setTimeout(resize, 200); });
      window.addEventListener('mousemove', e => { mx = e.clientX / window.innerWidth; my = e.clientY / window.innerHeight; }, { passive: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else this.resume(); });
      this.mood('title');
      this.resume();
    },
    resume() { if (running || !cv || App.screen === 'battle') return; running = true; last = performance.now(); requestAnimationFrame(frame); },
    pause() { running = false; },
    mood(name, hue) {
      if (!cv || !MOODS[name]) return;
      if (hue != null) { MOODS[name].hue = hue; MOODS[name].hue2 = hue + 60; MOODS[name].hueOverride = hue; }
      const next = build(name);
      if (cur === next) return;
      prev = cur; cur = next; blend = prev ? 0 : 1;
    },
    warp() { // a burst of streaks for screen transitions
      if (REDUCED || !cv) return;
      for (let k = 0; k < 14; k++) streaks.push({ x: Math.random() * W, y: Math.random() * H, a: 0.9, len: 60 + Math.random() * 160, ang: Math.PI + (Math.random() - 0.5) * 0.08 });
    },
  };
})();
