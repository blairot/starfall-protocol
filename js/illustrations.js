'use strict';
// ============================================================================
// STARFALL PROTOCOL — procedural illustrations
// Cinematic concept-art plates drawn entirely in SVG. Each plate is built in
// depth layers: a backdrop with haze between its planes, light shafts from a
// visible light source, the subject, ground fog, bokeh and framing shapes.
// The subject is lit by a filter derived from its own silhouette (key light
// form shading, specular edges and a coloured rim light), emissive parts
// bloom, and a per-faction palette drives materials and the colour grade.
// Every card id maps to a subject kind and options; a seeded RNG varies the
// details so cards that share a body plan still differ.
// Canvas: 160×100 user units, rasterized once to 480×300.
// Subjects stay inside x≈36–124 so square crops still read.
// ============================================================================

const f1 = n => (+n).toFixed(1);
const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
const pt = p => f1(p[0]) + ' ' + f1(p[1]);
const mirrorX = (pts, cx) => pts.concat(pts.slice().reverse().map(([x, y]) => [2 * cx - x, y]));
const glow = (m, o) => `<g filter="url(#gl)" opacity="${o || 0.9}">${m}</g>${m}`;
const rr = (r, a, b) => a + r() * (b - a);

// ---------------------------------------------------------------- palettes
// HSL triples. arm/arm1/arm2 = lit, mid and shadow tone of the main material.
const IPAL = {
  fleet:   { arm: [210, 12, 90], arm1: [212, 10, 58], arm2: [218, 22, 16], paint: [214, 64, 34], dark: [218, 30, 7], emis: [198, 100, 62], rim: [196, 95, 70], key: [36, 40, 94], fog: [208, 38, 34], sky: [216, 50, 5], light: [200, 75, 80], style: 'base', seams: 1 },
  raider:  { arm: [32, 10, 62], arm1: [28, 10, 33], arm2: [22, 16, 9], paint: [34, 92, 50], dark: [20, 22, 6], emis: [28, 100, 58], rim: [32, 95, 64], key: [30, 42, 86], fog: [20, 50, 30], sky: [16, 45, 5], light: [30, 95, 66], style: 'scrap' },
  swarm:   { arm: [46, 24, 44], arm1: [70, 24, 15], arm2: [120, 30, 4], paint: [70, 60, 30], dark: [120, 35, 3], emis: [90, 100, 54], rim: [78, 55, 64], key: [50, 35, 80], fog: [112, 30, 10], sky: [130, 35, 3], light: [88, 70, 50], style: 'hive' },
  synth:   { arm: [192, 10, 90], arm1: [198, 9, 54], arm2: [205, 20, 12], paint: [190, 40, 28], dark: [205, 30, 6], emis: [186, 100, 58], rim: [186, 85, 70], key: [200, 25, 95], fog: [196, 38, 20], sky: [200, 50, 4], light: [186, 85, 70], style: 'forge', seams: 1 },
  psi:     { arm: [250, 16, 58], arm1: [258, 18, 26], arm2: [268, 32, 7], paint: [268, 50, 32], dark: [265, 35, 5], emis: [270, 100, 72], rim: [232, 95, 74], key: [220, 50, 88], fog: [262, 48, 26], sky: [262, 50, 5], light: [255, 90, 76], style: 'psi' },
  void:    { arm: [320, 14, 40], arm1: [300, 14, 11], arm2: [290, 30, 2], paint: [330, 60, 25], dark: [300, 30, 2], emis: [348, 100, 56], rim: [340, 85, 64], key: [330, 30, 76], fog: [335, 45, 11], sky: [320, 45, 3], light: [348, 85, 56], style: 'choir' },
  neutral: { arm: [205, 8, 72], arm1: [208, 8, 38], arm2: [212, 16, 10], paint: [44, 90, 48], dark: [212, 20, 6], emis: [172, 90, 55], rim: [178, 80, 66], key: [35, 50, 90], fog: [200, 30, 30], sky: [210, 40, 5], light: [38, 80, 74], style: 'base' },
};
let IP = IPAL.neutral, ILT = { x: 124, y: 26, s: 1 };
const clp = v => Math.max(0, Math.min(100, v));
const ch = (c, dl, ds, a) => { const s = `${c[0]},${clp(c[1] + (ds || 0))}%,${clp(c[2] + (dl || 0))}%`; return a == null ? `hsl(${s})` : `hsla(${s},${a})`; };
function c01(c) {
  const h = c[0] / 360, s = c[1] / 100, l = c[2] / 100, a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map(v => v.toFixed(3));
}
const EM = dl => ch(IP.emis, dl || 0);

// ---------------------------------------------------------------- backdrop pieces
function starField(r, n, maxY) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f1(r() * 160)}" cy="${f1(r() * (maxY || 100))}" r="${f1(rr(r, 0.1, 0.42))}" fill="${r() < 0.3 ? ch(IP.light, 15) : '#e8eef8'}" opacity="${f1(rr(r, 0.2, 0.95))}"/>`;
  for (let i = 0; i < 3; i++) {
    const x = r() * 160, y = r() * (maxY || 100), k = rr(r, 0.5, 1.1);
    s += `<g opacity="${f1(rr(r, 0.5, 0.9))}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.45 * k)}" fill="#fff"/><path d="M${f1(x - 3.5 * k)} ${f1(y)}H${f1(x + 3.5 * k)}M${f1(x)} ${f1(y - 2.4 * k)}V${f1(y + 2.4 * k)}" stroke="${ch(IP.light, 15)}" stroke-width=".18"/></g>`;
  }
  return s;
}
const sunGlow = (x, y, k) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(48 * k)}" fill="url(#sun)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.3 * k)}" fill="#fff"/>`;

function planet(r, cx, cy, R) {
  const dx = ILT.x - cx, dy = ILT.y - cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const hue = Math.round((IP.fog[0] + rr(r, -50, 50) + 360) % 360), lc = ch(IP.light, 8);
  let m = `<defs><radialGradient id="plg" cx="${f1(0.5 + ux * 0.34)}" cy="${f1(0.5 + uy * 0.34)}" r=".72"><stop offset="0" stop-color="hsl(${hue},26%,48%)"/><stop offset=".34" stop-color="hsl(${hue},30%,22%)"/><stop offset=".6" stop-color="hsl(${hue},35%,6%)"/><stop offset="1" stop-color="#010103"/></radialGradient>`
    + `<linearGradient id="atm" x1="${f1(0.5 - ux * 0.5)}" y1="${f1(0.5 - uy * 0.5)}" x2="${f1(0.5 + ux * 0.5)}" y2="${f1(0.5 + uy * 0.5)}"><stop offset=".42" stop-color="${lc}" stop-opacity="0"/><stop offset="1" stop-color="${lc}"/></linearGradient>`
    + `<clipPath id="plc"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}"/></clipPath></defs>`;
  m += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" fill="url(#plg)"/>`;
  let bands = '';
  for (let k = 0; k < 8; k++) bands += `<ellipse cx="${f1(cx + rr(r, -R * 0.3, R * 0.3))}" cy="${f1(cy - R + rr(r, 0.1, 1.9) * R)}" rx="${f1(R * rr(r, 0.6, 1.2))}" ry="${f1(rr(r, 0.8, 3.6))}" fill="hsl(${hue},25%,${Math.round(rr(r, 45, 75))}%)" opacity="${f1(rr(r, 0.05, 0.14))}"/>`;
  let city = '';
  for (let k = 0; k < 26; k++) { const a = rr(r, 0, Math.PI * 2), q = rr(r, 0.2, 0.95); city += `<circle cx="${f1(cx - ux * R * 0.45 + Math.cos(a) * R * 0.5 * q)}" cy="${f1(cy - uy * R * 0.45 + Math.sin(a) * R * 0.5 * q)}" r=".25" fill="hsl(40,90%,70%)" opacity="${f1(rr(r, 0.3, 0.8))}"/>`; }
  m += `<g clip-path="url(#plc)">${bands}${city}</g>`;
  m += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 0.2)}" fill="none" stroke="url(#atm)" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 0.8)}" fill="none" stroke="url(#atm)" stroke-width="3.5" opacity=".6" filter="url(#gl)"/>`;
  if (r() < 0.4) m += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(R * 1.7)}" ry="${f1(R * 0.22)}" fill="none" stroke="${ch(IP.fog, 30)}" stroke-width=".6" opacity=".35" transform="rotate(${f1(rr(r, -18, -6))} ${f1(cx)} ${f1(cy)})"/>`;
  return m;
}

// silhouettes for the far and mid planes of a ground backdrop
function skyline(r, hz, style, far) {
  let m = '', lights = '';
  if (style === 'scrap') {
    let pts = [[-5, hz + 2]];
    for (let x = -5; x < 168; x += rr(r, 4, 10)) pts.push([x, hz - rr(r, far ? 4 : 2, far ? 18 : 10) - (r() < 0.15 ? rr(r, 4, 10) : 0)]);
    pts.push([168, hz + 2]);
    m += `<path d="${poly(pts)}"/>`;
    if (far) {
      const wx = rr(r, 20, 140), wr = rr(r, 18, 30);
      m += `<path d="M${f1(wx - wr)} ${f1(hz)} Q${f1(wx - wr * 0.6)} ${f1(hz - wr * 0.9)} ${f1(wx + wr * 0.3)} ${f1(hz - wr * 0.7)} L${f1(wx + wr)} ${f1(hz - wr * 0.3)} L${f1(wx + wr * 1.1)} ${f1(hz)}Z"/>`;
      for (let k = 0; k < 5; k++) m += `<path d="M${f1(wx - wr * 0.6 + k * wr * 0.35)} ${f1(hz - wr * 0.6)}l${f1(rr(r, -2, 2))} ${f1(-rr(r, 4, 12))}" stroke="currentColor" stroke-width=".8"/>`;
    }
    for (let k = 0; k < (far ? 2 : 3); k++) { const x = rr(r, 0, 160), ht = rr(r, 14, 30); m += `<path d="M${f1(x)} ${f1(hz)}V${f1(hz - ht)}L${f1(x + rr(r, 12, 22))} ${f1(hz - ht - rr(r, 2, 8))}" stroke="currentColor" stroke-width="${far ? 0.8 : 1.2}" fill="none"/>`; lights += `<circle cx="${f1(x)}" cy="${f1(hz - ht)}" r=".5" fill="hsl(0,100%,60%)"/>`; }
    if (!far) for (let k = 0; k < 12; k++) lights += `<rect x="${f1(rr(r, 0, 160))}" y="${f1(hz - rr(r, 1, 8))}" width=".9" height=".6" fill="hsl(${r() < 0.5 ? 30 : 45},95%,62%)" opacity=".85"/>`;
  } else if (style === 'forge') {
    for (let x = -4; x < 166; x += rr(r, 6, 16)) {
      const w = rr(r, 4, far ? 14 : 9), ht = far ? rr(r, 10, 46) : rr(r, 4, 16);
      m += `<path d="${poly([[x, hz + 1], [x, hz - ht], [x + w * 0.5, hz - ht - (r() < 0.3 ? rr(r, 2, 6) : 0)], [x + w, hz - ht], [x + w, hz + 1]])}"/>`;
      if (r() < 0.55) lights += `<rect x="${f1(x + w * 0.45)}" y="${f1(hz - ht + 1)}" width=".35" height="${f1(ht - 1)}" fill="${EM(8)}" opacity="${far ? 0.35 : 0.8}"/>`;
      if (!far && r() < 0.5) lights += `<rect x="${f1(x)}" y="${f1(hz - ht * 0.6)}" width="${f1(w)}" height=".35" fill="${EM()}" opacity=".7"/>`;
    }
    if (far) { const rx = rr(r, 30, 130); m += `<ellipse cx="${f1(rx)}" cy="${f1(hz - 26)}" rx="16" ry="16" fill="none" stroke="currentColor" stroke-width="2.4"/>`; lights += `<ellipse cx="${f1(rx)}" cy="${f1(hz - 26)}" rx="16" ry="16" fill="none" stroke="${EM()}" stroke-width=".3" opacity=".5"/>`; }
  } else {
    if (far) {
      let pts = [[-5, hz + 2]];
      for (let x = -5; x < 170; x += rr(r, 6, 14)) pts.push([x, hz - rr(r, 3, 16)]);
      pts.push([170, hz + 2]);
      m += `<path d="${poly(pts)}"/>`;
      for (let k = 0; k < 3; k++) {
        const x = rr(r, 4, 156), w = rr(r, 3, 6), ht = rr(r, 22, 48);
        m += `<path d="${poly([[x - w, hz], [x - w * 0.6, hz - ht], [x, hz - ht - 6], [x + w * 0.6, hz - ht], [x + w, hz]])}"/><path d="M${f1(x)} ${f1(hz - ht - 6)}V${f1(hz - ht - 14)}" stroke="currentColor" stroke-width=".4"/>`;
        lights += `<circle cx="${f1(x)}" cy="${f1(hz - ht - 14)}" r=".55" fill="hsl(0,100%,62%)"/>`;
        for (let j = 0; j < 6; j++) lights += `<rect x="${f1(x - w * 0.4 + r() * w * 0.8)}" y="${f1(hz - r() * ht)}" width=".5" height=".35" fill="${ch(IP.light, 10)}" opacity=".6"/>`;
      }
    } else {
      for (let x = -6; x < 166; x += rr(r, 8, 20)) {
        const w = rr(r, 6, 16), ht = rr(r, 3, 12);
        m += `<path d="${poly([[x, hz + 1], [x, hz - ht], [x + w * 0.2, hz - ht - rr(r, 1, 4)], [x + w * 0.8, hz - ht - rr(r, 1, 4)], [x + w, hz - ht], [x + w, hz + 1]])}"/>`;
        for (let j = 0; j < 3; j++) if (r() < 0.6) lights += `<rect x="${f1(x + 1 + r() * (w - 2))}" y="${f1(hz - r() * ht)}" width=".8" height=".45" fill="hsl(40,90%,70%)" opacity=".8"/>`;
        if (r() < 0.3) { m += `<path d="M${f1(x + w / 2)} ${f1(hz - ht)}V${f1(hz - ht - rr(r, 6, 14))}" stroke="currentColor" stroke-width=".5"/>`; }
      }
    }
  }
  return [m, lights];
}

// ---------------------------------------------------------------- backdrops
const BG = {
  space(r) {
    let m = `<rect width="160" height="100" fill="url(#sky)"/><rect width="160" height="100" fill="url(#nbm)" filter="url(#neb)"/>`;
    m += starField(r, 80);
    m += `<path d="M-10 ${f1(rr(r, 20, 60))} Q80 ${f1(rr(r, 10, 90))} 170 ${f1(rr(r, 20, 80))}" stroke="#000" stroke-width="${f1(rr(r, 8, 16))}" opacity=".4" filter="url(#bl)" fill="none"/>`;
    m += sunGlow(ILT.x, ILT.y, 1);
    const big = rr(r, 55, 90), pcx = ILT.s > 0 ? rr(r, 10, 60) : rr(r, 100, 150), pcy = 100 + big * rr(r, 0.42, 0.7);
    return m + planet(r, pcx, pcy, big);
  },
  ground(r, h) {
    const st = IP.style;
    if (st === 'hive') return BG.hive(r, h);
    if (st === 'psi') return BG.psi(r, h);
    if (st === 'choir') return BG.choir(r, h);
    const hz = rr(r, 60, 67);
    let m = `<rect width="160" height="100" fill="url(#sky)"/>` + starField(r, 20, hz - 20);
    m += sunGlow(ILT.x, hz - rr(r, 8, 18), 1.3);
    for (let k = 0; k < 3; k++) m += `<ellipse cx="${f1(rr(r, 0, 160))}" cy="${f1(rr(r, 10, hz - 18))}" rx="${f1(rr(r, 30, 60))}" ry="${f1(rr(r, 1.5, 4))}" fill="${ch(IP.fog, 14)}" opacity=".2" filter="url(#bl)"/>`;
    const [far, farL] = skyline(r, hz - 2, st, true);
    m += `<g fill="${ch(IP.fog, -4, -12)}" color="${ch(IP.fog, -4, -12)}" opacity=".85" filter="url(#hz)">${far}</g><g opacity=".7">${farL}</g>`;
    m += `<rect x="-5" y="${f1(hz - 14)}" width="170" height="18" fill="${ch(IP.fog, 6)}" opacity=".5" filter="url(#bl)"/>`;
    const [mid, midL] = skyline(r, hz, st, false);
    m += `<g fill="${ch(IP.dark, 2)}" color="${ch(IP.dark, 2)}">${mid}</g>${midL}`;
    m += `<rect y="${f1(hz)}" width="160" height="${f1(101 - hz)}" fill="url(#gd)"/>`;
    m += `<ellipse cx="${f1(ILT.x)}" cy="${f1(hz + 3)}" rx="50" ry="2.6" fill="${ch(IP.light)}" opacity=".3" filter="url(#bl)"/>`;
    let ln = '';
    for (let k = -7; k <= 7; k++) ln += `M${f1(80 + k * 9)} ${f1(hz)}L${f1(80 + k * 34)} 100`;
    for (let k = 1; k < 5; k++) { const y = hz + (100 - hz) * Math.pow(k / 5, 1.7); ln += `M0 ${f1(y)}H160`; }
    return m + `<path d="${ln}" stroke="${ch(IP.fog, 30)}" stroke-width=".18" opacity=".18"/>`;
  },
  field(r, h) {
    const st = IP.style;
    if (st === 'hive') return BG.hive(r, h);
    if (st === 'psi') return BG.psi(r, h);
    if (st === 'choir') return BG.choir(r, h);
    let m = BG.ground(r, h);
    for (let k = 0; k < 3; k++) {
      const x = rr(r, 10, 150), y = rr(r, 60, 68);
      m += `<path d="M${f1(x)} ${f1(y)} Q${f1(x + rr(r, -10, 10))} ${f1(y - 25)} ${f1(x + rr(r, 10, 30))} ${f1(y - 50)}" stroke="hsl(20,10%,14%)" stroke-width="${f1(rr(r, 6, 12))}" fill="none" opacity=".6" filter="url(#bl)"/>`;
      m += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="4" ry="1.6" fill="hsl(28,100%,60%)" filter="url(#gl)"/>`;
    }
    return m;
  },
  hive(r) {
    let m = `<rect width="160" height="100" fill="url(#sky)"/>` + sunGlow(ILT.x, rr(r, 40, 60), 1);
    let ribs = '';
    for (let k = 0; k < 7; k++) { const x = rr(r, -20, 180); ribs += `<path d="M${f1(x)} 106 Q${f1(x + rr(r, -40, 40))} ${f1(rr(r, 10, 40))} ${f1(x + rr(r, -70, 70))} -6" stroke-width="${f1(rr(r, 3, 9))}"/>`; }
    m += `<g stroke="${ch(IP.fog, 2)}" fill="none" stroke-linecap="round" opacity=".55" filter="url(#hz)">${ribs}</g>`;
    m += `<rect x="-5" y="40" width="170" height="40" fill="${ch(IP.fog, 6)}" opacity=".35" filter="url(#bl)"/>`;
    let mid = '', nodes = '';
    for (let k = 0; k < 4; k++) {
      const x = rr(r, -5, 165), w = rr(r, 4, 9), bend = rr(r, -16, 16);
      mid += tube([[x, 104], [x + bend * 0.3, 70], [x + bend, 36], [x + bend * 0.6, -6]], w, w * 0.6, 'd');
      for (let j = 0; j < 4; j++) nodes += `<circle cx="${f1(x + bend * rr(r, 0.2, 0.9) + rr(r, -3, 3))}" cy="${f1(rr(r, 10, 95))}" r="${f1(rr(r, 0.5, 1.4))}" fill="${EM()}"/>`;
    }
    for (let k = 0; k < 9; k++) { const x = rr(r, 0, 160), l = rr(r, 6, 26); mid += `<path d="M${f1(x)} -2 Q${f1(x + rr(r, -4, 4))} ${f1(l * 0.6)} ${f1(x + rr(r, -3, 3))} ${f1(l)}" stroke="${ch(IP.dark, 4)}" stroke-width="${f1(rr(r, 0.6, 1.6))}" fill="none"/>`; nodes += `<circle cx="${f1(x)}" cy="${f1(l)}" r=".7" fill="${EM()}" opacity=".8"/>`; }
    m += mid + glow(nodes, 0.8);
    m += `<path d="M-5 100 L-5 ${f1(rr(r, 80, 86))} Q40 ${f1(rr(r, 74, 82))} 80 ${f1(rr(r, 80, 86))} T165 ${f1(rr(r, 78, 86))} L165 100Z" fill="${ch(IP.dark, 3)}"/>`;
    m += `<ellipse cx="${f1(rr(r, 30, 130))}" cy="${f1(rr(r, 86, 92))}" rx="${f1(rr(r, 14, 30))}" ry="2" fill="${EM()}" opacity=".3" filter="url(#gl)"/>`;
    m += glow(Array.from({ length: 22 }, () => `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 100)}" r="${f1(rr(r, 0.2, 0.9))}" fill="${EM(10)}" opacity="${f1(rr(r, 0.2, 0.8))}"/>`).join(''), 0.7);
    return m;
  },
  psi(r) {
    let m = `<rect width="160" height="100" fill="url(#sky)"/><rect width="160" height="100" fill="url(#nbm)" filter="url(#neb)"/>` + starField(r, 60);
    m += `<path d="M-10 ${f1(rr(r, 30, 60))} Q80 ${f1(rr(r, 0, 50))} 170 ${f1(rr(r, 20, 60))}" stroke="#000" stroke-width="${f1(rr(r, 10, 18))}" opacity=".55" filter="url(#bl)" fill="none"/>`;
    m += sunGlow(ILT.x, ILT.y, 0.9);
    const lx = ILT.s > 0 ? rr(r, 24, 50) : rr(r, 110, 136), ly = rr(r, 18, 34), lr = rr(r, 10, 16);
    m += `<g opacity=".8"><ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(lr)}" ry="${f1(lr * 0.34)}" fill="none" stroke="hsl(260,25%,6%)" stroke-width="2.6" transform="rotate(-18 ${f1(lx)} ${f1(ly)})"/>`
      + glow(`<ellipse cx="${f1(lx)}" cy="${f1(ly)}" rx="${f1(lr)}" ry="${f1(lr * 0.34)}" fill="none" stroke="${EM(6)}" stroke-width=".35" transform="rotate(-18 ${f1(lx)} ${f1(ly)})"/><circle cx="${f1(lx)}" cy="${f1(ly)}" r="1" fill="#fff"/>`, 0.8) + '</g>';
    for (let k = 0; k < 3; k++) m += glow(`<path d="M${f1(rr(r, -10, 40))} ${f1(rr(r, 0, 100))} Q${f1(rr(r, 40, 120))} ${f1(rr(r, 0, 100))} ${f1(rr(r, 120, 170))} ${f1(rr(r, 0, 100))}" stroke="${EM()}" stroke-width=".3" fill="none" opacity=".35"/>`, 0.6);
    const gy = rr(r, 82, 88);
    m += `<path d="M-5 101 L-5 ${f1(gy)} L${f1(rr(r, 20, 40))} ${f1(gy - rr(r, 1, 4))} L${f1(rr(r, 60, 100))} ${f1(gy + 1)} L${f1(rr(r, 120, 140))} ${f1(gy - rr(r, 1, 5))} L165 ${f1(gy)} L165 101Z" fill="${ch(IP.dark, 2)}"/>`;
    for (let k = 0; k < 5; k++) { const x = rr(r, 0, 160), y = gy + rr(r, 0, 6), s = rr(r, 1.5, 4); m += glow(`<path d="${poly([[x - s * 0.4, y], [x, y - s * 2.4], [x + s * 0.4, y]])}" fill="${EM(-10)}" opacity=".75"/>`, 0.7); }
    return m;
  },
  choir(r) {
    const hz = rr(r, 70, 78);
    let m = `<rect width="160" height="100" fill="url(#sky)"/>` + starField(r, 26, 50);
    m += sunGlow(ILT.x, hz - 4, 1.5);
    m += `<rect x="-5" y="${f1(hz - 16)}" width="170" height="22" fill="${EM(-14)}" opacity=".22" filter="url(#bl)"/>`;
    let sp = '', edges = '';
    for (let x = -6; x < 168; x += rr(r, 4, 12)) {
      const w = rr(r, 2, 7), ht = rr(r, 8, 52) * (Math.abs(x - 80) < 30 ? 0.6 : 1), lean = rr(r, -6, 6);
      sp += `<path d="${poly([[x - w, hz + 2], [x + lean, hz - ht], [x + w, hz + 2]])}"/>`;
      edges += `<path d="M${f1(x + lean)} ${f1(hz - ht)}L${f1(x + (ILT.s > 0 ? w : -w))} ${f1(hz + 2)}" />`;
    }
    m += `<g fill="#050206">${sp}</g><g stroke="${EM(10)}" stroke-width=".25" opacity=".4">${edges}</g>`;
    for (let k = 0; k < 10; k++) { const x = rr(r, 0, 160), y = rr(r, 6, hz - 20), s = rr(r, 0.8, 3); m += `<path d="${poly([[x, y - s * 1.8], [x + s * 0.6, y], [x, y + s * 1.2], [x - s * 0.5, y]])}" fill="#070308" stroke="${EM(6)}" stroke-width=".2" stroke-opacity=".7"/>`; }
    m += `<rect y="${f1(hz + 2)}" width="160" height="${f1(100 - hz)}" fill="url(#gd)"/>`;
    for (let k = 0; k < 6; k++) m += `<rect x="${f1(rr(r, 0, 150))}" y="${f1(rr(r, hz + 3, 99))}" width="${f1(rr(r, 6, 30))}" height=".3" fill="${EM()}" opacity="${f1(rr(r, 0.15, 0.4))}"/>`;
    return m;
  },
  schematic(r) {
    let m = `<rect width="160" height="100" fill="url(#sky)"/>`;
    for (let k = 0; k < 7; k++) {
      const x = rr(r, -4, 150), y = rr(r, 6, 46), w = rr(r, 10, 26), ht = rr(r, 6, 16);
      m += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(ht)}" fill="${EM()}" fill-opacity=".04" stroke="${EM()}" stroke-opacity=".22" stroke-width=".25"/>`;
      for (let j = 0; j < 3; j++) m += `<rect x="${f1(x + 1.5)}" y="${f1(y + 2 + j * 2.2)}" width="${f1(rr(r, 3, w - 4))}" height=".5" fill="${EM()}" opacity=".25"/>`;
    }
    m += `<rect x="-5" y="34" width="170" height="30" fill="${ch(IP.fog, 4)}" opacity=".35" filter="url(#bl)"/>`;
    m += `<rect y="64" width="160" height="37" fill="url(#gd)"/>`;
    let g = '';
    for (let k = -9; k <= 9; k++) g += `M${f1(80 + k * 7)} 64L${f1(80 + k * 26)} 100`;
    for (let k = 1; k < 7; k++) g += `M0 ${f1(64 + 36 * Math.pow(k / 7, 1.6))}H160`;
    m += `<path d="${g}" stroke="${EM()}" stroke-width=".2" opacity=".3"/>`;
    return m;
  },
};

// ---------------------------------------------------------------- infantry puppet
// A posable armored figure: joints → tapered limb plates, helmet, gear, weapon.
// Back limbs use the darker material so the figure reads with depth.
const bar = (a, b, w1, w2, cls) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return `<path class="${cls || 'h'}" d="${poly([[a[0] + nx * w1, a[1] + ny * w1], [b[0] + nx * w2, b[1] + ny * w2], [b[0] - nx * w2, b[1] - ny * w2], [a[0] - nx * w1, a[1] - ny * w1]])}"/>`;
};
function limb3(a, b, c, wa, wb, wc, cls) {
  const nrm = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  const n1 = nrm(a, b), n2 = nrm(b, c), nb = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];
  return `<path class="${cls || 'h'}" d="${poly([[a[0] + n1[0] * wa, a[1] + n1[1] * wa], [b[0] + nb[0] * wb, b[1] + nb[1] * wb], [c[0] + n2[0] * wc, c[1] + n2[1] * wc], [c[0] - n2[0] * wc, c[1] - n2[1] * wc], [b[0] - nb[0] * wb, b[1] - nb[1] * wb], [a[0] - n1[0] * wa, a[1] - n1[1] * wa]])}"/>`;
}
const dot = (p, rad, cls) => `<circle class="${cls || 'h'}" cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(rad)}"/>`;
const add = (p, x, y) => [p[0] + x, p[1] + y];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Joints for each pose (figure faces right; "b" = far side, "f" = near side).
const POSES = {
  stand: () => ({ head: [80, 27], sb: [71, 40], sf: [88, 40], pel: [80, 63], hb: [75, 64], hf: [85, 64], kb: [73, 80], kf: [88, 80], fb: [71, 97], ff: [90, 97], eb: [69, 54], wb: [83, 61], ef: [96, 55], wf: [99, 49], grip: [83, 61], fore: [99, 49] }),
  aim: () => ({ head: [79, 28], sb: [71, 41], sf: [86, 40], pel: [79, 63], hb: [75, 64], hf: [84, 64], kb: [69, 80], kf: [91, 79], fb: [63, 97], ff: [96, 97], eb: [77, 53], wb: [89, 46], ef: [100, 48], wf: [108, 43], grip: [89, 46], fore: [108, 43] }),
  charge: () => ({ head: [89, 28], sb: [79, 40], sf: [94, 41], pel: [80, 62], hb: [76, 62], hf: [85, 62], kb: [69, 78], kf: [97, 73], fb: [57, 94], ff: [99, 95], eb: [70, 51], wb: [63, 59], ef: [104, 33], wf: [110, 23], grip: [110, 23], fore: [118, 10] }),
  kneel: () => ({ head: [80, 39], sb: [72, 51], sf: [87, 50], pel: [80, 73], hb: [76, 74], hf: [85, 73], kb: [72, 95], kf: [97, 75], fb: [58, 97], ff: [98, 97], eb: [77, 63], wb: [89, 57], ef: [101, 59], wf: [109, 54], grip: [89, 57], fore: [109, 54] }),
  brace: () => ({ head: [78, 31], sb: [70, 44], sf: [85, 43], pel: [78, 66], hb: [73, 67], hf: [83, 67], kb: [68, 82], kf: [90, 81], fb: [64, 97], ff: [95, 97], eb: [66, 57], wb: [74, 64], ef: [94, 52], wf: [97, 46], grip: [74, 64], fore: [92, 58] }),
  heavy: () => ({ head: [80, 29], sb: [69, 42], sf: [91, 42], pel: [80, 65], hb: [74, 66], hf: [86, 66], kb: [69, 82], kf: [92, 82], fb: [65, 97], ff: [96, 97], eb: [64, 34], wb: [70, 28], ef: [98, 56], wf: [102, 48], grip: [70, 30], fore: [118, 26] }),
  work: () => ({ head: [78, 28], sb: [70, 41], sf: [86, 41], pel: [78, 64], hb: [73, 65], hf: [83, 65], kb: [70, 81], kf: [88, 81], fb: [67, 97], ff: [92, 97], eb: [66, 56], wb: [70, 70], ef: [96, 52], wf: [106, 58], grip: [106, 58], fore: [118, 66] }),
  run: () => ({ head: [88, 27], sb: [78, 40], sf: [93, 41], pel: [80, 62], hb: [76, 63], hf: [85, 63], kb: [66, 74], kf: [97, 71], fb: [56, 88], ff: [101, 96], eb: [74, 52], wb: [86, 56], ef: [101, 52], wf: [107, 45], grip: [86, 56], fore: [107, 45] }),
  hip: () => ({ head: [78, 28], sb: [69, 41], sf: [86, 41], pel: [78, 64], hb: [73, 65], hf: [83, 65], kb: [66, 81], kf: [92, 80], fb: [60, 97], ff: [98, 97], eb: [70, 55], wb: [80, 62], ef: [95, 57], wf: [103, 56], grip: [80, 62], fore: [103, 56] }),
};
const VIS_HUE = { r: 0, c: 190, g: 130, a: 38 };

