'use strict';
// ============================================================================
// STARFALL PROTOCOL — painted space: animated menu backdrop + sector vistas
// Everything is generated here from noise and vector shapes (no image files).
// A "look" describes a place: a layered nebula (domain-warped value noise with
// emissive filaments, dust lanes, a hot core and a galactic band), a star field
// (band, clusters, colour temperature, flared bright stars), an optional sun
// with lens flare, planets (sphere shading, terminator, atmospheric scattering,
// clouds, bands and storms, rings with shadows, night-side lights, moons) and
// set pieces (station, fleets, asteroid belt, wrecks, foundry platforms, a Lamp,
// the Singularity). Menus bake a look once per mood/size into a back layer (sky,
// nebula, stars, sun) and a front layer (planets, structures); each frame
// composites them with parallax stars, drifting flare ghosts, passing ships and
// convoys, and warp streaks. backdrop(si) bakes a sector into a static JPEG.
// ============================================================================

const Scene = (() => {
  // ---------------------------------------------------------------- noise
  const P = new Uint8Array(512);
  (() => { const p = [...Array(256).keys()]; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
  const PF = new Float32Array(512); for (let i = 0; i < 512; i++) PF[i] = P[i] / 255;
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255, pa = P[X], pb = P[X + 1];
    const a = PF[(pa + Y) & 511], b = PF[(pb + Y) & 511], c = PF[(pa + Y + 1) & 511], d = PF[(pb + Y + 1) & 511];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // octaves are rotated to hide the value-noise grid
  function fbm(x, y, oct) { let s = 0, amp = 0.5; for (let i = 0; i < oct; i++) { s += amp * vnoise(x, y); const nx = x * 1.6 - y * 1.2 + 3.1; y = x * 1.2 + y * 1.6 - 1.7; x = nx; amp *= 0.5; } return s; }
  function vnoise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const A = P[X] + Y, B = P[X + 1] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, BA = P[B] + Z, BB = P[B + 1] + Z;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const x00 = PF[AA] + (PF[BA] - PF[AA]) * u, x10 = PF[AB] + (PF[BB] - PF[AB]) * u;
    const x01 = PF[AA + 1] + (PF[BA + 1] - PF[AA + 1]) * u, x11 = PF[AB + 1] + (PF[BB + 1] - PF[AB + 1]) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }
  function fbm3(x, y, z, oct) {
    let s = 0, amp = 0.5;
    for (let i = 0; i < oct; i++) {
      s += amp * vnoise3(x, y, z);
      const nx = (0.8 * y + 0.6 * z) * 2.02 + 1.3, ny = (-0.8 * x + 0.36 * y - 0.48 * z) * 2.02 - 2.1, nz = (-0.6 * x - 0.48 * y + 0.64 * z) * 2.02 + 0.7;
      x = nx; y = ny; z = nz; amp *= 0.5;
    }
    return s;
  }

  // ---------------------------------------------------------------- helpers
  const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return [0, 8, 4].map(n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))); };
  const rgbf = c => hsl(c[0], c[1], c[2]).map(v => v / 255);
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const mkRnd = seed => { let s = (Math.abs(Math.round(seed * 7919)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const gauss = rnd => (rnd() + rnd() + rnd() + rnd() - 2) * 1.73;
  const css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  const STAR_COLS = [[150, 178, 255], [192, 210, 255], [238, 243, 255], [255, 244, 228], [255, 220, 176], [255, 184, 128]];
  const STAR_CUM = [0.07, 0.22, 0.52, 0.74, 0.9, 1];
  const starCol = (r, warm) => { r = Math.min(0.999, Math.max(0, r + (warm || 0))); let i = 0; while (r > STAR_CUM[i]) i++; return i; };

  const SPR = {};
  function glowSprite(c) {
    const k = c.join(); if (SPR[k]) return SPR[k];
    const s = mkCanvas(64, 64), g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, css(c, 0.85)); gr.addColorStop(0.28, css(c, 0.2)); gr.addColorStop(1, css(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (SPR[k] = s);
  }
  function radial(g, x, y, r, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    for (const [o, c, a] of stops) gr.addColorStop(o, css(c, a));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // cheap blur: shrink twice, then stretch back (works without ctx.filter)
  function bloom(g, src, x, y, w, h, alpha, div) {
    const a = mkCanvas(src.width / 3, src.height / 3), b = mkCanvas(src.width / (div || 9), src.height / (div || 9));
    a.getContext('2d').drawImage(src, 0, 0, a.width, a.height); b.getContext('2d').drawImage(a, 0, 0, b.width, b.height);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha; g.drawImage(b, x, y, w, h); g.restore();
  }

  // ---------------------------------------------------------------- nebula
  // Emission (added) and dust (absorbing) painted at reduced resolution.
  // Coordinates are in units of the frame width so a look keeps its shape.
  function paintNebula(g, look, F, cw, ch, res) {
    const nb = look.neb; if (!nb) return;
    const NW = Math.max(64, Math.round(cw * res)), NH = Math.max(36, Math.round(ch * res));
    const em = mkCanvas(NW, NH), du = mkCanvas(NW, NH), ge = em.getContext('2d'), gd = du.getContext('2d');
    const ie = ge.createImageData(NW, NH), id = gd.createImageData(NW, NH), E = ie.data, DD = id.data;
    const A = rgbf(nb.a), B = rgbf(nb.b), C = rgbf(nb.c), K = nb.core ? rgbf(nb.core.col) : null, band = nb.band, BC = band ? rgbf(band.col) : null;
    const o = (nb.seed || look.seed || 1) * 7.31 % 97, sc = nb.scale || 2.4, warp = (nb.warp ?? 1) * 1.6, th = nb.th ?? 0.47, dustAmt = nb.dust ?? 0.8, expo = (nb.expo || 1.6) * (nb.gain ?? 0.5);
    const fw = F.w, asp = F.h / F.w;
    const cu = K ? nb.core.x : 0, cv = K ? nb.core.y * asp : 0, cr2 = K ? nb.core.r * nb.core.r : 1;
    const bca = band ? Math.cos(band.ang) : 0, bsa = band ? Math.sin(band.ang) : 0, bu = band ? band.x : 0, bv = band ? band.y * asp : 0, bw = band ? band.w : 1, ba = band ? band.a : 0;
    const dc = nb.dustCol || [3, 4, 8];
    for (let y = 0; y < NH; y++) {
      const v = ((y + 0.5) / NH * ch - F.y) / fw;
      for (let x = 0; x < NW; x++) {
        const u = ((x + 0.5) / NW * cw - F.x) / fw;
        const px = u * sc + o, py = v * sc - o * 0.6;
        const qx = fbm(px * 0.7 + 1.7, py * 0.7 + 9.2, 3) - 0.5, qy = fbm(px * 0.7 + 8.3, py * 0.7 + 2.8, 3) - 0.5;
        const wx = px + qx * warp, wy = py + qy * warp;
        const n1 = fbm(wx, wy, 5), n2 = fbm(wx * 1.3 + 5.2, wy * 1.3 - 1.9, 5);
        const rf = 1 - Math.abs(2 * fbm(wx * 1.8 - 3.1, wy * 1.8 + 7.7, 5) - 1);
        const big = smooth(0.3, 0.7, fbm(px * 0.33 + 21, py * 0.33 - 7, 3));
        const d1 = smooth(th, th + 0.26, n1), d2 = smooth(th + 0.02, th + 0.28, n2);
        let f = rf * rf; f *= f; f *= f;
        const fil = f * (0.12 + d1 + d2) * 1.2;
        const dn = fbm(wx * 1.5 + 11.3, wy * 1.5 - 4.4, 5);
        const dr = 1 - Math.abs(2 * fbm(wx * 2.3 + 3.3, wy * 2.3 + 13.1, 4) - 1), dr3 = dr * dr * dr;
        let dust = (smooth(0.5, 0.66, dn) * 0.7 + dr3 * dr3 * smooth(0.36, 0.52, dn)) * dustAmt;
        if (dust > 1) dust = 1;
        const ga = d1 * (0.35 + big * 1.1), gb = d2 * (1.25 - big * 0.8);
        let r = A[0] * ga + B[0] * gb + C[0] * fil, gg = A[1] * ga + B[1] * gb + C[1] * fil, b = A[2] * ga + B[2] * gb + C[2] * fil;
        if (K) { const dx = u - cu, dy = v - cv, k = Math.exp(-(dx * dx + dy * dy) / cr2) * (0.1 + n1 * 0.9 + f * 0.7) * (nb.core.k ?? 1); r += K[0] * k; gg += K[1] * k; b += K[2] * k; }
        if (band) { const pd = ((u - bu) * bsa - (v - bv) * bca) / bw, k = Math.exp(-pd * pd) * (0.25 + fbm(px * 3 + 2, py * 3 - 5, 3)) * ba; r += BC[0] * k; gg += BC[1] * k; b += BC[2] * k; }
        const ab = 1 - dust * 0.94;
        r = 1 - Math.exp(-r * ab * expo); gg = 1 - Math.exp(-gg * ab * expo); b = 1 - Math.exp(-b * ab * expo);
        const wh = smooth(0.55, 1, (r + gg + b) * 0.333) * 0.4; // hot regions bleach toward white
        const i = (y * NW + x) * 4;
        E[i] = (r + (1 - r) * wh) * 255; E[i + 1] = (gg + (1 - gg) * wh) * 255; E[i + 2] = (b + (1 - b) * wh) * 255; E[i + 3] = 255;
        DD[i] = dc[0]; DD[i + 1] = dc[1]; DD[i + 2] = dc[2]; DD[i + 3] = dust * 240;
      }
    }
    ge.putImageData(ie, 0, 0); gd.putImageData(id, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(du, 0, 0, cw, ch);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(em, 0, 0, cw, ch);
    g.restore();
    bloom(g, em, 0, 0, cw, ch, nb.glow ?? 0.35, 10);
  }

  // ---------------------------------------------------------------- stars
  function paintStars(g, look, F, cw, ch, rnd) {
    const st = look.stars || {}, mul = st.n ?? 1, warm = st.warm || 0, sc = Math.sqrt(F.w * F.h / (1280 * 760));
    const xs = [], ys = [], ms = [], cs = [];
    const add = (x, y, m, w) => { if (x < -2 || y < -2 || x > cw + 2 || y > ch + 2) return; xs.push(x); ys.push(y); ms.push(m); cs.push(starCol(rnd(), w ?? warm)); };
    const N = Math.round(cw * ch / 480 * mul);
    for (let k = 0; k < N; k++) { const m = rnd(); add(rnd() * cw, rnd() * ch, m * m * m * m); }
    const nb = look.neb && look.neb.band;
    if (nb) { // the galactic band: denser, fainter, warmer
      const bx = F.x + nb.x * F.w, by = F.y + nb.y * F.h, ca = Math.cos(nb.ang), sa = Math.sin(nb.ang), len = Math.hypot(cw, ch) * 0.6;
      const n = Math.round(N * 1.1 * nb.a * (st.band ?? 1));
      for (let k = 0; k < n; k++) { const t = (rnd() * 2 - 1) * len, p = gauss(rnd) * nb.w * F.w * 0.5, m = rnd(); add(bx + ca * t - sa * p, by + sa * t + ca * p, m * m * m * m * m * 0.9, warm + 0.08); }
    }
    const glows = [];
    for (let c = 0; c < (st.clusters ?? 2); c++) { // open clusters: tight knots of young blue-white stars
      const cx = F.x + (0.1 + rnd() * 0.8) * F.w, cy = F.y + (0.08 + rnd() * 0.6) * F.h, sg = (10 + rnd() * 26) * sc, n = Math.round((70 + rnd() * 150) * Math.sqrt(mul));
      glows.push([cx, cy, sg]);
      for (let k = 0; k < n; k++) { const m = rnd(); add(cx + gauss(rnd) * sg, cy + gauss(rnd) * sg, m * m * m * 0.95, -0.3); }
    }
    if (st.core) { // a galactic bulge
      const c = st.core, cx = F.x + c.x * F.w, cy = F.y + c.y * F.h, sg = c.s * F.w;
      for (let k = 0; k < c.n * mul; k++) { const m = rnd(); add(cx + gauss(rnd) * sg * 1.5, cy + gauss(rnd) * sg * 0.6, m * m * m * m, 0.22); }
    }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [cx, cy, sg] of glows) radial(g, cx, cy, sg * 3, [[0, [190, 210, 255], 0.12], [0.4, [190, 210, 255], 0.04], [1, [190, 210, 255], 0]]);
    for (let c = 0; c < STAR_COLS.length; c++) {
      g.fillStyle = `rgb(${STAR_COLS[c]})`;
      for (let k = 0; k < xs.length; k++) { if (cs[k] !== c) continue; const m = ms[k], s = 0.55 + m * 1.5; g.globalAlpha = Math.min(1, 0.12 + m * 1.2); g.fillRect(xs[k] - s / 2, ys[k] - s / 2, s, s); }
    }
    for (let k = 0; k < xs.length; k++) { const m = ms[k]; if (m < 0.45) continue; const s = (2.5 + m * 7) * Math.max(0.8, sc); g.globalAlpha = m * 0.5; g.drawImage(glowSprite(STAR_COLS[cs[k]]), xs[k] - s, ys[k] - s, s * 2, s * 2); }
    g.restore();
  }

  function starFlare(g, x, y, s, c, ana, rot) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y);
    radial(g, 0, 0, s * 10, [[0, c, 0.5], [0.1, c, 0.16], [1, c, 0]]);
    g.rotate(rot || 0);
    for (let k = 0; k < 4; k++) {
      const L = s * (k % 2 ? 12 : 17), w = Math.max(0.45, s * 0.3), lg = g.createLinearGradient(0, 0, L, 0);
      lg.addColorStop(0, css(c, 0.85)); lg.addColorStop(0.25, css(c, 0.25)); lg.addColorStop(1, css(c, 0));
      g.fillStyle = lg; g.beginPath(); g.moveTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.closePath(); g.fill();
      g.rotate(Math.PI / 2);
    }
    g.rotate(-(rot || 0));
    if (ana) { g.save(); g.scale(1, 0.03); radial(g, 0, 0, s * 36, [[0, [150, 190, 255], 0.5], [0.5, [120, 165, 255], 0.1], [1, [120, 165, 255], 0]]); g.restore(); }
    radial(g, 0, 0, s * 1.9, [[0, [255, 255, 255], 1], [0.45, c, 0.8], [1, c, 0]]);
    g.restore();
  }
  function paintBrightStars(g, look, F, rnd) {
    const st = look.stars || {}, n = st.bright ?? 4, k = F.h / 760;
    for (let i = 0; i < n; i++) starFlare(g, F.x + (0.03 + rnd() * 0.94) * F.w, F.y + (0.03 + rnd() * 0.9) * F.h, (0.9 + rnd() * rnd() * 1.8) * k, STAR_COLS[starCol(rnd(), (st.warm || 0) - 0.15)], rnd() < 0.4, look.spike || 0.12);
  }

  // ---------------------------------------------------------------- sun + lens flare
  function drawSun(g, x, y, s, c) {
    g.save(); g.globalCompositeOperation = 'lighter';
    radial(g, x, y, s * 240, [[0, c, 0.13], [0.12, c, 0.045], [0.45, c, 0.012], [1, c, 0]]);
    radial(g, x, y, s * 60, [[0, c, 0.6], [0.15, c, 0.2], [1, c, 0]]);
    g.translate(x, y);
    const rnd = mkRnd(x * 0.37 + y);
    for (let k = 0; k < 18; k++) { // starburst rays
      const a = rnd() * Math.PI * 2, L = s * (40 + rnd() * 140), w = s * (0.5 + rnd() * 1.6);
      g.save(); g.rotate(a); const lg = g.createLinearGradient(0, 0, L, 0); lg.addColorStop(0, css(c, 0.3)); lg.addColorStop(1, css(c, 0));
      g.fillStyle = lg; g.beginPath(); g.moveTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.fill(); g.restore();
    }
    g.save(); g.scale(1, 0.022); radial(g, 0, 0, s * 560, [[0, [170, 205, 255], 0.55], [0.35, [120, 170, 255], 0.14], [1, [90, 140, 255], 0]]); g.restore(); // anamorphic streak
    g.save(); g.scale(1, 0.007); radial(g, 0, 0, s * 320, [[0, [235, 245, 255], 0.9], [1, [160, 200, 255], 0]]); g.restore();
    radial(g, 0, 0, s * 16, [[0, [255, 255, 255], 1], [0.35, [255, 252, 240], 0.9], [1, c, 0]]);
    g.restore();
  }
  function makeGhosts(c) {
    const defs = [[0.3, 22, 'disc', [120, 255, 205], 0.22], [0.48, 56, 'ring', c, 0.22], [0.62, 13, 'hex', [255, 205, 140], 0.22], [0.86, 80, 'disc', [110, 150, 255], 0.1], [1.16, 30, 'hex', [200, 140, 255], 0.12], [1.38, 140, 'ring', [140, 200, 255], 0.16], [1.6, 20, 'disc', [255, 170, 120], 0.25], [1.75, 9, 'disc', [180, 255, 220], 0.4]];
    return defs.map(([t, r, type, col, a]) => {
      const S = Math.ceil(r * 2 + 4), cv = mkCanvas(S, S), g = cv.getContext('2d'), m = S / 2;
      if (type === 'hex') {
        g.beginPath(); for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3 + 0.3; g.lineTo(m + Math.cos(an) * r, m + Math.sin(an) * r); } g.closePath();
        g.fillStyle = css(col, 0.4); g.fill(); g.strokeStyle = css(col, 0.75); g.lineWidth = 1.2; g.stroke();
      } else if (type === 'ring') radial(g, m, m, r, [[0, col, 0], [0.8, col, 0.08], [0.92, col, 0.5], [1, col, 0]]);
      else radial(g, m, m, r, [[0, col, 0.5], [0.75, col, 0.3], [1, col, 0]]);
      return { c: cv, t, a };
    });
  }
  function drawGhosts(g, gh, sx, sy, cx, cy, alpha, k) {
    if (!gh || alpha <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const o of gh) { const x = sx + (cx - sx) * o.t, y = sy + (cy - sy) * o.t, w = o.c.width * k; g.globalAlpha = o.a * alpha * 0.5; g.drawImage(o.c, x - w / 2, y - w / 2, w, w); }
    g.restore();
  }

  // ---------------------------------------------------------------- planets
  function rotMat(pitch, spin, roll) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cs = Math.cos(spin), ss = Math.sin(spin), cr = Math.cos(roll), sr = Math.sin(roll);
    const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1], Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp], Ry = [cs, 0, ss, 0, 1, 0, -ss, 0, cs];
    const mul = (A, B) => { const C = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; };
    return mul(Ry, mul(Rx, Rz));
  }
  function bodyPalette(b) {
    const h = b.hue ?? 30;
    if (b.kind === 'gas') return [[h - 4, 45, 17], [h + 3, 45, 33], [h - 8, 35, 50], [h + 6, 38, 63], [h, 25, 76]].map(rgbf);
    if (b.kind === 'rock') return [[h, 45, 10], [h + 4, 50, 26], [h + 12, 45, 42], [h - 6, 30, 58]].map(rgbf);
    if (b.kind === 'ice') return [[h + 10, 40, 40], [h, 30, 66], [h - 10, 25, 84], [h, 20, 92]].map(rgbf);
    return [[h, 8, 30], [h, 6, 48], [h, 5, 62], [h, 4, 75]].map(rgbf); // moon
  }
  function ramp(pal, t, out) {
    t = clamp01(t) * (pal.length - 1); const i = Math.min(pal.length - 2, t | 0), f = t - i, a = pal[i], b = pal[i + 1];
    out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
  }

  // One body (planet or moon) with atmosphere halo and rings, painted only over
  // its visible bounding box at up to maxPx pixels. Lv: unit light vector,
  // screen space (x right, y down, z toward the viewer).
  function paintBody(b, R, cx, cy, cw, ch, Lv, maxPx) {
    const ring = b.ring, atm = b.atm ? b.atm.map(v => v / 255) : null, hw = atm ? (b.hw ?? 0.06) : 0, atmK = b.atmK ?? 1;
    const ext = Math.max(1 + hw * 2, ring ? ring.ro + 0.02 : 0) + 0.01;
    const x0 = Math.max(0, Math.floor(cx - ext * R)), x1 = Math.min(cw, Math.ceil(cx + ext * R)), y0 = Math.max(0, Math.floor(cy - ext * R)), y1 = Math.min(ch, Math.ceil(cy + ext * R));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;
    const bw = x1 - x0, bh = y1 - y0, k = Math.min(1, Math.sqrt((maxPx || 200000) / (bw * bh)));
    const w = Math.max(2, Math.round(bw * k)), h = Math.max(2, Math.round(bh * k));
    const c = mkCanvas(w, h), gc = c.getContext('2d'), img = gc.createImageData(w, h), D = img.data;
    const sx = bw / w, sy = bh / h, pw = sx / R;
    const M = rotMat(b.pitch ?? 0.35, b.spin ?? 0, b.roll ?? 0.25), Nr = [M[3], M[4], M[5]];
    const Lx = Lv[0], Ly = Lv[1], Lz = Lv[2], L2 = Math.hypot(Lx, Ly) || 1, lx2 = Lx / L2, ly2 = Ly / L2;
    const Hv = norm3([Lx, Ly, Lz + 1]);
    const kind = b.kind, pal = bodyPalette(b), rnd = mkRnd((b.seed || 1) * 31 + 7);
    const o1 = rnd() * 40, o2 = rnd() * 40, o3 = rnd() * 40, bf = 5 + rnd() * 4;
    const storms = kind === 'gas' ? Array.from({ length: b.storms ?? 3 }, (_, i) => { const lat = (rnd() - 0.5) * 1.2, lon = (rnd() - 0.5) * 1.6, cl = Math.cos(lat); return { x: Math.sin(lon) * cl, y: Math.sin(lat), z: Math.cos(lon) * cl, s: i === 0 ? 0.16 + rnd() * 0.06 : 0.05 + rnd() * 0.06, t: rnd() < 0.5 ? 0.92 : 0.08 }; }) : [];
    const craters = (kind === 'moon' || kind === 'rock') ? Array.from({ length: b.craters ?? 16 }, () => { const z = rnd() * 2 - 1, a = rnd() * 6.283, rr = Math.sqrt(1 - z * z); return { x: rr * Math.cos(a), y: z, z: rr * Math.sin(a), r: 0.03 + rnd() * rnd() * 0.2 }; }) : [];
    let prof = null, rc = null, rIn = 0, rOut = 0, NL = 0;
    if (ring) {
      rIn = ring.ri; rOut = ring.ro; rc = ring.col.map(v => v / 255); NL = Nr[0] * Lx + Nr[1] * Ly + Nr[2] * Lz;
      prof = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const t = i / 255; let d = 0.25 + 0.75 * (vnoise(t * 16 + o1, 1.5) * 0.5 + vnoise(t * 55 + o2, 4.5) * 0.3 + vnoise(t * 140, 8.5) * 0.2); if (Math.abs(t - 0.64) < 0.03) d *= 0.06; if (Math.abs(t - 0.28) < 0.012) d *= 0.3; d *= smooth(0, 0.08, t) * smooth(1, 0.88, t); prof[i] = Math.min(1, d * (ring.a ?? 0.85) * 1.15); }
    }
    const col = [0, 0, 0];
    for (let j = 0; j < h; j++) {
      const ny = (y0 + (j + 0.5) * sy - cy) / R;
      for (let i = 0; i < w; i++) {
        const nx = (x0 + (i + 0.5) * sx - cx) / R, rr = nx * nx + ny * ny, d = Math.sqrt(rr);
        let pr = 0, pg = 0, pb = 0, pa = 0;
        // ring sample (where the view ray crosses the ring plane)
        let ra = 0, rR = 0, rG = 0, rB = 0, ringFront = true;
        if (ring && Math.abs(Nr[2]) > 0.02) {
          const z = -(nx * Nr[0] + ny * Nr[1]) / Nr[2], rd = Math.sqrt(rr + z * z);
          if (rd > rIn && rd < rOut) {
            const t = (rd - rIn) / (rOut - rIn); ra = prof[(t * 255) | 0];
            const pl = nx * Lx + ny * Ly + z * Lz, shadow = pl < 0 && rd * rd - pl * pl < 1 ? 0.1 : 1;
            const lit = (0.18 + 0.82 * Math.abs(NL)) * shadow * (0.8 + 0.4 * t);
            rR = rc[0] * lit; rG = rc[1] * lit; rB = rc[2] * lit;
            ringFront = rr >= 1 || z > Math.sqrt(1 - rr);
          }
        }
        // atmosphere halo beyond the limb
        if (atm && d > 1 - 3 * pw) {
          const hh = Math.max(0, d - 1) / hw;
          if (hh < 2) {
            const ux = nx / d, uy = ny / d, facing = ux * Lx + uy * Ly, dl = ux * lx2 + uy * ly2;
            const il = smooth(-0.3, 0.5, facing) + Math.max(0, -Lz) * Math.pow(Math.max(0, dl), 3) * 2.4;
            const I = Math.exp(-hh * 2.4) * (1 - hh * 0.5) * il * atmK * 0.9;
            if (I > 0) { const a = Math.min(1, I); pr = Math.min(1, atm[0] * 1.15) * a; pg = Math.min(1, atm[1] * 1.15) * a; pb = Math.min(1, atm[2] * 1.15) * a; pa = a; }
          }
        }
        if (ra > 0 && rr >= 1) { pr = rR * ra + pr * (1 - ra); pg = rG * ra + pg * (1 - ra); pb = rB * ra + pb * (1 - ra); pa = ra + pa * (1 - ra); }
        if (d < 1 + pw) {
          const aa = clamp01((1 - d) / pw + 0.5), q = rr < 0.9999 ? rr : 0.9999, nz = Math.sqrt(1 - q);
          const tx = M[0] * nx + M[1] * ny + M[2] * nz, ty = M[3] * nx + M[4] * ny + M[5] * nz, tz = M[6] * nx + M[7] * ny + M[8] * nz;
          const lam = nx * Lx + ny * Ly + nz * Lz;
          let er = 0, eg = 0, eb = 0, spec = 0, cl = 0, sh = 1, cr_ = 0.92, cg_ = 0.93, cb_ = 0.95;
          if (kind === 'gas') {
            const turb = fbm3(tx * 2 + o1, ty * 6 + o2, tz * 2, 4) - 0.5, vv = ty * 3.1 + turb * 0.5;
            let t = 0.5 + Math.sin(vv * bf + o3) * 0.2 + (fbm(vv * 2.3 + o2, o3, 4) - 0.5) * 1.4 + (fbm3(tx * 5 + o3, ty * 26, tz * 5, 3) - 0.5) * 0.22;
            for (const s of storms) {
              const dx = tx - s.x, dy = (ty - s.y) * 1.9, dz = tz - s.z, dd = (dx * dx + dy * dy + dz * dz) / (s.s * s.s);
              if (dd < 2.5) { const sp = Math.exp(-dd * 1.6); t += (s.t - t) * sp * 0.9; sh *= 1 - 0.28 * Math.exp(-(dd - 1) * (dd - 1) * 6); }
            }
            ramp(pal, t, col); sh *= 0.6 + 0.4 * Math.sqrt(nz);
          } else if (kind === 'earth') {
            const wq = (fbm3(tx * 1.4 + o1, ty * 1.4, tz * 1.4, 3) - 0.5) * 0.7;
            const e = fbm3(tx * 1.8 + o2 + wq, ty * 1.8 + wq, tz * 1.8, 6), land = smooth(0.5, 0.52, e), coast = smooth(0.43, 0.5, e);
            const mo = smooth(0.42, 0.62, fbm3(tx * 3.4 + o3, ty * 3.4, tz * 3.4, 3)), lat = Math.abs(ty);
            col[0] = 0.012 + 0.04 * coast; col[1] = 0.05 + 0.11 * coast; col[2] = 0.15 + 0.15 * coast;
            const lr = 0.09 + 0.3 * mo, lg = 0.14 + 0.16 * mo, lb = 0.06 + 0.13 * mo;
            col[0] += (lr - col[0]) * land; col[1] += (lg - col[1]) * land; col[2] += (lb - col[2]) * land;
            const ice = smooth(0.9, 0.96, lat + (e - 0.5) * 0.3); col[0] += (0.88 - col[0]) * ice; col[1] += (0.92 - col[1]) * ice; col[2] += (0.96 - col[2]) * ice;
            const cwp = (fbm3(tx * 2 + o3, ty * 5, tz * 2, 3) - 0.5) * 1.3;
            cl = smooth(0.54, 0.8, fbm3(tx * 2.6 + cwp + o1, ty * 5.2, tz * 2.6 - cwp, 5)) * (b.clouds ?? 0.75);
            spec = (1 - land) * (1 - ice);
            if (b.lights) {
              const reg = smooth(0.42, 0.6, fbm3(tx * 5 + o2, ty * 5, tz * 5, 3)) * land * (1 - ice);
              if (reg > 0) { // towns, a fine scatter of lights, and the roads between them
                const c2 = vnoise3(tx * 55 + o3, ty * 55, tz * 55), c1 = vnoise3(tx * 240 + o1, ty * 240, tz * 240), rd = 1 - Math.abs(2 * vnoise3(tx * 22 + o2, ty * 22, tz * 22) - 1), r4 = rd * rd * rd * rd;
                const city = reg * (smooth(0.72, 0.95, c2) * 0.9 + smooth(0.62, 0.9, c1) * smooth(0.35, 0.7, c2) * 0.7 + r4 * r4 * smooth(0.3, 0.6, c2) * 0.6) * b.lights;
                er = 1.3 * city; eg = 0.78 * city; eb = 0.36 * city;
              }
            }
          } else if (kind === 'forge') {
            const t = fbm3(tx * 3 + o1, ty * 3, tz * 3, 5);
            col[0] = 0.09 + t * 0.16; col[1] = 0.1 + t * 0.16; col[2] = 0.115 + t * 0.17;
            const gx = tx * 26 + o2, gy = ty * 26 + o1, gz = tz * 26;
            const plate = vnoise3(Math.floor(gx) + 0.5, Math.floor(gy) + 0.5, Math.floor(gz) + 0.5); // tiled industrial blocks
            sh *= 0.7 + plate * 0.6;
            const ld = Math.min(Math.abs(gx - Math.floor(gx) - 0.5), Math.abs(gy - Math.floor(gy) - 0.5), Math.abs(gz - Math.floor(gz) - 0.5)), line = 1 - smooth(0.0, 0.05, ld);
            sh *= 1 - line * 0.1;
            const rg = 1 - Math.abs(2 * fbm3(tx * 2.1 + o3, ty * 2.1, tz * 2.1, 5) - 1), r2 = rg * rg, r4 = r2 * r2, r8 = r4 * r4, seam = r8 * r8 * r4;
            const reg = smooth(0.44, 0.6, fbm3(tx * 4 + o2, ty * 4, tz * 4, 3)), lights = line * reg * smooth(0.55, 0.85, vnoise3(tx * 150, ty * 150, tz * 150)) + reg * smooth(0.7, 0.9, vnoise3(tx * 70 + o1, ty * 70, tz * 70)) * 0.5;
            er = seam * 2.2 + lights * 1.4 + reg * 0.04; eg = seam * 0.85 + lights * 0.95 + reg * 0.015; eb = seam * 0.2 + lights * 0.45;
            cl = smooth(0.56, 0.82, fbm3(tx * 2.4 + o1, ty * 5, tz * 2.4, 4)) * 0.55; cr_ = 0.42; cg_ = 0.36; cb_ = 0.3;
          } else if (kind === 'hive') {
            const t = fbm3(tx * 2.6 + o1, ty * 2.6, tz * 2.6, 5), pt = smooth(0.52, 0.68, fbm3(tx * 4 + o2, ty * 4, tz * 4, 3));
            col[0] = 0.1 + t * 0.28; col[1] = 0.12 + t * 0.3; col[2] = 0.03 + t * 0.08;
            col[0] += (0.2 - col[0]) * pt; col[1] += (0.07 - col[1]) * pt; col[2] += (0.16 - col[2]) * pt;
            const rv = 1 - Math.abs(2 * fbm3(tx * 3.2 + o3, ty * 3.2, tz * 3.2, 5) - 1), r2 = rv * rv, r4 = r2 * r2, vein = r4 * r4 * r2;
            const pod = smooth(0.78, 0.9, vnoise3(tx * 34 + o1, ty * 34, tz * 34)) * (1 - pt);
            er = vein * 0.6 + pod * 0.5; eg = vein * 1.25 + pod * 1.0; eb = vein * 0.28 + pod * 0.2;
            cl = smooth(0.58, 0.8, fbm3(tx * 2.2 + o2, ty * 4.5, tz * 2.2, 4)) * 0.5; cr_ = 0.55; cg_ = 0.62; cb_ = 0.3;
          } else if (kind === 'dark') {
            const t = fbm3(tx * 2.4 + o1, ty * 2.4, tz * 2.4, 5);
            col[0] = 0.03 + t * 0.06; col[1] = 0.025 + t * 0.045; col[2] = 0.045 + t * 0.08;
            const rv = 1 - Math.abs(2 * fbm3(tx * 2.8 + o2, ty * 2.8, tz * 2.8, 5) - 1), r2 = rv * rv, r4 = r2 * r2, v = r4 * r4 * r4 * r4;
            er = v * 0.05; eg = v * 0.02; eb = v * 0.14;
          } else if (kind === 'ice') {
            const t = fbm3(tx * 2.2 + o1, ty * 2.2, tz * 2.2, 5); ramp(pal, t * 1.2 - 0.05 + Math.sin(ty * 9 + o2) * 0.05, col);
            const rc2 = 1 - Math.abs(2 * fbm3(tx * 3 + o2, ty * 3, tz * 3, 4) - 1), r4 = rc2 * rc2 * rc2 * rc2, crack = r4 * r4 * r4;
            col[0] *= 1 - crack * 0.25; col[1] *= 1 - crack * 0.15; col[2] *= 1 - crack * 0.05;
            spec = 0.15;
          } else { // rock, moon
            const t = fbm3(tx * 2.2 + o1, ty * 2.2, tz * 2.2, 6), rg = 1 - Math.abs(2 * fbm3(tx * 3.3 + o2, ty * 3.3, tz * 3.3, 4) - 1);
            ramp(pal, t * 1.3 - 0.15, col); sh *= 1 - Math.pow(rg, 8) * (kind === 'moon' ? 0.12 : 0.25);
            for (const c of craters) { const dx = tx - c.x, dy = ty - c.y, dz = tz - c.z, qq = (dx * dx + dy * dy + dz * dz) / (c.r * c.r); if (qq < 1.44) sh *= qq < 1 ? 0.74 + 0.26 * qq * qq : 1 + (1.44 - qq) * 0.45; }
          }
          // lighting
          const dif0 = (lam + 0.04) / 1.04, dif = dif0 > 0 ? Math.pow(dif0, 0.9) : 0;
          let ar = col[0] * sh, ag = col[1] * sh, ab = col[2] * sh;
          if (cl > 0) { ar += (cr_ - ar) * cl; ag += (cg_ - ag) * cl; ab += (cb_ - ab) * cl; }
          let r = ar * (0.012 + dif * 1.15), g = ag * (0.012 + dif * 1.15), bl = ab * (0.014 + dif * 1.15);
          if (ring && dif > 0 && Math.abs(NL) > 1e-3) { // ring shadow on the surface
            const t = -(nx * Nr[0] + ny * Nr[1] + nz * Nr[2]) / NL;
            if (t > 0) { const qx = nx + t * Lx, qy = ny + t * Ly, qz = nz + t * Lz, rq = Math.sqrt(qx * qx + qy * qy + qz * qz); if (rq > rIn && rq < rOut) { const s = 1 - prof[(((rq - rIn) / (rOut - rIn)) * 255) | 0] * 0.8; r *= s; g *= s; bl *= s; } }
          }
          if (spec > 0 && lam > 0) { const nh = nx * Hv[0] + ny * Hv[1] + nz * Hv[2]; if (nh > 0.95) { const s = Math.pow(nh, 160) * spec * (1 - cl) * 1.1; r += s; g += s * 0.93; bl += s * 0.82; } }
          const night = 1 - smooth(-0.1, 0.18, lam), ek = (night * 0.9 + 0.1) * (1 - cl * 0.7);
          r += er * ek; g += eg * ek; bl += eb * ek;
          if (atm) { // rim scattering, haze and a warm twilight band at the terminator
            const rim = Math.pow(1 - nz, 2.3), lit = smooth(-0.3, 0.5, lam), s = (rim * 1.15 + 0.06) * lit * atmK;
            const keep = 1 - rim * lit * 0.5;
            r = r * keep + atm[0] * s; g = g * keep + atm[1] * s; bl = bl * keep + atm[2] * s;
            const tw = Math.exp(-(lam * lam) / 0.006) * 0.1 * atmK * (0.3 + rim);
            r += tw; g += tw * 0.45; bl += tw * 0.2;
          }
          const sr = r > 1 ? 1 : r, sg = g > 1 ? 1 : g, sb = bl > 1 ? 1 : bl;
          pr = sr * aa + pr * (1 - aa); pg = sg * aa + pg * (1 - aa); pb = sb * aa + pb * (1 - aa); pa = aa + pa * (1 - aa);
          if (ra > 0 && ringFront && rr < 1) { pr = rR * ra + pr * (1 - ra); pg = rG * ra + pg * (1 - ra); pb = rB * ra + pb * (1 - ra); pa = ra + pa * (1 - ra); }
        }
        if (pa > 0.002) { const kk = (j * w + i) * 4, inv = 255 / pa; D[kk] = pr * inv; D[kk + 1] = pg * inv; D[kk + 2] = pb * inv; D[kk + 3] = pa * 255; }
      }
    }
    gc.putImageData(img, 0, 0);
    return { c, x: x0, y: y0, w: bw, h: bh };
  }

  // ---------------------------------------------------------------- set pieces
  function hullPath(g, L) { g.beginPath(); g.moveTo(L * 0.6, 0); g.lineTo(L * 0.25, -L * 0.09); g.lineTo(-L * 0.45, -L * 0.12); g.lineTo(-L * 0.5, -L * 0.2); g.lineTo(-L * 0.58, -L * 0.2); g.lineTo(-L * 0.58, L * 0.2); g.lineTo(-L * 0.5, L * 0.2); g.lineTo(-L * 0.45, L * 0.12); g.lineTo(L * 0.25, L * 0.09); g.closePath(); }
  function shipSil(g, x, y, L, dir, eng) {
    g.save(); g.translate(x, y); g.scale(dir, 1);
    g.globalCompositeOperation = 'lighter';
    const tl = g.createLinearGradient(-L * 0.6, 0, -L * 2.4, 0); tl.addColorStop(0, css(eng, 0.35)); tl.addColorStop(1, css(eng, 0));
    g.fillStyle = tl; g.fillRect(-L * 2.4, -L * 0.05, L * 1.8, L * 0.1);
    g.drawImage(glowSprite(eng), -L * 1.05, -L * 0.45, L * 0.9, L * 0.9);
    g.globalCompositeOperation = 'source-over';
    hullPath(g, L); g.fillStyle = '#070b11'; g.fill(); g.strokeStyle = 'rgba(160,190,225,.45)'; g.lineWidth = 0.6; g.stroke();
    g.restore();
  }
  function drawFleet(g, e, F) {
    const x = F.x + e.x * F.w, y = F.y + e.y * F.h, L = 16 * (e.s || 1) * F.h / 760, n = e.n || 3, dir = e.dir || 1;
    for (let k = n - 1; k >= 0; k--) shipSil(g, x - dir * k * L * 1.6, y + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * L * 0.7, L * (1 - k * 0.08), dir, e.eng || [150, 205, 255]);
  }

  function drawStation(g, e, F) {
    const x = F.x + e.x * F.w, y = F.y + e.y * F.h, s = e.s * F.h, rnd = mkRnd(e.seed || 5);
    g.save(); g.translate(x, y); g.rotate(e.ang ?? -0.3);
    const rx = s, ry = s * 0.36, th = Math.max(3, s * 0.1), rim = 'rgba(185,215,255,.8)', lw = Math.max(0.6, s * 0.007);
    const ell = (oy, a0, a1, ex) => { g.beginPath(); g.ellipse(0, oy, rx + (ex || 0), ry + (ex || 0), 0, a0, a1); g.stroke(); };
    const ring = (a0, a1) => { // the habitat wheel: shaded hull, shadowed underside, lit top edge, segment joints
      const lg = g.createLinearGradient(-rx, -ry, rx * 0.6, ry); lg.addColorStop(0, '#6a7c92'); lg.addColorStop(0.3, '#2c3746'); lg.addColorStop(1, '#0a0f17');
      g.strokeStyle = lg; g.lineWidth = th; ell(0, a0, a1);
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = th * 0.35; ell(th * 0.3, a0, a1);
      g.strokeStyle = rim; g.lineWidth = Math.max(0.7, th * 0.12); ell(-th * 0.44, a0, a1);
      g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = Math.max(0.6, s * 0.008); g.beginPath();
      for (let k = 0; k < 28; k++) { const an = a0 + (a1 - a0) * (k + 0.5) / 28, c = Math.cos(an), sn = Math.sin(an); g.moveTo(c * (rx - th / 2), sn * (ry - th / 2)); g.lineTo(c * (rx + th / 2), sn * (ry + th / 2)); }
      g.stroke();
    };
    ring(Math.PI, Math.PI * 2);
    g.strokeStyle = '#141b25'; g.lineWidth = Math.max(1, th * 0.28); g.beginPath();
    for (const an of [0.3, 0.8, 1.3, 1.8]) { g.moveTo(0, 0); g.lineTo(Math.cos(an * Math.PI) * rx, Math.sin(an * Math.PI) * ry); }
    g.stroke();
    // solar wings on the spindle
    for (const yy of [-0.62, 0.62]) for (const side of [-1, 1]) {
      const px = side > 0 ? s * 0.06 : -s * 0.46, w = s * 0.4, h = s * 0.1, pl = g.createLinearGradient(px, yy * s, px + w, yy * s + h);
      pl.addColorStop(0, '#2a4068'); pl.addColorStop(1, '#0c1526'); g.fillStyle = pl; g.fillRect(px, yy * s - h / 2, w, h);
      g.strokeStyle = 'rgba(140,180,240,.3)'; g.lineWidth = lw; g.beginPath();
      for (let k = 1; k < 6; k++) { g.moveTo(px + w * k / 6, yy * s - h / 2); g.lineTo(px + w * k / 6, yy * s + h / 2); }
      g.stroke(); g.strokeStyle = rim; g.beginPath(); g.moveTo(px, yy * s - h / 2); g.lineTo(px + w, yy * s - h / 2); g.stroke();
    }
    const sp = g.createLinearGradient(-s * 0.05, 0, s * 0.05, 0); sp.addColorStop(0, '#6c7f96'); sp.addColorStop(0.4, '#273140'); sp.addColorStop(1, '#090d14');
    g.fillStyle = sp; g.fillRect(-s * 0.05, -s * 0.95, s * 0.1, s * 1.9);
    g.beginPath(); g.ellipse(0, 0, s * 0.18, s * 0.11, 0, 0, Math.PI * 2); g.fill();
    for (const yy of [-0.95, -0.3, 0.3, 0.95]) g.fillRect(-s * 0.09, yy * s - s * 0.03, s * 0.18, s * 0.06);
    g.fillRect(-s * 0.012, -s * 1.28, s * 0.024, s * 0.34);
    ring(0, Math.PI);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 110; k++) { const an = 0.04 + rnd() * 3.06; g.fillStyle = rnd() < 0.8 ? 'rgba(255,214,150,.85)' : 'rgba(170,220,255,.9)'; g.fillRect(Math.cos(an) * rx - 0.5, Math.sin(an) * ry + (rnd() - 0.5) * th * 0.45 - 0.5, 1.1, 1.1); }
    for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(255,220,160,.8)'; g.fillRect(-s * 0.025 + rnd() * s * 0.05, -s * 0.9 + rnd() * s * 1.8, 1, 1); }
    radial(g, 0, s * 0.95, s * 0.12, [[0, [140, 200, 255], 0.5], [1, [140, 200, 255], 0]]);
    g.drawImage(glowSprite([255, 70, 60]), -5, -s * 1.28 - 5, 10, 10);
    g.drawImage(glowSprite([120, 255, 160]), rx - 4, -4, 8, 8);
    g.drawImage(glowSprite([255, 255, 255]), -rx - 4, -4, 8, 8);
    g.restore();
  }

  function asteroidSprite(seed, S, Lv, tone) {
    const c = mkCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), D = img.data;
    const rnd = mkRnd(seed), o = rnd() * 60, el = 0.6 + rnd() * 0.35, rot = rnd() * 3.14, cr = Math.cos(rot), sr = Math.sin(rot), e = 2 / S;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i + 0.5) / S * 2 - 1, y = (j + 0.5) / S * 2 - 1, u = x * cr + y * sr, v = (-x * sr + y * cr) / el;
      const rad = Math.hypot(u, v), ca = u / (rad || 1), sa = v / (rad || 1);
      const edge = 0.74 + (vnoise(ca * 1.6 + o, sa * 1.6 + o) - 0.5) * 0.5 + (vnoise(ca * 5 + o, sa * 5 - o) - 0.5) * 0.14;
      if (rad > edge + e) continue;
      const q = Math.min(0.98, rad / edge);
      let nx = x / edge, ny = y / edge, nz = Math.sqrt(1 - q * q);
      const hgt = fbm(x * 3 + o, y * 3 - o, 4), hx = fbm(x * 3 + 0.12 + o, y * 3 - o, 4) - hgt, hy = fbm(x * 3 + o, y * 3 + 0.12 - o, 4) - hgt;
      nx -= hx * 6; ny -= hy * 6; const nl = Math.hypot(nx, ny, nz);
      const lam = Math.max(0, (nx * Lv[0] + ny * Lv[1] + nz * Lv[2]) / nl), alb = 0.5 + hgt * 0.8;
      const crater = smooth(0.72, 0.8, vnoise(x * 7 + o, y * 7)) * 0.35, sh = (0.025 + Math.pow(lam, 1.2) * 1.2) * alb * (1 - crater);
      const k = (j * S + i) * 4;
      D[k] = Math.min(255, tone[0] * sh * 255); D[k + 1] = Math.min(255, tone[1] * sh * 255); D[k + 2] = Math.min(255, tone[2] * sh * 255); D[k + 3] = clamp01((edge + e - rad) / (2 * e)) * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function drawAsteroids(g, e, F, Lv) {
    const rnd = mkRnd(e.seed || 4), k = F.h / 760, sprites = Array.from({ length: 8 }, (_, i) => asteroidSprite((e.seed || 4) * 17 + i, 112, Lv, e.tone || [0.6, 0.45, 0.35]));
    const ax = F.x + e.x0 * F.w, ay = F.y + e.y0 * F.h, bx = F.x + e.x1 * F.w, by = F.y + e.y1 * F.h, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), px = -dy / len, py = dx / len;
    const haze = e.haze || [255, 160, 100];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) { const t = rnd(), p = gauss(rnd) * e.w * F.h * 0.5; radial(g, ax + dx * t + px * p, ay + dy * t + py * p, (70 + rnd() * 120) * k, [[0, haze, 0.05], [1, haze, 0]]); }
    g.restore();
    const rocks = [];
    for (let i = 0; i < (e.n || 160); i++) { const t = rnd() * 1.1 - 0.05, p = gauss(rnd) * e.w * F.h * 0.5, z = rnd(); rocks.push([ax + dx * t + px * p, ay + dy * t + py * p, (1.5 + Math.pow(z, 7) * 46) * k, (rnd() * 8) | 0, rnd() < 0.5]); }
    for (const b of e.big || []) rocks.push([F.x + b.x * F.w, F.y + b.y * F.h, b.s * F.h, (rnd() * 8) | 0, rnd() < 0.5]);
    rocks.sort((a, b) => a[2] - b[2]);
    for (const [x, y, s, i, flip] of rocks) {
      g.save(); g.translate(x, y); if (flip) g.scale(1, -1);
      g.globalAlpha = s < 4 * k ? 0.75 : 1; g.drawImage(sprites[i], -s, -s, s * 2, s * 2); g.restore();
    }
  }

  function drawWreck(g, e, F, Lv) {
    const x = F.x + e.x * F.w, y = F.y + e.y * F.h, s = e.s * F.h, rnd = mkRnd(e.seed || 2);
    g.save(); g.translate(x, y); g.rotate(e.ang || 0);
    const piece = (pts, ox, oy, rot) => {
      g.save(); g.translate(ox * s, oy * s); g.rotate(rot);
      g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s))); g.closePath();
      const lg = g.createLinearGradient(0, -0.25 * s, 0, 0.2 * s); lg.addColorStop(0, '#2a2420'); lg.addColorStop(0.35, '#121014'); lg.addColorStop(1, '#060608');
      g.fillStyle = lg; g.fill();
      g.save(); g.clip();
      for (let k = 0; k < 40; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,220,190,.05)' : 'rgba(0,0,0,.25)'; g.fillRect((rnd() - 0.6) * 1.4 * s, (rnd() - 0.5) * 0.5 * s, s * (0.03 + rnd() * 0.12), s * (0.02 + rnd() * 0.05)); }
      const tl = g.createLinearGradient(0, -0.26 * s, 0, -0.06 * s); tl.addColorStop(0, 'rgba(255,190,140,.35)'); tl.addColorStop(1, 'rgba(255,190,140,0)'); g.fillStyle = tl; g.fillRect(-s, -0.3 * s, 2 * s, 0.25 * s);
      g.restore();
      g.strokeStyle = 'rgba(255,190,140,.22)'; g.lineWidth = Math.max(0.6, s * 0.006); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(0.5, s * 0.004);
      for (let k = 0; k < 7; k++) { const xx = (rnd() - 0.5) * 0.9 * s; g.beginPath(); g.moveTo(xx, -0.1 * s); g.lineTo(xx, 0.1 * s); g.stroke(); }
      g.fillStyle = 'rgba(255,205,140,.8)'; for (let k = 0; k < 6; k++) if (rnd() < 0.6) g.fillRect((rnd() - 0.5) * 0.8 * s, (rnd() - 0.6) * 0.12 * s, 1.1, 1.1);
      g.restore();
    };
    piece([[1, 0], [0.62, -0.1], [0.2, -0.13], [0.15, -0.24], [-0.06, -0.25], [-0.1, -0.13], [-0.14, -0.08], [-0.09, -0.03], [-0.16, 0.02], [-0.1, 0.07], [-0.13, 0.12], [0.6, 0.1]], 0, 0, 0);
    piece([[0.14, -0.12], [0.08, -0.06], [0.15, -0.01], [0.09, 0.05], [0.13, 0.12], [-0.55, 0.15], [-0.62, 0.2], [-0.72, 0.2], [-0.72, -0.2], [-0.62, -0.2], [-0.55, -0.15]], -0.2, 0.09, 0.22);
    g.globalCompositeOperation = 'lighter';
    radial(g, -0.12 * s, 0.03 * s, s * 0.22, [[0, [255, 170, 80], 0.55], [0.3, [255, 110, 40], 0.18], [1, [255, 80, 20], 0]]);
    g.fillStyle = 'rgba(255,190,110,.9)';
    for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, r = rnd() * s * 0.35; g.fillRect(-0.12 * s + Math.cos(a) * r, 0.03 * s + Math.sin(a) * r * 0.6, 1, 1); }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#0b0a0c';
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, r = s * (0.15 + rnd() * 0.5), d = s * (0.01 + rnd() * 0.025); g.save(); g.translate(-0.12 * s + Math.cos(a) * r, Math.sin(a) * r * 0.5); g.rotate(rnd() * 3); g.fillRect(-d, -d * 0.5, d * 2, d); g.restore(); }
    g.restore();
  }

  function drawPlatform(g, e, F, planet) {
    const x = F.x + e.x * F.w, y = F.y + e.y * F.h, s = e.s * F.h, rnd = mkRnd(e.seed || 1), lw = Math.max(0.6, s * 0.006);
    if (e.tether && planet) {
      const dx = x - planet.x, dy = y - planet.y, dd = Math.hypot(dx, dy), sx = planet.x + dx / dd * planet.R, sy = planet.y + dy / dd * planet.R;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (const [w, a] of [[8, 0.05], [3, 0.12], [1.1, 0.6]]) { g.strokeStyle = `rgba(255,175,95,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(sx, sy); g.lineTo(x, y); g.stroke(); }
      for (const t of [0.22, 0.5, 0.78]) g.drawImage(glowSprite([255, 200, 140]), sx + (x - sx) * t - 5, sy + (y - sy) * t - 5, 10, 10);
      g.restore();
    }
    g.save(); g.translate(x, y); g.rotate(e.ang || 0);
    const L = s, H = s * 0.07;
    g.save(); g.globalCompositeOperation = 'lighter'; g.scale(1, 0.32); radial(g, 0, s * 0.3, L * 0.9, [[0, [255, 140, 60], 0.2], [1, [255, 120, 40], 0]]); g.restore();
    g.fillStyle = '#090c11'; g.fillRect(-L, -H / 2, 2 * L, H);
    g.strokeStyle = 'rgba(150,185,210,.4)'; g.lineWidth = lw; g.beginPath(); for (let k = 0; k <= 34; k++) g.lineTo(-L + k * (2 * L / 34), k % 2 ? -H / 2 : H / 2); g.stroke();
    for (let k = 0; k < 8; k++) {
      const mx = -L * 0.88 + rnd() * L * 1.6, mw = s * (0.05 + rnd() * 0.13), mh = s * (0.04 + rnd() * 0.12), up = rnd() < 0.5, my = up ? -H / 2 - mh : H / 2;
      g.fillStyle = '#0b0f15'; g.fillRect(mx - mw / 2, my, mw, mh);
      g.strokeStyle = 'rgba(170,205,230,.35)'; g.beginPath(); g.moveTo(mx - mw / 2, my); g.lineTo(mx + mw / 2, my); g.stroke();
      g.fillStyle = 'rgba(255,200,130,.85)'; for (let q = 0; q < 4; q++) g.fillRect(mx - mw / 2 + rnd() * mw, my + rnd() * mh, 1, 1);
    }
    g.strokeStyle = '#0a0e14'; g.lineWidth = s * 0.035; g.beginPath(); g.ellipse(L * 0.86, 0, s * 0.07, s * 0.24, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(170,210,240,.45)'; g.lineWidth = lw; g.beginPath(); g.ellipse(L * 0.86, -s * 0.01, s * 0.07, s * 0.24, 0, Math.PI, Math.PI * 2); g.stroke();
    g.globalCompositeOperation = 'lighter';
    radial(g, -L * 0.25, H / 2 + s * 0.03, s * 0.12, [[0, [255, 190, 110], 0.8], [0.3, [255, 120, 40], 0.3], [1, [255, 90, 20], 0]]);
    g.drawImage(glowSprite([255, 70, 60]), -L - 4, -4, 8, 8); g.drawImage(glowSprite([255, 255, 255]), L - 4, -4, 8, 8);
    g.restore();
  }

  function drawSwarm(g, e, F) {
    const rnd = mkRnd(e.seed || 3), x = F.x + e.x * F.w, y = F.y + e.y * F.h, s = e.s * F.h, k = F.h / 760;
    for (let i = 0; i < (e.n || 150); i++) {
      const t = rnd(), px = x + (t - 0.5) * s * 2.6, py = y + Math.sin(t * 5.5 + 1) * s * 0.25 + gauss(rnd) * s * 0.1, z = (0.9 + Math.pow(rnd(), 3) * 3.5) * k;
      g.fillStyle = 'rgba(5,9,4,.92)'; g.beginPath(); g.ellipse(px, py, z * 1.6, z * 0.8, rnd() * 3, 0, Math.PI * 2); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(glowSprite([150, 255, 90]), px - z * 2, py - z * 2, z * 4, z * 4); g.restore();
    }
  }

  function drawLamp(g, e, F) {
    const x = F.x + e.x * F.w, y = F.y + e.y * F.h, s = e.s * F.h;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [w, a] of [[s * 0.6, 0.02], [s * 0.14, 0.05], [1.2, 0.3]]) { // the lane: a thread of light bending away toward the core
      g.strokeStyle = `rgba(185,145,255,${a})`; g.lineWidth = w; g.beginPath();
      g.moveTo(F.x - 20, y + s * 2.6); g.quadraticCurveTo(x - s * 1.4, y + s * 0.5, x, y); g.quadraticCurveTo(x + s * 4, y - s * 0.9, F.x + F.w + 20, F.y + F.h * 0.12); g.stroke();
    }
    radial(g, x, y, s * 2.6, [[0, [170, 120, 255], 0.24], [0.4, [140, 90, 255], 0.06], [1, [120, 80, 255], 0]]);
    g.translate(x, y); g.rotate(-0.45);
    g.strokeStyle = 'rgba(175,135,255,.16)'; g.lineWidth = s * 0.3; g.beginPath(); g.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2); g.stroke();
    g.save(); g.scale(1, 0.42); radial(g, 0, 0, s, [[0, [150, 100, 255], 0.14], [0.85, [170, 130, 255], 0.05], [1, [170, 130, 255], 0]]); g.restore();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#06040b'; g.lineWidth = s * 0.085; g.beginPath(); g.ellipse(0, 0, s, s * 0.42, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#06040b'; for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; g.save(); g.translate(Math.cos(an) * s, Math.sin(an) * s * 0.42); g.rotate(an); g.fillRect(-s * 0.03, -s * 0.07, s * 0.06, s * 0.14); g.restore(); }
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(200,170,255,.5)'; g.lineWidth = Math.max(0.8, s * 0.014); g.beginPath(); g.ellipse(0, 0, s * 0.955, s * 0.385, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(150,130,190,.35)'; g.lineWidth = Math.max(0.6, s * 0.01); g.beginPath(); g.ellipse(0, -s * 0.035, s * 1.03, s * 0.45, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    for (const a of [0.4, 2.5, 4.4]) g.drawImage(glowSprite([215, 180, 255]), Math.cos(a) * s - 7, Math.sin(a) * s * 0.42 - 7, 14, 14);
    g.restore();
  }

  // The galactic core: lensed accretion disc around a black shadow.
  function paintSingularity(g, sg, F, cw, ch) {
    const cx = F.x + sg.x * F.w, cy = F.y + sg.y * F.h, rs = sg.rs * F.h, hue = sg.hue || 320;
    const q = 0.17, ri = 2.3, ro = 8.5, roll = sg.roll || 0, cr = Math.cos(roll), sr = Math.sin(roll);
    const deep = rgbf([hue, 90, 22]), mid = rgbf([hue + 14, 95, 55]), hot = rgbf([hue + 80, 100, 80]);
    g.save(); g.globalCompositeOperation = 'lighter';
    radial(g, cx, cy, rs * 20, [[0, mid.map(v => v * 255), 0.5], [0.15, mid.map(v => v * 255), 0.18], [0.5, deep.map(v => v * 255), 0.05], [1, deep.map(v => v * 255), 0]]);
    g.translate(cx, cy); g.rotate(roll);
    for (const dir of [-1, 1]) { // faint polar jets
      const lg = g.createLinearGradient(0, 0, 0, dir * rs * 12); lg.addColorStop(0, 'rgba(255,210,255,.09)'); lg.addColorStop(0.5, 'rgba(230,160,255,.025)'); lg.addColorStop(1, 'rgba(200,120,255,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(-rs * 0.12, 0); g.lineTo(-rs * 0.8, dir * rs * 9); g.lineTo(rs * 0.8, dir * rs * 9); g.lineTo(rs * 0.12, 0); g.fill();
    }
    g.restore();
    g.save(); radial(g, cx, cy, rs * 1.7, [[0, [0, 0, 0], 1], [0.58, [0, 0, 0], 1], [1, [0, 0, 0], 0]]); g.restore();
    const ex = ro * 1.04 * rs, ey = 3.7 * rs;
    const x0 = Math.max(0, Math.floor(cx - ex)), x1 = Math.min(cw, Math.ceil(cx + ex)), y0 = Math.max(0, Math.floor(cy - ey)), y1 = Math.min(ch, Math.ceil(cy + ey));
    const bw = x1 - x0, bh = y1 - y0, k = Math.min(1, Math.sqrt(230000 / (bw * bh))), w = Math.round(bw * k), h = Math.round(bh * k);
    const c = mkCanvas(w, h), gc = c.getContext('2d'), img = gc.createImageData(w, h), D = img.data;
    const prof = r => smooth(ri * 0.9, ri * 1.2, r) * Math.pow(ri / r, 1.4) * (1 - smooth(ro * 0.5, ro, r));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = (x0 + (i + 0.5) * bw / w - cx) / rs, Y0 = (y0 + (j + 0.5) * bh / h - cy) / rs;
      const x = X * cr + Y0 * sr, y = -X * sr + Y0 * cr, rho = Math.hypot(x, y);
      let I = 0;
      if (rho > 1) {
        const up = -y / rho, wv = smooth(-0.55, 0.85, up) * 0.9 + smooth(0.1, 1, -up) * 0.32, rl = ri + (rho - 1.1) * 4.2;
        if (rl > ri * 0.85 && rl < ro) { const ca = x / rho, sa = y / rho; I += prof(rl) * wv * 2.2 * (0.55 + 0.9 * fbm(rl * 1.7 + ca * 1.3 + 2, sa * 1.3 + rl * 0.2, 4)); }
        const ph = rho - 1.07; I += Math.exp(-ph * ph / 0.0006) * (0.9 + 0.7 * smooth(-0.6, 0.9, -y / rho)) + Math.exp(-ph * ph / 0.03) * 0.3;
      }
      const Yd = y / q, rd = Math.hypot(x, Yd);
      if (rd > ri * 0.85 && rd < ro && (y > 0 || rho > 1.03)) {
        const ca = x / rd, sa = Yd / rd, turb = 0.4 + 1.15 * fbm(rd * 2.1 + ca * 1.4 + 7, sa * 1.4 + rd * 0.15, 4);
        I += prof(rd) * turb * (1 + 0.65 * ca) * 1.25;
      }
      if (I <= 0.002) continue;
      const t = 1 - Math.exp(-I * 1.15), kk = (j * w + i) * 4;
      let r, gg, b;
      if (t < 0.5) { const f = t * 2; r = deep[0] + (mid[0] - deep[0]) * f; gg = deep[1] + (mid[1] - deep[1]) * f; b = deep[2] + (mid[2] - deep[2]) * f; }
      else if (t < 0.82) { const f = (t - 0.5) / 0.32; r = mid[0] + (hot[0] - mid[0]) * f; gg = mid[1] + (hot[1] - mid[1]) * f; b = mid[2] + (hot[2] - mid[2]) * f; }
      else { const f = (t - 0.82) / 0.18; r = hot[0] + (1 - hot[0]) * f; gg = hot[1] + (1 - hot[1]) * f; b = hot[2] + (1 - hot[2]) * f; }
      D[kk] = r * t * 255 * 1.2; D[kk + 1] = gg * t * 255 * 1.2; D[kk + 2] = b * t * 255 * 1.2; D[kk + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(c, x0, y0, bw, bh); g.restore();
    bloom(g, c, x0, y0, bw, bh, 0.7, 8);
  }

  function drawBokeh(g, look, F, rnd) {
    const n = look.bokeh ?? 5, k = F.h / 760, nb = look.neb || {}, cols = [look.bokehCol || rgbf(nb.a || [210, 60, 60]).map(v => v * 255), rgbf(nb.c || [200, 60, 60]).map(v => v * 255), [220, 230, 255]];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x = F.x + rnd() * F.w, y = F.y + rnd() * F.h, r = (8 + rnd() * rnd() * 46) * k, c = cols[(rnd() * 3) | 0], a = (0.02 + rnd() * 0.035) * Math.min(1, 14 * k / r + 0.3);
      g.beginPath(); if (rnd() < 0.5) for (let s = 0; s < 6; s++) { const an = s * Math.PI / 3 + 0.2; g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } else g.arc(x, y, r, 0, Math.PI * 2); g.closePath();
      g.fillStyle = css(c, a); g.fill(); g.strokeStyle = css(c, a * 1.6); g.lineWidth = 1; g.stroke();
    }
    g.restore();
  }
  function vignette(g, cw, ch, F, a) {
    const gr = g.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, Math.min(F.w, F.h) * 0.42, F.x + F.w / 2, F.y + F.h / 2, Math.hypot(F.w, F.h) * 0.6);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  }

  // ---------------------------------------------------------------- compose a look
  // F: the nominal frame inside the canvas (menus paint an oversized canvas for parallax).
  function compose(look, cw, ch, F, split, res, maxPx) {
    const rnd = mkRnd(look.seed || 1), back = mkCanvas(cw, ch), g = back.getContext('2d');
    const s = look.sky, sky = g.createLinearGradient(0, 0, cw * 0.35, ch);
    sky.addColorStop(0, `hsl(${s[0]},${s[1]}%,${s[2]}%)`); sky.addColorStop(1, `hsl(${s[3]},${s[4]}%,${s[5]}%)`);
    g.fillStyle = sky; g.fillRect(0, 0, cw, ch);
    paintStars(g, look, F, cw, ch, rnd);
    paintNebula(g, look, F, cw, ch, res);
    if (look.sing) paintSingularity(g, look.sing, F, cw, ch);
    for (const z of look.shade || []) radial(g, F.x + z.x * F.w, F.y + z.y * F.h, z.r * F.w, [[0, [0, 0, 0], z.a], [0.6, [0, 0, 0], z.a * 0.6], [1, [0, 0, 0], 0]]); // calm area behind menu text
    paintBrightStars(g, look, F, rnd);
    for (const e of look.back || []) if (e.t === 'lamp') drawLamp(g, e, F);
    const sc = Math.min(F.w, F.h), bodies = (look.bodies || []).map(b => ({ b, x: F.x + b.x * F.w, y: F.y + b.y * F.h, R: b.r * sc }));
    let sun = null;
    if (look.sun) {
      const S = look.sun; let sx = F.x + (S.x || 0) * F.w, sy = F.y + (S.y || 0) * F.h;
      if (S.limb != null && bodies[0]) { const B = bodies[0], k = 1 + (S.lift || 0); sx = B.x + Math.sin(S.limb) * B.R * k; sy = B.y - Math.cos(S.limb) * B.R * k; }
      sun = { x: sx, y: sy, s: (S.s || 1) * F.h / 760, c: S.col || [255, 244, 230] };
      drawSun(g, sun.x, sun.y, sun.s, sun.c);
    }
    const lightAt = (x, y, lz) => sun ? norm3([(sun.x - x) / (Math.hypot(sun.x - x, sun.y - y) || 1), (sun.y - y) / (Math.hypot(sun.x - x, sun.y - y) || 1), lz ?? 0.35]) : norm3(look.light || [-0.6, -0.45, 0.65]);
    const front = split ? mkCanvas(cw, ch) : back, gf = front.getContext('2d');
    for (const B of bodies) {
      const r = paintBody(B.b, B.R, B.x, B.y, cw, ch, lightAt(B.x, B.y, B.b.lz), maxPx);
      if (r) gf.drawImage(r.c, r.x, r.y, r.w, r.h);
      for (const m of B.b.moons || []) {
        const mx = F.x + m.x * F.w, my = F.y + m.y * F.h, mr = m.r * sc, rm = paintBody(Object.assign({ seed: 99, pitch: 0.2 }, m), mr, mx, my, cw, ch, lightAt(mx, my, m.lz), 40000);
        if (rm) gf.drawImage(rm.c, rm.x, rm.y, rm.w, rm.h);
      }
    }
    const mainLight = bodies[0] ? lightAt(bodies[0].x, bodies[0].y, 0.5) : lightAt(F.x + F.w / 2, F.y + F.h / 2, 0.5);
    for (const e of look.front || []) {
      if (e.t === 'station') drawStation(gf, e, F);
      else if (e.t === 'fleet') drawFleet(gf, e, F);
      else if (e.t === 'asteroids') drawAsteroids(gf, e, F, mainLight);
      else if (e.t === 'wreck') drawWreck(gf, e, F, mainLight);
      else if (e.t === 'platform') drawPlatform(gf, e, F, bodies[0]);
      else if (e.t === 'swarm') drawSwarm(gf, e, F);
    }
    if (sun) { gf.save(); gf.globalCompositeOperation = 'lighter'; radial(gf, sun.x, sun.y, sun.s * 130, [[0, sun.c, 0.4], [0.12, sun.c, 0.1], [1, sun.c, 0]]); radial(gf, sun.x, sun.y, sun.s * 12, [[0, [255, 255, 255], 0.9], [1, [255, 255, 255], 0]]); gf.restore(); }
    drawBokeh(gf, look, F, rnd);
    const ghosts = sun && look.sun.flare !== false ? makeGhosts(sun.c) : null;
    if (ghosts && !split) drawGhosts(gf, ghosts, sun.x, sun.y, F.x + F.w / 2, F.y + F.h / 2, 1, F.h / 760);
    vignette(gf, cw, ch, F, look.vig ?? 0.45);
    return { back, front: split ? front : null, sun, ghosts };
  }

  // ---------------------------------------------------------------- looks
  // Positions are fractions of the frame; planet radii are fractions of its short side.
  const SECTOR_LOOKS = [
    { // Fleet Academy: a blue inhabited world, an orbital ring station, fleet traffic
      seed: 21, sky: [222, 55, 3, 236, 45, 7],
      neb: { seed: 21, a: [214, 80, 42], b: [262, 60, 38], c: [192, 90, 62], core: { x: 0.24, y: 0.22, r: 0.15, col: [200, 75, 72] }, band: { x: 0.5, y: 0.4, ang: -0.42, w: 0.13, a: 0.55, col: [40, 35, 52] }, dust: 0.85, th: 0.47, scale: 2.3 },
      stars: { n: 1, clusters: 2, bright: 5 },
      sun: { x: 0.1, y: 0.13, s: 1, col: [255, 246, 232] },
      bodies: [{ kind: 'earth', x: 0.86, y: 1.06, r: 0.66, atm: [95, 165, 255], lz: 0.15, pitch: 0.2, roll: 0.35, lights: 1, seed: 3, moons: [{ x: 0.47, y: 0.68, r: 0.036, kind: 'moon', hue: 220, lz: 0.4 }] }],
      front: [{ t: 'station', x: 0.61, y: 0.5, s: 0.12 }, { t: 'fleet', x: 0.36, y: 0.3, n: 4, s: 1, dir: 1 }],
      bokeh: 7 },
    { // The Scrap Belt: rust and dust, a ringed giant, an asteroid belt full of wrecks
      seed: 29, sky: [20, 45, 3, 8, 40, 6],
      neb: { seed: 29, a: [16, 75, 34], b: [34, 70, 34], c: [8, 85, 52], core: { x: 0.8, y: 0.16, r: 0.16, col: [32, 90, 66], k: 0.7 }, gain: 0.42, band: { x: 0.5, y: 0.5, ang: 0.32, w: 0.12, a: 0.35, col: [30, 25, 50] }, dust: 1.15, dustCol: [10, 5, 3], th: 0.45, scale: 2.0, warp: 1.2 },
      stars: { n: 0.9, clusters: 1, bright: 3, warm: 0.15 },
      sun: { x: 0.85, y: 0.13, s: 0.85, col: [255, 226, 190] },
      bodies: [{ kind: 'gas', hue: 28, x: 0.13, y: 0.17, r: 0.25, atm: [255, 180, 120], atmK: 0.6, lz: 0.5, pitch: 0.3, roll: -0.38, ring: { ri: 1.35, ro: 2.25, col: [215, 170, 130], a: 0.85 }, seed: 5 }],
      front: [{ t: 'asteroids', x0: -0.05, y0: 0.98, x1: 1.05, y1: 0.4, w: 0.13, n: 230, tone: [0.62, 0.44, 0.33], seed: 4, big: [{ x: 0.05, y: 0.93, s: 0.17 }, { x: 0.95, y: 0.86, s: 0.11 }] },
        { t: 'wreck', x: 0.62, y: 0.62, s: 0.17, ang: -0.32, seed: 2 }, { t: 'wreck', x: 0.33, y: 0.4, s: 0.075, ang: 0.5, seed: 7 }],
      bokeh: 5 },
    { // Hive Nebula: sickly green clouds, a veined living world, swarm streams
      seed: 33, sky: [110, 50, 3, 150, 45, 5],
      neb: { seed: 33, a: [92, 70, 33], b: [150, 55, 26], c: [74, 90, 55], core: { x: 0.66, y: 0.36, r: 0.2, col: [82, 95, 66], k: 0.8 }, dust: 1.0, dustCol: [6, 2, 9], th: 0.42, scale: 2.6, warp: 1.5, gain: 0.42 },
      stars: { n: 0.7, clusters: 1, bright: 3 }, light: [0.75, -0.4, 0.5],
      bodies: [{ kind: 'hive', hue: 90, x: 0.15, y: 0.86, r: 0.34, atm: [170, 255, 90], atmK: 0.9, pitch: 0.5, roll: 0.2, seed: 9, moons: [{ x: 0.4, y: 0.6, r: 0.03, kind: 'moon', hue: 90 }] }],
      front: [{ t: 'swarm', x: 0.62, y: 0.56, s: 0.3, seed: 3, n: 220 }],
      bokeh: 14, bokehCol: [140, 255, 90] },
    { // Forge Worlds: a foundry planet glowing on its night side, orbital platforms, a tether
      seed: 41, sky: [195, 50, 3, 210, 40, 6],
      neb: { seed: 41, a: [186, 75, 34], b: [208, 60, 32], c: [24, 95, 55], core: { x: 0.8, y: 0.12, r: 0.14, col: [190, 70, 72] }, band: { x: 0.5, y: 0.35, ang: 0.18, w: 0.1, a: 0.4, col: [35, 30, 55] }, dust: 0.9, th: 0.49, scale: 2.2 },
      stars: { n: 1, clusters: 2, bright: 4 },
      sun: { x: 0.9, y: 0.1, s: 0.9, col: [235, 245, 255] },
      bodies: [{ kind: 'forge', x: 0.2, y: 1.12, r: 0.72, atm: [200, 175, 150], atmK: 0.45, lz: -0.3, pitch: 0.9, roll: -0.2, seed: 13 },
        { kind: 'forge', x: 0.7, y: 0.26, r: 0.045, atm: [200, 175, 150], atmK: 0.4, lz: 0.3, seed: 14 },
        { kind: 'forge', x: 0.56, y: 0.13, r: 0.022, lz: 0.3, seed: 15 }],
      front: [{ t: 'platform', x: 0.47, y: 0.46, s: 0.2, ang: -0.12, tether: true, seed: 1 }, { t: 'platform', x: 0.8, y: 0.66, s: 0.09, ang: 0.2, seed: 2 }, { t: 'fleet', x: 0.66, y: 0.36, n: 3, s: 0.6, dir: -1, eng: [255, 170, 100] }],
      bokeh: 6 },
    { // Void Expanse: near-black, sparse, a backlit dead world and a relit Lamp on its lane
      seed: 47, sky: [268, 40, 2, 250, 35, 4],
      neb: { seed: 47, a: [272, 55, 22], b: [236, 50, 18], c: [292, 75, 45], band: { x: 0.5, y: 0.6, ang: -0.2, w: 0.1, a: 0.18, col: [270, 20, 40] }, dust: 1.3, dustCol: [2, 1, 4], th: 0.52, scale: 1.8, warp: 1.3, expo: 1.4 },
      stars: { n: 0.42, clusters: 0, bright: 2 }, light: [-0.55, -0.6, -0.5],
      bodies: [{ kind: 'dark', x: 0.78, y: 0.98, r: 0.55, atm: [160, 105, 255], atmK: 0.8, hw: 0.05, pitch: 0.4, roll: 0.3, seed: 17 }],
      back: [{ t: 'lamp', x: 0.27, y: 0.3, s: 0.09 }],
      bokeh: 3 },
    { // The Singularity: the galactic core, a lensed accretion disc
      seed: 53, sky: [330, 50, 4, 350, 45, 6],
      neb: { seed: 53, a: [326, 75, 34], b: [8, 80, 34], c: [295, 70, 52], core: { x: 0.5, y: 0.42, r: 0.22, col: [36, 85, 62], k: 0.6 }, band: { x: 0.5, y: 0.42, ang: -0.12, w: 0.2, a: 0.8, col: [38, 70, 50] }, dust: 1.1, gain: 0.32, dustCol: [5, 1, 3], th: 0.45, scale: 2.4, warp: 1.1 },
      stars: { n: 1.3, clusters: 3, bright: 6, warm: 0.2, core: { x: 0.5, y: 0.42, s: 0.15, n: 2400 } },
      sing: { x: 0.5, y: 0.42, rs: 0.075, roll: -0.12, hue: 320 },
      bokeh: 8 },
  ];
  const MAP_BODY = [
    { kind: 'earth', atm: [95, 165, 255], lights: 1, pitch: 0.1 }, { kind: 'rock', hue: 18, atm: [255, 170, 120], atmK: 0.4 }, { kind: 'hive', atm: [170, 255, 90] },
    { kind: 'forge', atm: [255, 150, 80], atmK: 0.6 }, { kind: 'dark', atm: [170, 110, 255], atmK: 1.2 }, { kind: 'gas', hue: 330, atm: [255, 120, 200], atmK: 0.6 },
  ];

  const MOODS = {
    title: { hue: 200, look: {
      seed: 3, sky: [214, 55, 3, 205, 50, 6],
      neb: { seed: 3, a: [208, 78, 38], b: [28, 80, 42], c: [192, 90, 60], core: { x: 0.82, y: 0.2, r: 0.16, col: [36, 90, 68] }, band: { x: 0.5, y: 0.3, ang: -0.3, w: 0.13, a: 0.5, col: [38, 35, 55] }, dust: 0.95, th: 0.49, scale: 2.2, warp: 1.1, gain: 0.44 },
      stars: { n: 1, clusters: 2, bright: 5 },
      sun: { limb: 0.1, lift: -0.004, s: 1.25, col: [255, 240, 220] },
      shade: [{ x: 0.3, y: 0.32, r: 0.36, a: 0.38 }],
      bodies: [{ kind: 'earth', x: 0.5, y: 1.62, r: 1.05, atm: [90, 165, 255], atmK: 1.3, hw: 0.035, lz: -2.4, pitch: 1.25, roll: 0.1, lights: 1.3, seed: 2,
        moons: [{ x: 0.9, y: 0.13, r: 0.045, kind: 'moon', hue: 210, lz: 0.2 }] }],
      front: [{ t: 'fleet', x: 0.66, y: 0.2, n: 3, s: 0.8, dir: -1 }],
      bokeh: 6, vig: 0.4 } },
    map: { hue: 215 },
    hangar: { hue: 205, look: {
      seed: 7, sky: [210, 45, 4, 200, 40, 7],
      neb: { seed: 7, a: [205, 65, 34], b: [186, 60, 34], c: [176, 80, 58], core: { x: 0.75, y: 0.3, r: 0.15, col: [195, 60, 70] }, band: { x: 0.5, y: 0.6, ang: 0.4, w: 0.12, a: 0.4, col: [210, 20, 55] }, dust: 0.8, th: 0.5, scale: 2.0 },
      stars: { n: 0.9, clusters: 1, bright: 3 }, light: [0.65, 0.35, 0.65],
      bodies: [{ kind: 'ice', hue: 205, x: -0.06, y: 0.06, r: 0.32, atm: [160, 210, 255], atmK: 0.8, pitch: 0.3, roll: 0.45, ring: { ri: 1.3, ro: 1.9, col: [190, 210, 230], a: 0.6 }, seed: 6 }],
      bokeh: 4 } },
    shop: { hue: 34, look: {
      seed: 5, sky: [30, 50, 3, 18, 45, 6],
      neb: { seed: 5, a: [32, 80, 38], b: [12, 75, 36], c: [190, 60, 50], core: { x: 0.7, y: 0.25, r: 0.15, col: [40, 90, 68] }, band: { x: 0.5, y: 0.4, ang: -0.25, w: 0.12, a: 0.4, col: [35, 30, 55] }, dust: 0.95, th: 0.48, scale: 2.2 },
      stars: { n: 0.9, clusters: 2, bright: 4, warm: 0.1 },
      sun: { x: 0.88, y: 0.14, s: 0.8, col: [255, 236, 210] },
      bodies: [{ kind: 'gas', hue: 32, x: 0.06, y: 0.98, r: 0.5, atm: [255, 190, 120], atmK: 0.7, lz: 0.45, pitch: 0.42, roll: -0.42, ring: { ri: 1.3, ro: 2.2, col: [225, 190, 150], a: 0.8 }, seed: 8 }],
      front: [{ t: 'fleet', x: 0.6, y: 0.4, n: 2, s: 0.7, dir: 1 }],
      bokeh: 6 } },
  };
  function lookFor(name, hueArg) {
    const m = MOODS[name];
    if (name !== 'map') return m.look;
    const hue = hueArg ?? m.hueOverride ?? m.hue, si = typeof SECTORS !== 'undefined' ? SECTORS.findIndex(s => s.hue === hue) : -1;
    const base = SECTOR_LOOKS[si] || null;
    const neb = base ? Object.assign({}, base.neb, { seed: base.neb.seed + 5, core: base.neb.core ? Object.assign({}, base.neb.core, { x: 0.62, y: 0.32 }) : null })
      : { seed: 11, a: [hue, 70, 38], b: [hue + 60, 60, 36], c: [hue - 20, 85, 58], core: { x: 0.62, y: 0.32, r: 0.15, col: [hue, 60, 70] }, band: { x: 0.5, y: 0.5, ang: -0.35, w: 0.12, a: 0.45, col: [40, 30, 55] }, dust: 0.9, th: 0.48, scale: 2.2 };
    return {
      seed: 11 + Math.max(0, si) * 7, sky: base ? base.sky : [hue, 45, 3, hue + 20, 40, 6], neb, stars: base ? Object.assign({}, base.stars, { core: null }) : { n: 1, clusters: 2, bright: 4 },
      light: [-0.7, -0.35, 0.6], sing: si === 5 ? { x: 0.82, y: 0.3, rs: 0.035, roll: -0.12, hue } : null,
      bodies: si === 5 ? [] : [Object.assign({ hue: hue + 10, x: 1.0, y: 0.92, r: 0.5, pitch: 0.6, roll: 0.3, seed: 19 + si }, MAP_BODY[Math.max(0, si)] || MAP_BODY[0])],
      bokeh: 4, vig: 0.4,
    };
  }

  // ---------------------------------------------------------------- state
  let cv, ctx, W = 0, H = 0, cur = null, prev = null, blend = 1, running = false, last = 0;
  let stars = [], ships = [], streaks = [], mx = 0, my = 0, tx = 0, ty = 0, nextShip = 2000, nextStreak = 5000;
  const cache = {}, cacheKeys = [];
  let acc = 0; const stats = { frames: 0, cost: 0, bake: 0, backdrop: {} };

  function build(name) {
    const m = MOODS[name], key = name + ':' + W + 'x' + H + ':' + (m.hueOverride ?? '');
    if (cache[key]) return cache[key];
    const t0 = performance.now(), cw = W + 80, ch = H + 60;
    const r = compose(lookFor(name), cw, ch, { x: 40, y: 30, w: W, h: H }, true, Math.min(0.42, 620 / cw), 190000);
    const L = { name, back: r.back, front: r.front, sun: r.sun, ghosts: r.ghosts };
    stats.bake = Math.round(performance.now() - t0);
    cache[key] = L; cacheKeys.push(key);
    for (let guard = cacheKeys.length; cacheKeys.length > 6 && guard > 0; guard--) { const k = cacheKeys.shift(); if (cache[k] === cur || cache[k] === prev || cache[k] === L) cacheKeys.push(k); else delete cache[k]; }
    return L;
  }

  function resize() {
    W = cv.width = Math.round(window.innerWidth); H = cv.height = Math.round(window.innerHeight);
    const n = Math.round(W * H / 4200);
    stars = Array.from({ length: n }, () => { const z = Math.random(); return { x: Math.random() * W, y: Math.random() * H, z, s: z < 0.7 ? 0.6 + z : 1.2 + z * 1.4, t: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.6, flare: z > 0.985, tint: Math.random() }; });
    if (cur) cur = build(cur.name);
    prev = null;
  }

  function spawnShip() {
    const dir = Math.random() < 0.5 ? 1 : -1, x0 = dir > 0 ? -60 : W + 60;
    if (Math.random() < 0.35) { // a distant convoy in loose formation
      const y = H * (0.1 + Math.random() * 0.4), v = dir * 0.009 * (0.8 + Math.random() * 0.4), n = 3 + ((Math.random() * 3) | 0);
      for (let k = 0; k < n; k++) ships.push({ x: x0 - dir * k * (22 + Math.random() * 10), y: y + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 6, v, len: 7 + Math.random() * 4, a: 0.55, dir, ph: Math.random() * 6 });
      return;
    }
    const far = Math.random() < 0.6;
    ships.push({ x: x0, y: H * (0.15 + Math.random() * 0.55), v: dir * (far ? 0.012 : 0.03) * (0.7 + Math.random() * 0.6), len: far ? 10 + Math.random() * 10 : 26 + Math.random() * 22, a: far ? 0.5 : 0.85, dir, ph: Math.random() * 6 });
  }

  function drawShip(s, now) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.dir, 1); ctx.globalAlpha = s.a;
    const L = s.len;
    const g = ctx.createRadialGradient(-L * 0.55, 0, 0, -L * 0.55, 0, L * 0.7);
    g.addColorStop(0, 'rgba(160,220,255,.9)'); g.addColorStop(1, 'rgba(90,170,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-L * 1.3, -L * 0.35, L * 0.9, L * 0.7);
    ctx.fillStyle = '#0b1016'; ctx.strokeStyle = 'rgba(160,190,220,.35)'; ctx.lineWidth = 0.6;
    hullPath(ctx, L); ctx.fill(); ctx.stroke();
    if (L > 14) { ctx.fillStyle = 'rgba(255,190,110,.9)'; for (let k = 0; k < 4; k++) ctx.fillRect(-L * 0.3 + k * L * 0.14, -0.4, 0.9, 0.8); }
    // running lights: port red, starboard green, a white strobe
    const ph = now * 0.004 + s.ph;
    ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(ph));
    ctx.fillStyle = '#ff5048'; ctx.fillRect(-L * 0.47, -L * 0.2 - 1, 1.4, 1.4);
    ctx.fillStyle = '#5dff9a'; ctx.fillRect(-L * 0.47, L * 0.2 - 0.4, 1.4, 1.4);
    if (Math.sin(ph * 1.7) > 0.93) { ctx.globalAlpha = s.a; ctx.drawImage(glowSprite([255, 255, 255]), L * 0.55 - 4, -4, 8, 8); }
    ctx.restore();
  }

  function drawLayer(L, alpha, pdx, pdy, part) {
    if (!L || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(L[part], -40 - pdx * (part === 'front' ? 56 : 40), -30 - pdy * (part === 'front' ? 36 : 26));
    ctx.globalAlpha = 1;
  }
  // flare ghosts sit on the line from the sun through the screen centre, so they swing with parallax
  function drawFlare(L, alpha, pdx, pdy, now) {
    if (!L || !L.ghosts || alpha <= 0) return;
    const t = REDUCED ? 0 : now * 0.001, sx = L.sun.x - 40 - pdx * 40, sy = L.sun.y - 30 - pdy * 26;
    const cx = W / 2 + Math.sin(t * 0.07) * W * 0.03 - pdx * 60, cy = H / 2 + Math.cos(t * 0.09) * H * 0.02 - pdy * 40;
    drawGhosts(ctx, L.ghosts, sx, sy, cx, cy, alpha * (0.85 + 0.15 * Math.sin(t * 0.21)), H / 760 * (1 + Math.sin(t * 0.13) * 0.04));
  }

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
    // near stars with parallax and twinkle, batched by colour
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
    if (fading) { drawLayer(prev, 1 - blend, pdx, pdy, 'front'); drawLayer(cur, blend, pdx, pdy, 'front'); }
    else drawLayer(cur, 1, pdx, pdy, 'front');
    if (!REDUCED) {
      nextShip -= step; if (nextShip < 0) { spawnShip(); nextShip = 7000 + Math.random() * 9000; }
      nextStreak -= step; if (nextStreak < 0) { streaks.push({ x: Math.random() * W, y: Math.random() * H * 0.6, a: 1, len: 80 + Math.random() * 140, ang: 0.3 + Math.random() * 0.3 }); nextStreak = 6000 + Math.random() * 10000; }
    }
    for (const s of ships.slice()) { s.x += s.v * step; drawShip(s, now); if ((s.dir > 0 && s.x > W + 120) || (s.dir < 0 && s.x < -120)) ships.splice(ships.indexOf(s), 1); }
    for (const s of streaks.slice()) {
      s.a -= step / 700; if (s.a <= 0) { streaks.splice(streaks.indexOf(s), 1); continue; }
      const gx = Math.cos(s.ang) * s.len, gy = Math.sin(s.ang) * s.len, lg = ctx.createLinearGradient(s.x, s.y, s.x + gx, s.y + gy);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(220,240,255,${s.a * 0.8})`);
      ctx.strokeStyle = lg; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + gx, s.y + gy); ctx.stroke();
      s.x += Math.cos(s.ang) * step * 0.5; s.y += Math.sin(s.ang) * step * 0.5;
    }
    if (fading) { drawFlare(prev, 1 - blend, pdx, pdy, now); drawFlare(cur, blend, pdx, pdy, now); if (blend >= 1) prev = null; }
    else drawFlare(cur, 1, pdx, pdy, now);
    stats.cost = stats.cost * 0.9 + (performance.now() - t0) * 0.1;
  }

  // Static painted backdrop for a battle or cutscene in sector si (no animation cost).
  const BD = {};
  function backdrop(si, hue) {
    if (BD[si]) return BD[si];
    const BW = 1280, BH = 760, t0 = performance.now();
    let look = SECTOR_LOOKS[si];
    if (!look) look = lookFor('map', hue);
    const r = compose(look, BW, BH, { x: 0, y: 0, w: BW, h: BH }, false, 0.5, 230000);
    BD[si] = r.back.toDataURL('image/jpeg', 0.88);
    stats.backdrop[si] = Math.round(performance.now() - t0);
    return BD[si];
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
      if (hue != null) { MOODS[name].hue = hue; MOODS[name].hueOverride = hue; }
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