function infantry(r, h, o) {
  const J = (POSES[o.pose] || POSES.stand)();
  // per-card jitter so two cards with the same pose still differ
  const jit = () => rr(r, -1.1, 1.1);
  for (const k of Object.keys(J)) if (k !== 'grip' && k !== 'fore') J[k] = add(J[k], jit(), jit() * 0.6);
  const B = o.bulk || 1, pad = o.pad == null ? 1 : o.pad;
  const raider = IP === IPAL.raider;
  const vh = VIS_HUE[o.visor] ?? IP.emis[0], vis = `hsl(${vh},100%,${vh === 0 ? 58 : 62}%)`;
  const acc = o.accent != null ? `hsl(${o.accent},72%,46%)` : ch(IP.paint);
  const pm = def => raider && r() < 0.45 ? 'p' : def; // mismatched raider plates
  const seams = IP.seams;

  const boot = (f, cls) => `<path class="d" d="${poly([[f[0] - 3.8, f[1] - 4.6], [f[0] + 3.4, f[1] - 4.8], [f[0] + 7.6, f[1] - 1.4], [f[0] + 7.8, f[1] + 0.6], [f[0] - 4.2, f[1] + 0.6]])}"/><path class="${cls}" d="${poly([[f[0] - 3.6, f[1] - 5.8], [f[0] + 3, f[1] - 6], [f[0] + 6, f[1] - 2.8], [f[0] - 3.8, f[1] - 2.4]])}"/>`;
  const leg = (hp, kn, ft, cls) => {
    const c2 = cls === 'h' ? pm('h') : cls;
    let m = limb3(hp, kn, ft, 5 * B, 3.8 * B, 2.9 * B, 'd');
    m += bar(lerp(hp, kn, 0.05), lerp(hp, kn, 0.74), 5.2 * B, 4.1 * B, c2);
    m += `<path class="l" d="M${pt(add(lerp(hp, kn, 0.45), -3.6 * B, 0.3))}L${pt(add(lerp(hp, kn, 0.45), 3.6 * B, -0.5))}"/>`;
    m += bar(lerp(kn, ft, 0.2), lerp(kn, ft, 0.78), 4 * B, 3.3 * B, cls);
    m += `<path class="${cls}" d="M${f1(kn[0] - 3.8)} ${f1(kn[1] - 3.6)} Q${f1(kn[0] + 1)} ${f1(kn[1] - 6.4)} ${f1(kn[0] + 4.8)} ${f1(kn[1] - 2)} L${f1(kn[0] + 3.8)} ${f1(kn[1] + 3.8)} L${f1(kn[0] - 2.8)} ${f1(kn[1] + 3.2)}Z"/>`;
    if (seams && cls === 'h') m += `<path class="s" d="M${pt(add(lerp(kn, ft, 0.32), 2.4 * B, 0))}L${pt(add(lerp(kn, ft, 0.66), 2.1 * B, 0))}"/>`;
    return m + boot(ft, cls);
  };
  const arm = (sh, el, wr, cls) => {
    const c2 = cls === 'h' ? pm('h') : cls;
    let m = limb3(sh, el, wr, 3.8 * B, 3 * B, 2.4 * B, 'd');
    m += bar(lerp(sh, el, 0.12), lerp(sh, el, 0.8), 3.7 * B, 3.2 * B, c2);
    m += bar(lerp(el, wr, 0.12), lerp(el, wr, 0.9), 3.6 * B, 3.1 * B, cls);
    m += dot(el, 2.3 * B, 'hb');
    if (cls === 'h') m += `<path d="M${pt(lerp(el, wr, 0.35))}L${pt(lerp(el, wr, 0.68))}" stroke="${vis}" stroke-width=".6" opacity=".9"/>`;
    return m + dot(wr, 2.5 * B, 'd') + dot(add(wr, 0.6, -0.6), 1.4 * B, 'hb');
  };
  const pauld = (sh, cls, front) => {
    if (!pad) return '';
    const k = Math.min(1.45, pad * B), x = sh[0] + (front ? 1 : -1), y = sh[1];
    const c2 = front && raider ? 'p' : cls;
    let m = `<path class="${c2}" d="M${f1(x - 6.6 * k)} ${f1(y + 2.4 * k)} Q${f1(x - 6.8 * k)} ${f1(y - 6 * k)} ${f1(x + 0.4 * k)} ${f1(y - 6.4 * k)} Q${f1(x + 7.8 * k)} ${f1(y - 6 * k)} ${f1(x + 8 * k)} ${f1(y + 1.8 * k)} L${f1(x + 6.6 * k)} ${f1(y + 4.6 * k)} L${f1(x - 5.2 * k)} ${f1(y + 4.8 * k)}Z"/>`;
    m += `<path class="${cls}" d="${poly([[x - 5.6 * k, y + 4.2 * k], [x + 7.2 * k, y + 4 * k], [x + 6.2 * k, y + 7.8 * k], [x - 4.8 * k, y + 7.6 * k]])}"/>`;
    if (front && raider) m += `<path d="${poly([[x - 5.3 * k, y + 4.7 * k], [x + 6.9 * k, y + 4.5 * k], [x + 6.3 * k, y + 7.3 * k], [x - 4.8 * k, y + 7.1 * k]])}" fill="url(#haz)" opacity=".9"/>`;
    else if (o.stripe) m += `<path d="M${f1(x - 4.8 * k)} ${f1(y - 2.4 * k)} Q${f1(x + 0.8 * k)} ${f1(y - 5.4 * k)} ${f1(x + 6.8 * k)} ${f1(y - 2.2 * k)}" stroke="${acc}" stroke-width="${f1(1.7 * k)}" fill="none"/>`;
    m += `<path class="k" d="M${f1(x - 6 * k)} ${f1(y + 0.6 * k)} Q${f1(x - 5.6 * k)} ${f1(y - 5.2 * k)} ${f1(x + 0.6 * k)} ${f1(y - 5.6 * k)}"/>`;
    return m;
  };

  // weapon geometry along grip → fore
  const weapon = () => {
    const G = J.grip, F = J.fore, dx = F[0] - G[0], dy = F[1] - G[1], L = Math.hypot(dx, dy) || 1, u = [dx / L, dy / L], n = [u[1], -u[0]];
    const at = (t, off) => [G[0] + u[0] * t + n[0] * (off || 0), G[1] + u[1] * t + n[1] * (off || 0)];
    const w = o.weapon || 'rifle', ec = raider ? ch(IP.emis) : vis;
    if (w === 'rifle' || w === 'sniper' || w === 'carbine') {
      const len = w === 'sniper' ? 34 : w === 'carbine' ? 15 : 24;
      let m = bar(at(-12), at(-3), 2.2, 2.8, 'w');
      m += `<path class="w" d="${poly([at(-4, -3), at(12, -3.4), at(15.5, -1.8), at(15.5, 2.4), at(7, 3), at(-4, 3.4)])}"/>`;
      m += bar(at(15), at(15 + len * 0.55), 2, 1.7, 'w') + bar(at(15), at(15 + len), 0.8, 0.8, 'd') + bar(at(13 + len), at(15.5 + len), 1.3, 1.3, 'w');
      m += `<path class="d" d="${poly([at(4, 2.8), at(8, 2.8), at(9.6, 9), at(5.6, 9.6)])}"/>`;
      m += bar(at(0, -4.5), at(w === 'sniper' ? 12 : 8, -4.5), w === 'sniper' ? 1.6 : 1.2, w === 'sniper' ? 1.6 : 1.2, 'd');
      m += `<path class="l" d="M${pt(at(0, -1))}L${pt(at(13, -1.4))}"/>`;
      m += glow(`<path d="M${pt(at(1, 1.2))}L${pt(at(13, 0.8))}" stroke="${ec}" stroke-width=".55"/><circle cx="${f1(at(w === 'sniper' ? 12.4 : 8.4, -4.5)[0])}" cy="${f1(at(w === 'sniper' ? 12.4 : 8.4, -4.5)[1])}" r=".7" fill="${w === 'sniper' ? 'hsl(0,95%,60%)' : ec}"/>`, 0.8);
      return m;
    }
    if (w === 'cannon') {
      let m = bar(at(-12), at(32), 4.6, 4.2, 'w') + bar(at(-8), at(20), 5.4, 5, 'hb') + bar(at(32), at(40), 5.2, 5.2, 'd');
      for (let k = 0; k < 4; k++) m += bar(at(22 + k * 2.6), at(23.4 + k * 2.6), 4.8, 4.8, 'hb');
      m += bar(at(6, 5), at(12, 9.5), 1.6, 1.6, 'd');
      return m + glow(`<path d="M${pt(at(-6, -2))}L${pt(at(18, -2))}" stroke="${ec}" stroke-width=".7"/><circle cx="${f1(at(40)[0])}" cy="${f1(at(40)[1])}" r="2.6" fill="hsl(28,100%,60%)"/>`, 0.85);
    }
    if (w === 'blade') return bar(at(-4), at(3), 1.6, 1.6, 'd') + bar(at(2.5, 0), at(4, 0), 3, 3, 'w') + glow(`<path d="${poly([at(4, -1.6), at(30, -0.8), at(35, 0.4), at(4, 1.6)])}" fill="${ch(IP.emis, 10)}" opacity=".85"/><path d="M${pt(at(5, 0))}L${pt(at(33, 0.2))}" stroke="#fff" stroke-width=".7"/>`);
    if (w === 'tool') {
      const tip = at(16);
      return bar(at(-2), at(11), 2, 1.6, 'w') + bar(at(11), tip, 1, 0.7, 'd') + glow(`<circle cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="1.9" fill="#fff6d0"/>` + Array.from({ length: 10 }, () => { const a = rr(r, -1.3, 1.3) + Math.atan2(u[1], u[0]), d = rr(r, 3, 11); return `<path d="M${f1(tip[0])} ${f1(tip[1])}l${f1(Math.cos(a) * d)} ${f1(Math.sin(a) * d + 2)}" stroke="hsl(40,100%,${Math.round(rr(r, 60, 80))}%)" stroke-width=".35"/>`; }).join(''));
    }
    return '';
  };

  const torso = () => {
    const tl = add(J.sb, -3.6 * B, -2), tr = add(J.sf, 3.8 * B, -2);
    const wl = add(lerp(J.sb, J.hb, 0.68), -2 * B, 0), wr = add(lerp(J.sf, J.hf, 0.68), 2.2 * B, 0);
    const hl = add(J.hb, -3 * B, 1.5), hr = add(J.hf, 3 * B, 1.5);
    const cl = add(lerp(tl, wl, 0.42), -1.4 * B, 0), cr = add(lerp(tr, wr, 0.42), 1.6 * B, 0);
    let t = `<path class="hb" d="${poly([tl, tr, cr, wr, hr, hl, wl, cl])}"/>`;
    for (let k = 0; k < 2; k++) {
      const a = 0.48 + k * 0.2, L1 = lerp(cl, hl, a), R1 = lerp(cr, hr, a), L2 = lerp(cl, hl, a + 0.16), R2 = lerp(cr, hr, a + 0.16);
      t += `<path class="${k ? 'hb' : 'h'}" d="${poly([add(L1, 0.6, 0), add(R1, -0.4, 0), add(R2, -0.6, 0), add(L2, 0.8, 0)])}"/>`;
    }
    const bot = lerp(lerp(cl, cr, 0.55), lerp(wl, wr, 0.55), 0.5);
    const cp = [add(lerp(tl, tr, 0.06), 0.4, 1.2), add(lerp(tl, tr, 0.96), -0.2, 1), add(cr, 0.4, 1.6), add(lerp(cr, wr, 0.5), -0.6, 0), bot, add(lerp(cl, wl, 0.5), 0.8, 0), add(cl, 0.2, 1.6)];
    t += `<path class="${pm('h')}" d="${poly(cp)}"/>`;
    t += `<path class="k" d="M${pt(cp[0])}L${pt(cp[1])}"/><path class="l" d="M${pt(lerp(cp[0], cp[1], 0.55))}L${pt(bot)}"/>`;
    if (o.stripe) t += `<path d="${poly([add(cp[0], 1, 0.4), add(lerp(cp[0], cp[1], 0.32), 0, 0.4), add(lerp(cp[6], bot, 0.62), 0, 0), add(lerp(cp[6], bot, 0.36), -1, 0)])}" fill="${acc}" opacity=".9"/>`;
    if (seams) t += `<path class="s" d="M${pt(add(cp[2], -0.8, 0))}L${pt(add(cp[3], -0.6, 0))}L${pt(add(bot, 0, -0.6))}"/>`;
    const bl = lerp(wl, hl, 0.55), br = lerp(wr, hr, 0.55);
    t += `<path class="d" d="${poly([add(bl, -0.6, -1.4), add(br, 0.6, -1.6), add(br, 0.4, 1.8), add(bl, -0.4, 2)])}"/>`;
    if (o.rig !== false) t += [0.2, 0.45, 0.72].map(a => { const p = lerp(bl, br, a); return `<rect class="hb" x="${f1(p[0] - 2)}" y="${f1(p[1] - 1.2)}" width="4" height="4.6" rx=".7"/>`; }).join('');
    const bk = lerp(bl, br, 0.9);
    t += `<rect x="${f1(bk[0] - 0.7)}" y="${f1(bk[1] - 0.4)}" width="1.4" height=".8" fill="${vis}"/>`;
    const [hx, hy] = J.head;
    t += `<path class="d" d="M${f1(hx - 6)} ${f1(hy + 11)} Q${f1(hx)} ${f1(hy + 7.5)} ${f1(hx + 6.4)} ${f1(hy + 11)} L${f1(hx + 5)} ${f1(hy + 14)} L${f1(hx - 5)} ${f1(hy + 14)}Z"/>`;
    return t;
  };

  const helmet = () => { const [x, y] = J.head; return `<g transform="translate(${f1(x)} ${f1(y + 4)}) scale(.9) translate(${f1(-x)} ${f1(-y - 4)})">${helmet0()}</g>`; };
  const helmet0 = () => {
    const [x, y] = J.head, kind = o.helm || 'visor';
    let m = `<path class="d" d="${poly([[x - 3.4, y + 5], [x + 3.6, y + 5], [x + 4.2, y + 11], [x - 4, y + 11]])}"/>`;
    if (kind === 'open') {
      m += `<ellipse cx="${f1(x + 1.5)}" cy="${f1(y + 1.5)}" rx="5.4" ry="6.6" fill="url(#skn)"/><path d="M${f1(x - 6.5)} ${f1(y + 1)} Q${f1(x - 7)} ${f1(y - 9)} ${f1(x + 1)} ${f1(y - 9)} Q${f1(x + 8)} ${f1(y - 9)} ${f1(x + 8)} ${f1(y - 2)} L${f1(x + 7)} ${f1(y - 3)} Q${f1(x)} ${f1(y - 5)} ${f1(x - 4)} ${f1(y + 2)}Z" class="h"/>`;
      return m + `<circle cx="${f1(x + 4)}" cy="${f1(y + 0.4)}" r=".5" fill="#e8f0ff"/>`;
    }
    if (kind === 'hood') {
      m += `<path class="cl" d="M${f1(x - 9.5)} ${f1(y + 11)} Q${f1(x - 11)} ${f1(y - 11)} ${f1(x + 1)} ${f1(y - 11.5)} Q${f1(x + 11)} ${f1(y - 10)} ${f1(x + 10)} ${f1(y + 9)}Z"/><path d="M${f1(x - 5)} ${f1(y + 7)} Q${f1(x - 5)} ${f1(y - 6)} ${f1(x + 2)} ${f1(y - 6)} Q${f1(x + 9)} ${f1(y - 5)} ${f1(x + 9)} ${f1(y + 5)} L${f1(x + 4)} ${f1(y + 8)}Z" fill="#030304"/>`;
      return m + glow(`<path d="M${f1(x + 2)} ${f1(y + 0.6)}h2.6M${f1(x + 6)} ${f1(y + 0.4)}h2.4" stroke="${vis}" stroke-width="1"/>`);
    }
    const hv = kind === 'heavy';
    if (hv) m += `<path class="h" d="${poly([[x - 8.5, y + 7.5], [x - 9.8, y - 4], [x - 6, y - 10.8], [x + 4, y - 11.2], [x + 9.8, y - 6.6], [x + 11.2, y + 1], [x + 10.2, y + 7.6], [x + 3, y + 9.8], [x - 4, y + 9.8]])}"/>`;
    else m += `<path class="h" d="M${f1(x - 7.6)} ${f1(y + 6.5)} L${f1(x - 8.8)} ${f1(y - 2)} Q${f1(x - 7.4)} ${f1(y - 9.4)} ${f1(x + 1)} ${f1(y - 9.8)} Q${f1(x + 8.4)} ${f1(y - 9.6)} ${f1(x + 10.2)} ${f1(y - 3.6)} L${f1(x + 10)} ${f1(y + 1.4)} L${f1(x + 9)} ${f1(y + 5.4)} L${f1(x + 4.4)} ${f1(y + 8.6)} L${f1(x - 4)} ${f1(y + 8.6)}Z"/><path class="hb" d="${poly([[x - 0.6, y - 5.8], [x + 10.2, y - 4.8], [x + 10.1, y - 3.3], [x + 0.2, y - 4]])}"/>`;
    m += `<path class="hb" d="${poly([[x - 6.4, y - 1], [x - 1.6, y - 1.4], [x - 1.2, y + 4.4], [x - 5.6, y + 5]])}"/><rect x="${f1(x - 5)}" y="${f1(y + 1.2)}" width="2.4" height=".6" fill="${vis}"/>`;
    if (hv) m += `<path class="g" d="${poly([[x + 1, y - 2.8], [x + 10.8, y - 3], [x + 10.6, y + 0.8], [x + 1.4, y + 1]])}"/>`;
    else m += `<path class="g" d="M${f1(x + 0.4)} ${f1(y - 3.6)} Q${f1(x + 6)} ${f1(y - 5.6)} ${f1(x + 9.9)} ${f1(y - 3)} L${f1(x + 9.6)} ${f1(y + 1.8)} Q${f1(x + 5.4)} ${f1(y + 3.2)} ${f1(x + 0.8)} ${f1(y + 2.2)}Z"/>`;
    m += glow(`<path d="M${f1(x + 2.2)} ${f1(y - 0.6)}L${f1(x + 9.4)} ${f1(y - 1.1)}" stroke="${vis}" stroke-width=".75"/>`, 0.9);
    m += `<path d="M${f1(x + 1.8)} ${f1(y - 2.6)} Q${f1(x + 6)} ${f1(y - 4.2)} ${f1(x + 9.2)} ${f1(y - 2.4)}" stroke="#fff" stroke-opacity=".6" stroke-width=".35" fill="none"/>`;
    if (kind !== 'rebreather') m += `<path class="hb" d="${poly([[x + 2, y + 2.6], [x + 9.4, y + 1.8], [x + 8.4, y + 6], [x + 4.2, y + 8.6], [x + 1.4, y + 7]])}"/><path class="l" d="M${f1(x + 3.4)} ${f1(y + 5)}L${f1(x + 8)} ${f1(y + 4.2)}M${f1(x + 3.8)} ${f1(y + 6.4)}L${f1(x + 7.4)} ${f1(y + 5.8)}"/>`;
    m += `<path class="k" d="M${f1(x - 6)} ${f1(y - 6)} Q${f1(x)} ${f1(y - 11.6)} ${f1(x + 6.6)} ${f1(y - 8.2)}"/>`;
    if (kind === 'rebreather') m += `<path class="hb" d="${poly([[x + 2, y + 2.4], [x + 10, y + 2.2], [x + 9, y + 8], [x + 3, y + 8.4]])}"/><circle class="d" cx="${f1(x + 6.4)}" cy="${f1(y + 5.4)}" r="1.8"/><path d="M${f1(x + 4)} ${f1(y + 8)} Q${f1(x + 1)} ${f1(y + 14)} ${f1(x - 5)} ${f1(y + 13)}" stroke="hsl(${h},10%,18%)" stroke-width="1.4" fill="none"/>`;
    if (kind === 'crest') m += `<path class="${raider ? 'p' : 'h'}" d="${poly([[x - 5, y - 8.6], [x + 2, y - 16], [x + 4, y - 9.6]])}"/>`;
    if (o.stripe) m += `<path d="M${f1(x - 6)} ${f1(y - 5)} Q${f1(x)} ${f1(y - 9.4)} ${f1(x + 6)} ${f1(y - 6.4)}" stroke="${acc}" stroke-width="1.3" fill="none"/>`;
    if (o.antenna) m += `<path d="M${f1(x - 5)} ${f1(y - 4)} L${f1(x - 10)} ${f1(y - 20)}" stroke="hsl(${h},12%,55%)" stroke-width=".55"/>` + glow(`<circle cx="${f1(x - 10)}" cy="${f1(y - 20)}" r=".8" fill="hsl(0,100%,60%)"/>`);
    return m;
  };

  const back = () => {
    const s = J.sb, hb = J.hb;
    if (o.pack === 'dish') return bar(s, add(s, -6, -16), 0.7, 0.7, 'd') + `<ellipse class="h" cx="${f1(s[0] - 7)}" cy="${f1(s[1] - 18)}" rx="8" ry="3" transform="rotate(-25 ${f1(s[0] - 7)} ${f1(s[1] - 18)})"/>` + glow(`<circle cx="${f1(s[0] - 7)}" cy="${f1(s[1] - 18)}" r="1.3" fill="${EM(10)}"/>`) + `<path class="hb" d="${poly([add(s, -8, -1), add(s, 1, -3), add(hb, 0, -7), add(hb, -9, -3)])}"/>`;
    if (o.pack === 'charges') return `<path class="hb" d="${poly([add(s, -9, 0), add(s, 1, -2), add(hb, 0, -4), add(hb, -10, -2)])}"/>` + [0, 1, 2].map(k => `<rect x="${f1(s[0] - 9)}" y="${f1(s[1] + 3 + k * 5)}" width="8.4" height="3.4" rx=".6" fill="hsl(${o.accent ?? 30},60%,32%)" stroke="#000" stroke-width=".3"/><rect x="${f1(s[0] - 9)}" y="${f1(s[1] + 4.2 + k * 5)}" width="8.4" height="1" fill="url(#haz)"/>`).join('') + glow(`<circle cx="${f1(s[0] - 7.6)}" cy="${f1(s[1] + 4.5)}" r=".7" fill="hsl(0,100%,58%)"/>`);
    if (o.pack === 'tank') return `<rect class="hb" x="${f1(s[0] - 11)}" y="${f1(s[1] - 3)}" width="7" height="21" rx="3.4"/><rect class="p" x="${f1(s[0] - 11)}" y="${f1(s[1] + 4)}" width="7" height="2.4"/>`;
    if (o.pack) return `<path class="hb" d="${poly([add(s, -9.5, -2), add(s, 1, -4), add(hb, 0, -7), add(hb, -10, -4)])}"/><path class="l" d="M${pt(add(s, -8, 4))}L${pt(add(s, -1, 3))}M${pt(add(s, -8, 7))}L${pt(add(s, -1, 6))}"/>` + `<rect x="${f1(s[0] - 8)}" y="${f1(s[1] + 10)}" width="2" height=".8" fill="${vis}"/>`;
    return `<path class="hb" d="${poly([add(s, -7, -1), add(s, 0, -3), add(lerp(s, hb, 0.6), 0, 0), add(lerp(s, hb, 0.6), -7.5, 0)])}"/><rect x="${f1(s[0] - 6)}" y="${f1(s[1] + 3)}" width="1.6" height=".7" fill="${vis}"/>`;
  };

  const cape = o.cape ? `<path class="cl" d="M${f1(J.sb[0] - 2)} ${f1(J.sb[1] - 2)} Q${f1(J.pel[0] - 18)} ${f1(J.pel[1] + 8)} ${f1(J.fb[0] - 10)} 101 L${f1(J.ff[0] - 6)} 101 Q${f1(J.pel[0] + 2)} ${f1(J.pel[1] + 6)} ${f1(J.sf[0])} ${f1(J.sf[1])}Z"/><path class="l" d="M${f1(J.sb[0] - 4)} ${f1(J.sb[1] + 6)} Q${f1(J.pel[0] - 14)} ${f1(J.pel[1] + 12)} ${f1(J.fb[0] - 4)} 100"/>` : '';
  const sh = () => {
    const F = J.fore;
    let m = glow(`<path d="${poly([[F[0] - 2, F[1] - 40], [F[0] + 16, F[1] - 42], [F[0] + 16, F[1] - 22], [F[0] - 4, F[1] - 20]])}" fill="${EM()}" fill-opacity=".14" stroke="${EM(10)}" stroke-width=".5"/><path d="M${f1(F[0] - 3)} ${f1(F[1] - 30)}L${f1(F[0] + 16)} ${f1(F[1] - 32)}" stroke="${EM()}" stroke-width=".2" opacity=".6"/>`, 0.7);
    m += `<path class="h" d="${poly([[F[0] - 6, F[1] - 22], [F[0] + 14, F[1] - 24], [F[0] + 16, F[1] + 34], [F[0] - 4, F[1] + 38]])}"/><path class="hb" d="${poly([[F[0] - 6, F[1] - 22], [F[0] - 3, F[1] - 22.3], [F[0] - 1, F[1] + 37.6], [F[0] - 4, F[1] + 38]])}"/>`;
    m += `<path class="l" d="M${f1(F[0] - 5)} ${f1(F[1] - 4)}L${f1(F[0] + 15)} ${f1(F[1] - 6)}M${f1(F[0] - 4)} ${f1(F[1] + 14)}L${f1(F[0] + 15.5)} ${f1(F[1] + 12)}"/><path d="${poly([[F[0] - 4, F[1] + 26], [F[0] + 15.6, F[1] + 24], [F[0] + 15.8, F[1] + 30], [F[0] - 3.6, F[1] + 32]])}" fill="url(#haz)" opacity=".5"/>`;
    m += `<rect class="d" x="${f1(F[0] + 1)}" y="${f1(F[1] - 19)}" width="10" height="2.4"/>` + glow(`<path d="M${f1(F[0] + 1.5)} ${f1(F[1] - 17.8)}h9" stroke="${vis}" stroke-width=".8"/>`);
    return m;
  };

  let g = back() + cape;
  g += leg(J.hb, J.kb, J.fb, 'hb');
  g += pauld(J.sb, 'hb', false);
  g += arm(J.sb, J.eb, J.wb, 'hb');
  g += torso();
  g += leg(J.hf, J.kf, J.ff, 'h');
  g += helmet();
  if (o.weapon !== 'none' && !o.shield) g += weapon();
  g += arm(J.sf, J.ef, J.wf, 'h') + pauld(J.sf, 'h', true);
  if (o.shield) g += weapon() + sh();
  return g;
}

function infantryScene(r, h, o) {
  const vh = VIS_HUE[o.visor] ?? IP.emis[0];
  const defs = `<style>.g{fill:url(#vzi)}</style><defs><linearGradient id="vzi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${vh},40%,58%)"/><stop offset=".22" stop-color="hsl(${vh},50%,18%)"/><stop offset=".75" stop-color="hsl(${vh},70%,6%)"/><stop offset="1" stop-color="hsl(${vh},80%,24%)"/></linearGradient></defs>`;
  const ground = `<ellipse cx="80" cy="99" rx="30" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/>`;
  if (!o.squad) return defs + ground + `<g transform="translate(80 102) scale(1.16) translate(-80 -102)">${infantry(r, h, o)}</g>`;
  // a fire team: two further back in haze, one in front
  const back1 = infantry(r, h, Object.assign({}, o, { pose: 'run' })), back2 = infantry(r, h, Object.assign({}, o, { pose: 'kneel' }));
  return defs + `<g transform="translate(-32 14) scale(.8)" opacity=".7" filter="url(#hz)">${back1}</g><g transform="translate(50 18) scale(.76)" opacity=".75" filter="url(#hz)">${back2}</g>` + ground + `<g transform="translate(80 102) scale(1.08) translate(-80 -102)">${infantry(r, h, Object.assign({}, o, { pose: 'aim' }))}</g>`;
}

// ---------------------------------------------------------------- creature, drone, officer and mech families
// a smooth tapered tube along a polyline (bodies, tails)
function tube(pts, w0, w1, cls) {
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = w0 + (w1 - w0) * (i / (pts.length - 1));
    L.push([p[0] - dy / len * w, p[1] + dx / len * w]); R.push([p[0] + dy / len * w, p[1] - dx / len * w]);
  });
  return `<path class="${cls || 'o'}" d="${poly(L.concat(R.reverse()))}"/>`;
}
const oleg = (a, b, c, w) => limb3(a, b, c, w, w * 0.75, w * 0.35, 'o') + `<circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="${f1(w * 0.3)}" fill="${EM()}" opacity=".4"/>`;
const spike = (base, tip, w) => `<path class="o" d="${poly([[base[0] - w, base[1]], tip, [base[0] + w, base[1]]])}"/>`;
const eyesAt = (pts, col) => glow(pts.map(([x, y, rad]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad || 1.1)}" fill="${col}"/>`).join(''));
const plates = (cx, cy, rx, ry, n) => Array.from({ length: n }, (_, k) => { const x = cx - rx + (k + 0.5) * (2 * rx / n); return `<path d="M${f1(x - 2)} ${f1(cy - ry * 0.95)} Q${f1(x + 3)} ${f1(cy)} ${f1(x - 1)} ${f1(cy + ry * 0.9)}" stroke="#000" stroke-opacity=".6" stroke-width=".7" fill="none"/><path d="M${f1(x - 1.2)} ${f1(cy - ry * 0.9)} Q${f1(x + 3.6)} ${f1(cy - ry * 0.1)} ${f1(x + 0.4)} ${f1(cy + ry * 0.7)}" stroke="${ch(IP.arm, 25)}" stroke-opacity=".45" stroke-width=".4" fill="none"/>`; }).join('');
// wet sheen highlight along a curve, and bioluminescent spots
const sheen = d => `<path d="${d}" stroke="#f4ffe8" stroke-opacity=".55" stroke-width=".55" fill="none" stroke-linecap="round"/>`;
const bio = pts => glow(pts.map(([x, y, s]) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s || 1.2)}" ry="${f1((s || 1.2) * 0.7)}" fill="${EM(8)}"/>`).join(''), 0.85);

const BUGS = {
  runner(r, h, eye) { // lean pack hunter with back blades
    let m = oleg([92, 66], [104, 74], [110, 96], 2.6) + oleg([80, 68], [70, 80], [62, 96], 2.6);
    m += `<path class="o" d="M48 62 Q60 52 84 56 Q106 58 118 66 Q104 74 84 72 Q64 72 48 66Z"/>` + plates(86, 63, 22, 7, 5);
    m += `<path class="o" d="${poly([[52, 58], [34, 60], [26, 66], [36, 70], [52, 68]])}"/><path d="M28 66 Q22 72 30 76M34 69 Q32 76 40 77" stroke="hsl(60,25%,80%)" stroke-opacity=".85" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    m += `<path class="o" d="M76 56 Q70 30 52 18 Q66 30 70 56Z"/><path class="o" d="M90 57 Q90 34 76 22 Q86 36 84 57Z"/>`;
    m += sheen('M56 58 Q72 53 96 57') + bio([[100, 66, 1.4], [88, 68], [72, 67, 0.9]]);
    m += oleg([94, 66], [100, 76], [96, 97], 3) + oleg([72, 66], [62, 76], [56, 97], 3) + eyesAt([[38, 62], [42, 61, 0.9]], eye);
    return m;
  },
  serpent(r, h, eye) { // upright hooded serpent with blade arms
    const spine = [[128, 97], [112, 95], [100, 88], [93, 76], [90, 62], [88, 50], [85, 40]];
    let m = tube(spine, 3, 9, 'o');
    for (let k = 1; k < spine.length - 1; k++) m += `<path d="M${f1(spine[k][0] - 7)} ${f1(spine[k][1] + 2)} Q${f1(spine[k][0])} ${f1(spine[k][1] - 3)} ${f1(spine[k][0] + 7)} ${f1(spine[k][1] + 1)}" stroke="#000" stroke-opacity=".55" stroke-width=".7" fill="none"/>`;
    m += sheen('M96 86 Q90 74 88 56') + bio([[95, 80, 1.2], [91, 66, 1.1], [104, 91]]);
    m += `<path class="o" d="${poly([[85, 44], [66, 34], [62, 20], [70, 10], [84, 6], [98, 10], [106, 22], [100, 36]])}"/>` + plates(84, 22, 16, 12, 5);
    m += `<path class="o" d="${poly([[80, 32], [62, 34], [56, 40], [66, 45], [84, 42]])}"/>` + eyesAt([[66, 37], [70, 36, 0.9], [73, 37.5, 0.7]], eye);
    m += `<path d="M58 40 Q52 44 56 48" stroke="hsl(60,25%,80%)" stroke-opacity=".85" stroke-width="1.3" fill="none"/>`;
    m += oleg([90, 56], [72, 60], [58, 44], 2.8) + `<path class="o" d="${poly([[58, 44], [44, 22], [48, 21], [62, 42]])}"/>`;
    m += oleg([94, 62], [110, 62], [124, 46], 2.6) + `<path class="o" d="${poly([[124, 46], [136, 26], [139, 28], [127, 48]])}"/>`;
    return m;
  },
  scorpion(r, h, eye, o) { // low body, pincers forward, tail arched over
    let m = '';
    for (let k = 0; k < 4; k++) m += oleg([76 + k * 9, 72], [70 + k * 11, 62], [62 + k * 13, 96], 2);
    m += `<ellipse class="o" cx="90" cy="74" rx="24" ry="9"/>` + plates(90, 74, 24, 9, 6) + sheen('M72 69 Q90 63 108 68');
    m += `<path class="o" d="${poly([[68, 70], [56, 70], [50, 76], [58, 80], [70, 79]])}"/>` + eyesAt([[60, 73], [63, 72, 0.8]], eye);
    m += oleg([62, 76], [44, 70], [36, 78], 2.4) + `<path class="o" d="M36 78 Q24 70 30 64 Q34 72 40 74 Q30 80 36 78Z"/>`;
    m += tube([[112, 72], [126, 66], [133, 52], [132, 36], [124, 22], [110, 18]], 5, 2.2, 'o') + bio([[128, 60, 1.3], [132, 46, 1.2], [128, 32, 1]]);
    m += glow(`<path d="${poly([[108, 18], [100, 26], [112, 23]])}" fill="${eye}"/>`) + (o.spit ? glow(`<circle cx="44" cy="62" r="2.4" fill="${eye}"/><circle cx="36" cy="58" r="1.4" fill="${eye}"/><circle cx="30" cy="55" r=".9" fill="${eye}"/>`) : '');
    return m;
  },
  bloat(r, h, eye) { // swollen acid sac
    let m = oleg([70, 76], [60, 84], [56, 97], 2.6) + oleg([96, 78], [106, 86], [110, 97], 2.6);
    m += `<ellipse class="o" cx="96" cy="58" rx="26" ry="22"/>` + glow(`<ellipse cx="98" cy="58" rx="17" ry="14" fill="${EM(-8)}" opacity=".55"/>`, 0.85);
    m += `<path d="M78 46 Q96 36 116 48M76 62 Q96 52 120 62M80 74 Q98 68 116 74" stroke="#000" stroke-opacity=".7" stroke-width="1.1" fill="none"/>` + sheen('M80 44 Q94 36 108 40');
    m += `<ellipse class="o" cx="66" cy="70" rx="12" ry="9"/><path class="o" d="${poly([[58, 64], [42, 58], [40, 64], [54, 72]])}"/>` + eyesAt([[60, 67], [63, 66, 0.8]], eye);
    m += glow(`<circle cx="38" cy="58" r="2.6" fill="${eye}"/><circle cx="30" cy="54" r="1.6" fill="${eye}"/><circle cx="24" cy="52" r="1" fill="${eye}"/>`);
    m += oleg([74, 76], [70, 86], [72, 97], 3) + oleg([108, 76], [118, 84], [122, 97], 3);
    return m;
  },
  beetle(r, h, eye) { // armored tank with a front shield plate
    let m = '';
    for (let k = 0; k < 3; k++) m += oleg([74 + k * 14, 80], [66 + k * 16, 86], [60 + k * 18, 98], 3);
    m += `<path class="o" d="M40 82 Q44 40 92 36 Q132 38 134 82Z"/>` + plates(88, 60, 44, 22, 6);
    m += sheen('M52 54 Q88 32 124 54') + sheen('M60 62 Q90 46 118 60') + bio([[70, 76, 1.4], [92, 78, 1.6], [114, 76, 1.4]]);
    m += `<path class="o" d="${poly([[44, 52], [32, 56], [28, 84], [44, 88], [50, 70]])}"/><path class="o" d="${poly([[38, 54], [28, 30], [44, 50]])}"/>`;
    m += eyesAt([[36, 70], [36, 75, 0.9]], eye);
    return m;
  },
  raptor(r, h, eye) { // bipedal ripper with raised scythes
    let m = limb3([96, 62], [108, 76], [100, 97], 5, 3.6, 2, 'o') + limb3([86, 62], [80, 78], [90, 97], 6, 4.2, 2.2, 'o');
    m += `<path class="o" d="M60 52 Q74 40 96 50 Q116 56 140 52 Q118 66 96 66 Q72 64 60 58Z"/>` + plates(98, 56, 20, 6, 4) + sheen('M66 50 Q80 43 98 50 Q116 55 132 53');
    m += `<path class="o" d="${poly([[64, 50], [44, 46], [36, 52], [48, 58], [64, 58]])}"/>` + eyesAt([[44, 50], [48, 49, 0.8]], eye);
    m += `<path d="M38 54 Q30 58 34 64" stroke="hsl(60,25%,80%)" stroke-opacity=".85" stroke-width="1.4" fill="none"/>` + bio([[104, 60, 1.2], [118, 58], [90, 60, 0.9]]);
    m += limb3([70, 54], [62, 38], [70, 22], 2.6, 2.2, 1, 'o') + `<path class="o" d="${poly([[70, 22], [52, 6], [62, 4], [74, 20]])}"/>`;
    m += limb3([78, 56], [74, 42], [84, 30], 2.4, 2, 1, 'o') + `<path class="o" d="${poly([[84, 30], [74, 14], [82, 13], [88, 28]])}"/>`;
    return m;
  },
  spider(r, h, eye) { // broodmother with egg sacs
    let m = '';
    for (let k = 0; k < 4; k++) { const a = 0.2 + k * 0.32; m += oleg([80, 62], [80 - Math.cos(a) * 30, 40 + k * 4], [80 - Math.cos(a) * 46, 96], 2.4) + oleg([84, 62], [84 + Math.cos(a) * 30, 40 + k * 4], [84 + Math.cos(a) * 46, 96], 2.4); }
    m += `<ellipse class="o" cx="88" cy="58" rx="20" ry="16"/>` + plates(88, 58, 20, 16, 5) + sheen('M74 50 Q88 42 102 50');
    m += `<ellipse class="o" cx="64" cy="62" rx="10" ry="8"/>` + eyesAt([[58, 59, 1.2], [61, 57, 1], [64, 58, 0.8], [58, 63, 0.7]], eye);
    m += [[80, 82], [92, 84], [104, 80]].map(([x, y]) => `<ellipse class="o" cx="${x}" cy="${y}" rx="6" ry="7"/>` + glow(`<ellipse cx="${x}" cy="${y + 1}" rx="3" ry="4" fill="${EM(-4)}" opacity=".75"/>`, 0.8)).join('');
    return m;
  },
  mantis(r, h, eye) { // tall reaper with scythe forelegs
    let m = oleg([92, 70], [104, 80], [110, 97], 2.4) + oleg([86, 70], [78, 82], [72, 97], 2.4);
    m += `<path class="o" d="M90 70 Q120 68 136 84 Q118 82 92 78Z"/>` + plates(112, 77, 20, 5, 5) + bio([[106, 76, 1.3], [118, 78, 1.2], [128, 81, 1]]);
    m += `<path class="o" d="M80 74 Q76 50 82 30 Q90 50 94 74Z"/>` + sheen('M82 66 Q80 50 83 36');
    m += `<path class="o" d="${poly([[74, 24], [92, 22], [84, 36]])}"/>` + eyesAt([[77, 26, 1.4], [89, 25, 1.4]], eye);
    m += limb3([82, 40], [64, 36], [56, 18], 3, 2.4, 1.4, 'o') + `<path class="o" d="${poly([[56, 18], [36, 30], [40, 34], [58, 24]])}"/>`;
    m += limb3([88, 42], [106, 36], [114, 16], 3, 2.4, 1.4, 'o') + `<path class="o" d="${poly([[114, 16], [132, 30], [128, 34], [112, 22]])}"/>`;
    return m;
  },
  queen(r, h, eye) { // towering queen with crest and long abdomen
    let m = '';
    m += `<path class="o" d="M96 70 Q128 62 144 80 Q140 96 112 96 Q96 92 90 80Z"/>` + plates(118, 80, 24, 12, 6);
    m += glow(`<ellipse cx="120" cy="84" rx="13" ry="7" fill="${EM(-10)}" opacity=".6"/>`, 0.7) + sheen('M100 72 Q122 64 140 78');
    for (let k = 0; k < 3; k++) m += oleg([96, 76], [92 - k * 10, 82], [84 - k * 14, 97], 2.4);
    m += `<path class="o" d="M80 78 Q70 50 78 30 Q92 44 98 78Z"/>` + plates(86, 54, 8, 20, 3) + bio([[84, 62, 1.2], [86, 50, 1], [88, 72, 1.1]]);
    m += `<path class="o" d="${poly([[66, 30], [56, 4], [66, 20], [70, 0], [76, 18], [84, 2], [86, 22], [94, 8], [92, 32]])}"/>` + glow(`<circle cx="70" cy="1" r=".9" fill="${EM(10)}"/><circle cx="84" cy="3" r=".9" fill="${EM(10)}"/><circle cx="56" cy="5" r=".8" fill="${EM(10)}"/><circle cx="94" cy="9" r=".8" fill="${EM(10)}"/>`);
    m += `<path class="o" d="${poly([[70, 28], [56, 32], [50, 40], [62, 44], [80, 40]])}"/>` + eyesAt([[58, 36, 1.3], [62, 34.5, 1], [66, 35.5, 0.8]], eye);
    m += limb3([80, 44], [62, 50], [50, 64], 2.6, 2, 1.2, 'o') + limb3([88, 46], [104, 50], [112, 66], 2.6, 2, 1.2, 'o');
    return m;
  },
};

const DRONES = {
  disc(r, h, o, eye) { // flat recon drone with ducted fans and a sensor turret
    let m = `<ellipse cx="80" cy="70" rx="30" ry="4" fill="${eye}" opacity=".3" filter="url(#bl)"/>`;
    for (const x of [52, 108]) m += `<ellipse class="h" cx="${x}" cy="50" rx="13" ry="5"/><ellipse class="d" cx="${x}" cy="49.4" rx="10" ry="3.2"/><ellipse cx="${x}" cy="49.4" rx="9" ry="2.6" fill="${ch(IP.arm)}" opacity=".12"/><ellipse cx="${x}" cy="51" rx="12" ry="4" fill="none" stroke="${eye}" stroke-width=".3" opacity=".7"/>`;
    m += `<path class="h" d="${poly([[62, 45], [98, 45], [105, 52], [96, 59], [64, 59], [55, 52]])}"/><path class="hb" d="${poly([[56, 52], [104, 52], [96, 59], [64, 59]])}"/><path class="l" d="M70 45V59M90 45V59"/><path class="s" d="M58 52H102"/>`;
    m += `<rect class="d" x="76" y="58" width="8" height="4"/><circle class="h" cx="80" cy="65.5" r="4.6"/><circle class="d" cx="81" cy="66" r="2.4"/>` + glow(`<circle cx="81" cy="66" r="1.2" fill="${eye}"/><rect x="66" y="48.6" width="6" height=".9" fill="${eye}"/><rect x="88" y="48.6" width="6" height=".9" fill="${eye}"/>`);
    m += `<path d="M94 45 L100 31" stroke="${ch(IP.arm, -10)}" stroke-width=".5"/>` + glow(`<circle cx="100" cy="31" r=".8" fill="hsl(0,100%,60%)"/>`);
    if (o.shield) m += shieldBubble(80, 54, 48, 26);
    return m;
  },
  gunship(r, h, o, eye) {
    let m = `<path class="h" d="${poly([[44, 52], [74, 44], [116, 46], [128, 52], [116, 58], [74, 60]])}"/><path class="hb" d="${poly([[44, 52], [128, 52], [116, 58], [74, 60]])}"/><path class="l" d="M74 44V60M98 45V59"/><path class="s" d="M60 52H120"/>`;
    m += `<path class="h" d="${poly([[78, 46], [64, 26], [72, 24], [92, 46]])}"/><path class="hb" d="${poly([[78, 58], [64, 78], [72, 80], [92, 58]])}"/>`;
    m += `<rect class="h" x="56" y="19" width="20" height="9" rx="3"/><rect class="hb" x="56" y="76" width="20" height="9" rx="3"/>`;
    m += glow(`<ellipse cx="46" cy="23.5" rx="10" ry="2.6" fill="url(#pm)"/><ellipse cx="46" cy="80.5" rx="10" ry="2.6" fill="url(#pm)"/>`, 0.9);
    const barrels = o.gun > 1 ? [-2, 0, 2] : [0];
    m += `<rect class="d" x="104" y="58" width="12" height="7"/>` + barrels.map(dy => `<path d="M116 ${61.5 + dy}H${o.gun > 1 ? 140 : 132}" stroke="${ch(IP.arm1, -6)}" stroke-width="1.2"/>`).join('');
    if (o.gun > 1) m += glow(`<circle cx="141" cy="61.5" r="2" fill="hsl(36,100%,62%)"/>`);
    m += glow(`<path d="${poly([[108, 47.5], [123, 49], [122, 51.5], [108, 50.5]])}" fill="${eye}"/>`);
    return `<g transform="rotate(-8 80 52)">${m}</g>`;
  },
  sphere(r, h, o, eye) {
    const R = o.small ? 10 : 15;
    let m = `<circle class="h" cx="80" cy="52" r="${R}"/><path d="M${f1(80 - R * 0.75)} ${f1(52 - R * 0.62)} L${f1(80 + R * 0.62)} ${f1(52 + R * 0.75)}" stroke="url(#haz)" stroke-width="3" fill="none"/><path class="l" d="M${80 - R} 52H${80 + R}"/><path class="s" d="M${f1(80 - R * 0.9)} 54 Q80 ${f1(52 + R * 0.5)} ${f1(80 + R * 0.9)} 54" fill="none"/>`;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - 0.3; m += `<path class="h" d="${poly([[80 + Math.cos(a) * R - Math.sin(a) * 1.6, 52 + Math.sin(a) * R + Math.cos(a) * 1.6], [80 + Math.cos(a) * (R + 7), 52 + Math.sin(a) * (R + 7)], [80 + Math.cos(a) * R + Math.sin(a) * 1.6, 52 + Math.sin(a) * R - Math.cos(a) * 1.6]])}"/>`; }
    m += `<circle class="d" cx="${f1(80 + R * 0.5)}" cy="${f1(52 - R * 0.35)}" r="${f1(R * 0.28)}"/>` + glow(`<circle cx="${f1(80 + R * 0.5)}" cy="${f1(52 - R * 0.35)}" r="${f1(R * 0.14)}" fill="${eye}"/>`);
    if (o.shield) m += shieldBubble(80, 52, R + 14, R + 14);
    return m + `<ellipse cx="80" cy="96" rx="20" ry="2" fill="#000" opacity=".5" filter="url(#bl)"/>`;
  },
  probe(r, h, o, eye) {
    let m = `<rect class="h" x="74" y="34" width="12" height="40" rx="2"/><path class="l" d="M74 46h12M74 60h12"/><path class="s" d="M80 36V72"/>`;
    m += [[44, 40], [92, 40]].map(([x, y]) => `<rect x="${x}" y="${y}" width="24" height="14" fill="hsl(232,45%,16%)" stroke="${ch(IP.arm, -10)}" stroke-width=".5"/><path d="M${x + 8} ${y}v14M${x + 16} ${y}v14M${x} ${y + 7}h24" stroke="#000" stroke-opacity=".6" stroke-width=".4"/><path d="M${x} ${y}l24 14" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`).join('');
    m += `<path d="M68 47h6M86 47h6" stroke="${ch(IP.arm1)}" stroke-width="1.4"/><ellipse class="h" cx="80" cy="28" rx="11" ry="4"/><path d="M80 28V16" stroke="${ch(IP.arm)}" stroke-width=".6"/>`;
    return m + glow(`<circle cx="80" cy="16" r="1" fill="hsl(0,100%,60%)"/><circle cx="80" cy="66" r="2.4" fill="${eye}"/>`);
  },
};
// translucent hex-patterned energy shell
const shieldBubble = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#hex)" opacity=".5"/>` + glow(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${EM()}" fill-opacity=".07" stroke="${EM(14)}" stroke-width=".7"/>`, 0.75);

const SKIN = [[28, 40, 66], [25, 38, 50], [22, 40, 36], [20, 36, 24]];
function officer(r, h, o) {
  const tone = o.skin != null ? o.skin : Math.floor(r() * 4), sk = SKIN[tone];
  const S = dl => ch(sk, dl + (tone === 3 ? 14 : tone === 2 ? 6 : 0));
  const old = o.old ? 1 : 0;
  let m = `<defs><linearGradient id="fk" x1="0" y1="0" x2="1" y2=".15"><stop offset="0" stop-color="${S(8)}"/><stop offset=".36" stop-color="${S(2)}"/><stop offset=".5" stop-color="${S(-10)}"/><stop offset=".6" stop-color="${S(-28)}"/><stop offset="1" stop-color="${ch([sk[0], 30, 3])}"/></linearGradient></defs>`;
  // body: armored uniform jacket, broad shoulders, the far shoulder in shadow
  m += `<path class="hb" d="M20 101 C24 86 36 77 54 73 L68 68 L92 68 L106 73 C124 77 136 86 140 101Z"/>`;
  if (o.coat) m += `<path class="cl" d="M18 101 C22 84 34 76 52 72 L62 66 L70 78 L66 101Z"/><path class="cl" d="M142 101 C138 84 126 76 108 72 L98 66 L90 78 L94 101Z"/>`;
  m += `<path class="h" d="M28 96 C30 82 40 75 56 72 L64 79 C50 82 42 88 38 101 L28 101Z"/><path class="hb" d="M132 96 C130 82 120 75 104 72 L96 79 C110 82 118 88 122 101 L132 101Z"/>`;
  m += `<path class="h" d="M58 76 L70 70 L80 86 L90 70 L102 76 L106 101 L54 101Z"/><path class="l" d="M80 86V101M62 90H98"/>`;
  m += `<path class="s" d="M60 82 L72 79M100 82 L88 79"/>`;
  if (o.boards) m += [[44, 78], [104, 78]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="4" fill="hsl(40,55%,34%)" stroke="#000" stroke-width=".3"/>` + glow(`<rect x="${x + 1}" y="${y + 1.4}" width="10" height=".8" fill="hsl(42,95%,62%)"/>`, 0.7)).join('');
  if (o.medals) m += [0, 1, 2].map(k => `<rect x="${60 + k * 5}" y="88" width="4" height="2.4" fill="hsl(${[0, 210, 45][k]},65%,45%)"/>`).join('');
  if (o.straps) m += `<path d="M58 74 L86 101M102 74 L76 101" stroke="hsl(25,30%,14%)" stroke-width="3.2"/><path d="M58 74 L86 101" stroke="url(#haz)" stroke-width="1.2" opacity=".6"/>`;
  m += `<path class="hb" d="${poly([[66, 64], [72, 62], [80, 78], [74, 81], [62, 72]])}"/><path class="hb" d="${poly([[94, 64], [88, 62], [80, 78], [86, 81], [98, 72]])}"/>`;
  // neck and head
  m += `<path d="M72 52 L88 52 L89 70 L80 77 L71 70Z" fill="url(#fk)"/><ellipse cx="81" cy="63" rx="9" ry="4" fill="#000" opacity=".5" filter="url(#hz)"/>`;
  m += `<path d="M67 44 C66 30 72 25 80 25 C89 25 94 31 94 42 C94 50 92 56 88 61 C85 64.5 82 66 79.5 66 C76 66 72 63.5 70 60 C67.8 56 67 50 67 44Z" fill="url(#fk)"/>`;
  m += `<path d="M67.6 41 Q64.4 40.6 64.8 45.6 Q65.3 50 68.2 49.6Z" fill="${S(-4)}"/>`;
  m += `<ellipse cx="72.6" cy="50.5" rx="3.6" ry="2.2" fill="${S(16)}" opacity=".35" filter="url(#hz)"/>`;
  m += `<ellipse cx="75" cy="44.6" rx="3.8" ry="2.1" fill="#000" opacity=".3" filter="url(#hz)"/><ellipse cx="86.6" cy="44.6" rx="3.6" ry="2.1" fill="#000" opacity=".45" filter="url(#hz)"/>`;
  const brow = o.old ? 'hsl(30,6%,62%)' : 'hsl(20,25%,8%)';
  m += `<path d="M70.5 41.8 Q74.4 39.6 78.4 41.4M83.2 41.4 Q87 39.8 90.6 42" stroke="${brow}" stroke-opacity=".85" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  m += `<path d="M71.8 45 Q74.4 43.8 77 45 Q74.4 46.2 71.8 45ZM83.4 45 Q86 43.8 88.6 45 Q86 46.2 83.4 45Z" fill="#0b0807"/><circle cx="75" cy="44.8" r=".35" fill="#fff" opacity=".85"/><circle cx="86.4" cy="44.9" r=".3" fill="#fff" opacity=".4"/>`;
  m += `<path d="M79.8 45.4 L78.8 52" stroke="${S(14)}" stroke-opacity=".6" stroke-width=".5"/><path d="M81.4 46 L84 52.6 L81.2 53.6Z" fill="#000" opacity=".22"/><path d="M77.6 53.2 Q80.4 54.8 83.2 53.2" stroke="#000" stroke-opacity=".45" stroke-width=".7" fill="none"/>`;
  m += `<path d="M75.8 58.2 Q80 59.3 84.6 58" stroke="#000" stroke-opacity=".55" stroke-width=".75" fill="none"/><path d="M77.4 59.7 Q80 60.5 82.6 59.6" stroke="${S(12)}" stroke-opacity=".45" stroke-width=".5" fill="none"/>`;
  if (old) m += `<path d="M71 49 Q73 51 76 50M84 50 Q87 51 89 49M73 56 Q74 58 75.5 58.6" stroke="#000" stroke-opacity=".3" stroke-width=".5" fill="none"/>`;
  if (o.scar) m += `<path d="M86 37 L90 53" stroke="hsl(0,45%,72%)" stroke-opacity=".75" stroke-width=".7"/>`;
  if (o.beard) m += `<path d="M68 50 Q68 66 80 67 Q92 66 92 50 Q90 60 86 60 Q80 62 74 60 Q70 60 68 50Z" fill="${o.old ? 'hsl(30,8%,60%)' : 'hsl(25,20%,12%)'}"/>`;
  if (o.cyber) m += `<path d="${poly([[82, 41], [91, 41], [92, 48], [83, 48]])}" class="hb"/>` + glow(`<circle cx="86.5" cy="44.6" r="1.4" fill="hsl(0,100%,58%)"/>`);
  if (o.patch) m += `<path d="M82 42h8v6h-8z" fill="#050505"/><path d="M68 38L94 48" stroke="#050505" stroke-width=".7"/>`;
  if (o.bandana) m += `<path d="M66 50 Q80 56 94 50 L92 62 Q80 70 68 62Z" fill="hsl(${o.accent ?? 10},40%,26%)"/><path d="M68 54 Q80 58 92 54" stroke="#000" stroke-opacity=".4" stroke-width=".5" fill="none"/>`;
  // hair
  const hairCol = o.old ? 'hsl(30,6%,64%)' : `hsl(${[25, 20, 15, 30][tone]},22%,${[20, 13, 8, 6][tone]}%)`;
  const hair = o.hair || 'short';
  if (hair === 'short') m += `<path d="M66 42 Q64 23 80 22.6 Q96 23 94.4 42 Q92 31 82 30 Q72 31 68 42Z" fill="${hairCol}"/>`;
  if (hair === 'bun') m += `<path d="M66 44 Q64 22.5 80 22 Q96 22.5 94 44 Q92 30 80 29 Q70 30 66 44Z" fill="${hairCol}"/><ellipse cx="${o.cap ? 68 : 80}" cy="${o.cap ? 41 : 20}" rx="${o.cap ? 5 : 7}" ry="${o.cap ? 4.4 : 5}" fill="${hairCol}"/>`;
  if (hair === 'long') m += `<path d="M63 64 Q59 24 80 21.6 Q101 24 97 64 Q94 44 92 36 Q80 30 68 36 Q66 44 63 64Z" fill="${hairCol}"/>`;
  if (hair === 'none' && !o.hood && !o.hat) m += `<path d="M66.4 42 Q65 23.4 80 23 Q95 23.4 94 42 Q92 30 80 28.6 Q69 30 66.4 42Z" fill="${hairCol}" opacity=".45"/>`;
  if (hair === 'mohawk') m += `<path d="M76 30 Q78 14 84 12 Q86 20 85 31Z" fill="hsl(${o.accent ?? 10},70%,42%)"/>`;
  // headgear
  if (o.cap) m += `<path class="h" d="M65 36 Q80 21 96 35 L97 39 L64 39Z"/><path class="d" d="M62 38 L99 38 L95 42.5 L66 42.5Z"/><path d="M66 43 Q80 47 94 43 L94 47 Q80 50 66 47Z" fill="#000" opacity=".5"/>` + glow(`<rect x="78" y="30" width="4" height="2.2" fill="hsl(42,95%,62%)"/>`) + (o.braid ? `<path d="M64 39 L97 39" stroke="hsl(42,85%,55%)" stroke-width="1"/>` : '');
  if (o.hat) m += `<path class="d" d="M44 40 Q80 27 116 40 Q80 46 44 40Z"/><path class="hb" d="M66 38 Q70 19 80 18.6 Q90 19 94 38Z"/><path d="M66 42 Q80 46 94 42 L94 48 Q80 51 66 48Z" fill="#000" opacity=".55"/><path d="M67 36 Q80 33 93 36" stroke="${ch(IP.paint)}" stroke-width="1" fill="none"/>`;
  if (o.hood) m += `<path class="cl" d="M59 72 Q55 23 80 19 Q105 23 101 72 L94 56 Q94 33 80 30.6 Q66 33 66 56Z"/><path d="M66 56 Q66 34 80 31 Q72 40 70 62Z" fill="#000" opacity=".5"/>`;
  if (o.goggles) m += `<rect class="hb" x="67" y="${o.gogglesUp ? 29.5 : 41.6}" width="26" height="6.4" rx="2.8"/>` + glow(`<circle cx="74" cy="${o.gogglesUp ? 32.7 : 44.8}" r="2.3" fill="${ch(IP.emis)}"/><circle cx="86" cy="${o.gogglesUp ? 32.7 : 44.8}" r="2.3" fill="${ch(IP.emis)}"/>`);
  if (o.headset) m += `<path d="M64 46 Q62 29 80 25.6 Q98 29 96 46" stroke="${ch(IP.arm1, -10)}" stroke-width="1.6" fill="none"/><rect class="h" x="61" y="42" width="5" height="9" rx="2"/><path d="M64 50 Q70 60 76 59" stroke="${ch(IP.arm1, -10)}" stroke-width="1" fill="none"/>` + glow(`<path d="${poly([[82, 41.6], [95, 41], [95, 46.6], [82, 46.2]])}" fill="${EM()}" opacity=".45"/><path d="M83 43.4h11" stroke="${EM(14)}" stroke-width=".3"/>`, 0.8);
  if (o.helm) {
    m += `<path class="h" d="M63.5 54 C62 34 68 23 80 22.4 C92 23 98.5 34 96.8 54 L92 63 L84 67 L76 67 L68 63Z"/><path class="hb" d="M70 57 L80 66 L90 57 L92 63 L84 67.4 L76 67.4 L68 63Z"/><path class="l" d="M72 60 L80 64 L88 60"/>`;
    m += `<path class="g" d="M66.5 40 Q80 35 94 40 L93 48 Q80 52 67.2 48Z"/>` + glow(`<path d="M68.4 44.4 Q80 41.6 92 44.4" stroke="${EM(10)}" stroke-width=".8" fill="none"/>`) + `<path d="M68.6 40.8 Q78 37.4 88 39" stroke="#fff" stroke-opacity=".7" stroke-width=".45" fill="none"/>`;
    m += `<path class="k" d="M66 36 Q71 25 80 24.4"/><path class="p" d="M78.6 23 L81.4 23 L81.2 36 L78.8 36Z"/><circle cx="64.6" cy="49" r="2.4" class="hb"/><circle cx="64.6" cy="49" r=".6" fill="${EM()}"/>`;
  }
  return m;
}

const MECHS = {
  walker(r, h, o) { // reverse-jointed cockpit walker with missile pods
    let m = '';
    const leg = (x, cls) => limb3([x, 54], [x - 10, 70], [x + 4, 94], 5, 4, 3, cls) + `<circle class="d" cx="${x - 10}" cy="70" r="2.6"/><path class="${cls}" d="${poly([[x - 4, 94], [x + 12, 94], [x + 14, 99], [x - 6, 99]])}"/>` + bar([x - 7, 62], [x + 2, 86], 0.8, 0.8, 'd');
    m += leg(72, 'hb') + leg(92, 'h');
    m += `<path class="h" d="${poly([[52, 40], [96, 32], [116, 40], [112, 56], [62, 60], [50, 52]])}"/><path class="hb" d="${poly([[50, 50], [114, 47], [112, 56], [62, 60]])}"/><path class="l" d="M64 38V58M98 34V56"/><path class="s" d="M54 48 L110 45"/>`;
    m += `<path class="d" d="${poly([[98, 40], [114, 42], [112, 48], [98, 47]])}"/>` + glow(`<path d="${poly([[100, 42], [112, 43.4], [111, 46], [100, 45]])}" fill="${o.heavy ? 'hsl(0,100%,58%)' : EM(4)}"/>`);
    m += `<rect class="h" x="54" y="25" width="18" height="12" rx="1"/><path class="p" d="M54 25h18v2.4H54z"/>` + glow(Array.from({ length: 6 }, (_, k) => `<circle cx="${57 + (k % 3) * 6}" cy="${30 + Math.floor(k / 3) * 4.6}" r="1.1" fill="hsl(14,100%,58%)"/>`).join(''), 0.7);
    m += `<rect class="d" x="104" y="54" width="14" height="5"/><path d="M118 55.5h18M118 57.5h18" stroke="${ch(IP.arm1)}" stroke-width="1"/>`;
    if (o.coil) m += glow(`<path d="${line([[60, 25], [55, 13], [62, 17], [57, 2]])}" stroke="${EM(14)}" stroke-width=".9" fill="none"/><path d="${line([[66, 25], [72, 14], [68, 10], [76, 0]])}" stroke="${EM(14)}" stroke-width=".6" fill="none"/>`);
    return `<ellipse cx="82" cy="99" rx="34" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 99) scale(.86) translate(-84 -99)">${m}</g>`;
  },
};

// ---------------------------------------------------------------- psionic figure
function psionFigure(r, h, o) {
  const E = ch(IP.emis), E2 = ch(IP.emis, 16), pose = o.pose || 'stand', med = pose === 'meditate', hy = med ? 12 : 0;
  const ct = [(IP.arm1[0] + Math.round(rr(r, -34, 30)) + 360) % 360, IP.arm1[1] + 8, IP.arm1[2] + Math.round(rr(r, 0, 9))];
  let m = `<defs><linearGradient id="clp" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="${ch(ct, 20)}"/><stop offset=".45" stop-color="${ch(ct, 2)}"/><stop offset="1" stop-color="${ch(IP.dark)}"/></linearGradient></defs><style>.cl{fill:url(#clp)}</style>`;
  const halos = (o.halo || 0) + (o.herald ? 2 : 0) + (o.crown ? 1 : 0);
  // distortion aura behind the figure
  m += `<g filter="url(#aur)" opacity="${o.echo ? 0.6 : 0.8}"><path d="${med ? 'M46 96 Q46 58 80 40 Q114 58 114 96Z' : 'M50 101 Q48 46 80 14 Q112 46 110 101Z'}" fill="${E}"/></g>`;
  if (o.herald) for (let k = 0; k < 11; k++) { const a = -Math.PI * 0.98 + k / 10 * Math.PI * 0.96, L1 = rr(r, 36, 52); m += `<path d="${poly([[80 + Math.cos(a - 0.04) * 10, 34 + Math.sin(a - 0.04) * 10], [80 + Math.cos(a) * L1, 34 + Math.sin(a) * L1 * 0.95], [80 + Math.cos(a + 0.05) * 10, 34 + Math.sin(a + 0.05) * 10]])}" class="gs"/>`; }
  for (let k = 0; k < halos; k++) { const R = 16 + k * 9; m += glow(`<ellipse cx="80" cy="${30 + hy}" rx="${R}" ry="${f1(R * 0.34)}" fill="none" stroke="${E2}" stroke-width=".7" opacity="${f1(0.85 - k * 0.15)}" transform="rotate(${k % 2 ? 10 : -12} 80 ${30 + hy})"/>`, 0.8); }
  if (o.runes) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = 80 + Math.cos(a) * 38, y = 52 + Math.sin(a) * 14; m += glow(`<path d="M${f1(x - 1.4)} ${f1(y)}L${f1(x)} ${f1(y - 1.8)}L${f1(x + 1.4)} ${f1(y)}L${f1(x)} ${f1(y + 1.8)}Z" fill="none" stroke="${E2}" stroke-width=".4"/>`, 0.8); }
  if (pose === 'spread') m += `<path class="cl" d="M80 50 Q52 46 26 80 Q40 90 56 101 L104 101 Q120 90 134 80 Q108 46 80 50Z"/><path d="M80 52 Q54 50 30 80M80 52 Q106 50 130 80" stroke="${E}" stroke-opacity=".5" stroke-width=".5" fill="none"/>`;
  // robe
  if (med) m += `<path class="cl" d="M48 94 Q52 76 64 70 Q72 64 80 64 Q88 64 96 70 Q108 76 112 94 Q96 99 80 98 Q64 99 48 94Z"/><path class="l" d="M60 88 Q80 82 100 88M70 72 Q74 84 66 94M90 72 Q86 84 94 94"/><path class="s" d="M50 93.6 Q80 99 110 93.6" fill="none"/>`;
  else m += `<path class="cl" d="M55 101 L60 74 Q62 58 70 52 Q80 48 90 52 Q98 58 100 74 L105 101Z"/><path d="M76 60 L72 101 L88 101 L84 60Z" fill="#000" opacity=".35"/><path class="l" d="M66 70 Q64 86 62 101M94 70 Q96 86 98 101M70 64 Q80 70 90 64"/><path class="s" d="M76 62 L73 100M84 62 L87 100" fill="none"/>`;
  // armoured mantle, chest plate, sigil
  m += `<path class="h" d="M61 ${62 + hy} Q62 ${50 + hy} 74 ${48 + hy} L76 ${56 + hy} Q67 ${57 + hy} 63 ${66 + hy}Z"/><path class="hb" d="M99 ${62 + hy} Q98 ${50 + hy} 86 ${48 + hy} L84 ${56 + hy} Q93 ${57 + hy} 97 ${66 + hy}Z"/>`;
  m += `<path class="h" d="${poly([[72, 52 + hy], [88, 52 + hy], [86.5, 66 + hy], [80, 71 + hy], [73.5, 66 + hy]])}"/>` + glow(`<path d="${poly([[80, 56 + hy], [82.4, 60 + hy], [80, 64 + hy], [77.6, 60 + hy]])}" fill="${E2}"/>`);
  // head
  if (o.reveal) {
    m += `<path class="cl" d="M63 ${60 + hy} Q61 ${28 + hy} 80 ${24 + hy} Q99 ${28 + hy} 97 ${60 + hy} L91 ${52 + hy} Q91 ${36 + hy} 80 ${34 + hy} Q69 ${36 + hy} 69 ${52 + hy}Z"/>`;
    m += `<path d="M71 ${44 + hy} Q71 ${34 + hy} 80 ${33 + hy} Q89 ${34 + hy} 89 ${44 + hy} Q89 ${53 + hy} 80 ${56 + hy} Q71 ${53 + hy} 71 ${44 + hy}Z" fill="${ch([IP.arm[0], 14, 72])}"/><path d="M80 ${33.5 + hy} Q89 ${36 + hy} 89 ${45 + hy} Q87 ${54 + hy} 80 ${56 + hy} Q84 ${46 + hy} 80 ${33.5 + hy}Z" fill="#000" opacity=".5"/>`;
    m += glow(`<path d="M80 ${35.5 + hy}V${40 + hy}" stroke="${E2}" stroke-width=".7"/><rect x="74" y="${44 + hy}" width="3" height="1.1" fill="${E2}"/><rect x="83" y="${44 + hy}" width="3" height="1.1" fill="${E2}"/>`);
  } else {
    m += `<path class="cl" d="M63 ${61 + hy} Q61 ${27 + hy} 80 ${22 + hy} Q99 ${27 + hy} 97 ${61 + hy} L90 ${54 + hy} Q90 ${36 + hy} 80 ${34 + hy} Q70 ${36 + hy} 70 ${54 + hy}Z"/><path d="M70.5 ${56 + hy} Q70 ${37 + hy} 80 ${35 + hy} Q90 ${37 + hy} 89.5 ${56 + hy} Q80 ${60 + hy} 70.5 ${56 + hy}Z" fill="#030205"/>`;
    if (o.mask) m += `<path class="h" d="M73 ${39 + hy} Q80 ${35 + hy} 87 ${39 + hy} L86 ${51 + hy} Q80 ${55 + hy} 74 ${51 + hy}Z"/><path class="l" d="M80 ${37 + hy}V${53 + hy}"/>`;
    m += glow(`<rect x="74.6" y="${43 + hy}" width="3.4" height="1.2" fill="${E2}"/><rect x="82" y="${43 + hy}" width="3.4" height="1.2" fill="${E2}"/>`);
  }
  if (o.crown) m += `<path class="gs" d="${poly([[66, 32], [67, 14], [72, 27], [76, 6], [80, 25], [84, 6], [88, 27], [93, 14], [94, 32]])}"/>` + glow(`<circle cx="76" cy="7" r=".8" fill="${E2}"/><circle cx="84" cy="7" r=".8" fill="${E2}"/><circle cx="67" cy="15" r=".7" fill="${E2}"/><circle cx="93" cy="15" r=".7" fill="${E2}"/>`);
  if (o.tendrils) for (let k = 0; k < 6; k++) { const ex = 52 + k * 11; m += glow(`<path d="M80 ${30 + hy} Q${f1(ex + rr(r, -8, 8))} ${f1(14 + rr(r, -4, 4))} ${f1(ex)} ${f1(rr(r, -2, 8))}" stroke="${E2}" stroke-width=".7" fill="none" opacity=".8"/>`, 0.8); }
  // arms, hands and the energy they hold
  const sleeve = (a, b, c, cls) => limb3(a, b, c, 4.2, 3.6, 2.8, 'cl') + bar(lerp(b, c, 0.25), lerp(b, c, 0.95), 2.8, 2.4, cls || 'h');
  const orb = (x, y, s) => `<circle cx="${x}" cy="${y}" r="${f1(s * 3)}" fill="${E}" opacity=".5" filter="url(#aur)"/>` + glow(`<circle cx="${x}" cy="${y}" r="${f1(s)}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${f1(s * 1.8)}" fill="${E2}" opacity=".7"/>`);
  if (med) m += sleeve([66, 66], [62, 78], [76, 82]) + sleeve([94, 66], [98, 78], [84, 82], 'hb') + orb(80, 80, 2.2);
  else if (pose === 'raise') m += sleeve([68, 58], [56, 46], [52, 31]) + sleeve([92, 58], [104, 46], [108, 31], 'hb') + orb(52, 28, 2.2) + orb(108, 28, 2.2) + glow(`<path d="${line([[52, 28], [62, 22], [70, 27], [80, rr(r, 14, 20)], [90, 26], [98, 21], [108, 28]])}" stroke="${E2}" stroke-width=".7" fill="none"/>`);
  else if (pose === 'spread') m += sleeve([68, 58], [52, 60], [37, 56]) + sleeve([92, 58], [108, 60], [123, 56], 'hb') + orb(35, 55, 2.2) + orb(125, 55, 2.2);
  else m += sleeve([66, 58], [60, 70], [58, 78]) + sleeve([94, 58], [100, 70], [102, 78], 'hb') + orb(58, 80, 2) + orb(102, 80, 2);
  if (o.book) m += [[40, 40, -12], [108, 32, 10], [114, 60, 18]].map(([x, y, a]) => `<g transform="rotate(${a} ${x + 7} ${y + 5})"><rect x="${x}" y="${y}" width="14" height="10" fill="${E}" fill-opacity=".12" stroke="${E2}" stroke-width=".4"/>` + glow(`<path d="M${x + 2} ${y + 3}h10M${x + 2} ${y + 5.5}h7M${x + 2} ${y + 8}h8" stroke="${E2}" stroke-width=".45"/>`) + '</g>').join('');
  return m;
}

Object.assign(MECHS, {
  tripod(r, h, o) { // spider tripod with a sensor body slung high
    let m = '';
    const legs = [[80, 40, 40, 30, 30, 98], [80, 40, 120, 28, 132, 98], [80, 40, 86, 22, 92, 99]];
    legs.forEach(([x0, y0, kx, ky, fx, fy], k) => { m += limb3([x0, y0], [kx, ky], [fx, fy], 3.4, 2.8, 1.6, k === 2 ? 'hb' : 'h') + `<circle class="d" cx="${kx}" cy="${ky}" r="2.4"/><circle cx="${kx}" cy="${ky}" r=".7" fill="${EM()}"/>`; });
    m += `<path class="h" d="${poly([[58, 38], [80, 28], [104, 36], [100, 50], [62, 52]])}"/><path class="hb" d="${poly([[60, 45], [102, 43], [100, 50], [62, 52]])}"/><path class="l" d="M68 32V52M92 31V50"/><path class="s" d="M60 44 L102 42"/>`;
    m += glow(`<path d="${poly([[86, 37], [100, 38], [99, 42], [86, 41]])}" fill="${EM(6)}"/>`) + `<rect class="d" x="70" y="50" width="16" height="5"/><path d="M78 55v8M74 55v8M82 55v8" stroke="${ch(IP.arm1)}" stroke-width="1"/>`;
    if (o.shield) m += shieldBubble(80, 44, 36, 24);
    return `<ellipse cx="82" cy="99" rx="50" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/>` + m;
  },
  sleek(r, h, o) { // slender assassin frame, single eye, arm blades
    let m = limb3([74, 58], [68, 76], [72, 98], 3.4, 2.6, 2, 'hb') + limb3([86, 58], [94, 76], [90, 98], 3.6, 2.8, 2.2, 'h') + `<path class="s" d="M88 62 L93 76 L90 94" fill="none"/>`;
    m += `<path class="h" d="${poly([[70, 32], [90, 32], [94, 46], [86, 60], [74, 60], [66, 46]])}"/><path class="hb" d="${poly([[66, 46], [94, 46], [86, 60], [74, 60]])}"/><path class="l" d="M80 32V60"/><path class="s" d="M70 46H90"/>`;
    m += `<path class="h" d="${poly([[74, 17], [86, 17], [89, 27], [80, 32], [71, 27]])}"/>` + glow(`<circle cx="82" cy="23.6" r="1.9" fill="#eafcff"/><circle cx="82" cy="23.6" r="3.4" fill="${EM()}" opacity=".5"/>`);
    m += limb3([68, 36], [58, 50], [52, 66], 2.8, 2.2, 1.8, 'hb') + `<path class="h" d="${poly([[52, 66], [40, 92], [44, 92], [55, 67]])}"/>`;
    m += limb3([92, 36], [104, 44], [112, 34], 2.8, 2.2, 1.8, 'h') + `<path class="h" d="${poly([[112, 34], [134, 14], [136, 17], [114, 37]])}"/>` + glow(`<path d="M115 35L134 16" stroke="${EM(10)}" stroke-width=".6"/>`);
    if (o.shield) m += shieldBubble(80, 56, 38, 44);
    return `<ellipse cx="82" cy="99" rx="26" ry="3" fill="#000" opacity=".6" filter="url(#bl)"/>` + m;
  },
});

// ---------------------------------------------------------------- vehicles
function hullShip(r, o) {
  const sz = o.size || 1, small = sz < 1 && !o.hauler && !o.wreck;
  const L = 46 * sz * (small ? 0.8 : 1), n = rr(r, 12, 18) * (small ? 0.7 : 1), H = (o.hauler ? 1.15 : small ? 1.2 : 1) * rr(r, 8.6, 10);
  const nE = o.hauler || small ? 2 : 3;
  let plume = '';
  if (!o.wreck) for (let k = 0; k < nE; k++) { const ey = (k - (nE - 1) / 2) * H * 0.62 - H * 0.05; plume += `<ellipse cx="${f1(-L - 26)}" cy="${f1(ey)}" rx="24" ry="${f1(H * 0.24)}" fill="url(#pm)"/>`; }
  let m = glow(plume, 0.95);
  // fins behind hull
  m += `<path class="hb" d="${poly([[-L * 0.55, H * 0.6], [-L * 0.95, H * 2.1], [-L * 1.05, H * 2.1], [-L * 0.9, H * 0.6]])}"/>`;
  // side hull and dorsal deck: two planes give the hull volume
  m += `<path class="hb" d="M${f1(L + n)} 0.6 C${f1(L * 0.55)} ${f1(H * 0.5)} ${f1(-L * 0.1)} ${f1(H)} ${f1(-L * 0.7)} ${f1(H * 1.05)} L${f1(-L)} ${f1(H * 0.85)} L${f1(-L)} ${f1(-H * 0.2)} L${f1(L * 0.25)} ${f1(-H * 0.22)}Z"/>`;
  const dh = rr(r, 0.9, 1.5);
  m += `<path class="h" d="M${f1(L + n)} 0.6 L${f1(L * 0.25)} ${f1(-H * 0.22)} L${f1(-L)} ${f1(-H * 0.2)} L${f1(-L - 1)} ${f1(-H * 0.95 * dh)} L${f1(-L * 0.5)} ${f1(-H * 1.3 * dh)} C${f1(L * 0.1)} ${f1(-H * 1.2 * dh)} ${f1(L * 0.62)} ${f1(-H * 0.7)} ${f1(L + n)} 0.6Z"/>`;
  // engine block
  m += `<path class="h" d="${poly([[-L, -H * 0.95], [-L - 7, -H * 1.05], [-L - 7, H * 0.95], [-L, H * 0.85]])}"/>`;
  for (let k = 0; k < nE; k++) { const ey = (k - (nE - 1) / 2) * H * 0.62 - H * 0.05; m += `<ellipse cx="${f1(-L - 7.4)}" cy="${f1(ey)}" rx="1.4" ry="${f1(H * 0.26)}" class="d"/>` + (o.wreck ? '' : `<ellipse cx="${f1(-L - 7.6)}" cy="${f1(ey)}" rx=".9" ry="${f1(H * 0.2)}" fill="#e6f6ff"/>`); }
  // panel lines and hull plating
  let det = `<path class="l" d="M${f1(L * 0.9)} 1.6 Q${f1(0)} ${f1(H * 0.45)} ${f1(-L)} ${f1(H * 0.35)}M${f1(L * 0.6)} ${f1(-H * 0.5)} Q0 ${f1(-H * 0.85)} ${f1(-L)} ${f1(-H * 0.6)}"/>`;
  for (let x = -L + 6; x < L * 0.8; x += rr(r, 6, 11)) det += `<path class="l" d="M${f1(x)} ${f1(-H * 0.2)}V${f1(H * 0.8)}"/>`;
  for (let k = 0; k < 7; k++) { const x = rr(r, -L, L * 0.6), w = rr(r, 4, 12); det += `<rect x="${f1(x)}" y="${f1(rr(r, -H * 0.15, H * 0.4))}" width="${f1(w)}" height="${f1(rr(r, 1.5, 3.5))}" fill="${r() < 0.5 ? '#000' : '#fff'}" opacity=".08"/>`; }
  // faction paint band near the bow
  det += `<path d="${poly([[L * 0.35, -H * 0.2], [L * 0.55, -H * 0.18], [L * 0.38, H * 0.48], [L * 0.18, H * 0.58]])}" class="p"/>`;
  // superstructure
  const sx = -L * rr(r, 0.35, 0.55);
  det += `<path class="h" d="${poly([[sx - 8, -H * 1.2], [sx - 6, -H * 1.9], [sx + 6, -H * 2], [sx + 12, -H * 1.15]])}"/><path class="hb" d="${poly([[sx - 6, -H * 1.9], [sx + 6, -H * 2], [sx + 6.6, -H * 1.75], [sx - 5.6, -H * 1.66]])}"/>`;
  det += `<path class="${o.wreck ? 'hb' : 'h'}" d="${poly([[-L * 0.2, -H * 1.2], [-L * 0.75, -H * 2.6], [-L * 0.86, -H * 2.6], [-L * 0.7, -H * 1.1]])}"/>`;
  // turrets
  const nt = o.turrets || 1 + Math.floor(r() * 2);
  for (let t = 0; t < nt; t++) { const tx = rr(r, -L * 0.1, L * 0.65), ty = -H * (1.1 - (tx + L) / (2 * L) * 0.7); det += `<ellipse class="h" cx="${f1(tx)}" cy="${f1(ty)}" rx="2.6" ry="1.6"/><path d="M${f1(tx)} ${f1(ty - 0.4)}l${f1(rr(r, 8, 12))} -2.4M${f1(tx)} ${f1(ty + 0.4)}l${f1(rr(r, 8, 12))} -2" stroke="${ch(IP.arm1)}" stroke-width=".7"/>`; }
  if (o.hauler) for (let k = 0; k < 8; k++) { const x = -L * 0.8 + k * L * 0.2; det += `<rect x="${f1(x)}" y="${f1(H * 0.95)}" width="${f1(L * 0.18)}" height="${f1(H * 0.7)}" fill="hsl(${[28, 200, 8, 45, 160][k % 5]},${30 + (k * 7) % 20}%,${22 + (k * 5) % 12}%)" stroke="#000" stroke-width=".3"/><path d="M${f1(x + 1)} ${f1(H * 1.2)}h${f1(L * 0.14)}" stroke="#000" stroke-opacity=".5" stroke-width=".3"/>`; }
  // windows and running lights
  let win = '';
  for (let k = 0; k < 26; k++) if (r() < (o.wreck ? 0.25 : 0.8)) win += `<rect x="${f1(-L + 4 + k * (1.7 * L) / 26)}" y="${f1(H * 0.1 + k * 0.03)}" width=".8" height=".45"/>`;
  for (let k = 0; k < 6; k++) if (r() < 0.8) win += `<rect x="${f1(sx - 4 + k * 2)}" y="${f1(-H * 1.55)}" width="1.2" height=".5"/>`;
  det += `<g fill="hsl(42,90%,72%)" opacity=".9">${win}</g>`;
  det += glow(`<circle cx="${f1(L + n - 3)}" cy=".6" r=".8" fill="#fff"/><circle cx="${f1(-L * 0.98)}" cy="${f1(H * 2.1)}" r=".8" fill="hsl(0,100%,60%)"/><circle cx="${f1(-L * 0.8)}" cy="${f1(-H * 2.6)}" r=".8" fill="hsl(130,100%,60%)"/>`, 0.9);
  if (o.flag) det += glow(`<path d="M${f1(L * 0.9)} ${f1(-H * 0.05)} L${f1(-L * 0.95)} ${f1(-H * 0.75)}" stroke="${EM(10)}" stroke-width=".55"/>`, 0.9) + `<path class="p" d="${poly([[L * 0.1, -H * 0.9], [L * 0.32, -H * 0.66], [L * 0.28, -H * 0.55], [L * 0.05, -H * 0.8]])}"/>`;
  if (o.wreck) {
    det += `<path d="${line([[-6, -H * 1.2], [-1, -H * 0.2], [-8, H * 0.4], [-3, H * 1.1]])}" stroke="#000" stroke-width="3.4" fill="none"/>` + glow(`<path d="${line([[-6, -H * 1.2], [-1, -H * 0.2], [-8, H * 0.4], [-3, H * 1.1]])}" stroke="hsl(24,100%,58%)" stroke-width=".8" fill="none"/><circle cx="-2" cy="${f1(-H * 0.2)}" r="2.4" fill="hsl(30,100%,62%)"/>`);
    for (let k = 0; k < 12; k++) det += `<path d="${poly([[0, 0], [rr(r, 1, 3), rr(r, -1, 1)], [rr(r, 0, 2), rr(r, 1, 3)]])}" transform="translate(${f1(rr(r, -20, 20))} ${f1(rr(r, -H * 3, H * 3))}) rotate(${Math.round(rr(r, 0, 360))})" class="hb"/>`;
  }
  if (o.pods || (!o.hauler && !o.wreck && r() < 0.4)) { // engine sponsons on outriggers
    for (const sy of [H * 1.5]) det += `<path class="hb" d="${poly([[-L * 0.3, H * 0.7], [-L * 0.45, sy], [-L * 0.6, sy], [-L * 0.5, H * 0.7]])}"/>` + `<path class="h" d="M${f1(-L * 0.95)} ${f1(sy - 2.6)} L${f1(-L * 0.2)} ${f1(sy - 2)} Q${f1(-L * 0.12)} ${f1(sy)} ${f1(-L * 0.2)} ${f1(sy + 2)} L${f1(-L * 0.95)} ${f1(sy + 2.6)}Z"/><path class="s" d="M${f1(-L * 0.9)} ${f1(sy)}H${f1(-L * 0.25)}"/>` + glow(`<ellipse cx="${f1(-L * 0.95 - 14)}" cy="${f1(sy)}" rx="14" ry="2.2" fill="url(#pm)"/>`, 0.9);
  }
  if (sz >= 1.15) { const sx2 = L * rr(r, 0.05, 0.25); det += `<path class="h" d="${poly([[sx2 - 6, -H * 1.02], [sx2 - 4, -H * 1.5], [sx2 + 5, -H * 1.55], [sx2 + 9, -H * 0.95]])}"/><rect x="${f1(sx2 - 3)}" y="${f1(-H * 1.4)}" width="7" height=".5" fill="hsl(42,90%,72%)"/>`; for (let k = 0; k < 6; k++) det += `<rect class="hb" x="${f1(-L * 0.7 + k * L * 0.22)}" y="${f1(H * 0.62)}" width="3" height="1.6"/>`; }
  if (o.spinal) det += `<path class="w" d="${poly([[L * 0.6, -H * 0.1], [L + n + 14, 0], [L + n + 14, 1.6], [L * 0.6, H * 0.3]])}"/>` + glow([0, 1, 2, 3].map(k => `<ellipse cx="${f1(L + n - 2 + k * 4)}" cy=".8" rx=".7" ry="2" fill="${EM(10)}"/>`).join('') + `<circle cx="${f1(L + n + 15)}" cy=".8" r="1.8" fill="#fff"/>`);
  if (o.carrier) det += `<path class="d" d="${poly([[L * 0.5, H * 0.32], [-L * 0.75, H * 0.62], [-L * 0.75, H * 0.88], [L * 0.45, H * 0.5]])}"/>` + glow(Array.from({ length: 12 }, (_, k) => `<rect x="${f1(L * 0.4 - k * L * 0.095)}" y="${f1(H * 0.5 + k * 0.024 * H)}" width="1.6" height=".5" fill="${EM(10)}"/>`).join(''), 0.9);
  return m + det;
}

// ---------------------------------------------------------------- subjects
const SUBJ = {
  ship(r, h, o) {
    let esc = '';
    for (let k = 0; k < (o.flag ? 4 : 2); k++) { const x = rr(r, 10, 150), y = rr(r, 8, 40), s = rr(r, 0.12, 0.22); esc += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-14) scale(${f1(s)})" opacity=".55" filter="url(#hz)"><path d="M30 0 L-20 -4 L-26 -2 L-26 3 L-20 5Z" fill="${ch(IP.dark, 8)}"/><ellipse cx="-34" cy="0" rx="9" ry="2.4" fill="url(#pm)"/></g>`; }
    const flip = r() < 0.4;
    return esc + `<g transform="translate(${flip ? 76 : 84} 54) rotate(${f1((flip ? -1 : 1) * rr(r, -16, -9))}) scale(${flip ? '-' : ''}${f1(o.scale || 1.04)} ${f1(o.scale || 1.04)})">${hullShip(r, o)}</g>`;
  },

  fighter(r, h, o) {
    if (o.dropship) { // troop dropship descending on thrusters, bay open
      let m = glow(`<ellipse cx="-14" cy="18" rx="3" ry="12" fill="url(#pmv)"/><ellipse cx="14" cy="18" rx="3" ry="12" fill="url(#pmv)"/>`, 0.95);
      m += `<path class="hb" d="${poly([[-30, -4], [-18, -12], [-18, -5]])}"/>`;
      m += `<path class="h" d="${poly([[-28, -6], [16, -9], [30, -3], [27, 6], [-24, 8]])}"/><path class="hb" d="${poly([[-26, 1], [28, 0], [27, 6], [-24, 8]])}"/><path class="l" d="M-10 -8V8M6 -9V7"/><path class="s" d="M-24 0H24"/>`;
      m += `<path class="g" d="${poly([[18, -7.4], [28.6, -2.8], [26, -1], [17, -3.4]])}"/><path class="p" d="${poly([[-8, -8], [2, -8.6], [0, -5], [-8, -4.6]])}"/>`;
      m += `<rect class="hb" x="-19" y="2" width="9" height="7" rx="2"/><rect class="hb" x="9" y="2" width="9" height="7" rx="2"/>`;
      m += `<path class="d" d="${poly([[-8, 7.4], [6, 7], [8, 13], [-10, 13.4]])}"/>` + glow(`<path d="${poly([[-7, 8], [5, 7.6], [6.4, 12.4], [-8.4, 12.8]])}" fill="${ch(IP.light, 8)}" opacity=".6"/><circle cx="29" cy="-2" r=".7" fill="#fff"/><circle cx="-29" cy="-5" r=".7" fill="hsl(0,100%,60%)"/>`, 0.85);
      m += [[-4, 20], [3, 24], [-9, 27]].map(([x, y]) => `<path d="M${x} ${y}l1 -3.6l1.6 0l1 3.6l-.6 4h-2.4z" fill="#06080b"/><rect x="${x + 1}" y="${y - 3}" width="1.6" height=".5" fill="${EM()}"/>`).join('');
      return `<ellipse cx="80" cy="92" rx="34" ry="4" fill="${ch(IP.light)}" opacity=".18" filter="url(#bl)"/><g transform="translate(80 40) rotate(-7) scale(1.5)">${m}</g>`;
    }
    const w = rr(r, 20, 27) * (o.sleek ? 0.82 : 1), len = rr(r, 28, 34), raider = o.raider || IP === IPAL.raider;
    let m = glow(`<ellipse cx="-31" cy="-2.6" rx="11" ry="2.2" fill="url(#pm)"/><ellipse cx="-31" cy="3" rx="11" ry="2.2" fill="url(#pm)"/>`, 0.95);
    m += `<path class="hb" d="${poly([[6, -3.6], [-10, -w], [-18, -w + 2.6], [-14, -4]])}"/><path class="l" d="M-4 -5 L-12 -${f1(w - 2)}"/>`;
    if (o.dropship) m += `<path class="hb" d="${poly([[-14, 5], [10, 5], [8, 13], [-12, 14]])}"/>` + glow(`<path d="${poly([[-11, 7], [6, 7], [5, 12], [-10, 12.6]])}" fill="${ch(IP.light, 5)}" opacity=".55"/>`, 0.8);
    m += `<path class="h" d="${poly([[len, 0], [10, -4.6], [-16, -5.6], [-24, -3.6], [-24, 4], [-16, 6], [10, 4.6]])}"/><path class="hb" d="${poly([[len, 0], [10, 4.6], [-16, 6], [-24, 4], [-24, 1], [10, 1]])}"/>`;
    m += `<path class="l" d="M-2 -4.6V4.8M-14 -5.4V5.6"/><path class="s" d="M${f1(len - 6)} .3 L-22 .6"/>`;
    m += `<path class="g" d="M${f1(len * 0.55)} -.2 Q12 -3.6 4 -2.4 Q8 1.2 ${f1(len * 0.55)} -.2Z"/><path d="M6 -2.2 Q11 -3 ${f1(len * 0.45)} -1" stroke="#fff" stroke-opacity=".7" stroke-width=".3" fill="none"/>`;
    m += `<path class="${raider ? 'p' : 'h'}" d="${poly([[6, 3.8], [-9, w * 0.85], [-19, w * 0.85 - 0.6], [-15, 4.6]])}"/><path class="l" d="M-4 5 L-12 ${f1(w * 0.85 - 1)}"/>`;
    m += raider ? `<path d="${poly([[-8, w * 0.6], [-13, w * 0.85], [-17, w * 0.85], [-11, w * 0.6]])}" fill="url(#haz)"/>` : `<path d="M-6 5L-11 ${f1(w * 0.78)}" stroke="${ch(IP.paint, 10)}" stroke-width="1.4"/>`;
    m += `<rect class="d" x="-6" y="${f1(w * 0.45)}" width="14" height="1.4"/>`;
    m += glow(`<circle cx="-18.4" cy="${f1(w * 0.85)}" r=".7" fill="hsl(130,100%,60%)"/><circle cx="-17.6" cy="${f1(-w + 2.6)}" r=".7" fill="hsl(0,100%,60%)"/>`);
    let wing = '';
    if (o.dropship) wing = `<g opacity=".7">${[[-10, 18], [-2, 19], [6, 18]].map(([x, y]) => `<path d="M${x} ${y} l1.2 6 l-1 .5 Z" fill="${ch(IP.arm1)}"/>`).join('')}</g>`;
    return `<g transform="translate(78 52) rotate(${f1(rr(r, -36, -22))}) scale(1.38)">${m}${wing}</g>`;
  },

  drone(r, h, o) {
    const eye = o.medic ? 'hsl(140,90%,58%)' : o.bomb ? 'hsl(0,100%,58%)' : EM(4);
    if (o.plan && DRONES[o.plan]) return DRONES[o.plan](r, h, o, eye);
    const R = (o.small ? 8 : 12) * rr(r, 0.9, 1.1), cx = 80, cy = o.crawler ? 64 : 48;
    let m = '';
    if (o.crawler) {
      for (let k = -1; k <= 1; k++) for (const s of [-1, 1]) m += limb3([cx + k * 8, cy], [cx + k * 8 + s * 10, cy - 8], [cx + k * 8 + s * 16, cy + 14], 1.2, 1, 0.6, s > 0 ? 'h' : 'hb');
      m += `<ellipse class="h" cx="${cx}" cy="${cy}" rx="${f1(R * 1.5)}" ry="${f1(R * 0.7)}"/><path class="hb" d="M${f1(cx - R * 1.5)} ${cy} Q${cx} ${f1(cy + R * 1.1)} ${f1(cx + R * 1.5)} ${cy}Z"/><path class="l" d="M${cx - 10} ${cy}h20"/><path d="M${cx - 8} ${cy - 3}h10" stroke="url(#haz)" stroke-width="1.6"/>`;
      m += glow(`<circle cx="${f1(cx + R * 1.3)}" cy="${f1(cy - 2)}" r="1.6" fill="${eye}"/>`);
      return m + `<ellipse cx="${cx}" cy="88" rx="${f1(R * 2.2)}" ry="2" fill="#000" opacity=".5" filter="url(#bl)"/>`;
    }
    const arms = o.arms || (r() < 0.5 ? 2 : 4);
    for (let k = 0; k < arms; k++) {
      const a = (arms === 2 ? [Math.PI * 0.08, Math.PI * 0.92][k] : (k + 0.5) / arms * Math.PI * 2) - (arms === 2 ? 0 : 0.2);
      const ex = cx + Math.cos(a) * R * 2.1 * (arms === 2 ? 1.2 : 1), ey = cy + Math.sin(a) * R * 1.3 - (arms === 2 ? 4 : 0);
      m += bar([cx, cy], [ex, ey], 1.3, 1, ex > cx ? 'h' : 'hb');
      m += `<ellipse class="h" cx="${f1(ex)}" cy="${f1(ey)}" rx="5.4" ry="2.8"/><ellipse cx="${f1(ex)}" cy="${f1(ey - 3)}" rx="9.5" ry="1.4" fill="${ch(IP.arm)}" opacity=".2"/><ellipse cx="${f1(ex)}" cy="${f1(ey + 2.4)}" rx="4" ry="1" fill="${eye}" opacity=".6" filter="url(#gl)"/>`;
    }
    if (o.gun) m += `<rect class="h" x="${cx - 3}" y="${f1(cy + R * 0.6)}" width="6" height="7"/><path d="M${cx - 2} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}M${cx} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}M${cx + 2} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}" stroke="${ch(IP.arm1)}" stroke-width="1"/>`;
    if (o.probe) m += `<path class="h" d="${poly([[cx - 3, cy - R], [cx + 3, cy - R], [cx + 1, cy - R - 14], [cx - 1, cy - R - 14]])}"/><ellipse class="h" cx="${cx}" cy="${f1(cy - R - 15)}" rx="7" ry="2"/>`;
    const body = r() < 0.5 ? `<circle class="h" cx="${cx}" cy="${cy}" r="${f1(R)}"/>` : `<path class="h" d="${poly(Array.from({ length: 8 }, (_, k) => [cx + Math.cos(k / 8 * Math.PI * 2 + Math.PI / 8) * R, cy + Math.sin(k / 8 * Math.PI * 2 + Math.PI / 8) * R]))}"/>`;
    m += body + `<path class="hb" d="M${f1(cx - R)} ${cy} A${f1(R)} ${f1(R)} 0 0 0 ${f1(cx + R)} ${cy}Z"/><path class="s" d="M${f1(cx - R)} ${cy}H${f1(cx + R)}"/><circle class="d" cx="${cx}" cy="${f1(cy + 1)}" r="${f1(R * 0.45)}"/>`;
    m += glow(`<circle cx="${cx}" cy="${f1(cy + 1)}" r="${f1(R * 0.26)}" fill="${eye}"/><circle cx="${f1(cx + R * 0.08)}" cy="${f1(cy + 0.6)}" r="${f1(R * 0.08)}" fill="#fff"/>`);
    if (o.medic) m += `<path d="M${f1(cx - 2)} ${f1(cy - R * 0.7)}h4M${cx} ${f1(cy - R * 0.7 - 2)}v4" stroke="hsl(140,90%,62%)" stroke-width="1.2"/>`;
    if (o.bomb) m += `<path d="M${f1(cx - R * 0.8)} ${f1(cy - R * 0.5)}L${f1(cx + R * 0.8)} ${f1(cy - R * 0.5)}" stroke="url(#haz)" stroke-width="1.8"/>`;
    if (o.shield) m += shieldBubble(cx, cy, R * 2.6, R * 2);
    if (o.junk) m += `<path d="${line([[cx - R, cy - R * 0.6], [cx - R * 0.2, cy - R * 0.9], [cx + R * 0.5, cy - R * 0.4]])}" stroke="hsl(25,45%,32%)" stroke-width="2" fill="none"/><rect x="${f1(cx - R * 0.9)}" y="${f1(cy + R * 0.2)}" width="${f1(R * 0.7)}" height="${f1(R * 0.5)}" class="p" transform="rotate(14 ${cx} ${cy})"/>`;
    m += `<ellipse cx="${cx}" cy="94" rx="${f1(R * 1.8)}" ry="2" fill="#000" opacity=".5" filter="url(#bl)"/><ellipse cx="${cx}" cy="94" rx="${f1(R)}" ry="1.2" fill="${eye}" opacity=".25" filter="url(#gl)"/>`;
    return m;
  },

  trooper(r, h, o) { return infantryScene(r, h, o); },

  bust(r, h, o) { return officer(r, h, o); },

  mech(r, h, o) {
    if (o.plan && MECHS[o.plan]) return MECHS[o.plan](r, h, o);
    const s = o.giant ? 1.15 : o.heavy ? 1.05 : 0.95;
    const cls = o.crystal ? 'cr' : 'h', clb = o.crystal ? 'cr' : 'hb';
    const eye = o.crystal ? 'hsl(190,100%,80%)' : o.sleek ? 'hsl(0,100%,58%)' : EM(4);
    let m = '';
    const leg = (x, flip, c) => `<path class="${c}" d="${poly([[x, 60], [x + flip * 8, 60], [x + flip * 2, 76], [x + flip * 8, 92], [x + flip * 12, 98], [x - flip * 4, 98], [x - flip * 4, 92], [x - flip * 6, 76]])}"/><path class="d" d="${poly([[x - flip * 6, 76], [x + flip * 2, 76], [x + flip * 1, 80], [x - flip * 5, 80]])}"/><circle class="d" cx="${f1(x - flip * 2)}" cy="76" r="2.6"/>` + bar([x + flip * 2, 64], [x + flip * 6, 88], 0.7, 0.7, 'd');
    m += leg(70, -1, clb) + leg(90, 1, cls);
    if (o.tri) m += `<path class="${cls}" d="${poly([[78, 60], [82, 60], [84, 94], [76, 94]])}" opacity=".85"/>`;
    m += `<path class="${cls}" d="${poly([[60, 32], [100, 32], [106, 46], [98, 62], [62, 62], [54, 46]])}"/><path class="${clb}" d="${poly([[54, 46], [106, 46], [98, 62], [62, 62]])}"/><path class="l" d="M80 32V62M66 34V60M94 34V60"/>`;
    if (!o.crystal) m += `<path class="s" d="M58 46H102"/>`;
    m += `<path class="d" d="${poly([[68, 36.5], [92, 36.5], [90, 43.5], [70, 43.5]])}"/>` + glow(`<path d="${poly([[70, 38], [90, 38], [88.6, 42], [71.4, 42]])}" fill="${eye}"/>`);
    // arms / weapons
    m += `<path class="${clb}" d="${poly([[46, 38], [58, 38], [60, 66], [50, 68]])}"/><rect class="d" x="49" y="66" width="9" height="13"/><path d="M50 79v8M53 79v8M56 79v8" stroke="${ch(IP.arm1)}" stroke-width="1"/>`;
    m += `<path class="${cls}" d="${poly([[102, 38], [114, 38], [112, 66], [100, 66]])}"/><rect class="d" x="101" y="66" width="9" height="13"/><path class="l" d="M102 48h10"/>`;
    if (o.heavy || o.giant) m += `<rect class="${cls}" x="57" y="21" width="15" height="11"/><rect class="${clb}" x="88" y="21" width="15" height="11"/>` + glow(Array.from({ length: 6 }, (_, k) => `<circle cx="${f1(60.5 + (k % 3) * 4)}" cy="${f1(24.6 + Math.floor(k / 3) * 4)}" r=".95" fill="hsl(14,100%,58%)"/>`).join(''), 0.7);
    if (o.coil) m += glow(`<path d="${line([[54, 30], [50, 18], [56, 22], [52, 8]])}" stroke="${EM(14)}" stroke-width=".9" fill="none"/>`);
    if (o.shield) m += shieldBubble(80, 56, 40, 46);
    if (o.wall) m += `<path class="${cls}" d="${poly([[36, 28], [58, 24], [60, 88], [38, 92]])}"/><path class="hb" d="${poly([[36, 28], [40, 27.4], [42, 91.4], [38, 92]])}"/><path class="l" d="M37 50L59 46M38 70L60 66"/><path d="${poly([[38, 76], [60, 72], [60, 80], [38, 84]])}" fill="url(#haz)" opacity=".7"/>` + glow(`<path d="M42 34L56 31" stroke="${EM(6)}" stroke-width="1"/>`);
    if (o.crane) m += `<path d="M104 40 L126 14 L140 20" stroke="${ch(IP.arm1, 6)}" stroke-width="3.2" fill="none" stroke-linejoin="round"/><path d="M104 40 L126 14 L140 20" stroke="url(#haz)" stroke-width="1.6" fill="none" stroke-linejoin="round" opacity=".7"/><path class="${cls}" d="${poly([[136, 20], [146, 30], [140, 32], [134, 26], [128, 30], [130, 22]])}"/>`;
    if (o.junk) m += `<path d="${line([[62, 34], [70, 50], [64, 60]])}" stroke="hsl(20,45%,30%)" stroke-width="2.5" fill="none"/><rect x="86" y="48" width="10" height="9" class="p" transform="rotate(12 92 52)"/><rect x="64" y="50" width="8" height="7" fill="hsl(200,25%,30%)" transform="rotate(-8 68 54)"/>`;
    if (o.crystal) m += `<path d="${poly([[96, 32], [104, 10], [108, 34]])}" class="cr"/><path d="${poly([[60, 32], [55, 12], [66, 32]])}" class="cr"/><path d="${poly([[80, 32], [83, 16], [87, 32]])}" class="cr"/>` + glow(`<circle cx="104" cy="12" r=".8" fill="#fff"/><circle cx="55" cy="14" r=".8" fill="#fff"/>`);
    return `<ellipse cx="80" cy="99" rx="34" ry="4" fill="#000" opacity=".55" filter="url(#bl)"/><g transform="translate(80 60) scale(${s}) translate(-80 -60)">${m}</g>`;
  },

  tank(r, h, o) {
    let m = '';
    if (o.hover) m += glow(`<ellipse cx="80" cy="88" rx="38" ry="3" fill="${EM(4)}"/>`, 0.85);
    m += `<path class="h" d="${poly([[40, 66], [118, 64], [126, 72], [36, 74]])}"/><path class="hb" d="${poly([[36, 74], [126, 72], [116, 84], [46, 86]])}"/><path class="l" d="M50 66V85M70 65V85M95 65V84"/><path class="s" d="M44 76 L118 74"/>`;
    m += `<path class="p" d="${poly([[102, 64.6], [112, 64.4], [118, 72], [108, 72.3]])}"/>`;
    if (!o.hover) { m += `<rect class="d" x="38" y="82" width="84" height="12" rx="6"/>`; for (let k = 0; k < 7; k++) m += `<circle cx="${46 + k * 12}" cy="88" r="4" class="hb"/><circle cx="${46 + k * 12}" cy="88" r="1.2" class="d"/>`; }
    else m += [50, 80, 110].map(x => `<ellipse class="d" cx="${x}" cy="85" rx="8" ry="2"/>`).join('');
    m += `<path class="h" d="${poly([[58, 52], [94, 49], [104, 58], [96, 64], [58, 65], [52, 59]])}"/><path class="hb" d="${poly([[52, 59], [104, 58], [96, 64], [58, 65]])}"/><path class="l" d="M70 50.5V64"/>`;
    const bl = o.lance ? 48 : 36;
    m += `<path class="d" d="${poly([[98, 54], [98 + bl, 49], [98 + bl, 52.4], [98, 58.6]])}"/><path class="w" d="${poly([[98, 53.4], [112, 51.6], [112, 56.6], [98, 58.6]])}"/><rect class="w" x="${92 + bl}" y="48.4" width="7" height="4.8" transform="rotate(-6 ${95 + bl} 51)"/>`;
    if (o.lance) m += glow([0, 1, 2, 3].map(k => `<ellipse cx="${114 + k * 7}" cy="${f1(52.6 - k * 0.8)}" rx="1" ry="3.2" fill="${EM(10)}"/>`).join(''));
    if (o.mines) m += `<rect class="h" x="40" y="55" width="16" height="11"/><path d="M42 60.5h12" stroke="url(#haz)" stroke-width="2"/>`;
    m += glow(`<rect x="64" y="54" width="9" height="1.4" fill="${EM()}"/><circle cx="122" cy="70" r=".8" fill="#fff"/>`, 0.8);
    return `<ellipse cx="80" cy="96" rx="48" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(-4 -6)">${m}</g>`;
  },

  structure(r, h, o) {
    const t = o.type, E = EM(4);
    if (t === 'wall') {
      let m = '';
      for (let k = 0; k < 3; k++) {
        const x = 34 + k * 30, top = 48 + (k % 2) * 6;
        m += `<path class="${k === 1 ? 'h' : 'hb'}" d="${poly([[x, 94], [x + 4, top], [x + 28, top - 3], [x + 27, 94]])}"/><path class="h" d="${poly([[x + 4, top], [x + 28, top - 3], [x + 26, top - 6], [x + 6, top - 3]])}"/>`;
        m += `<path d="${poly([[x + 2, 70 + k], [x + 27, 68 + k], [x + 27, 75 + k], [x + 2, 77 + k]])}" fill="url(#haz)" opacity=".85"/><path class="l" d="M${x + 3} 60 L${x + 27} 58M${x + 2} 86 L${x + 27} 85"/>`;
      }
      m += glow(`<circle cx="66" cy="44" r="1.4" fill="#fff6e0"/><circle cx="122" cy="44" r="1.4" fill="#fff6e0"/>`) + `<path d="M66 44 L40 100 L92 100Z" fill="#fff4d8" opacity=".06"/>`;
      return `<ellipse cx="80" cy="96" rx="54" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/>${m}`;
    }
    if (t === 'coil') return `<path class="h" d="${poly([[64, 97], [96, 97], [90, 84], [70, 84]])}"/><rect class="hb" x="75" y="34" width="10" height="52"/><path class="s" d="M80 36V84"/>${[40, 52, 64, 76].map(y => `<ellipse class="h" cx="80" cy="${y}" rx="13" ry="3.2"/><ellipse cx="80" cy="${y + 0.8}" rx="12" ry="2" fill="${E}" opacity=".35"/>`).join('')}<circle class="h" cx="80" cy="28" r="8.4"/>` + glow(`<path d="${line([[80, 20], [70, 10], [76, 8], [62, -2]])}" stroke="${EM(16)}" stroke-width="1" fill="none"/><path d="${line([[86, 24], [100, 18], [96, 12], [112, 6]])}" stroke="${EM(16)}" stroke-width="1" fill="none"/><path d="${line([[74, 26], [60, 28], [62, 22], [48, 20]])}" stroke="${EM(16)}" stroke-width=".6" fill="none"/><circle cx="80" cy="28" r="3.4" fill="#eafcff"/>`);
    if (t === 'factory') {
      let wins = ''; for (let k = 0; k < 12; k++) wins += `<rect x="${f1(47 + (k % 6) * 10)}" y="${f1(58 + Math.floor(k / 6) * 7)}" width="6" height="1" fill="${E}"/>`;
      return `<rect class="hb" x="42" y="52" width="72" height="46"/><path class="h" d="${poly([[42, 52], [56, 40], [100, 40], [114, 52]])}"/><rect class="h" x="98" y="16" width="9" height="30"/><rect class="h" x="50" y="22" width="7" height="22"/><path class="l" d="M42 72H114M78 52V98"/>`
        + `<rect class="d" x="64" y="76" width="28" height="22"/>` + glow(`${wins}<rect x="66" y="78" width="24" height="20" fill="${E}" opacity=".35"/><path d="M66 78h24" stroke="${EM(16)}" stroke-width=".6"/><circle cx="102.5" cy="18" r="1.4" fill="hsl(0,100%,60%)"/>`, 0.85)
        + `<g filter="url(#bl)" opacity=".45"><ellipse cx="104" cy="8" rx="12" ry="6" fill="${ch(IP.fog, 20)}"/><ellipse cx="54" cy="16" rx="8" ry="5" fill="${ch(IP.fog, 20)}"/></g><ellipse cx="78" cy="98" rx="42" ry="3" fill="#000" opacity=".5" filter="url(#bl)"/>`;
    }
    if (t === 'reactor') return [48, 112].map(x => `<rect class="hb" x="${x - 4}" y="48" width="8" height="50"/><path class="s" d="M${x} 52V94"/>`).join('') + `<path class="h" d="${poly([[56, 97], [104, 97], [100, 30], [60, 30]])}"/><path class="hb" d="${poly([[86, 30], [100, 30], [104, 97], [90, 97]])}"/><ellipse class="h" cx="80" cy="30" rx="20" ry="5"/>${[44, 58, 72, 86].map(y => `<path class="l" d="M58 ${y}H102"/>`).join('')}<rect class="d" x="70" y="38" width="20" height="54"/>` + glow(`<rect x="72" y="40" width="16" height="50" fill="url(#core)"/><ellipse cx="80" cy="30" rx="11" ry="2.6" fill="${EM(16)}"/>`);
    if (t === 'core') {
      const c = o.red ? 'hsl(0,100%,58%)' : IP === IPAL.synth ? EM(4) : 'hsl(38,100%,60%)';
      return `<ellipse cx="80" cy="60" rx="46" ry="13" fill="none" stroke="${c}" stroke-width=".5" opacity=".5" stroke-dasharray="2 3"/><path class="hb" d="${poly([[64, 99], [96, 99], [91, 12], [69, 12]])}"/><path class="h" d="${poly([[64, 99], [78, 99], [77, 12], [69, 12]])}"/><path class="l" d="M71 30H89M70 60H90M68 84H92"/>`
        + glow(`<rect x="78.4" y="18" width="3.2" height="76" fill="${c}"/><circle cx="80" cy="44" r="5.4" fill="${c}"/><circle cx="80" cy="44" r="2" fill="#fff"/>`)
        + glow(`<ellipse cx="80" cy="56" rx="34" ry="9" fill="none" stroke="${c}" stroke-width=".9"/>`, 0.6) + `<path d="M46 56 A34 9 0 0 0 114 56" fill="none" stroke="${c}" stroke-width="1.2"/>`;
    }
    if (t === 'cryo') return `<path class="h" d="${poly([[66, 97], [94, 97], [89, 50], [71, 50]])}"/><path class="hb" d="${poly([[82, 50], [89, 50], [94, 97], [84, 97]])}"/><path class="s" d="M70 60H90"/>` + `<path class="cr" d="${poly([[71, 50], [80, 10], [89, 50]])}"/><path class="cr" d="${poly([[66, 60], [56, 30], [72, 54]])}"/><path class="cr" d="${poly([[94, 60], [106, 34], [89, 54]])}"/><path d="M80 12 L84 48" stroke="#fff" stroke-opacity=".5" stroke-width=".4"/>` + glow(`<circle cx="80" cy="38" r="3.4" fill="hsl(195,100%,82%)"/>`);
    if (t === 'dummy') return `<rect class="hb" x="78" y="60" width="4" height="38"/><path class="h" d="M66 60 Q64 24 80 22 Q96 24 94 60Z"/>${[0, 1, 2].map(k => `<circle cx="80" cy="42" r="${4 + k * 5}" fill="none" stroke="hsl(0,85%,55%)" stroke-width="1.2" opacity=".75"/>`).join('')}` + glow(`<circle cx="80" cy="42" r="1.6" fill="hsl(0,100%,60%)"/>`);
    return '';
  },

  bug(r, h, o) {
    const eye = ch(IP.emis, 10);
    if (o.plan && BUGS[o.plan]) { const sc = o.small ? 0.82 : o.big ? 1.06 : 1; return `<ellipse cx="84" cy="98" rx="50" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 98) scale(${sc}) translate(-84 -98)">${BUGS[o.plan](r, h, eye, o)}</g>`; }
    const s = o.big || o.queen ? 1.1 : o.small ? 0.78 : 0.95;
    let m = '';
    const leg = (x, y, kx, ky, fx, fy, w) => `<path class="o" d="${poly([[x - w, y], [x + w, y], [kx + w * 0.7, ky], [fx + 1, fy], [fx - 1.5, fy], [kx - w * 0.7, ky]])}"/>`;
    m += `<g opacity=".7">${leg(104, 66, 118, 52, 126, 96, 2.4)}${leg(88, 68, 96, 56, 102, 97, 2.2)}</g>`;
    const back = o.queen ? 22 : 28;
    m += `<path class="o" d="M134 80 Q136 60 118 ${back + 12} Q100 ${back} 78 ${back + 8} Q64 ${back + 12} 58 46 L62 62 Q84 76 106 76 Q122 78 134 80Z"/>`;
    for (let k = 0; k < 4; k++) { const x = 72 + k * 14; m += `<path d="M${x - 2} ${f1(back + 14 - Math.sin(k) * 2)} Q${x + 7} ${f1(back + 2 - (k === 1 || k === 2 ? 4 : 0))} ${x + 16} ${f1(back + 12 + k * 1.5)}" stroke="#000" stroke-opacity=".6" stroke-width=".8" fill="none"/>`; }
    m += sheen(`M66 ${back + 12} Q90 ${back - 2} 120 ${back + 14}`);
    for (let k = 0; k < (o.armored ? 7 : 5); k++) { const x = 70 + k * 10, y = back + 6 + Math.abs(k - 2) * 2.4; m += `<path class="o" d="${poly([[x, y + 3], [x + 2 + rr(r, 0, 2), y - rr(r, 8, 14) - (o.queen ? 8 : 0)], [x + 6, y + 3]])}"/>`; }
    m += `<path class="o" d="${poly([[62, 40], [46, 44], [34, 54], [38, 60], [50, 60], [64, 58]])}"/>`;
    m += `<path d="M38 58 Q30 64 34 72 L38 66 M44 60 Q42 70 48 74 L48 66" stroke="hsl(60,25%,80%)" stroke-opacity=".85" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    m += glow(`<circle cx="46" cy="49" r="1.3" fill="${eye}"/><circle cx="50" cy="47.5" r="1" fill="${eye}"/><circle cx="52.5" cy="50.5" r=".8" fill="${eye}"/>`) + bio([[96, 66, 1.4], [112, 70, 1.2], [80, 64, 1]]);
    m += leg(76, 66, 70, 70, 60, 97, 3) + leg(96, 72, 104, 66, 112, 98, 3);
    if (o.scythe) m += `<path class="o" d="${poly([[62, 50], [50, 26], [30, 16], [46, 30], [56, 56]])}"/>`;
    else m += leg(64, 58, 52, 66, 44, 96, 2.6);
    if (o.tail) m += `<path d="M132 74 Q150 48 132 28 Q120 18 110 26" stroke="url(#o)" stroke-width="6" fill="none" stroke-linecap="round"/>` + glow(`<path d="${poly([[110, 26], [104, 33], [113, 30]])}" fill="${eye}"/>`);
    if (o.sac) m += glow(`<ellipse cx="116" cy="70" rx="11" ry="6" fill="${EM(-10)}" opacity=".5"/>`, 0.6);
    if (o.spit) m += glow(`<circle cx="30" cy="62" r="2.4" fill="${eye}"/><circle cx="23" cy="64" r="1.3" fill="${eye}"/>`);
    if (o.queen) m += `<path class="o" d="${poly([[60, 42], [52, 14], [62, 34], [66, 8], [72, 34], [80, 12], [80, 40]])}"/>` + glow(`<circle cx="52" cy="15" r=".9" fill="${eye}"/><circle cx="66" cy="9" r=".9" fill="${eye}"/><circle cx="80" cy="13" r=".9" fill="${eye}"/>`);
    return `<ellipse cx="82" cy="98" rx="52" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 60) scale(${s}) translate(-84 -60)">${m}</g>`;
  },

  worm(r, h, o) {
    const R0 = o.big ? 16 : o.small ? 9 : 12.5, n = o.small ? 6 : 8;
    let m = `<ellipse cx="112" cy="96" rx="32" ry="6" fill="#000" opacity=".85"/><path d="M82 96 Q112 85 142 96" stroke="${ch(IP.arm, -10)}" stroke-width="1.4" fill="none"/>`;
    for (let k = 0; k < 7; k++) m += `<path class="o" d="${poly([[rr(r, 86, 136), 96], [rr(r, 84, 140), rr(r, 86, 92)], [rr(r, 86, 138), 97]])}"/>`;
    const pts = [];
    for (let k = 0; k < n; k++) { const t = k / (n - 1); pts.push([112 - t * 50 - Math.sin(t * Math.PI) * 6, 96 - Math.sin(t * Math.PI * 0.62) * 70]); }
    for (let k = 0; k < n; k++) {
      const [x, y] = pts[k], rad = R0 * (1 - 0.25 * (k / (n - 1)));
      m += `<ellipse class="o" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rad)}" ry="${f1(rad * 0.82)}"/>`;
      m += `<path d="M${f1(x - rad * 0.9)} ${f1(y - rad * 0.2)} Q${f1(x)} ${f1(y - rad * 0.9)} ${f1(x + rad * 0.9)} ${f1(y - rad * 0.2)}" stroke="#000" stroke-opacity=".55" stroke-width=".8" fill="none"/>`;
      m += sheen(`M${f1(x - rad * 0.6)} ${f1(y - rad * 0.55)} Q${f1(x)} ${f1(y - rad * 0.85)} ${f1(x + rad * 0.5)} ${f1(y - rad * 0.6)}`);
      if (k % 2) m += bio([[x + rad * 0.6, y + rad * 0.2, rad * 0.12]]);
    }
    const [hx, hy] = pts[n - 1], R = R0 * 0.95;
    m += `<path class="o" d="${poly([[hx + R * 0.6, hy - R * 0.8], [hx - R * 1.6, hy - R * 0.3], [hx - R * 0.4, hy + R * 0.2]])}"/>`;
    m += `<path class="o" d="${poly([[hx + R * 0.6, hy + R * 0.5], [hx - R * 1.4, hy + R * 1.1], [hx - R * 0.4, hy + R * 0.25]])}"/>`;
    m += `<path class="d" d="${poly([[hx - R * 0.3, hy - R * 0.2], [hx - R * 1.3, hy + R * 0.1], [hx - R * 1.2, hy + R * 0.8], [hx - R * 0.3, hy + R * 0.3]])}"/>`;
    let teeth = ''; for (let k = 0; k < 5; k++) { const tx = hx - R * 0.5 - k * R * 0.18; teeth += `<path d="${poly([[tx, hy - R * 0.08], [tx - R * 0.06, hy + R * 0.18], [tx - R * 0.14, hy - R * 0.04]])}" fill="hsl(50,25%,72%)"/><path d="${poly([[tx, hy + R * 0.55], [tx - R * 0.07, hy + R * 0.32], [tx - R * 0.15, hy + R * 0.6]])}" fill="hsl(50,25%,72%)"/>`; }
    m += teeth + glow(`<ellipse cx="${f1(hx - R * 0.55)}" cy="${f1(hy + R * 0.25)}" rx="${f1(R * 0.38)}" ry="${f1(R * 0.13)}" fill="${o.small ? 'hsl(0,100%,50%)' : EM()}"/>`, 0.85);
    return m;
  },

  pod(r, h, o) {
    let m = `<ellipse cx="80" cy="94" rx="54" ry="8" fill="${ch(IP.dark, 4)}"/>`;
    const n = o.many ? 6 : o.big ? 1 : 3 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const big = o.big ? 1.8 : rr(r, 0.8, 1.15), x = o.big ? 80 : 48 + k * (64 / Math.max(1, n - 1)) + rr(r, -4, 4), y = 92 - 18 * big;
      m += `<ellipse class="o" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(11 * big)}" ry="${f1(17 * big)}"/>`;
      m += glow(`<ellipse cx="${f1(x)}" cy="${f1(y + 3)}" rx="${f1(5.4 * big)}" ry="${f1(9.6 * big)}" fill="${EM(-6)}" opacity=".7"/>`, 0.85);
      m += `<path d="M${f1(x - 6 * big)} ${f1(y - 10 * big)} Q ${f1(x)} ${f1(y)} ${f1(x - 3 * big)} ${f1(y + 14 * big)}M${f1(x + 5 * big)} ${f1(y - 12 * big)} Q ${f1(x + 2 * big)} ${f1(y)} ${f1(x + 5 * big)} ${f1(y + 13 * big)}" stroke="#000" stroke-opacity=".7" stroke-width=".8" fill="none"/>`;
      m += sheen(`M${f1(x - 7 * big)} ${f1(y - 8 * big)} Q${f1(x - 5 * big)} ${f1(y - 15 * big)} ${f1(x + 1 * big)} ${f1(y - 16 * big)}`);
    }
    if (o.spore) m += glow(Array.from({ length: 14 }, () => `<circle cx="${f1(rr(r, 36, 124))}" cy="${f1(rr(r, 8, 60))}" r="${f1(rr(r, 0.8, 2))}" fill="${EM(10)}"/>`).join(''), 0.85);
    if (o.big) m += `<path d="M60 90 Q40 70 30 80 M100 90 Q120 70 132 82 M70 92 Q60 98 44 98" stroke="${ch(IP.arm1)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return m;
  },

  brain(r, h) {
    let m = `<path d="M70 70 Q66 86 58 98 M80 72 V100 M90 70 Q96 86 104 98" stroke="${ch(IP.arm1)}" stroke-width="3.4" fill="none"/>`;
    m += glow(`<path d="M58 98 Q66 86 70 70M104 98 Q96 86 90 70" stroke="${EM()}" stroke-width=".4" fill="none"/>`, 0.7);
    m += `<ellipse class="o" cx="68" cy="46" rx="20" ry="22"/><ellipse class="o" cx="92" cy="46" rx="20" ry="22"/>`;
    for (let k = 0; k < 9; k++) { const x = rr(r, 54, 104), y = rr(r, 30, 62); m += `<path d="M${f1(x)} ${f1(y)} q 4 -5 8 0 t 8 0" stroke="#000" stroke-opacity=".6" stroke-width=".9" fill="none"/>`; }
    m += sheen('M54 36 Q64 24 76 28') + sheen('M86 28 Q98 24 106 34');
    m += glow([[62, 40], [96, 36], [84, 58], [70, 60], [76, 34], [100, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${EM(10)}"/>`).join('') + `<path d="M62 40 Q72 46 70 60M96 36 Q88 44 84 58M76 34 Q86 40 96 36" stroke="${EM()}" stroke-width=".4" fill="none"/>`);
    return m;
  },

  psion(r, h, o) { return psionFigure(r, h, o); },

  horror(r, h, o) {
    const E = EM(), E2 = EM(16);
    if (o.wisp) {
      let m = `<g filter="url(#aur)"><path d="M80 50 Q112 62 136 36 Q114 76 80 64Z" fill="${E}" opacity=".7"/><circle cx="80" cy="56" r="13" fill="${E}" opacity=".7"/></g>`;
      m += glow(`<circle cx="80" cy="56" r="7" fill="${E2}"/><circle cx="80" cy="56" r="3.4" fill="#fff"/>`, 1);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, d = rr(r, 14, 22); m += `<path class="gs" d="${poly([[80 + Math.cos(a) * d, 56 + Math.sin(a) * d - 2.4], [80 + Math.cos(a) * d + 1.4, 56 + Math.sin(a) * d], [80 + Math.cos(a) * d, 56 + Math.sin(a) * d + 2.4], [80 + Math.cos(a) * d - 1.2, 56 + Math.sin(a) * d]])}"/>`; }
      return m;
    }
    if (o.maw) {
      const R = o.giant ? 36 : 27;
      let m = '';
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; m += `<path d="M80 54 L${f1(80 + Math.cos(a) * R * 2.6)} ${f1(54 + Math.sin(a) * R * 2.1)}" stroke="${E}" stroke-width="${f1(rr(r, 0.4, 1.6))}" opacity=".18"/>`; }
      m += `<ellipse class="gs" cx="80" cy="54" rx="${R + 12}" ry="${f1((R + 12) * 0.8)}"/><ellipse fill="#000" cx="80" cy="54" rx="${R}" ry="${f1(R * 0.78)}"/>`;
      m += `<ellipse cx="80" cy="54" rx="${f1(R * 0.62)}" ry="${f1(R * 0.48)}" fill="url(#ipc)" opacity=".7"/>` + glow(`<ellipse cx="80" cy="54" rx="${f1(R * 0.42)}" ry="${f1(R * 0.32)}" fill="none" stroke="${E2}" stroke-width=".6"/>`, 0.8);
      for (let ring = 0; ring < (o.giant ? 3 : 2); ring++) for (let k = 0; k < 20; k++) {
        const a = k / 20 * Math.PI * 2 + ring * 0.16, r1 = R * (1.02 - ring * 0.24), r2 = r1 * 0.66;
        m += `<path class="gs" d="${poly([[80 + Math.cos(a) * r1, 54 + Math.sin(a) * r1 * 0.78], [80 + Math.cos(a + 0.1) * r2, 54 + Math.sin(a + 0.1) * r2 * 0.78], [80 + Math.cos(a + 0.2) * r1, 54 + Math.sin(a + 0.2) * r1 * 0.78]])}"/>`;
      }
      m += glow(`<ellipse cx="80" cy="54" rx="${f1(R * 0.18)}" ry="${f1(R * 0.13)}" fill="#fff"/>`);
      for (let k = 0; k < 12; k++) { const a = rr(r, 0, Math.PI * 2), d = rr(r, R + 14, R + 34), s = rr(r, 1, 3); m += `<path class="gs" d="${poly([[0, -s * 1.6], [s * 0.6, 0], [0, s * 1.2], [-s * 0.5, 0]])}" transform="translate(${f1(80 + Math.cos(a) * d)} ${f1(54 + Math.sin(a) * d * 0.8)}) rotate(${Math.round(a * 57 + 90)})"/>`; }
      return m;
    }
    if (o.stalker) {
      const body = `<path class="h" d="M40 72 Q56 50 86 52 Q114 52 124 66 L118 70 Q100 62 84 66 Q64 68 50 78Z"/><path class="h" d="${poly([[44, 70], [30, 62], [36, 74]])}"/>`
        + limb3([58, 70], [52, 82], [48, 98], 2.4, 1.8, 1, 'hb') + limb3([72, 66], [70, 82], [74, 98], 2.6, 2, 1, 'h') + limb3([100, 62], [106, 78], [110, 98], 2.6, 2, 1, 'hb') + limb3([114, 64], [124, 80], [126, 96], 2.6, 2, 1, 'h')
        + `<path class="s" d="M50 66 Q80 54 118 64" fill="none"/>`;
      const st = `<g opacity=".25" transform="translate(-10 -2)" filter="url(#aur)">${body}</g><g opacity=".4" transform="translate(7 1)">${body}</g>${body}` + `<path class="h" d="M58 58 L66 44 L72 56Z M76 54 L84 40 L88 53Z M94 54 L104 42 L104 56Z"/>` + glow(`<circle cx="38" cy="66" r="1.2" fill="${E2}"/><circle cx="42" cy="65" r="1.2" fill="${E2}"/>`);
      return `<g transform="translate(82 99) scale(1.28) translate(-82 -99)">${st}</g>`;
    }
    if (IP === IPAL.psi) { // a drifting psionic mass: a glass bell trailing tendrils around one great eye
      let m = '';
      for (let k = 0; k < 9; k++) { const x0 = 60 + k * 5, x1 = x0 + rr(r, -16, 16); m += tube([[x0, 56], [x0 + rr(r, -8, 8), 70], [x1, 84], [x1 + rr(r, -8, 8), 99]], rr(r, 1.6, 2.6), 0.4, 'gs'); }
      m += `<g filter="url(#aur)" opacity=".5"><ellipse cx="80" cy="40" rx="30" ry="22" fill="${E}"/></g>`;
      m += `<path class="gs" d="M50 58 Q48 18 80 15 Q112 18 110 58 Q96 51 80 60 Q64 51 50 58Z"/>`;
      m += glow(Array.from({ length: 6 }, (_, k) => `<path d="M${62 + k * 7} 56 Q${f1(60 + k * 8 + rr(r, -6, 6))} 36 ${f1(70 + k * 4)} 20" stroke="${E}" stroke-width=".35" fill="none" opacity=".7"/>`).join(''), 0.7);
      m += `<ellipse cx="80" cy="40" rx="9" ry="6" fill="#020104"/>` + glow(`<ellipse cx="80" cy="40" rx="5" ry="4.4" fill="${E}"/><ellipse cx="80" cy="40" rx="1.4" ry="3.4" fill="#05020a"/><circle cx="81.6" cy="38.4" r=".8" fill="#fff"/>`);
      return m;
    }
    // a Choir construct: black-glass shards around a burning core, tendrils to the ground
    let m = '';
    for (let k = 0; k < 7; k++) { const sx = rr(r, 40, 120), side = sx < 80 ? -1 : 1; m += tube([[80, 60], [80 + side * rr(r, 8, 18), rr(r, 70, 80)], [sx, rr(r, 84, 92)], [sx + side * rr(r, 4, 12), 99]], rr(r, 2.4, 3.6), 0.6, 'gs'); }
    for (let k = 0; k < 13; k++) {
      const a = -Math.PI / 2 + rr(r, -1.5, 1.5), len = rr(r, 18, 44), w = rr(r, 3, 7), bx = 80 + Math.cos(a) * 6, by = 52 + Math.sin(a) * 6;
      const tx = 80 + Math.cos(a) * len, ty = 52 + Math.sin(a) * len * 0.9, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      m += `<path class="gs" d="${poly([[bx + nx, by + ny], [tx, ty], [bx - nx, by - ny], [80, 60]])}"/><path d="M${f1(bx + nx * 0.4)} ${f1(by + ny * 0.4)}L${f1(tx)} ${f1(ty)}" stroke="${E2}" stroke-width=".25" opacity=".55"/>`;
    }
    m += `<path class="gs" d="${poly([[68, 46], [80, 26], [92, 46], [88, 70], [80, 76], [72, 70]])}"/>`;
    m += glow(`<path d="M80 34 Q84 50 80 68 Q76 50 80 34Z" fill="${E}"/><path d="M80 38 Q82 50 80 64 Q78 50 80 38Z" fill="#fff"/>`, 1);
    m += glow(Array.from({ length: 5 }, (_, k) => `<circle cx="${f1(73 + (k % 2) * 14)}" cy="${f1(42 + k * 5)}" r="${f1(1.2 - k * 0.12)}" fill="${E2}"/>`).join(''));
    m += glow(`<path d="M68 52 L60 62 L62 70M92 52 L100 60 L98 72" stroke="${E}" stroke-width=".45" fill="none" opacity=".8"/>`, 0.7);
    return m;
  },

  projectile(r, h, o) {
    const t = o.type, c = { plasma: EM(4), rail: 'hsl(200,90%,80%)', arc: 'hsl(200,100%,76%)', frost: 'hsl(190,90%,82%)', shards: EM(10), psi: EM(10), drain: 'hsl(0,95%,58%)' }[t] || EM();
    const x0 = 30, y0 = 80, x1 = 116, y1 = 44;
    let m = '';
    // target: a hulking silhouette backlit by the impact
    if (t !== 'drain') m += `<path d="M106 101 L108 80 L102 72 L103 60 L112 54 L117 52 L117 45 Q121 40 126 43 L127 52 L137 56 L143 68 L137 76 L139 101Z" fill="#06080b"/><path d="M103 60 L112 54 L117 52 L117 45 Q121 40 126 43" stroke="${c}" stroke-width=".5" fill="none" opacity=".8"/>` + glow(`<rect x="118" y="46" width="5" height="1" fill="hsl(0,100%,60%)"/>`);
    const impact = (x, y, s) => `<circle cx="${x}" cy="${y}" r="${f1(14 * s)}" fill="url(#ipc)"/>` + glow(`<circle cx="${x}" cy="${y}" r="${f1(3 * s)}" fill="#fff"/>` + Array.from({ length: 10 }, () => { const a = rr(r, 0, Math.PI * 2), d = rr(r, 4, 14) * s; return `<path d="M${x} ${y}l${f1(Math.cos(a) * d)} ${f1(Math.sin(a) * d)}" stroke="${c}" stroke-width=".4"/>`; }).join(''));
    // the weapon or caster in the left foreground
    if (t === 'rail' || t === 'plasma') m += `<g transform="rotate(-23 26 84)"><path class="w" d="M-10 80 L34 80 L36 88 L-10 90Z"/><path class="d" d="M34 82 L46 82 L46 86 L34 86Z"/>${[0, 1, 2, 3].map(k => `<rect x="${6 + k * 6}" y="79" width="2" height="11" class="hb"/>`).join('')}` + glow(`<path d="M2 84.6H32" stroke="${c}" stroke-width=".7"/>`) + '</g>';
    if (t === 'arc') m += `<path class="w" d="M-4 100 L14 72 L20 74 L10 100Z"/>` + glow(`<circle cx="17" cy="72" r="2.4" fill="#fff"/>`);
    if (t === 'psi' || t === 'shards' || t === 'frost') m += limb3([-6, 104], [10, 90], [26, 82], 5, 3.6, 2.4, 'cl') + `<circle cx="28" cy="81" r="3" class="h"/>` + `<circle cx="30" cy="80" r="7" fill="${c}" opacity=".5" filter="url(#aur)"/>`;
    if (t === 'rail') {
      m += glow(`<path d="M${x0 + 8} ${y0 - 4}L${x1} ${y1}" stroke="${c}" stroke-width="2.4" opacity=".5"/><path d="M${x0 + 8} ${y0 - 4}L${x1} ${y1}" stroke="#fff" stroke-width=".8"/>`);
      m += [0.2, 0.38, 0.56, 0.74].map((k, i) => { const x = x0 + 8 + (x1 - x0 - 8) * k, y = y0 - 4 + (y1 - y0 + 4) * k; return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(1.6 + i * 0.3)}" ry="${f1(7 - i)}" fill="none" stroke="${c}" stroke-width=".6" transform="rotate(-23 ${f1(x)} ${f1(y)})" opacity="${f1(0.9 - i * 0.15)}"/>`; }).join('');
      m += impact(x1, y1, 1.2);
    } else if (t === 'arc') {
      const bolt = () => { const p = [[17, 72]]; for (let k = 1; k < 9; k++) p.push([17 + (x1 - 17) * k / 9 + rr(r, -6, 6), 72 + (y1 - 72) * k / 9 + rr(r, -8, 8)]); p.push([x1, y1]); return p; };
      const b = bolt();
      m += glow(`<path d="${line(b)}" stroke="${c}" stroke-width="1.8" fill="none" opacity=".6"/><path d="${line(b)}" stroke="#fff" stroke-width=".6" fill="none"/>`) + glow(`<path d="${line(bolt())}" stroke="${c}" stroke-width=".5" fill="none" opacity=".7"/>`);
      for (let k = 0; k < 3; k++) { const s = b[2 + k * 2]; m += glow(`<path d="${line([s, [s[0] + rr(r, -4, 8), s[1] + rr(r, 6, 12)], [s[0] + rr(r, 0, 10), s[1] + rr(r, 12, 20)]])}" stroke="${c}" stroke-width=".4" fill="none"/>`); }
      m += impact(x1, y1, 1);
    } else if (t === 'frost' || t === 'shards') {
      const n = t === 'shards' ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const ox = k * 9 - (n - 1) * 4.5, oy = -k * 11 + (n - 1) * 5.5, tx = 100 + ox, ty = 50 + oy;
        m += `<path d="M${36 + ox} ${76 + oy}L${tx - 8} ${ty + 5}" stroke="${c}" stroke-width="3" opacity=".25" filter="url(#gl)"/>`;
        m += `<path class="${t === 'frost' ? 'cr' : 'gs'}" d="${poly([[tx - 18, ty + 9], [tx - 4, ty - 2.6], [tx + 8, ty - 6], [tx - 2, ty + 3]])}"/>` + glow(`<path d="M${tx - 16} ${ty + 8}L${tx + 7} ${ty - 5.6}" stroke="#fff" stroke-width=".4"/>`);
        for (let j = 0; j < 8; j++) m += `<circle cx="${f1(36 + ox + rr(r, 0, 50))}" cy="${f1(76 + oy - rr(r, 0, 28))}" r="${f1(rr(r, 0.3, 0.9))}" fill="${c}" opacity=".7"/>`;
      }
      m += impact(x1 + 4, y1 + 2, 0.8);
    } else if (t === 'psi') {
      m += [10, 22, 34, 48, 62].map((rad, k) => glow(`<path d="M${f1(30 + rad * 0.6)} ${f1(80 - rad * 1.2)} Q${f1(30 + rad * 1.4)} ${f1(80 - rad * 0.4)} ${f1(30 + rad * 1.1)} ${f1(80 + rad * 0.2)}" stroke="${c}" stroke-width="${f1(1.6 - k * 0.22)}" fill="none" opacity="${f1(1 - k * 0.14)}"/>`, 0.8)).join('');
      m += `<g filter="url(#aur)" opacity=".6"><circle cx="122" cy="52" r="9" fill="${c}"/></g>`;
    } else if (t === 'drain') {
      m += `<path class="o" d="M110 98 Q112 60 126 52 Q142 50 144 64 Q146 80 140 98Z"/>` + glow(`<circle cx="128" cy="60" r="1.4" fill="${EM(10)}"/>`);
      for (let k = 0; k < 4; k++) { const cx = rr(r, 70, 100), cy = rr(r, 20, 60); m += `<path d="M120 ${64 + k * 4} Q${f1(cx)} ${f1(cy)} ${f1(36 + k * 2)} ${f1(70 + k * 3)}" stroke="${c}" stroke-width="${f1(4 - k * 0.6)}" fill="none" opacity=".35" filter="url(#aur)"/>` + glow(`<path d="M120 ${64 + k * 4} Q${f1(cx)} ${f1(cy)} ${f1(36 + k * 2)} ${f1(70 + k * 3)}" stroke="${k % 2 ? EM(6) : c}" stroke-width="${f1(0.9 - k * 0.15)}" fill="none"/>`); for (let j = 0; j < 5; j++) { const t = rr(r, 0.1, 0.9), x = (1 - t) * (1 - t) * 120 + 2 * t * (1 - t) * cx + t * t * 36, y = (1 - t) * (1 - t) * (64 + k * 4) + 2 * t * (1 - t) * cy + t * t * 70; m += glow(`<circle cx="${f1(x)}" cy="${f1(y)}" r=".8" fill="#fff"/>`); } }
      m += glow(`<circle cx="36" cy="72" r="3.4" fill="${c}"/>`) + `<path class="o" d="M20 100 Q22 76 34 72 Q42 74 44 86 L46 100Z"/>`;
    } else {
      m += `<path d="M${x0 + 10} ${y0 - 6}L${x1 - 6} ${y1 + 3}" stroke="url(#tr)" stroke-width="6" stroke-linecap="round"/>`;
      m += `<ellipse cx="${x1 - 10}" cy="${y1 + 4}" rx="9" ry="3.6" fill="${c}" opacity=".6" filter="url(#gl)" transform="rotate(-23 ${x1 - 10} ${y1 + 4})"/>` + glow(`<ellipse cx="${x1 - 9}" cy="${y1 + 3.6}" rx="5" ry="2" fill="#fff" transform="rotate(-23 ${x1 - 9} ${y1 + 3.6})"/>`);
      m += impact(x1 + 2, y1, 0.7);
    }
    return m;
  },

  blast(r, h, o) {
    const t = o.type, col = { flak: 'hsl(35,100%,60%)', orbital: 'hsl(28,100%,62%)', broadside: 'hsl(30,100%,62%)', acid: EM(4), arc: 'hsl(200,100%,74%)', emp: EM(6), cryo: 'hsl(190,90%,82%)', psi: EM(10), void: EM(4) }[t] || 'hsl(30,100%,60%)';
    let m = '';
    const boom = (x, y, s) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(16 * s)}" fill="url(#ipc)"/>` + glow(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3.4 * s)}" fill="#fff8e8"/>`);
    if (t === 'orbital') {
      for (let k = 0; k < 3; k++) m += `<g transform="translate(${f1(rr(r, 30, 130))} ${f1(rr(r, 4, 14))}) rotate(-10) scale(.16)" opacity=".7"><path d="M30 0 L-20 -4 L-26 -2 L-26 3 L-20 5Z" fill="#05070a"/></g>`;
      const hits = Array.from({ length: 3 }, (_, k) => [44 + k * 34 + rr(r, -6, 6), rr(r, 80, 86)]);
      m += hits.map(([x, y]) => `<path d="M${f1(x + 14)} -4 L${f1(x)} ${f1(y)}" stroke="${col}" stroke-width="7" opacity=".22" filter="url(#gl)"/>` + glow(`<path d="M${f1(x + 14)} -4 L${f1(x)} ${f1(y)}" stroke="#fff" stroke-width="1.1"/>`)).join('');
      m += hits.map(([x, y]) => `<ellipse cx="${f1(x)}" cy="${f1(y - 6)}" rx="16" ry="10" fill="hsl(20,30%,16%)" opacity=".75" filter="url(#bl)"/>` + boom(x, y, 1.1) + `<ellipse cx="${f1(x)}" cy="${f1(y + 1)}" rx="20" ry="2.6" fill="none" stroke="${col}" stroke-width=".6" opacity=".7"/>`).join('');
    }
    if (t === 'flak') {
      for (let k = 0; k < 3; k++) m += `<g transform="translate(${f1(rr(r, 30, 130))} ${f1(rr(r, 14, 50))}) rotate(${f1(rr(r, -30, 10))}) scale(.32)"><path d="M30 0 L6 -4 L-10 -18 L-16 -16 L-12 -4 L-20 -3 L-20 3 L-12 4 L-16 16 L-10 18 L6 4Z" fill="#06080b"/></g>`;
      for (let k = 0; k < 9; k++) { const x = rr(r, 20, 140), y = rr(r, 8, 56); m += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(r, 3, 6))}" fill="hsl(25,10%,14%)" opacity=".8" filter="url(#hz)"/>` + boom(x, y, rr(r, 0.35, 0.6)); }
      for (let k = 0; k < 6; k++) { const x = rr(r, 10, 150); m += glow(`<path d="M${f1(x)} 100 L${f1(x + rr(r, 10, 30))} ${f1(rr(r, 30, 70))}" stroke="${col}" stroke-width=".4" stroke-dasharray="3 4" opacity=".8"/>`); }
    }
    if (t === 'broadside') {
      m += `<g transform="translate(20 34) rotate(8) scale(.6)">${hullShip(r, { size: 1.1, turrets: 3 })}</g>`;
      for (let k = 0; k < 10; k++) { const sx = rr(r, 4, 46), sy = rr(r, 30, 40), ex = rr(r, 100, 150), ey = rr(r, 40, 80); m += glow(`<path d="M${f1(sx)} ${f1(sy)}L${f1(ex)} ${f1(ey)}" stroke="${col}" stroke-width=".5" stroke-dasharray="5 6" opacity=".9"/>`) + glow(`<circle cx="${f1(sx)}" cy="${f1(sy)}" r="1.2" fill="#fff"/>`); }
      m += `<g transform="translate(128 62) rotate(-170) scale(.45)">${hullShip(r, { size: 0.9, wreck: 1 })}</g>` + boom(124, 60, 1) + boom(136, 70, 0.6);
    }
    if (t === 'acid') {
      m += `<path d="M30 100 L32 72 L40 70 L42 80 L52 78 L54 100Z M100 100 L104 64 L114 62 L118 74 L126 72 L128 100Z" fill="#05070a"/>`;
      m += glow(Array.from({ length: 40 }, () => { const x = rr(r, 0, 170), y = rr(r, -5, 90); return `<path d="M${f1(x)} ${f1(y)}l-2.4 8" stroke="${col}" stroke-width=".7" opacity="${f1(rr(r, 0.5, 1))}"/>`; }).join(''), 0.9) + glow(Array.from({ length: 10 }, () => `<ellipse cx="${f1(rr(r, 10, 150))}" cy="${f1(rr(r, 88, 98))}" rx="1.6" ry=".5" fill="#fff"/>`).join(''));
      m += `<ellipse cx="80" cy="94" rx="60" ry="5" fill="${col}" opacity=".3" filter="url(#gl)"/>` + Array.from({ length: 6 }, () => `<ellipse cx="${f1(rr(r, 20, 140))}" cy="${f1(rr(r, 86, 96))}" rx="${f1(rr(r, 6, 16))}" ry="${f1(rr(r, 3, 8))}" fill="${col}" opacity=".18" filter="url(#bl)"/>`).join('');
      m += `<g opacity=".5" filter="url(#bl)"><ellipse cx="80" cy="12" rx="80" ry="16" fill="${col}" opacity=".4"/><ellipse cx="50" cy="8" rx="40" ry="10" fill="${ch(IP.fog, 10)}"/></g>`;
      m += `<path d="M62 100 L64 70 L58 60 L66 48 L78 44 L92 46 L100 58 L96 70 L98 100Z" fill="#05070a"/>` + glow(`<path d="M66 48 L78 44 L92 46 L100 58" stroke="${col}" stroke-width=".6" fill="none"/>` + Array.from({ length: 7 }, () => { const x = rr(r, 62, 98), y = rr(r, 48, 70); return `<path d="M${f1(x)} ${f1(y)}v${f1(rr(r, 3, 9))}" stroke="${col}" stroke-width=".6"/><circle cx="${f1(x)}" cy="${f1(y)}" r=".9" fill="${col}"/>`; }).join(''), 0.9);
    }
    if (t === 'arc') {
      const pts = [[36, 84], [62, 80], [92, 86], [122, 80]];
      m += pts.map(([x, y]) => `<path d="M${x - 4} 100 L${x - 3} ${y - 6} Q${x} ${y - 14} ${x + 3} ${y - 6} L${x + 4} 100Z" fill="#05070a"/>`).join('');
      m += glow((() => { let p = [[pts[0][0] - 10, -4]]; for (let y = 10; y < pts[0][1] - 10; y += 10) p.push([pts[0][0] + rr(r, -6, 6), y]); p.push([pts[0][0], pts[0][1] - 12]); return `<path d="${line(p)}" stroke="#fff" stroke-width=".9" fill="none"/>`; })());
      for (let k = 0; k < pts.length - 1; k++) { const [a, b] = [pts[k], pts[k + 1]], p = [[a[0], a[1] - 12]]; for (let j = 1; j < 5; j++) p.push([a[0] + (b[0] - a[0]) * j / 5 + rr(r, -3, 3), a[1] - 12 + rr(r, -6, 6)]); p.push([b[0], b[1] - 12]); m += glow(`<path d="${line(p)}" stroke="${col}" stroke-width="1.6" fill="none" opacity=".6"/><path d="${line(p)}" stroke="#fff" stroke-width=".5" fill="none"/>`); }
      m += pts.map(([x, y]) => boom(x, y - 12, 0.45)).join('');
    }
    if (t === 'emp' || t === 'cryo' || t === 'void' || t === 'psi') {
      const cy = t === 'psi' ? 40 : 86;
      if (t === 'psi') {
        for (let k = 0; k < 5; k++) m += `<ellipse cx="80" cy="${cy}" rx="${16 + k * 14}" ry="${f1(5 + k * 4)}" fill="none" stroke="${col}" stroke-width="${f1(2.4 - k * 0.4)}" opacity="${f1(0.7 - k * 0.1)}" filter="url(#aur)"/>`;
        for (let k = 0; k < 4; k++) { const x = rr(r, 40, 120), p = [[80 + rr(r, -10, 10), cy + 4]]; for (let y = cy + 14; y < 92; y += 10) p.push([x + rr(r, -6, 6), y]); m += glow(`<path d="${line(p)}" stroke="#fff" stroke-width=".6" fill="none"/>`) + boom(p[p.length - 1][0], p[p.length - 1][1], 0.4); }
        m += glow(`<ellipse cx="80" cy="${cy}" rx="8" ry="3" fill="#fff"/>`);
      } else {
        m += `<path d="M14 ${cy} A66 66 0 0 1 146 ${cy}Z" fill="${t === 'void' ? '#000' : col}" opacity="${t === 'void' ? 0.65 : 0.12}"/>`;
        m += glow(`<path d="M14 ${cy} A66 66 0 0 1 146 ${cy}" fill="none" stroke="${col}" stroke-width="1.4"/><path d="M30 ${cy} A50 50 0 0 1 130 ${cy}" fill="none" stroke="${col}" stroke-width=".5" opacity=".6"/>`, 0.9);
        m += `<ellipse cx="80" cy="${cy}" rx="66" ry="5" fill="none" stroke="${col}" stroke-width=".8" opacity=".7"/>` + boom(80, cy - 2, t === 'void' ? 0.4 : 1);
        if (t === 'emp') for (let k = 0; k < 6; k++) { const a = rr(r, Math.PI * 1.05, Math.PI * 1.95), x = 80 + Math.cos(a) * 66, y = cy + Math.sin(a) * 66, p = [[x, y]]; for (let j = 0; j < 3; j++) p.push([p[j][0] + rr(r, -5, 5), p[j][1] + rr(r, 3, 7)]); m += glow(`<path d="${line(p)}" stroke="#fff" stroke-width=".5" fill="none"/>`); }
        if (t === 'cryo') for (let k = 0; k < 9; k++) { const x = rr(r, 26, 134), ht = rr(r, 8, 26); m += `<path class="cr" d="${poly([[x - 2.4, cy + 2], [x + rr(r, -4, 4), cy - ht], [x + 2.4, cy + 2]])}"/>`; }
        if (t === 'void') for (let k = 0; k < 12; k++) { const x = rr(r, 20, 140), y = rr(r, 30, cy - 4), s = rr(r, 1, 3); m += `<path class="gs" d="${poly([[x, y - s * 1.8], [x + s * 0.6, y], [x, y + s * 1.2], [x - s * 0.5, y]])}"/>`; }
      }
    }
    return m;
  },

  emblem(r, h, o) {
    const c = EM(6), c2 = EM(18), T = o.type;
    const S = (d, w) => `<path d="${d}" stroke="${c2}" stroke-width="${w || 1.3}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    const hex = (cx, cy, R) => poly(Array.from({ length: 6 }, (_, k) => [cx + Math.cos(k * Math.PI / 3 + Math.PI / 6) * R, cy + Math.sin(k * Math.PI / 3 + Math.PI / 6) * R]));
    // cinematic set pieces for the protocols that describe an action
    if (T === 'shield' || T === 'fort') {
      let m = '';
      if (T === 'fort') m += `<path d="M10 100 L14 84 L40 82 L46 88 L114 88 L120 82 L148 84 L152 100Z" class="hb"/><path d="M40 82 L46 88 L114 88 L120 82" stroke="url(#haz)" stroke-width="1.6" fill="none"/>` + [52, 70, 88, 104].map(x => `<path d="M${x} 88 L${x + 1} 78 Q${x + 4} 72 ${x + 7} 78 L${x + 8} 88Z" fill="#06080b"/><rect x="${x + 4}" y="75" width="2.4" height=".7" fill="${c2}"/>`).join('');
      else m += `<path class="hb" d="M46 92 L54 72 L106 72 L114 92Z"/><path class="h" d="M54 72 L60 64 L100 64 L106 72Z"/>` + glow(`<path d="M60 70h40" stroke="${c}" stroke-width=".6"/>`);
      m += `<path d="M16 90 A64 58 0 0 1 144 90Z" fill="url(#hex)" opacity=".55"/><path d="M16 90 A64 58 0 0 1 144 90Z" fill="${c}" opacity=".08"/>`;
      m += glow(`<path d="M16 90 A64 58 0 0 1 144 90" fill="none" stroke="${c2}" stroke-width="1"/><path d="M40 90 A40 50 0 0 1 120 90" fill="none" stroke="${c}" stroke-width=".3" opacity=".6"/>`, 0.9);
      for (let k = 0; k < 4; k++) { const a = rr(r, Math.PI * 1.15, Math.PI * 1.85), x = 80 + Math.cos(a) * 64, y = 90 + Math.sin(a) * 58; m += glow(`<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="none" stroke="${c2}" stroke-width=".5"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1" fill="#fff"/>`) + glow(`<path d="M${f1(x + 30)} ${f1(y - 30)}L${f1(x + 2)} ${f1(y - 2)}" stroke="hsl(30,100%,62%)" stroke-width=".4"/>`, 0.6); }
      return m;
    }
    if (T === 'crate') {
      const pod = o.market || IP === IPAL.raider;
      if (pod) {
        let m = `<path d="M30 100 L34 60 L48 58 L50 100Z M112 100 L114 54 L130 56 L132 100Z" fill="#06070a"/>`;
        m += `<path class="hb" d="M54 96 L58 70 L102 70 L106 96Z"/><path class="h" d="M58 70 L64 62 L100 62 L102 70Z"/><path class="l" d="M60 82H100M80 70V96"/><path d="M58 88 L104 88" stroke="url(#haz)" stroke-width="2.4"/>`;
        m += glow(`<path d="M62 66H98" stroke="${c}" stroke-width=".6"/>`) + [[46, 34, 'CR'], [104, 28, '%'], [72, 22, '$']].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="10" fill="${c}" fill-opacity=".12" stroke="${c2}" stroke-width=".4"/><path d="M${x + 2} ${y + 3}h10M${x + 2} ${y + 6}h6" stroke="${c2}" stroke-width=".5"/>`).join('');
        return m;
      }
      let m = `<path d="M74 0 L86 0 L84 46 L76 46Z" fill="${EM()}" opacity=".08"/>`;
      m += `<g transform="rotate(8 80 50)"><path class="h" d="${poly([[70, 30], [90, 30], [94, 64], [66, 64]])}"/><path class="hb" d="${poly([[82, 30], [90, 30], [94, 64], [84, 64]])}"/><path class="h" d="${poly([[72, 30], [80, 18], [88, 30]])}"/><path class="l" d="M68 46H92M68 56H93"/><path d="M68 52H93" stroke="url(#haz)" stroke-width="1.6"/>`;
      m += glow(`<ellipse cx="80" cy="74" rx="7" ry="10" fill="url(#pm)" transform="rotate(90 80 74)"/><path d="M68 66 L60 80M92 66 L100 80" stroke="hsl(30,100%,70%)" stroke-width="1.4"/>`) + `<circle cx="80" cy="22" r=".9" fill="hsl(0,100%,60%)"/></g>`;
      m += `<ellipse cx="80" cy="92" rx="36" ry="5" fill="hsl(30,20%,40%)" opacity=".35" filter="url(#bl)"/>` + glow(`<ellipse cx="80" cy="92" rx="12" ry="1.6" fill="none" stroke="${c2}" stroke-width=".5"/><path d="M68 92h-6M92 92h6" stroke="${c2}" stroke-width=".5"/>`);
      return m;
    }
    if (T === 'target') {
      let m = `<path d="M100 98 L103 70 Q100 60 106 52 Q112 46 118 48 Q126 50 127 58 Q130 66 124 72 L128 98Z" fill="#05070a"/><rect x="113" y="54" width="6" height="1.2" fill="hsl(0,100%,60%)"/>`;
      m += `<path d="M0 0H160V100H0Z M114 60 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0Z" fill="#000" fill-rule="evenodd" opacity=".72"/>`;
      m += glow(`<circle cx="114" cy="60" r="34" fill="none" stroke="${c2}" stroke-width=".8"/><path d="M80 60H106M122 60H148M114 26V52M114 68V94" stroke="${c2}" stroke-width=".5"/><circle cx="114" cy="60" r="4" fill="none" stroke="hsl(0,100%,60%)" stroke-width=".7"/>`, 0.9);
      m += `<path d="M84 74h6M84 78h10M84 82h4" stroke="${c}" stroke-width=".6"/><path d="M136 40l4 -4M138 44h6" stroke="${c}" stroke-width=".5"/>` + glow(`<path d="${poly([[110, 36], [118, 36], [114, 40]])}" fill="hsl(0,100%,60%)"/>`);
      return m;
    }
    if (T === 'smoke') {
      let m = [[52, 90], [96, 92], [124, 88]].map(([x, y]) => `<path d="M${x - 4} 100 L${x - 3} ${y - 14} Q${x} ${y - 20} ${x + 3} ${y - 14} L${x + 4} 100Z" fill="#06070a"/><rect x="${x}" y="${y - 17}" width="2.6" height=".8" fill="hsl(0,100%,58%)"/>`).join('');
      m += `<g filter="url(#bl)">${Array.from({ length: 9 }, () => `<circle cx="${f1(rr(r, 10, 150))}" cy="${f1(rr(r, 50, 96))}" r="${f1(rr(r, 12, 24))}" fill="hsl(${IP.fog[0]},8%,${Math.round(rr(r, 26, 40))}%)" opacity=".8"/>`).join('')}</g>`;
      m += `<g filter="url(#aur)" opacity=".5">${Array.from({ length: 5 }, () => `<circle cx="${f1(rr(r, 20, 140))}" cy="${f1(rr(r, 40, 80))}" r="${f1(rr(r, 8, 14))}" fill="hsl(${IP.fog[0]},8%,46%)"/>`).join('')}</g>`;
      return m + glow(`<circle cx="44" cy="70" r="1.4" fill="hsl(28,100%,60%)"/>`);
    }
    if (T === 'syringe') {
      let m = limb3([-8, 104], [30, 84], [64, 66], 9, 7, 6, 'h') + bar([34, 82], [62, 67], 7.4, 6.4, 'hb');
      m += `<path class="w" d="${poly([[58, 60], [92, 40], [98, 48], [64, 70]])}"/>` + glow(`<path d="${poly([[66, 61], [88, 48], [91, 52], [69, 65]])}" fill="${c}" opacity=".85"/>`) + `<path d="M96 44 L110 36" stroke="#d8e0e8" stroke-width=".7"/>`;
      m += `<rect x="96" y="56" width="40" height="22" fill="${c}" fill-opacity=".1" stroke="${c2}" stroke-width=".4"/>` + glow(`<path d="${line([[98, 68], [106, 68], [109, 60], [112, 74], [115, 64], [118, 68], [134, 68]])}" stroke="${c2}" stroke-width=".6" fill="none"/>`) + `<path d="M98 59h12M98 75h20" stroke="${c}" stroke-width=".5"/>`;
      return m;
    }
    if (T === 'eye' || T === 'neural') {
      if (T === 'eye') {
        let m = `<g filter="url(#aur)" opacity=".7"><path d="M32 50 Q80 14 128 50 Q80 86 32 50Z" fill="${c}"/></g><path d="M34 50 Q80 18 126 50 Q80 82 34 50Z" fill="#05030a"/>`;
        m += glow(`<circle cx="80" cy="50" r="14" fill="none" stroke="${c2}" stroke-width="1.2"/><circle cx="80" cy="50" r="7" fill="${c}"/><circle cx="80" cy="50" r="3" fill="#fff"/>`);
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; m += `<path d="M${f1(80 + Math.cos(a) * 16)} ${f1(50 + Math.sin(a) * 16)}L${f1(80 + Math.cos(a) * 26)} ${f1(50 + Math.sin(a) * 22)}" stroke="${c2}" stroke-width=".4" opacity=".6"/>`; }
        return m;
      }
      let m = `<path class="hb" d="M58 100 Q58 84 66 78 Q60 70 60 56 Q60 34 80 30 Q100 30 104 50 L110 62 L104 64 Q106 74 98 76 L96 84 Q104 88 106 100Z"/><path d="M80 30 Q100 30 104 50 L110 62 L104 64 Q106 74 98 76 L96 84 Q86 84 82 72Z" fill="#000" opacity=".4"/>`;
      m += glow([[74, 44], [86, 40], [92, 52], [78, 56], [70, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('') + `<path d="M74 44L86 40L92 52L78 56L70 52Z M74 44L92 52M86 40L78 56" stroke="${c2}" stroke-width=".4" fill="none"/>`);
      for (let k = 0; k < 6; k++) m += glow(`<path d="M${f1(80 + rr(r, -10, 10))} ${f1(rr(r, 36, 56))} Q${f1(rr(r, 20, 140))} ${f1(rr(r, 0, 30))} ${f1(rr(r, 0, 160))} ${f1(rr(r, -4, 20))}" stroke="${c}" stroke-width=".7" fill="none"/>`, 0.7);
      return m;
    }
    if (T === 'void') {
      let m = `<ellipse cx="80" cy="52" rx="50" ry="13" fill="none" stroke="${c}" stroke-width="5" opacity=".25" filter="url(#bl)"/>`;
      m += glow(`<ellipse cx="80" cy="52" rx="44" ry="10" fill="none" stroke="${c2}" stroke-width="1"/><ellipse cx="80" cy="52" rx="30" ry="6.4" fill="none" stroke="#fff" stroke-width=".5"/>`) + `<circle cx="80" cy="52" r="15" fill="#000"/><path d="M65 52 A15 15 0 0 1 95 52" fill="none" stroke="${c2}" stroke-width=".6"/>`;
      for (let k = 0; k < 14; k++) { const a = rr(r, 0, Math.PI * 2), d = rr(r, 20, 60), s = rr(r, 1, 3); m += `<path class="gs" d="${poly([[0, -s * 1.6], [s * 0.6, 0], [0, s * 1.2], [-s * 0.5, 0]])}" transform="translate(${f1(80 + Math.cos(a) * d)} ${f1(52 + Math.sin(a) * d * 0.6)}) rotate(${Math.round(a * 57)})"/>`; }
      return m;
    }
    if (T === 'heat') {
      let m = `<path class="h" d="M30 100 L36 46 L124 46 L130 100Z"/><path class="hb" d="M36 46 L124 46 L120 54 L40 54Z"/>`;
      for (let k = 0; k < 5; k++) m += `<rect class="d" x="${44 + k * 15}" y="58" width="10" height="30" rx="1"/>` + glow(`<rect x="${45 + k * 15}" y="60" width="8" height="26" fill="hsl(${18 + k * 4},100%,${52 + (k % 2) * 6}%)" opacity=".85"/>`, 0.9);
      m += `<g filter="url(#aur)" opacity=".55">${[0, 1, 2, 3, 4].map(k => `<path d="M${49 + k * 15} 46 Q${44 + k * 15} 26 ${52 + k * 15} 6" stroke="hsl(30,100%,62%)" stroke-width="4" fill="none"/>`).join('')}</g>`;
      return m;
    }
    if (T === 'helix') {
      let p1 = '', p2 = '', rungs = '';
      for (let k = 0; k <= 24; k++) { const y = 10 + k * 3.3, x1 = 80 + Math.sin(k * 0.55) * 16, x2 = 80 - Math.sin(k * 0.55) * 16; p1 += (k ? 'L' : 'M') + f1(x1) + ' ' + f1(y); p2 += (k ? 'L' : 'M') + f1(x2) + ' ' + f1(y); if (k % 2) rungs += `M${f1(x1)} ${f1(y)}L${f1(x2)} ${f1(y)}`; }
      return `<g filter="url(#aur)" opacity=".5"><path d="${p1}" stroke="${c}" stroke-width="3" fill="none"/></g>` + glow(`<path d="${p1}" stroke="${c2}" stroke-width="1.6" fill="none"/><path d="${p2}" stroke="${c}" stroke-width="1.6" fill="none" opacity=".75"/><path d="${rungs}" stroke="${c2}" stroke-width=".5" fill="none"/>`);
    }
    // a holographic interface projected over an emitter
    let g = '';
    if (T === 'repair') g = S('M62 70L84 48') + S('M84 48a10 10 0 1 1 10 -10l-6 2l-2 6z') + S(hex(64, 68, 9), 0.6);
    else if (T === 'cycle') g = S('M58 48a22 22 0 0 1 40 -13') + S('M102 48a22 22 0 0 1 -40 13') + S('M92 27l6 8l-9 2M68 69l-6 -8l9 -2', 1.1) + S('M80 48m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', 0.5);
    else if (T === 'chevrons') g = S('M60 70l20 -15l20 15', 2) + S('M60 54l20 -15l20 15', 2) + S('M60 38l20 -15l20 15', 1);
    else if (T === 'emp') g = S('M80 48m-26 0a26 26 0 1 0 52 0a26 26 0 1 0 -52 0', 0.9) + S('M84 26L72 50h12L76 70', 1.8) + S('M60 68L100 28', 0.6);
    else g = S('M80 22v14M80 62v14M52 48h14M94 48h14') + S('M80 48m-20 0a20 20 0 1 0 40 0a20 20 0 1 0 -40 0', 1);
    let m = `<path d="M66 90 L94 90 L124 14 L36 14Z" fill="url(#cone)"/>`;
    m += `<path class="h" d="M58 100 L64 90 L96 90 L102 100Z"/><path class="hb" d="M64 90 L96 90 L94 93 L66 93Z"/>` + glow(`<ellipse cx="80" cy="90" rx="15" ry="2" fill="none" stroke="${c2}" stroke-width=".7"/>`);
    m += glow(g, 0.95) + `<rect x="40" y="16" width="80" height="70" fill="url(#scan)" opacity=".5"/>`;
    m += [[24, 34], [118, 52]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="13" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-width=".35" opacity=".85"/><path d="M${x + 2} ${y + 3}h${f1(rr(r, 8, 15))}M${x + 2} ${y + 6}h${f1(rr(r, 5, 14))}M${x + 2} ${y + 9}h${f1(rr(r, 6, 12))}" stroke="${c}" stroke-width=".5" opacity=".8"/>`).join('');
    return m;
  },

  weapon(r, h, o) {
    const t = o.type, c = EM(6);
    let m = `<ellipse cx="80" cy="88" rx="50" ry="5" fill="${c}" opacity=".18" filter="url(#bl)"/>` + glow(`<ellipse cx="80" cy="88" rx="40" ry="2.6" fill="none" stroke="${c}" stroke-width=".4"/>`, 0.6);
    if (t === 'blade' || t === 'knife') {
      const L = t === 'knife' ? 52 : 84, bc = t === 'knife' ? 'hsl(40,100%,62%)' : EM(4), x0 = 80 - L / 2;
      m += `<g transform="rotate(-22 80 52)"><rect class="w" x="${x0}" y="49.5" width="22" height="7" rx="1.4"/><path class="l" d="M${x0 + 4} 50v6M${x0 + 8} 50v6M${x0 + 12} 50v6"/><path class="h" d="${poly([[x0 + 20, 45], [x0 + 25, 46], [x0 + 25, 60], [x0 + 20, 61]])}"/>`;
      if (t === 'knife') m += `<path class="h" d="${poly([[x0 + 25, 49], [80 + L / 2, 51], [80 + L / 2 + 6, 53.6], [x0 + 25, 56.6]])}"/>` + glow(`<path d="M${x0 + 26} 56.2L${80 + L / 2 + 4} 53.6" stroke="${bc}" stroke-width=".9"/>`);
      else m += `<path class="w" d="${poly([[x0 + 25, 49.6], [x0 + 34, 50.4], [x0 + 34, 55.6], [x0 + 25, 56.4]])}"/>` + `<path d="${poly([[x0 + 34, 50], [80 + L / 2, 51.8], [80 + L / 2 + 7, 53.4], [x0 + 34, 56]])}" fill="${bc}" opacity=".55" filter="url(#gl)"/>` + glow(`<path d="${poly([[x0 + 34, 51.4], [80 + L / 2, 52.6], [80 + L / 2 + 5, 53.3], [x0 + 34, 54.8]])}" fill="#fff"/>`);
      m += glow(`<circle cx="${x0 + 22.6}" cy="53" r=".9" fill="${bc}"/>`) + '</g>';
    } else if (t === 'baton') {
      m += `<g transform="rotate(-30 80 52)"><rect class="w" x="36" y="48" width="58" height="8" rx="2"/><rect class="h" x="94" y="45.6" width="16" height="12.8" rx="2"/>${[0, 1, 2, 3].map(k => `<path class="l" d="M${44 + k * 10} 48v8"/>`).join('')}` + glow(`<path d="M40 52H92" stroke="${c}" stroke-width=".5"/><rect x="108" y="47" width="3" height="10" fill="#e8f8ff"/>`) + '</g>';
      m += glow(`<path d="${line([[112, 24], [118, 18], [114, 14], [124, 6]])}" stroke="hsl(195,100%,78%)" stroke-width="1" fill="none"/><path d="${line([[106, 22], [100, 14], [104, 10], [98, 2]])}" stroke="hsl(195,100%,78%)" stroke-width=".6" fill="none"/><path d="${line([[116, 30], [126, 30], [124, 36], [134, 38]])}" stroke="hsl(195,100%,78%)" stroke-width=".6" fill="none"/>`);
    } else { // rifle / harpoon / cannon
      const big = t === 'cannon';
      m += `<g transform="rotate(-12 80 52)"><path class="w" d="${poly([[30, 50], [92, 45], [98, 52], [70, 57], [62, 68], [51, 68], [55, 57], [30, 60]])}"/><path class="h" d="${poly([[44, 47.8], [90, 44.6], [94, 48], [44, 51]])}"/>`;
      m += `<rect class="w" x="92" y="${big ? 42 : 46.4}" width="${t === 'rifle' ? 48 : 30}" height="${big ? 11 : 4}"/><rect class="d" x="${t === 'rifle' ? 136 : 118}" y="${big ? 43 : 47}" width="${big ? 8 : 6}" height="${big ? 9 : 2.8}"/><rect class="h" x="58" y="38" width="24" height="5.4" rx="1"/><circle class="d" cx="82" cy="40.7" r="2.2"/>`;
      if (t === 'rifle') m += [0, 1, 2, 3, 4].map(k => `<rect class="hb" x="${98 + k * 7}" y="45.4" width="2.4" height="6"/>`).join('') + glow(`<path d="M96 48.4H138" stroke="${c}" stroke-width=".7"/>`);
      if (t === 'harpoon') m += `<path class="h" d="${poly([[118, 46], [136, 48.4], [118, 51.2]])}"/><path d="M96 49 Q110 62 120 49" stroke="${ch(IP.arm)}" stroke-width=".6" fill="none"/>` + glow(`<path d="M120 48.6H135" stroke="${c}" stroke-width=".5"/>`);
      if (big) m += [0, 1, 2].map(k => `<circle class="d" cx="${100 + k * 8}" cy="47.5" r="3.4"/><circle cx="${100 + k * 8}" cy="47.5" r="1.2" fill="${c}"/>`).join('');
      m += `<path class="l" d="M40 54H90"/>` + glow(`<rect x="60" y="39.6" width="7" height="1.6" fill="hsl(0,100%,60%)"/><path d="M34 55.4H86" stroke="${c}" stroke-width=".55"/>`) + '</g>';
    }
    const dims = `<g stroke="${c}" stroke-width=".3" opacity=".5" fill="none"><path d="M24 94H136M24 91v6M136 91v6"/><path d="M18 14v72M15 14h6M15 86h6"/></g>`;
    return dims + `<g transform="translate(80 56) scale(1.22) translate(-80 -54)">${m}</g>`;
  },

  trap(r, h, o) {
    const t = o.type, c = EM(4), c2 = EM(18);
    if (t === 'singularity') {
      let m = `<circle cx="80" cy="52" r="34" fill="url(#ipc)" opacity=".5"/>`;
      for (let k = 0; k < 5; k++) m += glow(`<ellipse cx="80" cy="52" rx="${18 + k * 9}" ry="${f1(5 + k * 2.6)}" fill="none" stroke="${c2}" stroke-width="${f1(1.2 - k * 0.18)}" opacity="${f1(0.9 - k * 0.15)}" transform="rotate(${-10 + k * 4} 80 52)"/>`, 0.8);
      m += `<circle cx="80" cy="52" r="12" fill="#000"/><circle cx="80" cy="52" r="12.6" fill="none" stroke="#fff" stroke-width=".5"/>`;
      for (let k = 0; k < 14; k++) { const a = rr(r, 0, Math.PI * 2), d = rr(r, 18, 52), s = rr(r, 0.8, 2.6); m += `<path class="h" d="${poly([[0, -s], [s * 1.4, 0], [0, s], [-s * 0.8, 0]])}" transform="translate(${f1(80 + Math.cos(a) * d)} ${f1(52 + Math.sin(a) * d * 0.5)}) rotate(${Math.round(a * 57 + 80)})"/><path d="M${f1(80 + Math.cos(a) * d)} ${f1(52 + Math.sin(a) * d * 0.5)}l${f1(Math.cos(a + 1.4) * 5)} ${f1(Math.sin(a + 1.4) * 2.5)}" stroke="${c}" stroke-width=".3" opacity=".7"/>`; }
      return m;
    }
    if (t === 'mirror') {
      let g = '';
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2, x = 80 + Math.cos(a) * 26, y = 52 + Math.sin(a) * 18, R = 9.6;
        g += `<path class="g" d="${poly(Array.from({ length: 6 }, (_, j) => [x + Math.cos(j * Math.PI / 3) * R, y + Math.sin(j * Math.PI / 3) * R * 0.9]))}" stroke="${c2}" stroke-width=".5"/><path d="M${f1(x - 5)} ${f1(y - 4)}L${f1(x + 2)} ${f1(y - 7)}" stroke="#fff" stroke-width=".5" opacity=".7"/>`;
      }
      return glow(`<path d="M0 30 L80 52 L160 22" stroke="${c2}" stroke-width=".6" fill="none"/>`, 0.7) + g + glow(`<circle cx="80" cy="52" r="7" fill="none" stroke="${c2}" stroke-width="1.2"/><circle cx="80" cy="52" r="2" fill="#fff"/>`);
    }
    if (t === 'null') {
      let m = `<circle cx="80" cy="52" r="34" fill="${c}" opacity=".12" filter="url(#aur)"/><circle cx="80" cy="52" r="30" fill="url(#hex)" opacity=".45"/>`;
      m += glow(`<circle cx="80" cy="52" r="26" fill="none" stroke="${c2}" stroke-width="1.6"/><path d="M62 70L98 34" stroke="${c2}" stroke-width="2"/><circle cx="80" cy="52" r="34" fill="none" stroke="${c}" stroke-width=".5" stroke-dasharray="2 3"/>`);
      for (let k = 0; k < 5; k++) { const a = rr(r, 0, Math.PI * 2), p = [[80 + Math.cos(a) * 26, 52 + Math.sin(a) * 26]]; for (let j = 0; j < 3; j++) p.push([p[j][0] + Math.cos(a) * 4 + rr(r, -2, 2), p[j][1] + Math.sin(a) * 4 + rr(r, -2, 2)]); m += glow(`<path d="${line(p)}" stroke="#fff" stroke-width=".4" fill="none"/>`); }
      return m;
    }
    if (t === 'barrier') {
      let m = `<path d="M0 100 L30 70 L130 70 L160 100Z" fill="${ch(IP.dark, 4)}"/><path d="M0 0 L30 22 L30 70 L0 100Z M160 0 L130 22 L130 70 L160 100Z" class="hb"/>`;
      const bq = poly([[32, 14], [118, 26], [118, 70], [32, 86]]);
      m += `<path d="${bq}" fill="url(#hex)" opacity=".75"/><path d="${bq}" fill="${c}" opacity=".12"/>` + glow(`<path d="${bq}" fill="none" stroke="${c2}" stroke-width=".8"/><path d="M32 14V86M118 26V70" stroke="#fff" stroke-width=".6"/>`, 0.8) + `<path class="h" d="${poly([[26, 10], [32, 12], [32, 90], [26, 94]])}"/><path class="hb" d="${poly([[118, 24], [122, 25], [122, 72], [118, 72]])}"/>` + [[128, 70], [138, 72]].map(([x, y]) => `<path d="M${x - 3} 101 L${x - 2} ${y} Q${x} ${y - 6} ${x + 2} ${y} L${x + 3} 101Z" fill="#06080b"/>`).join('');
      for (let k = 0; k < 4; k++) { const x = rr(r, 44, 116), y = rr(r, 30, 62); m += glow(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(r, 2, 5))}" fill="none" stroke="#fff" stroke-width=".5"/><circle cx="${f1(x)}" cy="${f1(y)}" r=".9" fill="hsl(30,100%,66%)"/>`, 0.9); }
      return m;
    }
    // mine
    let m = `<ellipse cx="80" cy="84" rx="44" ry="6" fill="#000" opacity=".6" filter="url(#bl)"/><ellipse class="hb" cx="80" cy="76" rx="26" ry="8"/><path class="h" d="M54 74 Q80 56 106 74 Q80 80 54 74Z"/><path d="M58 76 Q80 82 102 76" stroke="url(#haz)" stroke-width="1.6" fill="none"/>`;
    m += [-18, -6, 6, 18].map(x => `<path d="M${80 + x} ${f1(68 - Math.abs(x) * 0.2)}l${f1(x * 0.3)} -10" stroke="${ch(IP.arm, -10)}" stroke-width="1"/>`).join('');
    m += glow(`<circle cx="80" cy="63" r="2.4" fill="hsl(0,100%,58%)"/><path d="M80 63 L4 54M80 63 L156 50M80 63 L30 94M80 63 L140 96" stroke="hsl(0,100%,58%)" stroke-width=".35" opacity=".8"/>`);
    return m + `<g stroke="hsl(0,90%,60%)" stroke-width=".5" fill="none" opacity=".6"><ellipse cx="80" cy="76" rx="36" ry="10"/><ellipse cx="80" cy="76" rx="52" ry="15" stroke-dasharray="2 3"/></g>`;
  },

  battery(r, h) {
    const c = EM(6);
    let m = `<path class="hb" d="M56 100 L60 88 L100 88 L104 100Z"/><rect class="h" x="64" y="18" width="32" height="70" rx="3"/><rect class="hb" x="84" y="18" width="12" height="70" rx="2"/><rect class="d" x="71" y="11" width="18" height="8"/><path class="l" d="M64 32h32M64 74h32"/>`;
    m += `<rect class="d" x="69" y="35" width="22" height="36" rx="1"/>` + glow([0, 1, 2, 3, 4].map(k => `<rect x="71" y="${37 + k * 6.6}" width="18" height="4.4" fill="${c}" opacity="${f1(1 - k * 0.12)}"/>`).join('') + `<rect x="78" y="12" width="4" height="2" fill="${c}"/>`);
    m += [[30, 40], [108, 30]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="12" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-width=".35"/><path d="M${x + 2} ${y + 4}h14M${x + 2} ${y + 8}h9" stroke="${c}" stroke-width=".5"/>`).join('');
    return m;
  },
};

// ---------------------------------------------------------------- card → subject
const ART = {
  cadet: ['trooper', { pose: 'stand', helm: 'visor', visor: 'c', pad: 0.6, weapon: 'carbine', rig: false }], scout_drone: ['drone', { plan: 'disc' }], marine: ['trooper', { pose: 'aim', helm: 'visor', stripe: 1 }], heavy_trooper: ['trooper', { pose: 'hip', helm: 'heavy', bulk: 1.3, pad: 1.5, weapon: 'cannon', pack: 1 }],
  star_cruiser: ['ship', { size: 1.05 }], ion_lancer: ['tank', { hover: 1, lance: 1 }], patrol_frigate: ['ship', { size: 0.9 }],
  salvage_crew: ['trooper', { pose: 'work', helm: 'rebreather', weapon: 'tool', pack: 'tank', pad: 0.7, accent: 40, stripe: 1 }], siege_gunner: ['trooper', { pose: 'heavy', helm: 'heavy', bulk: 1.2, pad: 1.3, weapon: 'cannon', pack: 1, visor: 'a' }], assault_drone: ['drone', { plan: 'gunship', gun: 1 }],
  rhino_tank: ['tank', {}], battlecruiser: ['ship', { size: 1.15, turrets: 3, pods: 1 }], medic_bot: ['drone', { medic: 1 }],
  field_engineer: ['trooper', { pose: 'work', helm: 'visor', visor: 'a', weapon: 'tool', pack: 1, antenna: 1 }], rifle_squad: ['trooper', { squad: 1, helm: 'visor', stripe: 1 }], recon_officer: ['bust', { headset: 1, boards: 1, skin: 1 }],
  sapper: ['trooper', { pose: 'kneel', helm: 'rebreather', visor: 'r', pack: 'charges', weapon: 'carbine' }], shield_trooper: ['trooper', { pose: 'brace', helm: 'heavy', shield: 1, weapon: 'carbine', pad: 1.2 }], barricade: ['structure', { type: 'wall' }],
  bulwark_mech: ['mech', { heavy: 1, wall: 1 }], dreadnought: ['ship', { size: 1.2, turrets: 4, spinal: 1 }], strike_fighter: ['fighter', {}],
  interceptor: ['fighter', { sleek: 1 }], hover_tank: ['tank', { hover: 1 }], breach_commando: ['trooper', { pose: 'charge', helm: 'crest', visor: 'r', weapon: 'blade', bulk: 1.15, stripe: 1, accent: 0 }],
  fleet_captain: ['bust', { cap: 1, beard: 1, old: 1, boards: 1, medals: 1, skin: 0 }], okonkwo: ['bust', { cap: 1, braid: 1, hair: 'bun', skin: 3, boards: 1, medals: 1 }], aurora: ['ship', { size: 1.25, turrets: 4, flag: 1, carrier: 1 }],
  plasma_bolt: ['projectile', { type: 'plasma' }], railgun: ['projectile', { type: 'rail' }], flak_barrage: ['blast', { type: 'flak' }],
  orbital_strike: ['blast', { type: 'orbital' }], field_repair: ['emblem', { type: 'repair' }], supply_drop: ['emblem', { type: 'crate' }],
  combat_stims: ['emblem', { type: 'syringe' }], reinforcements: ['fighter', { dropship: 1 }], dig_in: ['emblem', { type: 'fort' }],
  kill_order: ['emblem', { type: 'target' }], drone: ['drone', { small: 1 }],
  energy_cell: ['battery', {}], scrap_rat: ['drone', { crawler: 1 }], junk_drone: ['drone', { junk: 1, small: 1 }], boarding_crew: ['trooper', { pose: 'run', helm: 'rebreather', visor: 'a', weapon: 'carbine', pad: 0.6, accent: 20, stripe: 1 }],
  smuggler: ['bust', { hood: 1, bandana: 1, hair: 'none', skin: 2 }], det_bot: ['drone', { plan: 'sphere', bomb: 1 }], gunrunner: ['bust', { goggles: 1, gogglesUp: 1, hair: 'mohawk', scar: 1, straps: 1, accent: 15, skin: 0 }], shadow_corsair: ['trooper', { pose: 'charge', helm: 'hood', cape: 1, weapon: 'blade', visor: 'r', pad: 0 }],
  mine_layer: ['tank', { mines: 1, hover: 1 }], cargo_hauler: ['ship', { hauler: 1, size: 0.95 }], quartermaster: ['bust', { beard: 1, cyber: 1, straps: 1, hair: 'short', old: 1, skin: 1 }],
  plunderer: ['fighter', { raider: 1 }], scrap_golem: ['mech', { junk: 1 }], ghost_operative: ['trooper', { pose: 'kneel', helm: 'hood', cape: 1, weapon: 'sniper', visor: 'c', pad: 0 }],
  shipbreaker: ['mech', { giant: 1, junk: 1, crane: 1 }], salvaged_hull: ['ship', { wreck: 1, size: 0.9 }], vex: ['bust', { hat: 1, patch: 1, hair: 'long', coat: 1, skin: 0 }], mox: ['bust', { goggles: 1, hair: 'long', coat: 1, skin: 2 }],
  shock_baton: ['weapon', { type: 'baton' }], plasma_cutlass: ['weapon', { type: 'blade' }], harpoon_gun: ['weapon', { type: 'harpoon' }],
  rail_rifle: ['weapon', { type: 'rifle' }], cluster_cannon: ['weapon', { type: 'cannon' }], combat_knife: ['weapon', { type: 'knife' }],
  smoke_screen: ['emblem', { type: 'smoke' }], echo_protocol: ['emblem', { type: 'cycle' }], broadside: ['blast', { type: 'broadside' }],
  shakedown: ['emblem', { type: 'target' }], black_market: ['emblem', { type: 'crate', market: 1 }],
  swarmling: ['bug', { plan: 'runner', small: 1 }], larva: ['pod', {}], brood_warrior: ['bug', { plan: 'serpent' }], venom_stinger: ['bug', { plan: 'scorpion' }], blood_leech: ['worm', { small: 1 }],
  spore_carrier: ['pod', { spore: 1 }], acid_spitter: ['bug', { plan: 'bloat' }], chitin_guard: ['bug', { plan: 'beetle' }], frenzied_ripper: ['bug', { plan: 'raptor' }],
  hive_mind: ['brain', {}], toxic_spitter: ['bug', { plan: 'scorpion', spit: 1 }], broodmother: ['bug', { plan: 'spider' }], lamprey: ['worm', {}],
  hive_reaper: ['bug', { plan: 'mantis' }], devourer_worm: ['worm', { big: 1 }], ixis: ['bug', { plan: 'queen' }], progenitor: ['pod', { big: 1 }],
  spawn_surge: ['pod', { many: 1 }], rapid_mutation: ['emblem', { type: 'helix' }], acid_rain: ['blast', { type: 'acid' }], life_drain: ['projectile', { type: 'drain' }],
  hive_surge: ['brain', {}], infest: ['pod', { spore: 1, many: 1 }],
  shield_drone: ['drone', { plan: 'disc', shield: 1 }], plating_tech: ['trooper', { pose: 'work', helm: 'heavy', bulk: 1.25, weapon: 'tool', pack: 1 }], arc_coil: ['structure', { type: 'coil' }],
  emp_trooper: ['trooper', { pose: 'stand', helm: 'visor', visor: 'c', pack: 'dish', weapon: 'carbine' }], gatling_drone: ['drone', { plan: 'gunship', gun: 2 }], overclocked_mech: ['mech', { plan: 'walker' }], repair_drone: ['drone', { medic: 1, arms: 4 }],
  aegis_sentinel: ['mech', { shield: 1 }], assembler: ['structure', { type: 'factory' }], nanoforge: ['structure', { type: 'factory' }], nanobot: ['drone', { plan: 'sphere', small: 1, shield: 1 }],
  reactor_core: ['structure', { type: 'reactor' }], storm_titan: ['mech', { plan: 'walker', heavy: 1, coil: 1 }], war_walker: ['mech', { plan: 'tripod', shield: 1 }], unit_zero: ['mech', { plan: 'sleek', shield: 1 }],
  calculus: ['structure', { type: 'core' }], disruptor: ['emblem', { type: 'emp' }], lightning_arc: ['projectile', { type: 'arc' }], chain_lightning: ['blast', { type: 'arc' }],
  fortify: ['emblem', { type: 'shield' }], overdrive: ['emblem', { type: 'chevrons' }], deflector_grid: ['emblem', { type: 'shield' }], vent_heat: ['emblem', { type: 'heat' }], emp_blast: ['blast', { type: 'emp' }],
  void_initiate: ['psion', { pose: 'meditate', halo: 1 }], psi_adept: ['psion', { pose: 'raise' }], probe_unit: ['drone', { plan: 'probe' }], cryo_sentry: ['structure', { type: 'cryo' }], mind_seer: ['psion', { reveal: 1, halo: 1 }],
  telepath: ['psion', { mask: 1, tendrils: 1 }], phase_stalker: ['horror', { stalker: 1 }], void_oracle: ['psion', { pose: 'meditate', halo: 2, runes: 1 }], psionic_horror: ['horror', {}], glacial_titan: ['mech', { crystal: 1, giant: 1 }],
  nyra: ['psion', { pose: 'spread', crown: 1, halo: 1 }], archivist: ['psion', { book: 1, reveal: 1 }], frost_lance: ['projectile', { type: 'frost' }], cryo_nova: ['blast', { type: 'cryo' }],
  void_shards: ['projectile', { type: 'shards' }], mind_blast: ['projectile', { type: 'psi' }], foresight: ['emblem', { type: 'eye' }], psionic_storm: ['blast', { type: 'psi' }],
  dominate: ['emblem', { type: 'neural' }], grav_snare: ['trap', { type: 'singularity' }], mirror_field: ['trap', { type: 'mirror' }], psionic_null: ['trap', { type: 'null' }],
  kinetic_barrier: ['trap', { type: 'barrier' }], sniper_mine: ['trap', { type: 'mine' }],
  void_wisp: ['horror', { wisp: 1 }], choir_echo: ['psion', { echo: 1, pose: 'raise' }], null_horror: ['horror', {}], abyssal_maw: ['horror', { maw: 1 }], herald_of_end: ['psion', { herald: 1, pose: 'spread' }],
  entropy_wave: ['blast', { type: 'void' }], unmaking: ['emblem', { type: 'void' }], devouring_dark: ['horror', { maw: 1, giant: 1 }], target_dummy: ['structure', { type: 'dummy' }],
  // strategy cards (not painted yet)
  line_sergeant: ['trooper', { pose: 'brace', helm: 'crest', visor: 'a', shield: 1, weapon: 'carbine', pad: 1.3, stripe: 1 }], drill_instructor: ['bust', { cap: 1, hair: 'short', scar: 1, boards: 1, skin: 2 }],
  deck_chief: ['bust', { headset: 1, hair: 'short', straps: 1, skin: 1 }], rally_line: ['emblem', { type: 'chevrons' }],
  gun_tinker: ['bust', { goggles: 1, cyber: 1, straps: 1, hair: 'mohawk', skin: 3 }], wreck_gunner: ['trooper', { pose: 'kneel', helm: 'rebreather', visor: 'a', weapon: 'sniper', pad: 0.6, accent: 20, pack: 'tank' }], twin_pistols: ['weapon', { type: 'rifle' }],
  hatchery: ['pod', { big: 1, spore: 1 }], venom_tender: ['bug', { plan: 'spider', small: 1 }], needle_mite: ['bug', { plan: 'scorpion', small: 1 }], venom_graft: ['emblem', { type: 'helix' }], thornback: ['bug', { plan: 'beetle', big: 1 }],
  overclock_relay: ['structure', { type: 'coil' }], aegis_projector: ['drone', { plan: 'disc', shield: 1 }], furnace_walker: ['mech', { plan: 'walker', heavy: 1 }], heat_sink: ['structure', { type: 'reactor' }],
  stormcaller: ['psion', { pose: 'spread', halo: 1, runes: 1 }], frost_warden: ['psion', { pose: 'raise', mask: 1 }], flash_freeze: ['projectile', { type: 'frost' }], shatter: ['blast', { type: 'cryo' }], cryo_adept: ['psion', { pose: 'raise', halo: 1 }],
};

const FACTION_CODE = { neutral: 'NTL', fleet: 'FLT', raider: 'RDR', swarm: 'SWM', synth: 'SYN', psi: 'PSI', void: 'VOID' };
// which backdrop a subject stands in front of
function backdropFor(kind, o, faction) {
  if (kind === 'ship' || kind === 'fighter') return 'space';
  if (kind === 'bug' || kind === 'worm' || kind === 'pod' || kind === 'brain') return 'hive';
  if (kind === 'psion') return faction === 'void' ? 'choir' : 'psi';
  if (kind === 'horror') return faction === 'psi' ? 'psi' : 'choir';
  if (kind === 'blast') return o.type === 'broadside' ? 'space' : 'field';
  if (kind === 'projectile') return 'field';
  if (kind === 'trap') return o.type === 'mine' || o.type === 'barrier' ? 'ground' : 'psi';
  if (kind === 'emblem') return { shield: 'field', fort: 'field', crate: 'ground', target: 'field', smoke: 'field', syringe: 'schematic', eye: 'psi', neural: 'psi', void: 'choir', heat: 'ground', helix: 'hive' }[o.type] || 'schematic';
  if (kind === 'weapon' || kind === 'battery') return 'schematic';
  return 'ground';
}
// subjects that get the key/rim lighting pass (organic ones get a wetter specular)
const LIT = { trooper: 1, bust: 1, mech: 1, drone: 1, tank: 1, ship: 1, fighter: 1, structure: 1, psion: 1, horror: 1, weapon: 1, battery: 1, trap: 1, bug: 2, worm: 2, pod: 2, brain: 2 };

function artFor(d) {
  if (ART[d.id]) return ART[d.id];
  if (d.type === 'spell') return ['emblem', { type: 'target' }];
  if (d.type === 'gear') return ['weapon', { type: 'rifle' }];
  if (d.type === 'trap') return ['trap', { type: 'mine' }];
  return [{ fleet: 'trooper', raider: 'trooper', swarm: 'bug', synth: 'drone', psi: 'psion', void: 'horror' }[d.faction] || 'drone', {}];
}

// Light between the backdrop and the subject: backlight halo and light shafts.
function atmosphere(r, bg, kind) {
  let m = `<ellipse cx="${f1(80 + ILT.s * 10)}" cy="48" rx="${kind === 'bust' ? 40 : 48}" ry="40" fill="${ch(IP.light)}" opacity="${bg === 'space' ? 0.1 : 0.17}" filter="url(#bl)"/>`;
  if (bg !== 'space' && bg !== 'schematic') {
    for (let k = 0; k < 4; k++) {
      const x0 = ILT.x + rr(r, -10, 10), w0 = rr(r, 1.5, 5), x1 = x0 - ILT.s * rr(r, 25, 75), w1 = rr(r, 10, 26);
      m += `<path d="${poly([[x0, -5], [x0 + w0, -5], [x1 + w1, 105], [x1, 105]])}" fill="url(#shf)" opacity="${f1(rr(r, 0.25, 0.6))}"/>`;
    }
  }
  return m;
}
// Ground fog, bokeh, dust and an out-of-focus framing shape in front of the subject.
function foreground(r, bg, kind) {
  let m = '';
  if (bg !== 'space' && bg !== 'schematic') m += `<rect x="-5" y="78" width="170" height="28" fill="url(#fogg)"/>`;
  for (let k = 0; k < 6; k++) {
    const edge = r() < 0.5 ? rr(r, -4, 34) : rr(r, 126, 164), big = rr(r, 1.4, 4.5);
    m += `<circle cx="${f1(edge)}" cy="${f1(rr(r, 4, 96))}" r="${f1(big)}" fill="${r() < 0.5 ? EM(10) : ch(IP.light, 10)}" opacity="${f1(rr(r, 0.08, 0.28))}" filter="url(#hz)"/>`;
  }
  for (let k = 0; k < 14; k++) m += `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 100)}" r="${f1(rr(r, 0.2, 0.6))}" fill="${ch(IP.light, 15)}" opacity="${f1(rr(r, 0.2, 0.6))}"/>`;
  if (bg === 'ground' || bg === 'hive' || bg === 'choir' || bg === 'field' || bg === 'psi') {
    const left = ILT.s > 0, x = left ? -6 : 166, d = left ? 1 : -1;
    m += `<path d="M${x} 106 L${x} ${f1(rr(r, 74, 86))} L${f1(x + d * rr(r, 10, 18))} ${f1(rr(r, 80, 88))} L${f1(x + d * rr(r, 22, 34))} ${f1(rr(r, 92, 98))} L${f1(x + d * 40)} 106Z" fill="#000" opacity=".85" filter="url(#dof)"/>`;
  }
  return m;
}
// Anamorphic streak and ghosts from the light source.
function lensFlare(r, bg) {
  const { x, y } = ILT, c = ch(IP.light, 12), k = bg === 'schematic' ? 0.4 : 1;
  let m = `<g opacity="${f1(0.35 * k)}"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="80" ry=".7" fill="${c}" filter="url(#gl)"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="34" ry=".22" fill="#fff"/>`;
  for (const t of [0.55, 0.8, 1.3]) m += `<circle cx="${f1(x + (80 - x) * t * 2)}" cy="${f1(y + (50 - y) * t * 2)}" r="${f1(rr(r, 1.5, 5))}" fill="${c}" opacity=".1"/>`;
  return m + '</g>';
}

function serialFor(id, faction) { const n = hashStr(id) % 9000 + 1000; return `${FACTION_CODE[faction] || 'NTL'}-${n}`; }

// Muted faction hue for backdrop tinting.
const ART_HUE = { neutral: 210, fleet: 208, raider: 24, swarm: 95, synth: 188, psi: 268, void: 312 };

function composeArt(key, kind, opts, faction, extraHue) {
  const r = seeded(hashStr(key));
  const P = IP = IPAL[faction] || IPAL.neutral;
  const h = Math.round((ART_HUE[faction] ?? 210) + (extraHue || 0) + (r() - 0.5) * 16);
  const bgKind = opts.bg || backdropFor(kind, opts, faction);
  const side = kind === 'bust' ? 1 : (r() < 0.72 ? 1 : -1);
  ILT = { s: side, x: side > 0 ? rr(r, 112, 142) : rr(r, 18, 48), y: rr(r, 12, 30) };
  const seed = hashStr(key) % 1000;
  const bg = BG[bgKind](r, h);
  const subject = (SUBJ[kind] || SUBJ.drone)(r, h, opts);
  const lit = LIT[kind];
  const code = opts.code || serialFor(key, faction);
  const n1 = c01([P.fog[0], P.fog[1] + 10, P.fog[2] + 18]), n2 = c01([(P.fog[0] + 40) % 360, P.fog[1], P.fog[2] + 8]);
  const nbx = f1(rr(r, 0.2, 0.8)), nby = f1(rr(r, 0.2, 0.7));
  const wet = lit === 2;
  // Lighting pass: the silhouette's blurred alpha is a height map. Diffuse light
  // multiplies in form shading; specular adds glints; an offset edge gives the rim.
  const litF = `<filter id="lit" x="-.1" y="-.1" width="1.2" height="1.2" color-interpolation-filters="sRGB">
<feComponentTransfer in="SourceAlpha" result="A"><feFuncA type="linear" slope="4" intercept="-2.6"/></feComponentTransfer>
<feGaussianBlur in="A" stdDeviation="1.6" result="hb"/>
<feDiffuseLighting in="hb" surfaceScale="2.8" diffuseConstant="1.05" lighting-color="${ch(P.key)}" result="dif"><feDistantLight azimuth="${side > 0 ? 225 : 315}" elevation="48"/></feDiffuseLighting>
<feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1="1" k2=".24" result="sh"/>
<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .3 .55 .15 0 0" result="lum"/>
<feComposite in="lum" in2="A" operator="arithmetic" k2=".7" k3=".3" result="ht"/>
<feGaussianBlur in="ht" stdDeviation="${wet ? 0.5 : 0.35}" result="hf"/>
<feSpecularLighting in="hf" surfaceScale="${wet ? 3 : 2.4}" specularConstant="${wet ? 1.1 : 0.85}" specularExponent="${wet ? 14 : 22}" lighting-color="${ch(P.key)}" result="spc"><feDistantLight azimuth="${side > 0 ? 225 : 315}" elevation="38"/></feSpecularLighting>
<feComposite in="spc" in2="A" operator="in" result="spm"/>
<feOffset in="A" dx="${f1(-0.65 * side)}" dy=".45" result="ao"/>
<feComposite in="A" in2="ao" operator="out" result="edge"/>
<feGaussianBlur in="edge" stdDeviation=".22" result="eb"/>
<feFlood flood-color="${ch(P.rim)}"/><feComposite in2="eb" operator="in" result="rim"/>
<feGaussianBlur in="rim" stdDeviation="1.4" result="rimg"/>
<feComposite in="sh" in2="spm" operator="arithmetic" k2="1" k3="${wet ? 0.8 : 0.6}" result="s1"/>
<feComposite in="s1" in2="rim" operator="arithmetic" k2="1" k3=".85" result="s2"/>
<feComposite in="s2" in2="rimg" operator="arithmetic" k2="1" k3=".3"/>
</filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="m" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${ch(P.arm)}"/><stop offset=".45" stop-color="${ch(P.arm1)}"/><stop offset="1" stop-color="${ch(P.arm2)}"/></linearGradient>
<linearGradient id="mb" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${ch(P.arm, -26)}"/><stop offset=".45" stop-color="${ch(P.arm1, -14)}"/><stop offset="1" stop-color="${ch(P.arm2, -4)}"/></linearGradient>
<linearGradient id="mp" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${ch(P.paint, 16)}"/><stop offset=".5" stop-color="${ch(P.paint)}"/><stop offset="1" stop-color="${ch(P.paint, -22)}"/></linearGradient>
<linearGradient id="mw" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="hsl(${P.arm[0]},6%,44%)"/><stop offset=".4" stop-color="hsl(${P.arm[0]},8%,18%)"/><stop offset="1" stop-color="hsl(${P.arm[0]},12%,5%)"/></linearGradient>
<linearGradient id="o" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${ch(P.arm, 4)}"/><stop offset=".16" stop-color="${ch(P.arm, 16)}"/><stop offset=".3" stop-color="${ch(P.arm1, 2)}"/><stop offset="1" stop-color="${ch(P.arm2)}"/></linearGradient>
<linearGradient id="gsg" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="hsl(${P.arm[0]},14%,34%)"/><stop offset=".14" stop-color="hsl(${P.arm[0]},12%,9%)"/><stop offset=".55" stop-color="#050307"/><stop offset=".8" stop-color="hsl(${P.emis[0]},40%,8%)"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="clg" x1="0" y1="0" x2=".25" y2="1"><stop offset="0" stop-color="${ch(P.arm1, 20)}"/><stop offset=".45" stop-color="${ch(P.arm1, 2)}"/><stop offset="1" stop-color="${ch(P.dark)}"/></linearGradient>
<linearGradient id="crg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(195,50%,88%)"/><stop offset=".45" stop-color="hsl(200,45%,46%)"/><stop offset="1" stop-color="hsl(210,45%,14%)"/></linearGradient>
<linearGradient id="vz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.emis, -4, -40)}"/><stop offset=".22" stop-color="${ch(P.emis, -40, -30)}"/><stop offset=".75" stop-color="${ch(P.emis, -52)}"/><stop offset="1" stop-color="${ch(P.emis, -32)}"/></linearGradient>
<linearGradient id="skn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(28,30%,50%)"/><stop offset=".55" stop-color="hsl(24,24%,22%)"/><stop offset="1" stop-color="hsl(20,20%,8%)"/></linearGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.sky)}"/><stop offset=".55" stop-color="${ch(P.fog, -12)}"/><stop offset="1" stop-color="${ch(P.fog, -2)}"/></linearGradient>
<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.fog, -14)}"/><stop offset=".4" stop-color="${ch(P.dark, 2)}"/><stop offset="1" stop-color="${ch(P.dark, -3)}"/></linearGradient>
<linearGradient id="fogg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.fog, 8)}" stop-opacity="0"/><stop offset=".5" stop-color="${ch(P.fog, 4)}" stop-opacity=".4"/><stop offset="1" stop-color="${ch(P.fog, -6)}" stop-opacity=".55"/></linearGradient>
<linearGradient id="shf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.light, 10)}" stop-opacity=".55"/><stop offset=".7" stop-color="${ch(P.light)}" stop-opacity=".08"/><stop offset="1" stop-color="${ch(P.light)}" stop-opacity="0"/></linearGradient>
<linearGradient id="cone" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${ch(P.emis)}" stop-opacity=".4"/><stop offset="1" stop-color="${ch(P.emis)}" stop-opacity="0"/></linearGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".05" stop-color="${ch(P.light, 10)}" stop-opacity=".75"/><stop offset=".3" stop-color="${ch(P.light)}" stop-opacity=".2"/><stop offset="1" stop-color="${ch(P.light)}" stop-opacity="0"/></radialGradient>
<radialGradient id="ipc"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="${ch(P.light, 10)}" stop-opacity=".9"/><stop offset=".5" stop-color="${ch(P.emis)}" stop-opacity=".35"/><stop offset="1" stop-color="${ch(P.emis)}" stop-opacity="0"/></radialGradient>
<radialGradient id="nbm" cx="${nbx}" cy="${nby}" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="pm" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#eef8ff"/><stop offset=".25" stop-color="hsl(200,100%,68%)"/><stop offset="1" stop-color="hsl(212,100%,50%)" stop-opacity="0"/></linearGradient>
<linearGradient id="pmv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef8ff"/><stop offset=".25" stop-color="hsl(200,100%,68%)"/><stop offset="1" stop-color="hsl(212,100%,50%)" stop-opacity="0"/></linearGradient>
<linearGradient id="tr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${ch(P.emis)}" stop-opacity="0"/><stop offset="1" stop-color="${ch(P.emis, 10)}"/></linearGradient>
<linearGradient id="core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${ch(P.emis, 14)}"/><stop offset="1" stop-color="${ch(P.emis, -14)}"/></linearGradient>
<pattern id="haz" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#111"/><rect width="1.5" height="3" fill="hsl(44,95%,50%)"/></pattern>
<pattern id="hex" width="6" height="10.4" patternUnits="userSpaceOnUse"><path d="M3 0L6 1.7V5.2L3 6.9L0 5.2V1.7ZM3 6.9V10.4M0 5.2H-1M6 5.2H7" fill="none" stroke="${ch(P.emis, 14)}" stroke-width=".25"/></pattern>
<pattern id="scan" width="2" height="1" patternUnits="userSpaceOnUse"><rect width="2" height=".45" fill="#000"/></pattern>
<filter id="gl" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="bl" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="hz"><feGaussianBlur stdDeviation=".45"/></filter>
<filter id="dof" x="-.2" y="-.2" width="1.4" height="1.4"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="bgdof"><feGaussianBlur stdDeviation=".9"/></filter>
<filter id="neb" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".016 .028" numOctaves="4" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 ${n1[0]}  0 0 0 0 ${n1[1]}  0 0 0 0 ${n1[2]}  2.4 0 0 0 -1.05" result="c1"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 ${n2[0]}  0 0 0 0 ${n2[1]}  0 0 0 0 ${n2[2]}  0 2.6 0 0 -1.3" result="c2"/><feMerge result="cl"><feMergeNode in="c1"/><feMergeNode in="c2"/></feMerge><feComposite in="cl" in2="SourceGraphic" operator="in"/></filter>
<filter id="aur" x="-.5" y="-.5" width="2" height="2"><feTurbulence type="fractalNoise" baseFrequency=".09 .05" numOctaves="2" seed="${seed + 7}" result="t"/><feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/><feDisplacementMap in="b" in2="t" scale="10" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".5"/></filter>
${lit ? litF : ''}
<filter id="post" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feComponentTransfer in="SourceGraphic" result="hi"><feFuncR type="linear" slope="2.6" intercept="-1.6"/><feFuncG type="linear" slope="2.6" intercept="-1.6"/><feFuncB type="linear" slope="2.6" intercept="-1.6"/></feComponentTransfer><feGaussianBlur in="hi" stdDeviation="1.5" result="b1"/><feGaussianBlur in="hi" stdDeviation="5" result="b2"/><feComposite in="SourceGraphic" in2="b1" operator="arithmetic" k2="1" k3=".8" result="s1"/><feComposite in="s1" in2="b2" operator="arithmetic" k2="1" k3=".55" result="s2"/><feComponentTransfer in="s2"><feFuncR type="table" tableValues="0 .06 .19 .41 .65 .86 1"/><feFuncG type="table" tableValues="0 .06 .19 .41 .65 .86 1"/><feFuncB type="table" tableValues="0 .07 .2 .42 .65 .86 1"/></feComponentTransfer></filter>
<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .58  0 0 0 0 .62  0 0 0 .9 0"/></filter>
<linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch(P.rim, -10)}"/><stop offset=".6" stop-color="hsl(${P.fog[0]},20%,50%)"/><stop offset="1" stop-color="${ch(P.key, -20)}"/></linearGradient>
<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
</defs>
<style>.h{fill:url(#m);stroke:#000;stroke-opacity:.5;stroke-width:.3}.hb{fill:url(#mb);stroke:#000;stroke-opacity:.5;stroke-width:.3}.p{fill:url(#mp);stroke:#000;stroke-opacity:.5;stroke-width:.3}.w{fill:url(#mw);stroke:#000;stroke-opacity:.6;stroke-width:.3}.o{fill:url(#o);stroke:#000;stroke-opacity:.55;stroke-width:.35}.gs{fill:url(#gsg);stroke:${ch(P.emis, 6)};stroke-opacity:.45;stroke-width:.3}.cl{fill:url(#clg);stroke:#000;stroke-opacity:.5;stroke-width:.3}.cr{fill:url(#crg);stroke:hsl(195,70%,88%);stroke-opacity:.7;stroke-width:.4}.g{fill:url(#vz);stroke:#000;stroke-opacity:.6;stroke-width:.3}.d{fill:${ch(P.dark)}}.l{fill:none;stroke:#000;stroke-opacity:.55;stroke-width:.35}.k{fill:none;stroke:#fff;stroke-opacity:.4;stroke-width:.3}.s{fill:none;stroke:${ch(P.emis, 6)};stroke-width:.4}</style>
<g filter="url(#post)">
<g${kind === 'bust' ? ' filter="url(#bgdof)"' : ''}>${bg}</g>
${atmosphere(r, bgKind, kind)}
<g${lit ? ' filter="url(#lit)"' : ''}>${subject}</g>
${foreground(r, bgKind, kind)}
</g>
${lensFlare(r, bgKind)}
<rect width="160" height="100" fill="url(#cg)" opacity=".22" style="mix-blend-mode:soft-light"/>
<rect width="160" height="100" filter="url(#gr)" opacity=".1"/>
<rect width="160" height="100" fill="url(#vg)"/>
${globalThis.ART_NO_HUD ? '' : `<g stroke="${ch(P.light, 10)}" stroke-width=".5" fill="none" opacity=".45"><path d="M6 14V6H14M146 6H154V14M154 86V94H146M14 94H6V86"/></g>
<text x="152" y="91" text-anchor="end" font-family="ui-monospace,Consolas,monospace" font-size="4.2" letter-spacing=".6" fill="${ch(P.light, 10)}" opacity=".55">${code}</text>`}
</svg>`;
}

// ---------------------------------------------------------------- caching
// Vector art with lighting and grain filters is expensive to repaint, so each
// plate is rasterized once (in idle time) and the bitmap is used from then on.
const RASTER = {};
// Phones (iPhone especially) have far less memory for decoding images. There the
// code-drawn art skips its heavy SVG filters, painted art uses half-size files,
// and only one plate is rasterized at a time.
const ART_LITE = typeof window !== 'undefined' && !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
const liteSvg = svg => ART_LITE ? svg.replace(/\sfilter="url\(#[^)]*\)"/g, '') : svg;

// Rasterize SVG plates through a small queue so dozens never decode at once.
const RQ = []; let rBusy = 0;
const R_MAX = ART_LITE ? 1 : 3;
function rasterize(key, svgUrl) {
  if (key in RASTER || typeof document === 'undefined') return;
  RASTER[key] = null;
  RQ.push([key, svgUrl]); pumpRaster();
}
function pumpRaster() {
  while (rBusy < R_MAX && RQ.length) {
    const [key, svgUrl] = RQ.shift(); rBusy++;
    const img = new Image();
    const done = () => { rBusy--; img.onload = img.onerror = null; setTimeout(pumpRaster, ART_LITE ? 40 : 0); };
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 480; c.height = 300;
        c.getContext('2d').drawImage(img, 0, 0, 480, 300);
        c.toBlob(b => { if (b) RASTER[key] = `url("${URL.createObjectURL(b)}")`; c.width = c.height = 0; done(); }, 'image/webp', 0.9);
      } catch (e) { done(); /* tainted or unsupported: keep the vector version */ }
    };
    img.onerror = done;
    img.src = svgUrl.slice(5, -2);
  }
}
// Safari has no requestIdleCallback: the fallback gives a real ~8 ms budget per slice.
const idle = window.requestIdleCallback || (fn => setTimeout(() => { const t0 = performance.now(); fn({ timeRemaining: () => Math.max(0, 8 - (performance.now() - t0)) }); }, 50));
function prewarmArt(keysAndMakers) {
  const queue = keysAndMakers.slice();
  // only top up the raster queue a little at a time
  const step = dl => { while (queue.length && dl.timeRemaining() > 4 && RQ.length < 2) queue.shift()(); if (queue.length) idle(step); };
  idle(step);
}

// public: art for a card id
// Painted art (art/cards, art/portraits) replaces the code-drawn plate when present; see tools/art/ingest.py.
const PAINTED_CARDS = new Set(typeof PAINTED !== 'undefined' ? PAINTED.cards : []);
const PAINTED_PORTRAITS = typeof PAINTED !== 'undefined' ? PAINTED.portraits : {};
// resolved from this script's own URL, so pages in subfolders (tools/) find the art too
const ART_BASE = typeof document !== 'undefined' && document.currentScript ? new URL('../art/', document.currentScript.src).href : 'art/';
const CARD_DIR = ART_LITE ? 'cards-sm' : 'cards';

// second art pass (packs, stills, station, sectors, screens, card back): CSS url or '' when not painted yet
const PAINTED_EXTRA = new Set(typeof PAINTED !== 'undefined' ? PAINTED.extra || [] : []);
// The Claude artifact build serves some art from its asset store (PAINTED.a: id -> { f: full size, s: phone size }; see tools/art/artifact_painted.py).
const PAINTED_A = typeof PAINTED !== 'undefined' ? PAINTED.a || {} : {};
const hostedArt = id => PAINTED_A[id] ? `url("${ART_LITE ? PAINTED_A[id].s : PAINTED_A[id].f}")` : '';
function extraArt(id) { return PAINTED_EXTRA.has(id) ? hostedArt(id) || `url("${ART_BASE}${ART_LITE ? 'extra-sm' : 'extra'}/${id}.webp")` : ''; }
// a painted banner for a modal or panel, or nothing
function paintedBanner(id, cls) { const u = extraArt(id); return u ? `<div class="m-hero ${cls || ''}" style='background-image:${u}'></div>` : ''; }
if (typeof document !== 'undefined' && PAINTED_EXTRA.has('card-back')) document.documentElement.style.setProperty('--cardback', extraArt('card-back'));

function artPlate(id) {
  if (PAINTED_CARDS.has(id)) return hostedArt(id) || `url("${ART_BASE}${CARD_DIR}/${id}.webp")`;
  if (RASTER[id]) return RASTER[id];
  if (!ART_CACHE[id]) {
    const d = D(id); const [kind, opts] = artFor(d);
    ART_CACHE[id] = `url("data:image/svg+xml,${encodeURIComponent(liteSvg(composeArt(id, kind, opts, d.faction)))}")`;
  }
  rasterize(id, ART_CACHE[id]);
  return ART_CACHE[id];
}

// public: portrait for a commander/boss/sector/pack by explicit art spec
function portraitPlate(key, faction, spec) {
  if (PAINTED_PORTRAITS[key]) return `url("${ART_BASE}portraits/${PAINTED_PORTRAITS[key]}.webp")`;
  const k = 'p:' + key + (spec ? ':' + spec[0] : '');
  if (RASTER[k]) return RASTER[k];
  if (!ART_CACHE[k]) {
    const [kind, opts] = spec || ['bust', { cap: 1 }];
    ART_CACHE[k] = `url("data:image/svg+xml,${encodeURIComponent(liteSvg(composeArt(key, kind, opts || {}, faction || 'fleet')))}")`;
  }
  rasterize(k, ART_CACHE[k]);
  return ART_CACHE[k];
}

// Warm every card in idle time so most art is already a bitmap when needed.
function prewarmAllArt() { prewarmArt(CARD_LIST.map(d => () => artPlate(d.id))); }
