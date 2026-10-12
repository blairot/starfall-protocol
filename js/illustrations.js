'use strict';
// ============================================================================
// STARFALL PROTOCOL — procedural illustrations
// Hard-surface silhouettes with rim light over grainy backdrops, finished with
// HUD brackets and a stenciled serial. Every card id maps to a subject kind and
// options; a seeded RNG varies proportions so no two cards look identical.
// Canvas: 160×100. Subjects stay inside x≈36–124 so square crops still read.
// ============================================================================

const f1 = n => (+n).toFixed(1);
const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
const mirrorX = (pts, cx) => pts.concat(pts.slice().reverse().map(([x, y]) => [2 * cx - x, y]));
const glow = (m, o) => `<g filter="url(#gl)" opacity="${o || 0.95}">${m}</g>${m}`;
const rr = (r, a, b) => a + r() * (b - a);

// ---------------------------------------------------------------- backdrops
const BG = {
  space(r, h) {
    const stars = Array.from({ length: 40 }, () => `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 100)}" r="${f1(rr(r, 0.15, 0.7))}" fill="#dfe8f5" opacity="${f1(rr(r, 0.25, 0.9))}"/>`).join('');
    const px = rr(r, 10, 150), big = rr(r, 70, 120), side = r() < 0.5;
    const pcx = side ? -big * 0.35 + rr(r, 0, 30) : px, pcy = side ? rr(r, 30, 70) : 100 + big * 0.62;
    return `<rect width="160" height="100" fill="url(#sp)"/>
      <g filter="url(#bl)" opacity=".35"><ellipse cx="${f1(rr(r, 20, 140))}" cy="${f1(rr(r, 10, 60))}" rx="50" ry="18" fill="hsl(${h + 20},30%,30%)"/><ellipse cx="${f1(rr(r, 20, 140))}" cy="${f1(rr(r, 20, 70))}" rx="40" ry="14" fill="hsl(${h - 30},25%,22%)"/></g>${stars}
      <circle cx="${f1(pcx)}" cy="${f1(pcy)}" r="${f1(big)}" fill="url(#pl)"/>
      <circle cx="${f1(pcx)}" cy="${f1(pcy)}" r="${f1(big)}" fill="none" stroke="hsl(${h + 10},55%,70%)" stroke-width="1.2" opacity=".45" filter="url(#gl)"/>`;
  },
  ground(r, h) {
    const hz = rr(r, 66, 74);
    let city = '';
    for (let x = -4; x < 164; x += rr(r, 5, 12)) { const w = rr(r, 3, 9), ht = rr(r, 3, 16); city += `<rect x="${f1(x)}" y="${f1(hz - ht)}" width="${f1(w)}" height="${f1(ht)}"/>`; if (r() < 0.25) city += `<rect x="${f1(x + w / 2)}" y="${f1(hz - ht - 6)}" width=".5" height="6"/>`; }
    const lights = Array.from({ length: 10 }, () => `<rect x="${f1(r() * 160)}" y="${f1(hz - rr(r, 1, 12))}" width=".8" height=".6" fill="hsl(38,90%,65%)" opacity=".7"/>`).join('');
    return `<rect width="160" height="100" fill="url(#sk)"/>
      <ellipse cx="${f1(rr(r, 30, 130))}" cy="${f1(hz)}" rx="90" ry="10" fill="hsl(${h + 20},40%,45%)" opacity=".25" filter="url(#bl)"/>
      <g fill="hsl(${h},12%,9%)" opacity=".9">${city}</g>${lights}
      <rect y="${f1(hz)}" width="160" height="${f1(100 - hz)}" fill="url(#gd)"/>
      <path d="M0 ${f1(hz + 6)} L160 ${f1(hz + 3)}" stroke="hsl(${h},20%,40%)" stroke-width=".3" opacity=".4"/>`;
  },
  hive(r, h) {
    let mem = '';
    for (let k = 0; k < 7; k++) { const y = rr(r, 0, 100); mem += `<path d="M-5 ${f1(y)} Q ${f1(rr(r, 30, 130))} ${f1(y + rr(r, -40, 40))} 165 ${f1(y + rr(r, -20, 20))}" stroke="hsl(${h + 20},30%,30%)" stroke-width="${f1(rr(r, 0.5, 2.4))}" fill="none" opacity=".16"/>`; }
    const spores = Array.from({ length: 16 }, () => `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 100)}" r="${f1(rr(r, 0.4, 1.6))}" fill="hsl(${h - 30},80%,60%)" opacity="${f1(rr(r, 0.3, 0.8))}"/>`).join('');
    return `<rect width="160" height="100" fill="url(#hv)"/><g filter="url(#bl)" opacity=".5"><ellipse cx="80" cy="110" rx="90" ry="30" fill="hsl(${h - 20},45%,20%)"/></g>${mem}<g filter="url(#gl)">${spores}</g>`;
  },
  void(r, h) {
    const cx = rr(r, 50, 110), cy = rr(r, 30, 60);
    const rings = Array.from({ length: 6 }, (_, i) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(14 + i * 14)}" ry="${f1(8 + i * 8)}" fill="none" stroke="hsl(${h},40%,55%)" stroke-width=".4" opacity="${f1(0.35 - i * 0.05)}"/>`).join('');
    const stars = Array.from({ length: 24 }, () => { const x = r() * 160, y = r() * 100, l = rr(r, 1, 5); return `<path d="M${f1(x)} ${f1(y)}l${f1(l)} ${f1(l * 0.15)}" stroke="#d8d2f0" stroke-width=".35" opacity="${f1(rr(r, 0.2, 0.7))}"/>`; }).join('');
    return `<rect width="160" height="100" fill="url(#vd)"/>${stars}<g filter="url(#bl)" opacity=".55"><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="40" ry="22" fill="hsl(${h},45%,25%)"/></g>${rings}`;
  },
  schematic(r, h) {
    let g = '';
    for (let x = 0; x <= 160; x += 8) g += `<path d="M${x} 0V100"/>`;
    for (let y = 4; y <= 100; y += 8) g += `<path d="M0 ${y}H160"/>`;
    const cx = rr(r, 60, 100), cy = rr(r, 40, 60);
    const rings = [16, 30, 46].map(rad => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${rad}"/>`).join('');
    let ticks = ''; for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, l = k % 3 ? 2 : 4; ticks += `<path d="M${f1(cx + Math.cos(a) * 46)} ${f1(cy + Math.sin(a) * 46)}L${f1(cx + Math.cos(a) * (46 - l))} ${f1(cy + Math.sin(a) * (46 - l))}"/>`; }
    return `<rect width="160" height="100" fill="url(#sc)"/><g stroke="hsl(${h},35%,50%)" stroke-width=".25" opacity=".22">${g}</g>
      <g fill="none" stroke="hsl(${h},40%,60%)" stroke-width=".35" opacity=".3">${rings}${ticks}</g>`;
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
};

function infantry(r, h, o) {
  const J = (POSES[o.pose] || POSES.stand)();
  // per-card jitter so two cards with the same pose still differ
  const jit = () => rr(r, -1.2, 1.2);
  for (const k of Object.keys(J)) if (k !== 'grip' && k !== 'fore') J[k] = add(J[k], jit(), jit() * 0.6);
  const bulk = o.bulk || 1, pad = o.pad == null ? 1 : o.pad;
  const vis = o.visor === 'r' ? 'hsl(0,85%,55%)' : o.visor === 'c' ? 'hsl(190,85%,62%)' : o.visor === 'g' ? 'hsl(140,70%,55%)' : 'hsl(38,92%,58%)';
  const acc = o.accent != null ? `hsl(${o.accent},55%,45%)` : `hsl(${h},45%,46%)`;
  let g = '';
  const boot = (f, dir) => `<path class="d" d="${poly([[f[0] - 3, f[1] - 4], [f[0] + 4 * dir, f[1] - 3.5], [f[0] + 6 * dir, f[1]], [f[0] - 3.5, f[1]]])}"/>`;
  const leg = (hp, kn, ft, cls, front) => limb3(hp, kn, ft, 5 * bulk, 3.9 * bulk, 3 * bulk, cls)
    + bar(lerp(hp, kn, 0.15), lerp(hp, kn, 0.7), 4.2 * bulk, 3.5 * bulk, cls)
    + `<path class="${cls}" d="${poly([[kn[0] - 3.4, kn[1] - 4], [kn[0] + 4, kn[1] - 3.2], [kn[0] + 3.4, kn[1] + 3.4], [kn[0] - 3, kn[1] + 2.4]])}"/>`
    + bar(lerp(kn, ft, 0.3), lerp(kn, ft, 0.85), 3.4 * bulk, 3.1 * bulk, cls) + boot(ft, 1);
  const arm = (sh, el, wr, cls) => limb3(sh, el, wr, 3.9 * bulk, 3.2 * bulk, 2.6 * bulk, cls)
    + bar(lerp(el, wr, 0.25), lerp(el, wr, 0.85), 3.2 * bulk, 2.9 * bulk, cls) + dot(wr, 2.5, 'd');
  const pauld = (sh, cls, side) => {
    if (!pad) return '';
    const k = Math.min(1.3, pad * bulk), x = sh[0], y = sh[1];
    let m = `<path class="${cls}" d="${poly([[x - 6 * k, y - 1], [x - 2 * k, y - 5.5 * k], [x + 5 * k, y - 5 * k], [x + 7.5 * k, y + 1], [x + 6 * k, y + 5 * k], [x - 5 * k, y + 4.5 * k]])}"/>`;
    m += `<path class="${cls}" d="${poly([[x - 5.4 * k, y + 3.4 * k], [x + 6.4 * k, y + 3.6 * k], [x + 5.6 * k, y + 7.4 * k], [x - 4.6 * k, y + 7 * k]])}"/>`;
    if (o.stripe) m += `<path d="M${f1(x - 3 * k)} ${f1(y - 3.6 * k)}L${f1(x + 5 * k)} ${f1(y - 3.4 * k)}" stroke="${acc}" stroke-width="1.5"/>`;
    return m;
  };

  // weapon geometry along grip → fore
  const weapon = () => {
    const G = J.grip, F = J.fore, dx = F[0] - G[0], dy = F[1] - G[1], L = Math.hypot(dx, dy) || 1, u = [dx / L, dy / L], n = [u[1], -u[0]];
    const at = (t, off) => [G[0] + u[0] * t + n[0] * (off || 0), G[1] + u[1] * t + n[1] * (off || 0)];
    const w = o.weapon || 'rifle';
    if (w === 'rifle' || w === 'sniper' || w === 'carbine') {
      const len = w === 'sniper' ? 36 : w === 'carbine' ? 18 : 26;
      let m = bar(at(-11), at(-2), 2.2, 2.6, 'hb') + `<path class="h" d="${poly([at(-3, -2.8), at(13, -2.6), at(15, -1), at(15, 2.4), at(-3, 3)])}"/>` + bar(at(15), at(15 + len), 1.2, 1, 'd');
      m += bar(at(16), at(22), 1.8, 1.8, 'hb') + bar(at(1, -4.2), at(9, -4.2), 1.6, 1.6, 'd') + `<path class="d" d="${poly([at(3, 2.6), at(7, 2.6), at(9, 9), at(5.5, 9.6)])}"/>` + `<path class="l" d="M${f1(at(0, 0)[0])} ${f1(at(0, 0)[1])}L${f1(at(13, 0)[0])} ${f1(at(13, 0)[1])}"/>`;
      if (w === 'sniper') m += bar(at(20), at(26, 9), 0.5, 0.5, 'd') + bar(at(20), at(16, 9), 0.5, 0.5, 'd') + glow(`<circle cx="${f1(at(1, -3)[0])}" cy="${f1(at(1, -3)[1])}" r=".8" fill="hsl(0,85%,58%)"/>`);
      else m += glow(`<circle cx="${f1(at(8, -1.8)[0])}" cy="${f1(at(8, -1.8)[1])}" r=".55" fill="${vis}"/>`, 0.8);
      return m;
    }
    if (w === 'cannon') return bar(at(-12), at(34), 4.6, 4.2, 'h') + bar(at(34), at(40), 5.2, 5.2, 'd') + bar(at(6, 5), at(12, 9), 1.6, 1.6, 'd') + glow(`<circle cx="${f1(at(40)[0])}" cy="${f1(at(40)[1])}" r="2.2" fill="hsl(25,90%,55%)"/>`, 0.7);
    if (w === 'blade') return bar(at(-4), at(3), 1.6, 1.6, 'd') + `<path class="h" d="${poly([at(3, -1.4), at(30, -0.6), at(34, 0.6), at(3, 1.6)])}"/>` + glow(`<path d="M${f1(at(4, 1.4)[0])} ${f1(at(4, 1.4)[1])}L${f1(at(32, 0.6)[0])} ${f1(at(32, 0.6)[1])}" stroke="hsl(190,90%,70%)" stroke-width=".7"/>`);
    if (w === 'tool') {
      const tip = at(16);
      return bar(at(-2), at(12), 1.8, 1.4, 'h') + bar(at(12), tip, 1, 0.7, 'd') + glow(`<circle cx="${f1(tip[0])}" cy="${f1(tip[1])}" r="1.8" fill="hsl(45,95%,65%)"/>` + Array.from({ length: 7 }, () => { const a = rr(r, -1.2, 1.2) + Math.atan2(u[1], u[0]), d = rr(r, 3, 9); return `<path d="M${f1(tip[0])} ${f1(tip[1])}l${f1(Math.cos(a) * d)} ${f1(Math.sin(a) * d + 2)}" stroke="hsl(40,95%,70%)" stroke-width=".4"/>`; }).join(''));
    }
    return '';
  };

  const torso = () => {
    const tl = add(J.sb, -3 * bulk, -1), tr = add(J.sf, 3 * bulk, -1), br = add(J.hf, 2, 0), bl = add(J.hb, -2, 0);
    const mid = lerp(lerp(tl, tr, 0.5), lerp(bl, br, 0.5), 0.45);
    let t = `<path class="h" d="${poly([tl, tr, lerp(tr, br, 0.55), br, bl, lerp(tl, bl, 0.55)])}"/>`;
    t += `<path class="h" d="${poly([add(lerp(tl, tr, 0.12), 0, 2), add(lerp(tl, tr, 0.88), 0, 2), add(mid, 5, 2), add(mid, -5, 2)])}" opacity=".9"/>`;
    t += `<path class="l" d="M${f1(mid[0] - 6)} ${f1(mid[1] + 6)}H${f1(mid[0] + 6)}M${f1(mid[0] - 5)} ${f1(mid[1] + 10)}H${f1(mid[0] + 5)}"/>`;
    t += `<rect class="d" x="${f1(bl[0] - 1)}" y="${f1(bl[1] - 4)}" width="${f1(br[0] - bl[0] + 2)}" height="3.2"/>`;
    if (o.rig !== false) t += `<rect class="hb" x="${f1(mid[0] - 7)}" y="${f1(mid[1] + 1)}" width="4" height="5" rx=".6"/><rect class="hb" x="${f1(mid[0] - 2)}" y="${f1(mid[1] + 1)}" width="4" height="5" rx=".6"/>`;
    if (o.stripe) t += `<path d="M${f1(tl[0] + 3)} ${f1(tl[1] + 4)}L${f1(mid[0] - 2)} ${f1(mid[1])}" stroke="${acc}" stroke-width="1.6"/>`;
    return t;
  };

  const helmet = () => {
    const [x, y] = J.head, kind = o.helm || 'visor';
    let m = `<path class="d" d="${poly([[x - 3, y + 6], [x + 3, y + 6], [x + 3.5, y + 11], [x - 3.5, y + 11]])}"/>`;
    if (kind === 'open') {
      m += `<ellipse cx="${f1(x + 1.5)}" cy="${f1(y + 1.5)}" rx="5.4" ry="6.6" fill="url(#skn)"/><path d="M${f1(x - 6.5)} ${f1(y + 1)} Q${f1(x - 7)} ${f1(y - 9)} ${f1(x + 1)} ${f1(y - 9)} Q${f1(x + 8)} ${f1(y - 9)} ${f1(x + 8)} ${f1(y - 2)} L${f1(x + 7)} ${f1(y - 3)} Q${f1(x)} ${f1(y - 5)} ${f1(x - 4)} ${f1(y + 2)}Z" class="h"/>`;
      m += `<path d="M${f1(x - 2)} ${f1(y + 5)} Q${f1(x + 3)} ${f1(y + 8)} ${f1(x + 6)} ${f1(y + 4)}" stroke="hsl(${h},10%,30%)" stroke-width=".8" fill="none"/>` + glow(`<circle cx="${f1(x + 4)}" cy="${f1(y + 0.4)}" r=".55" fill="#e8f0ff"/>`, 0.5);
      return m;
    }
    if (kind === 'hood') {
      m += `<path class="d" d="M${f1(x - 9)} ${f1(y + 10)} Q${f1(x - 10)} ${f1(y - 11)} ${f1(x + 1)} ${f1(y - 11)} Q${f1(x + 11)} ${f1(y - 10)} ${f1(x + 9)} ${f1(y + 9)}Z"/><path class="hb" d="M${f1(x - 7)} ${f1(y + 8)} Q${f1(x - 8)} ${f1(y - 9)} ${f1(x + 1)} ${f1(y - 9)} Q${f1(x + 9)} ${f1(y - 8)} ${f1(x + 8)} ${f1(y + 6)} L${f1(x + 5)} ${f1(y + 1)} L${f1(x - 3)} ${f1(y + 2)}Z"/>`;
      return m + glow(`<rect x="${f1(x - 1)}" y="${f1(y + 0.4)}" width="2.4" height="1" fill="${vis}"/><rect x="${f1(x + 3)}" y="${f1(y + 0.2)}" width="2.4" height="1" fill="${vis}"/>`);
    }
    const big = kind === 'heavy' ? 1.25 : 1;
    if (kind === 'heavy') m += `<path class="h" d="${poly([[x - 8, y + 8], [x - 9, y - 6], [x - 4, y - 10], [x + 6, y - 10], [x + 10, y - 5], [x + 10, y + 8]])}"/>`;
    else m += `<path class="h" d="M${f1(x - 7)} ${f1(y + 7)} Q${f1(x - 8.5)} ${f1(y - 9)} ${f1(x + 0.5)} ${f1(y - 9.5)} Q${f1(x + 9)} ${f1(y - 9)} ${f1(x + 8.5)} ${f1(y + 4)} L${f1(x + 5)} ${f1(y + 8.5)} L${f1(x - 4)} ${f1(y + 8.5)}Z"/>`;
    m += `<path class="d" d="${poly([[x - 2 * big, y - 2.4], [x + 8.6 * big, y - 2.6], [x + 8 * big, y + 2.4], [x - 1.5 * big, y + 2.2]])}"/>`;
    m += glow(`<path d="${poly([[x - 0.5, y - 1.2], [x + 8 * big, y - 1.4], [x + 7.6 * big, y + 0.8], [x, y + 0.8]])}" fill="${vis}"/>`);
    if (kind === 'rebreather') m += `<path class="hb" d="${poly([[x + 2, y + 3], [x + 9, y + 3], [x + 8, y + 8], [x + 3, y + 8]])}"/><path d="M${f1(x + 4)} ${f1(y + 8)} Q${f1(x + 1)} ${f1(y + 13)} ${f1(x - 4)} ${f1(y + 13)}" stroke="hsl(${h},10%,22%)" stroke-width="1.2" fill="none"/>`;
    if (kind === 'crest') m += `<path class="h" d="${poly([[x - 4, y - 9], [x + 3, y - 15], [x + 4, y - 9]])}"/>`;
    if (o.stripe) m += `<path d="M${f1(x - 6)} ${f1(y - 5)} Q${f1(x)} ${f1(y - 9)} ${f1(x + 6)} ${f1(y - 6)}" stroke="${acc}" stroke-width="1.2" fill="none"/>`;
    if (o.antenna) m += `<path d="M${f1(x - 5)} ${f1(y - 4)} L${f1(x - 10)} ${f1(y - 20)}" stroke="hsl(${h},12%,55%)" stroke-width=".55"/>` + glow(`<circle cx="${f1(x - 10)}" cy="${f1(y - 20)}" r=".8" fill="hsl(0,90%,60%)"/>`);
    return m;
  };

  const back = () => {
    if (o.pack === 'dish') return bar(J.sb, add(J.sb, -6, -16), 0.7, 0.7, 'd') + `<ellipse class="h" cx="${f1(J.sb[0] - 7)}" cy="${f1(J.sb[1] - 18)}" rx="8" ry="3" transform="rotate(-25 ${f1(J.sb[0] - 7)} ${f1(J.sb[1] - 18)})"/>` + glow(`<circle cx="${f1(J.sb[0] - 7)}" cy="${f1(J.sb[1] - 18)}" r="1.2" fill="hsl(190,90%,65%)"/>`);
    if (o.pack === 'charges') return `<path class="hb" d="${poly([add(J.sb, -9, 0), add(J.sb, 1, -2), add(J.hb, 0, -4), add(J.hb, -10, -2)])}"/>` + [0, 1, 2].map(k => `<rect x="${f1(J.sb[0] - 8)}" y="${f1(J.sb[1] + 3 + k * 5)}" width="8" height="3" fill="hsl(${o.accent ?? 30},60%,35%)" stroke="#000" stroke-width=".3"/>`).join('') + glow(`<circle cx="${f1(J.sb[0] - 7)}" cy="${f1(J.sb[1] + 4.5)}" r=".7" fill="hsl(0,90%,58%)"/>`);
    if (o.pack === 'tank') return `<rect class="hb" x="${f1(J.sb[0] - 10)}" y="${f1(J.sb[1] - 2)}" width="7" height="20" rx="3"/>`;
    if (o.pack) return `<path class="hb" d="${poly([add(J.sb, -8, -1), add(J.sb, 2, -3), add(J.hb, 0, -6), add(J.hb, -9, -3)])}"/>`;
    return '';
  };

  const cape = o.cape ? `<path class="d" d="M${f1(J.sb[0] - 2)} ${f1(J.sb[1])} Q${f1(J.pel[0] - 16)} ${f1(J.pel[1] + 10)} ${f1(J.fb[0] - 8)} 100 L${f1(J.ff[0] - 4)} 100 Q${f1(J.pel[0] + 2)} ${f1(J.pel[1] + 6)} ${f1(J.sf[0])} ${f1(J.sf[1])}Z" opacity=".95"/>` : '';
  const shield = o.shield ? `<path class="h" d="${poly([[J.fore[0] - 6, J.fore[1] - 24], [J.fore[0] + 14, J.fore[1] - 26], [J.fore[0] + 16, J.fore[1] + 34], [J.fore[0] - 4, J.fore[1] + 38]])}"/><path class="l" d="M${f1(J.fore[0] - 5)} ${f1(J.fore[1] - 4)}L${f1(J.fore[0] + 15)} ${f1(J.fore[1] - 6)}M${f1(J.fore[0] - 4)} ${f1(J.fore[1] + 14)}L${f1(J.fore[0] + 15)} ${f1(J.fore[1] + 12)}"/>`
    + `<rect class="d" x="${f1(J.fore[0] + 1)}" y="${f1(J.fore[1] - 20)}" width="9" height="3"/>` + glow(`<path d="M${f1(J.fore[0] - 4)} ${f1(J.fore[1] + 26)}L${f1(J.fore[0] + 15)} ${f1(J.fore[1] + 24)}" stroke="hsl(190,85%,62%)" stroke-width=".9"/>`) : '';

  g += back() + cape;
  g += leg(J.hb, J.kb, J.fb, 'hb', false);
  g += pauld(J.sb, 'hb', -1);
  g += arm(J.sb, J.eb, J.wb, 'hb');
  g += torso();
  g += leg(J.hf, J.kf, J.ff, 'h', true);
  g += helmet();
  if (o.weapon !== 'none' && !o.shield) g += weapon();
  g += arm(J.sf, J.ef, J.wf, 'h') + pauld(J.sf, 'h', 1);
  if (o.shield) g += weapon() + shield;
  return g;
}

function infantryScene(r, h, o) {
  const ground = `<ellipse cx="80" cy="99" rx="30" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/>`;
  if (!o.squad) return ground + `<g transform="translate(80 102) scale(1.16) translate(-80 -102)">${infantry(r, h, o)}</g>`;
  // a fire team: two further back in haze, one in front
  const back1 = infantry(r, h, Object.assign({}, o, { pose: 'aim' })), back2 = infantry(r, h, Object.assign({}, o, { pose: 'kneel' }));
  return `<g transform="translate(-30 14) scale(.8)" opacity=".55" filter="url(#hz)">${back1}</g><g transform="translate(46 16) scale(.78)" opacity=".6" filter="url(#hz)">${back2}</g>` + ground + infantry(r, h, Object.assign({}, o, { pose: 'aim' }));
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
const oleg = (a, b, c, w) => limb3(a, b, c, w, w * 0.75, w * 0.35, 'o');
const spike = (base, tip, w) => `<path class="o" d="${poly([[base[0] - w, base[1]], tip, [base[0] + w, base[1]]])}"/>`;
const eyesAt = (pts, col) => glow(pts.map(([x, y, rad]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad || 1.1)}" fill="${col}"/>`).join(''));
const plates = (cx, cy, rx, ry, n, h) => Array.from({ length: n }, (_, k) => { const x = cx - rx + (k + 0.5) * (2 * rx / n); return `<path d="M${f1(x - 2)} ${f1(cy - ry * 0.95)} Q${f1(x + 3)} ${f1(cy)} ${f1(x - 1)} ${f1(cy + ry * 0.9)}" stroke="hsl(${h},35%,60%)" stroke-opacity=".35" stroke-width=".7" fill="none"/>`; }).join('');

const BUGS = {
  runner(r, h, eye) { // lean pack hunter with back blades
    let m = oleg([92, 66], [104, 74], [110, 96], 2.6) + oleg([80, 68], [70, 80], [62, 96], 2.6);
    m += `<path class="o" d="M48 62 Q60 52 84 56 Q106 58 118 66 Q104 74 84 72 Q64 72 48 66Z"/>` + plates(86, 63, 22, 7, 5, h);
    m += `<path class="o" d="${poly([[52, 58], [34, 60], [26, 66], [36, 70], [52, 68]])}"/><path d="M28 66 Q22 72 30 76M34 69 Q32 76 40 77" stroke="hsl(${h},25%,72%)" stroke-opacity=".8" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    m += `<path class="o" d="M76 56 Q70 30 52 18 Q66 30 70 56Z"/><path class="o" d="M90 57 Q90 34 76 22 Q86 36 84 57Z"/>`;
    m += oleg([94, 66], [100, 76], [96, 97], 3) + oleg([72, 66], [62, 76], [56, 97], 3) + eyesAt([[38, 62], [42, 61, 0.9]], eye);
    return m;
  },
  serpent(r, h, eye) { // upright hooded serpent with blade arms
    const spine = [[128, 97], [112, 95], [100, 88], [93, 76], [90, 62], [88, 50], [85, 40]];
    let m = tube(spine, 3, 9, 'o');
    for (let k = 1; k < spine.length - 1; k++) m += `<path d="M${f1(spine[k][0] - 7)} ${f1(spine[k][1] + 2)} Q${f1(spine[k][0])} ${f1(spine[k][1] - 3)} ${f1(spine[k][0] + 7)} ${f1(spine[k][1] + 1)}" stroke="hsl(${h},35%,62%)" stroke-opacity=".35" stroke-width=".7" fill="none"/>`;
    m += `<path class="o" d="${poly([[85, 44], [66, 34], [62, 20], [70, 10], [84, 6], [98, 10], [106, 22], [100, 36]])}"/>` + plates(84, 22, 16, 12, 5, h);
    m += `<path class="o" d="${poly([[80, 32], [62, 34], [56, 40], [66, 45], [84, 42]])}"/>` + eyesAt([[66, 37], [70, 36, 0.9], [73, 37.5, 0.7]], eye);
    m += `<path d="M58 40 Q52 44 56 48" stroke="hsl(${h},25%,72%)" stroke-opacity=".8" stroke-width="1.3" fill="none"/>`;
    m += oleg([90, 56], [72, 60], [58, 44], 2.8) + `<path class="o" d="${poly([[58, 44], [44, 22], [48, 21], [62, 42]])}"/>`;
    m += oleg([94, 62], [110, 62], [124, 46], 2.6) + `<path class="o" d="${poly([[124, 46], [136, 26], [139, 28], [127, 48]])}"/>`;
    return m;
  },
  scorpion(r, h, eye, o) { // low body, pincers forward, tail arched over
    let m = '';
    for (let k = 0; k < 4; k++) m += oleg([76 + k * 9, 72], [70 + k * 11, 62], [62 + k * 13, 96], 2);
    m += `<ellipse class="o" cx="90" cy="74" rx="24" ry="9"/>` + plates(90, 74, 24, 9, 6, h);
    m += `<path class="o" d="${poly([[68, 70], [56, 70], [50, 76], [58, 80], [70, 79]])}"/>` + eyesAt([[60, 73], [63, 72, 0.8]], eye);
    m += oleg([62, 76], [44, 70], [36, 78], 2.4) + `<path class="o" d="M36 78 Q24 70 30 64 Q34 72 40 74 Q30 80 36 78Z"/>`;
    m += tube([[112, 72], [126, 66], [133, 52], [132, 36], [124, 22], [110, 18]], 5, 2.2, 'o');
    m += glow(`<path d="${poly([[108, 18], [100, 26], [112, 23]])}" fill="${eye}"/>`) + (o.spit ? glow(`<circle cx="44" cy="62" r="2.2" fill="${eye}"/>`) : '');
    return m;
  },
  bloat(r, h, eye) { // swollen acid sac
    let m = oleg([70, 76], [60, 84], [56, 97], 2.6) + oleg([96, 78], [106, 86], [110, 97], 2.6);
    m += `<ellipse class="o" cx="96" cy="58" rx="26" ry="22"/>` + glow(`<ellipse cx="98" cy="56" rx="17" ry="14" fill="hsl(${h - 30},85%,42%)" opacity=".55"/>`, 0.8);
    m += `<path d="M78 46 Q96 36 116 48M76 62 Q96 52 120 62M80 74 Q98 68 116 74" stroke="hsl(${h},35%,15%)" stroke-width="1" fill="none"/>`;
    m += `<ellipse class="o" cx="66" cy="70" rx="12" ry="9"/><path class="o" d="${poly([[58, 64], [42, 58], [40, 64], [54, 72]])}"/>` + eyesAt([[60, 67], [63, 66, 0.8]], eye);
    m += glow(`<circle cx="38" cy="58" r="2.6" fill="${eye}"/><circle cx="30" cy="54" r="1.6" fill="${eye}"/><circle cx="24" cy="52" r="1" fill="${eye}"/>`);
    m += oleg([74, 76], [70, 86], [72, 97], 3) + oleg([108, 76], [118, 84], [122, 97], 3);
    return m;
  },
  beetle(r, h, eye) { // armored tank with a front shield plate
    let m = '';
    for (let k = 0; k < 3; k++) m += oleg([74 + k * 14, 80], [66 + k * 16, 86], [60 + k * 18, 98], 3);
    m += `<path class="o" d="M40 82 Q44 40 92 36 Q132 38 134 82Z"/>` + plates(88, 60, 44, 22, 6, h);
    m += `<path d="M48 60 Q90 30 128 60" stroke="hsl(${h},40%,65%)" stroke-opacity=".5" stroke-width="1" fill="none"/>`;
    m += `<path class="o" d="${poly([[44, 52], [32, 56], [28, 84], [44, 88], [50, 70]])}"/><path class="o" d="${poly([[38, 54], [28, 30], [44, 50]])}"/>`;
    m += eyesAt([[36, 70], [36, 75, 0.9]], eye);
    return m;
  },
  raptor(r, h, eye) { // bipedal ripper with raised scythes
    let m = limb3([96, 62], [108, 76], [100, 97], 5, 3.6, 2, 'o') + limb3([86, 62], [80, 78], [90, 97], 6, 4.2, 2.2, 'o');
    m += `<path class="o" d="M60 52 Q74 40 96 50 Q116 56 140 52 Q118 66 96 66 Q72 64 60 58Z"/>` + plates(98, 56, 20, 6, 4, h);
    m += `<path class="o" d="${poly([[64, 50], [44, 46], [36, 52], [48, 58], [64, 58]])}"/>` + eyesAt([[44, 50], [48, 49, 0.8]], eye);
    m += `<path d="M38 54 Q30 58 34 64" stroke="hsl(${h},25%,72%)" stroke-opacity=".8" stroke-width="1.4" fill="none"/>`;
    m += limb3([70, 54], [62, 38], [70, 22], 2.6, 2.2, 1, 'o') + `<path class="o" d="${poly([[70, 22], [52, 6], [62, 4], [74, 20]])}"/>`;
    m += limb3([78, 56], [74, 42], [84, 30], 2.4, 2, 1, 'o') + `<path class="o" d="${poly([[84, 30], [74, 14], [82, 13], [88, 28]])}"/>`;
    return m;
  },
  spider(r, h, eye) { // broodmother with egg sacs
    let m = '';
    for (let k = 0; k < 4; k++) { const a = 0.2 + k * 0.32; m += oleg([80, 62], [80 - Math.cos(a) * 30, 40 + k * 4], [80 - Math.cos(a) * 46, 96], 2.4) + oleg([84, 62], [84 + Math.cos(a) * 30, 40 + k * 4], [84 + Math.cos(a) * 46, 96], 2.4); }
    m += `<ellipse class="o" cx="88" cy="58" rx="20" ry="16"/>` + plates(88, 58, 20, 16, 5, h);
    m += `<ellipse class="o" cx="64" cy="62" rx="10" ry="8"/>` + eyesAt([[58, 59, 1.2], [61, 57, 1], [64, 58, 0.8], [58, 63, 0.7]], eye);
    m += [[80, 82], [92, 84], [104, 80]].map(([x, y]) => `<ellipse class="o" cx="${x}" cy="${y}" rx="6" ry="7"/>` + glow(`<ellipse cx="${x}" cy="${y + 1}" rx="2.6" ry="3.6" fill="hsl(${h - 40},80%,48%)" opacity=".6"/>`, 0.7)).join('');
    return m;
  },
  mantis(r, h, eye) { // tall reaper with scythe forelegs
    let m = oleg([92, 70], [104, 80], [110, 97], 2.4) + oleg([86, 70], [78, 82], [72, 97], 2.4);
    m += `<path class="o" d="M90 70 Q120 68 136 84 Q118 82 92 78Z"/>` + plates(112, 77, 20, 5, 5, h);
    m += `<path class="o" d="M80 74 Q76 50 82 30 Q90 50 94 74Z"/>`;
    m += `<path class="o" d="${poly([[74, 24], [92, 22], [84, 36]])}"/>` + eyesAt([[77, 26, 1.4], [89, 25, 1.4]], eye);
    m += limb3([82, 40], [64, 36], [56, 18], 3, 2.4, 1.4, 'o') + `<path class="o" d="${poly([[56, 18], [36, 30], [40, 34], [58, 24]])}"/>`;
    m += limb3([88, 42], [106, 36], [114, 16], 3, 2.4, 1.4, 'o') + `<path class="o" d="${poly([[114, 16], [132, 30], [128, 34], [112, 22]])}"/>`;
    return m;
  },
  queen(r, h, eye) { // towering queen with crest and long abdomen
    let m = '';
    m += `<path class="o" d="M96 70 Q128 62 144 80 Q140 96 112 96 Q96 92 90 80Z"/>` + plates(118, 80, 24, 12, 6, h);
    m += glow(`<ellipse cx="120" cy="84" rx="12" ry="6" fill="hsl(${h - 40},60%,32%)" opacity=".45"/>`, 0.5);
    for (let k = 0; k < 3; k++) m += oleg([96, 76], [92 - k * 10, 82], [84 - k * 14, 97], 2.4);
    m += `<path class="o" d="M80 78 Q70 50 78 30 Q92 44 98 78Z"/>` + plates(86, 54, 8, 20, 3, h);
    m += `<path class="o" d="${poly([[66, 30], [56, 4], [66, 20], [70, 0], [76, 18], [84, 2], [86, 22], [94, 8], [92, 32]])}"/>`;
    m += `<path class="o" d="${poly([[70, 28], [56, 32], [50, 40], [62, 44], [80, 40]])}"/>` + eyesAt([[58, 36, 1.3], [62, 34.5, 1], [66, 35.5, 0.8]], eye);
    m += limb3([80, 44], [62, 50], [50, 64], 2.6, 2, 1.2, 'o') + limb3([88, 46], [104, 50], [112, 66], 2.6, 2, 1.2, 'o');
    return m;
  },
};

const DRONES = {
  quad(r, h, o, eye) { return null; }, // handled by the classic drone renderer
  disc(r, h, o, eye) { // flat recon drone with ducted fans and a sensor turret
    let m = `<ellipse cx="80" cy="66" rx="30" ry="4" fill="hsl(${h + 160},70%,55%)" opacity=".25" filter="url(#bl)"/>`;
    for (const x of [52, 108]) m += `<ellipse class="h" cx="${x}" cy="50" rx="13" ry="5"/><ellipse class="d" cx="${x}" cy="49.4" rx="10" ry="3.2"/><ellipse cx="${x}" cy="49.4" rx="9" ry="2.6" fill="hsl(${h},20%,70%)" opacity=".12"/>`;
    m += `<path class="h" d="${poly([[62, 46], [98, 46], [104, 52], [96, 58], [64, 58], [56, 52]])}"/><path class="l" d="M70 46V58M90 46V58M56 52H104"/>`;
    m += `<rect class="d" x="76" y="58" width="8" height="4"/><circle class="h" cx="80" cy="65" r="4.4"/><circle class="d" cx="81" cy="65.6" r="2.2"/>` + glow(`<circle cx="81" cy="65.6" r="1.1" fill="${eye}"/><rect x="66" y="50" width="6" height="1" fill="${eye}"/><rect x="88" y="50" width="6" height="1" fill="${eye}"/>`);
    m += `<path d="M94 46 L100 32" stroke="hsl(${h},12%,55%)" stroke-width=".5"/>` + glow(`<circle cx="100" cy="32" r=".8" fill="hsl(0,90%,60%)"/>`);
    if (o.shield) m += glow(`<ellipse cx="80" cy="54" rx="46" ry="24" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".7" stroke-dasharray="3 1.5"/>`, 0.7);
    return m;
  },
  gunship(r, h, o, eye) {
    let m = `<path class="h" d="${poly([[44, 52], [74, 44], [116, 46], [128, 52], [116, 58], [74, 60]])}"/><path class="l" d="M74 44V60M98 45V59"/>`;
    m += `<path class="h" d="${poly([[78, 46], [64, 26], [72, 24], [92, 46]])}"/><path class="h" d="${poly([[78, 58], [64, 78], [72, 80], [92, 58]])}"/>`;
    m += `<rect class="h" x="58" y="20" width="18" height="8" rx="3"/><rect class="h" x="58" y="76" width="18" height="8" rx="3"/>`;
    m += glow(`<ellipse cx="50" cy="24" rx="8" ry="2.4" fill="url(#pm)"/><ellipse cx="50" cy="80" rx="8" ry="2.4" fill="url(#pm)"/>`, 0.8);
    const barrels = o.gun > 1 ? [-2, 0, 2] : [0];
    m += `<rect class="d" x="104" y="58" width="12" height="6"/>` + barrels.map(dy => `<path d="M116 ${61 + dy}H${o.gun > 1 ? 140 : 132}" stroke="hsl(${h},10%,40%)" stroke-width="1.2"/>`).join('');
    m += glow(`<path d="${poly([[108, 48], [122, 49], [121, 52], [108, 51]])}" fill="${eye}"/>`);
    return `<g transform="rotate(-8 80 52)">${m}</g>`;
  },
  sphere(r, h, o, eye) {
    const R = o.small ? 10 : 15;
    let m = `<circle class="h" cx="80" cy="52" r="${R}"/><path d="M${f1(80 - R * 0.75)} ${f1(52 - R * 0.62)} L${f1(80 + R * 0.62)} ${f1(52 + R * 0.75)}" stroke="hsl(45,90%,52%)" stroke-width="3" stroke-dasharray="2.4 2" fill="none"/><path class="l" d="M${80 - R} 52H${80 + R}"/>`;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - 0.3; m += spike([80 + Math.cos(a) * R, 52 + Math.sin(a) * R], [80 + Math.cos(a) * (R + 7), 52 + Math.sin(a) * (R + 7)], 1.6).replace('class="o"', 'class="h"'); }
    m += `<circle class="d" cx="${f1(80 + R * 0.5)}" cy="${f1(52 - R * 0.35)}" r="${f1(R * 0.26)}"/>` + glow(`<circle cx="${f1(80 + R * 0.5)}" cy="${f1(52 - R * 0.35)}" r="${f1(R * 0.13)}" fill="${eye}"/>`);
    if (o.shield) m += glow(`<circle cx="80" cy="52" r="${R + 14}" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".7" stroke-dasharray="3 1.5"/>`, 0.7);
    return m + `<ellipse cx="80" cy="96" rx="20" ry="2" fill="#000" opacity=".5" filter="url(#bl)"/>`;
  },
  probe(r, h, o, eye) {
    let m = `<rect class="h" x="74" y="34" width="12" height="40" rx="2"/><path class="l" d="M74 46h12M74 60h12"/>`;
    m += [[44, 40], [92, 40]].map(([x, y]) => `<rect x="${x}" y="${y}" width="24" height="14" fill="hsl(215,40%,22%)" stroke="hsl(${h},30%,60%)" stroke-opacity=".5" stroke-width=".5"/><path d="M${x + 8} ${y}v14M${x + 16} ${y}v14M${x} ${y + 7}h24" stroke="#000" stroke-opacity=".5" stroke-width=".4"/>`).join('');
    m += `<path d="M68 47h6M86 47h6" stroke="hsl(${h},10%,40%)" stroke-width="1.4"/><ellipse class="h" cx="80" cy="28" rx="11" ry="4"/><path d="M80 28V16" stroke="hsl(${h},15%,55%)" stroke-width=".6"/>`;
    return m + glow(`<circle cx="80" cy="16" r="1" fill="hsl(0,90%,60%)"/><circle cx="80" cy="66" r="2.2" fill="${eye}"/>`);
  },
};

const SKIN = ['hsl(28,34%,64%)', 'hsl(25,32%,48%)', 'hsl(22,34%,34%)', 'hsl(20,30%,22%)'];
function officer(r, h, o) {
  const tone = o.skin != null ? o.skin : Math.floor(r() * 4), sk = SKIN[tone];
  const old = o.old ? 1 : 0;
  let m = `<defs><linearGradient id="fk" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="${sk}"/><stop offset=".62" stop-color="${sk}"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient></defs>`;
  // uniform
  const coat = o.coat ? `<path class="h" d="${poly([[30, 101], [40, 76], [62, 66], [70, 50], [70, 70], [90, 70], [90, 50], [98, 66], [120, 76], [130, 101]])}"/>` : `<path class="h" d="${poly([[34, 101], [44, 80], [64, 70], [96, 70], [116, 80], [126, 101]])}"/>`;
  m += coat + `<path class="d" d="${poly([[68, 70], [80, 86], [92, 70], [88, 66], [72, 66]])}"/>`;
  if (o.boards) m += [[48, 76], [102, 76]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="4" fill="hsl(40,55%,40%)" stroke="#000" stroke-width=".3"/>` + glow(`<rect x="${x + 1}" y="${y + 1.2}" width="10" height=".8" fill="hsl(42,90%,62%)"/>`, 0.7)).join('');
  if (o.medals) m += [0, 1, 2].map(k => `<rect x="${52 + k * 5}" y="86" width="4" height="2.4" fill="hsl(${[0, 210, 45][k]},60%,45%)"/>`).join('');
  if (o.straps) m += `<path d="M60 74 L84 101M100 74 L78 101" stroke="hsl(25,30%,18%)" stroke-width="3"/>`;
  // neck and head
  m += `<path d="${poly([[73, 56], [87, 56], [88, 72], [72, 72]])}" fill="url(#fk)"/>`;
  m += `<path d="M66 44 Q66 26 80 25 Q95 26 94 44 Q94 56 86 63 Q80 66 74 63 Q66 56 66 44Z" fill="url(#fk)"/>`;
  // features: brows, eyes, nose, mouth, cheek shadow
  m += `<path d="M70.5 42.5 Q74 40.6 77.5 42M82.5 42 Q86 40.6 89.5 42.6" stroke="#000" stroke-opacity=".55" stroke-width="1.1" fill="none"/>`;
  m += `<path d="M71.6 45.3 Q74.2 44.2 76.8 45.3 Q74.2 46.4 71.6 45.3ZM83.2 45.3 Q85.8 44.2 88.4 45.3 Q85.8 46.4 83.2 45.3Z" fill="#0b0c0e"/>`;
  m += glow(`<circle cx="75" cy="45.1" r=".35" fill="#fff"/><circle cx="86.6" cy="45.1" r=".35" fill="#fff"/>`, 0.4);
  m += `<path d="M80.5 46 L79 53 L81.6 53.6" stroke="#000" stroke-opacity=".35" stroke-width=".7" fill="none"/><path d="M76 57.6 Q80 58.8 84 57.6" stroke="#000" stroke-opacity=".5" stroke-width=".8" fill="none"/>`;
  m += `<path d="M86 30 Q95 36 92 54 Q90 60 84 63 Q90 50 86 30Z" fill="#000" opacity=".3"/>`;
  if (old) m += `<path d="M71 49 Q73 51 76 50M84 50 Q87 51 89 49" stroke="#000" stroke-opacity=".3" stroke-width=".5" fill="none"/>`;
  if (o.scar) m += `<path d="M86 38 L90 52" stroke="hsl(0,40%,70%)" stroke-opacity=".7" stroke-width=".7"/>`;
  if (o.beard) m += `<path d="M68 50 Q68 66 80 67 Q92 66 92 50 Q90 60 86 60 Q80 62 74 60 Q70 60 68 50Z" fill="${o.old ? 'hsl(30,8%,62%)' : 'hsl(25,20%,14%)'}"/>`;
  if (o.cyber) m += `<path d="${poly([[82, 41], [91, 41], [92, 48], [83, 48]])}" fill="hsl(${h},8%,30%)" stroke="hsl(${h},20%,60%)" stroke-width=".4"/>` + glow(`<circle cx="86.5" cy="44.6" r="1.4" fill="hsl(0,90%,58%)"/>`);
  if (o.patch) m += `<path d="M82 42h8v6h-8z" fill="#050505"/><path d="M68 38L94 48" stroke="#050505" stroke-width=".7"/>`;
  if (o.bandana) m += `<path d="M66 50 Q80 56 94 50 L92 62 Q80 70 68 62Z" fill="hsl(${o.accent ?? 10},35%,28%)"/>`;
  // hair
  const hairCol = o.old ? 'hsl(30,6%,66%)' : `hsl(${[25, 20, 15, 30][tone]},20%,${[22, 14, 9, 7][tone]}%)`;
  const hair = o.hair || 'short';
  if (hair === 'short') m += `<path d="M66 42 Q64 24 80 23 Q96 24 94 42 Q92 31 82 30 Q72 31 68 42Z" fill="${hairCol}"/>`;
  if (hair === 'bun') m += `<path d="M66 44 Q64 23 80 22 Q96 23 94 44 Q92 30 80 29 Q70 30 66 44Z" fill="${hairCol}"/><ellipse cx="80" cy="20" rx="7" ry="5" fill="${hairCol}"/>`;
  if (hair === 'long') m += `<path d="M64 62 Q60 24 80 22 Q100 24 96 62 Q94 44 92 36 Q80 30 68 36 Q66 44 64 62Z" fill="${hairCol}"/>`;
  if (hair === 'mohawk') m += `<path d="M76 30 Q78 14 84 12 Q86 20 85 31Z" fill="hsl(${o.accent ?? 10},60%,40%)"/>`;
  // headgear
  if (o.cap) m += `<path class="h" d="M65 36 Q80 22 96 35 L97 39 L64 39Z"/><path class="d" d="M62 38 L99 38 L95 42.5 L66 42.5Z"/><path d="M66 43 Q80 47 94 43 L94 47 Q80 50 66 47Z" fill="#000" opacity=".45"/>` + glow(`<rect x="78" y="30" width="4" height="2.2" fill="hsl(42,90%,62%)"/>`) + (o.braid ? `<path d="M64 39 L97 39" stroke="hsl(42,80%,55%)" stroke-width="1"/>` : '');
  if (o.hat) m += `<path class="d" d="M46 40 Q80 28 114 40 Q80 46 46 40Z"/><path class="h" d="M66 38 Q70 20 80 19 Q90 20 94 38Z"/><path d="M66 42 Q80 46 94 42 L94 47 Q80 50 66 47Z" fill="#000" opacity=".5"/>`;
  if (o.hood) m += `<path class="d" d="M60 70 Q56 24 80 20 Q104 24 100 70 L94 56 Q94 34 80 31 Q66 34 66 56Z"/>`;
  if (o.goggles) m += `<rect class="h" x="${o.gogglesUp ? 68 : 68}" y="${o.gogglesUp ? 30 : 42}" width="24" height="6" rx="2.6"/>` + glow(`<circle cx="74" cy="${o.gogglesUp ? 33 : 45}" r="2.2" fill="hsl(25,85%,55%)"/><circle cx="86" cy="${o.gogglesUp ? 33 : 45}" r="2.2" fill="hsl(25,85%,55%)"/>`);
  if (o.headset) m += `<path d="M64 46 Q62 30 80 26 Q98 30 96 46" stroke="hsl(${h},10%,30%)" stroke-width="1.6" fill="none"/><rect class="h" x="61" y="42" width="5" height="9" rx="2"/><path d="M64 50 Q70 60 76 59" stroke="hsl(${h},10%,30%)" stroke-width="1" fill="none"/>` + glow(`<path d="${poly([[82, 42], [94, 41.4], [94, 46.6], [82, 46]])}" fill="hsl(190,85%,60%)" opacity=".5"/>`);
  if (o.helm) m += `<path class="h" d="M65 52 Q63 26 80 24 Q97 26 95 52 L90 60 L70 60Z"/>` + glow(`<path d="${poly([[68, 41], [92, 41], [90, 46], [70, 46]])}" fill="hsl(190,80%,60%)"/>`);
  return m;
}

const MECHS = {
  walker(r, h, o) { // reverse-jointed cockpit walker with missile pods
    let m = '';
    const leg = (x, cls) => limb3([x, 54], [x - 10, 70], [x + 4, 94], 5, 4, 3, cls) + `<path class="${cls}" d="${poly([[x - 4, 94], [x + 12, 94], [x + 14, 99], [x - 6, 99]])}"/>`;
    m += leg(72, 'hb') + leg(92, 'h');
    m += `<path class="h" d="${poly([[52, 40], [96, 32], [116, 40], [112, 56], [62, 60], [50, 52]])}"/><path class="l" d="M64 38V58M98 34V56"/>`;
    m += `<path class="d" d="${poly([[98, 40], [114, 42], [112, 48], [98, 47]])}"/>` + glow(`<path d="${poly([[100, 42], [112, 43.4], [111, 46], [100, 45]])}" fill="${o.heavy ? 'hsl(0,85%,58%)' : 'hsl(38,92%,58%)'}"/>`);
    m += `<rect class="h" x="54" y="26" width="18" height="12"/>` + glow(Array.from({ length: 6 }, (_, k) => `<circle cx="${57 + (k % 3) * 6}" cy="${29.5 + Math.floor(k / 3) * 5}" r="1.1" fill="hsl(0,80%,55%)"/>`).join(''), 0.7);
    m += `<rect class="d" x="104" y="54" width="14" height="5"/><path d="M118 55.5h18M118 57.5h18" stroke="hsl(${h},10%,40%)" stroke-width="1"/>`;
    if (o.coil) m += glow(`<path d="${line([[60, 26], [56, 14], [62, 18], [58, 4]])}" stroke="hsl(190,90%,70%)" stroke-width=".9" fill="none"/>`);
    return `<ellipse cx="82" cy="99" rx="34" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 99) scale(.82) translate(-84 -99)">${m}</g>`;
  },
};

// ---------------------------------------------------------------- psionic and mech variants
function psionFigure(r, h, o) {
  const eyeC = o.echo ? 'hsl(300,80%,75%)' : `hsl(${h + 10},90%,72%)`;
  const pose = o.pose || 'stand';
  let m = '';
  const halos = (o.halo || 0) + (o.herald ? 2 : 0) + (o.crown ? 1 : 0);
  for (let k = 0; k < halos; k++) m += glow(`<ellipse cx="80" cy="${pose === 'meditate' ? 44 : 34}" rx="${20 + k * 10}" ry="${f1((20 + k * 10) * 0.9)}" fill="none" stroke="${eyeC}" stroke-width=".6" opacity="${0.7 - k * 0.15}"/>`, 0.6);
  if (o.runes) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; m += glow(`<rect x="${f1(80 + Math.cos(a) * 34 - 1.2)}" y="${f1(46 + Math.sin(a) * 30 - 1.2)}" width="2.4" height="2.4" fill="${eyeC}" opacity=".7" transform="rotate(45 ${f1(80 + Math.cos(a) * 34)} ${f1(46 + Math.sin(a) * 30)})"/>`, 0.7); }
  if (o.herald) for (let k = 0; k < 9; k++) { const a = -Math.PI * 0.95 + k / 8 * Math.PI * 0.9; m += `<path d="${poly([[80 + Math.cos(a) * 12, 40 + Math.sin(a) * 12], [80 + Math.cos(a) * 44, 40 + Math.sin(a) * 40], [80 + Math.cos(a + 0.05) * 13, 40 + Math.sin(a + 0.05) * 13]])}" fill="hsl(${h},15%,20%)"/>`; }
  if (pose === 'spread') m += `<path class="d" d="M80 50 Q50 46 26 80 Q40 90 56 101 L104 101 Q120 90 134 80 Q110 46 80 50Z" opacity=".95"/><path d="M80 52 Q54 50 30 80M80 52 Q106 50 130 80" stroke="hsl(${h},50%,50%)" stroke-opacity=".4" stroke-width=".6" fill="none"/>`;
  // robe
  if (pose === 'meditate') m += `<path class="h" d="M50 92 Q56 70 68 62 Q74 58 80 58 Q86 58 92 62 Q104 70 110 92 Q80 98 50 92Z"/><path class="l" d="M60 88 Q80 82 100 88"/>`;
  else m += `<path class="h" d="M56 101 Q60 70 66 56 Q70 50 80 50 Q90 50 94 56 Q100 70 104 101Z"/><path class="l" d="M80 54V101M70 70 Q80 76 90 70"/>`;
  const hy = pose === 'meditate' ? 10 : 0;
  // head / hood
  if (o.reveal) {
    m += `<path class="h" d="M63 ${60 + hy} Q61 ${28 + hy} 80 ${24 + hy} Q99 ${28 + hy} 97 ${60 + hy} L91 ${52 + hy} Q91 ${36 + hy} 80 ${34 + hy} Q69 ${36 + hy} 69 ${52 + hy}Z"/>`;
    m += `<path d="M71 ${44 + hy} Q71 ${34 + hy} 80 ${33 + hy} Q89 ${34 + hy} 89 ${44 + hy} Q89 ${53 + hy} 80 ${56 + hy} Q71 ${53 + hy} 71 ${44 + hy}Z" fill="hsl(${h},12%,70%)"/><path d="M80 ${34 + hy} Q88 ${38 + hy} 88 ${46 + hy} Q86 ${54 + hy} 80 ${56 + hy}Z" fill="#000" opacity=".35"/>`;
    m += glow(`<ellipse cx="80" cy="${38 + hy}" rx="2.4" ry="1.3" fill="${eyeC}"/><rect x="74" y="${44 + hy}" width="3" height="1.1" fill="${eyeC}"/><rect x="83" y="${44 + hy}" width="3" height="1.1" fill="${eyeC}"/>`);
  } else {
    m += `<path class="h" d="M64 ${60 + hy} Q62 ${28 + hy} 80 ${24 + hy} Q98 ${28 + hy} 96 ${60 + hy} L88 ${52 + hy} Q80 ${40 + hy} 72 ${52 + hy}Z"/><path class="d" d="M72 ${54 + hy} Q72 ${36 + hy} 80 ${34 + hy} Q88 ${36 + hy} 88 ${54 + hy}Z"/>`;
    if (o.mask) m += `<path d="M73 ${38 + hy} Q80 ${34 + hy} 87 ${38 + hy} L86 ${50 + hy} Q80 ${54 + hy} 74 ${50 + hy}Z" fill="hsl(${h},10%,72%)" opacity=".9"/>`;
    m += glow(`<rect x="75" y="${42 + hy}" width="3.2" height="1.3" fill="${eyeC}"/><rect x="82" y="${42 + hy}" width="3.2" height="1.3" fill="${eyeC}"/>`);
  }
  if (o.crown) m += `<path class="h" d="${poly([[66, 32], [68, 16], [72, 28], [76, 10], [80, 26], [84, 10], [88, 28], [92, 16], [94, 32]])}"/>`;
  if (o.tendrils) for (let k = 0; k < 5; k++) { const ex = 56 + k * 12; m += glow(`<path d="M80 ${30 + hy} Q${f1(ex + rr(r, -6, 6))} ${f1(14 + rr(r, -4, 4))} ${f1(ex)} ${f1(rr(r, 0, 8))}" stroke="${eyeC}" stroke-width=".7" fill="none" opacity=".75"/>`, 0.7); }
  // arms and hands per pose
  const sleeve = (a, b, c) => limb3(a, b, c, 4, 3.4, 2.6, 'h');
  if (pose === 'meditate') m += sleeve([66, 66], [62, 78], [76, 82]) + sleeve([94, 66], [98, 78], [84, 82]) + glow(`<circle cx="80" cy="81" r="3.4" fill="${eyeC}" opacity=".9"/>`);
  else if (pose === 'raise') m += sleeve([68, 58], [56, 46], [52, 30]) + sleeve([92, 58], [104, 46], [108, 30]) + glow(`<circle cx="52" cy="28" r="3.2" fill="${eyeC}"/><circle cx="108" cy="28" r="3.2" fill="${eyeC}"/><path d="M52 28 Q80 ${rr(r, 8, 18)} 108 28" stroke="${eyeC}" stroke-width=".8" fill="none"/>`);
  else if (pose === 'spread') m += sleeve([68, 58], [52, 60], [36, 56]) + sleeve([92, 58], [108, 60], [124, 56]) + glow(`<circle cx="35" cy="55" r="3" fill="${eyeC}"/><circle cx="125" cy="55" r="3" fill="${eyeC}"/>`);
  else m += glow(`<circle cx="58" cy="74" r="3.4" fill="${eyeC}" opacity=".85"/><circle cx="102" cy="74" r="3.4" fill="${eyeC}" opacity=".85"/>`);
  if (o.book) m += [[44, 40, -12], [106, 34, 10], [112, 60, 18]].map(([x, y, a]) => `<rect class="h" x="${x}" y="${y}" width="14" height="10" transform="rotate(${a} ${x + 7} ${y + 5})"/>` + glow(`<path d="M${x + 2} ${y + 4}h10M${x + 2} ${y + 7}h7" stroke="${eyeC}" stroke-width=".5" transform="rotate(${a} ${x + 7} ${y + 5})"/>`)).join('');
  return `<g ${o.echo ? 'opacity=".75"' : ''}>${m}</g>`;
}

Object.assign(MECHS, {
  tripod(r, h, o) { // spider tripod with a sensor body slung high
    let m = '';
    const legs = [[80, 40, 40, 30, 30, 98], [80, 40, 120, 28, 132, 98], [80, 40, 86, 22, 92, 99]];
    legs.forEach(([x0, y0, kx, ky, fx, fy], k) => { m += limb3([x0, y0], [kx, ky], [fx, fy], 3.4, 2.8, 1.6, k === 2 ? 'hb' : 'h'); });
    m += `<path class="h" d="${poly([[58, 38], [80, 28], [104, 36], [100, 50], [62, 52]])}"/><path class="l" d="M68 32V52M92 31V50"/>`;
    m += glow(`<path d="${poly([[86, 38], [100, 39], [99, 43], [86, 42]])}" fill="hsl(38,92%,58%)"/>`) + `<rect class="d" x="70" y="50" width="16" height="5"/><path d="M78 55v8M74 55v8M82 55v8" stroke="hsl(${h},10%,40%)" stroke-width="1"/>`;
    if (o.shield) m += glow(`<ellipse cx="80" cy="44" rx="34" ry="22" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".7" stroke-dasharray="3 1.5"/>`, 0.6);
    return `<ellipse cx="82" cy="99" rx="50" ry="3.5" fill="#000" opacity=".6" filter="url(#bl)"/>` + m;
  },
  sleek(r, h, o) { // slender assassin frame, single eye, arm blades
    let m = limb3([74, 58], [68, 76], [72, 98], 3.4, 2.6, 2, 'hb') + limb3([86, 58], [94, 76], [90, 98], 3.6, 2.8, 2.2, 'h');
    m += `<path class="h" d="${poly([[70, 32], [90, 32], [94, 46], [86, 60], [74, 60], [66, 46]])}"/><path class="l" d="M80 32V60M70 46H90"/>`;
    m += `<path class="h" d="${poly([[74, 18], [86, 18], [88, 28], [80, 32], [72, 28]])}"/>` + glow(`<circle cx="82" cy="24" r="1.8" fill="hsl(0,90%,58%)"/>`);
    m += limb3([68, 36], [58, 50], [52, 66], 2.8, 2.2, 1.8, 'hb') + `<path class="h" d="${poly([[52, 66], [40, 92], [44, 92], [55, 67]])}"/>`;
    m += limb3([92, 36], [104, 44], [112, 34], 2.8, 2.2, 1.8, 'h') + `<path class="h" d="${poly([[112, 34], [134, 14], [136, 17], [114, 37]])}"/>` + glow(`<path d="M115 35L134 16" stroke="hsl(0,90%,62%)" stroke-width=".6"/>`);
    if (o.shield) m += glow(`<ellipse cx="80" cy="56" rx="36" ry="44" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".6" stroke-dasharray="3 1.5"/>`, 0.6);
    return `<ellipse cx="82" cy="99" rx="26" ry="3" fill="#000" opacity=".6" filter="url(#bl)"/>` + m;
  },
});

// ---------------------------------------------------------------- subjects
const SUBJ = {
  ship(r, h, o) {
    const L = (o.size || 1) * 52, segs = 3 + Math.floor(r() * 3);
    let parts = '', x = -L, details = '';
    const nose = rr(r, 10, 18);
    parts += `<path class="h" d="${poly([[L + nose, 0], [L, -rr(r, 4, 6)], [L, rr(r, 4, 6)]])}"/>`;
    const segW = (2 * L) / segs;
    for (let i = 0; i < segs; i++) {
      const hh = rr(r, 6, 11) * (o.hauler ? 1.4 : 1), sx = -L + i * segW;
      parts += `<rect class="h" x="${f1(sx)}" y="${f1(-hh)}" width="${f1(segW - 0.8)}" height="${f1(hh * 2)}"/>`;
      details += `<path class="l" d="M${f1(sx + segW * 0.5)} ${f1(-hh)}V${f1(hh)}"/>`;
      if (r() < 0.6) details += `<rect class="d" x="${f1(sx + 2)}" y="${f1(-hh - 3)}" width="${f1(segW * 0.5)}" height="2.4"/>`;
      if (r() < 0.5) details += `<rect class="k" x="${f1(sx + 1)}" y="${f1(hh - 2)}" width="${f1(segW - 3)}" height="1"/>`;
      if (o.hauler) details += `<rect class="d" x="${f1(sx + 2)}" y="${f1(-hh + 2)}" width="${f1(segW - 5)}" height="${f1(hh * 2 - 4)}" opacity=".7"/>`;
    }
    // radiator fins
    const fx = -L + segW * rr(r, 0.5, 1.5);
    details += `<path class="h" d="${poly([[fx, -10], [fx + 16, -10], [fx + 12, -24], [fx + 2, -24]])}" opacity=".9"/><path class="h" d="${poly([[fx, 10], [fx + 16, 10], [fx + 12, 22], [fx + 2, 22]])}" opacity=".9"/>`;
    // drive section and cone
    const dr = rr(r, 10, 14);
    parts += `<path class="h" d="${poly([[-L, -dr * 0.7], [-L - 10, -dr], [-L - 10, dr], [-L, dr * 0.7]])}"/><path class="d" d="${poly([[-L - 10, -dr * 0.8], [-L - 17, -dr * 1.15], [-L - 17, dr * 1.15], [-L - 10, dr * 0.8]])}"/>`;
    const plume = glow(`<ellipse cx="${f1(-L - 30)}" cy="0" rx="16" ry="${f1(dr * 0.7)}" fill="url(#pm)"/>`, 0.9);
    // turrets and running lights
    for (let t = 0; t < (o.turrets || 1 + Math.floor(r() * 2)); t++) { const tx = rr(r, -L * 0.6, L * 0.7); details += `<circle class="h" cx="${f1(tx)}" cy="-8" r="2.4"/><path d="M${f1(tx)} -8l${f1(rr(r, 7, 12))} -2" stroke="hsl(${h},15%,60%)" stroke-width="1"/>`; }
    let win = ''; for (let k = 0; k < 14; k++) win += `<rect x="${f1(-L + 4 + k * (2 * L - 8) / 14)}" y="1.2" width=".9" height=".6"/>`;
    const lights = glow(`<g fill="hsl(40,90%,70%)">${win}</g><circle cx="${f1(L + nose - 3)}" cy="0" r=".9" fill="hsl(0,90%,60%)"/>`, 0.8);
    const wreck = o.wreck ? `<path d="${line([[-10, -9], [-4, 2], [-12, 9]])}" stroke="#000" stroke-width="2.4" fill="none"/><g filter="url(#gl)"><circle cx="-6" cy="0" r="2" fill="hsl(25,90%,55%)"/></g>` : '';
    const flag = o.flag ? `<rect class="h" x="${f1(L * 0.2)}" y="-17" width="22" height="7"/><g filter="url(#gl)"><rect x="${f1(L * 0.2 + 2)}" y="-15" width="18" height="1" fill="hsl(${h},70%,70%)"/></g>` : '';
    return `<g transform="translate(82 54) rotate(${f1(rr(r, -20, -12))}) scale(${f1(o.scale || 0.95)})">${plume}${details}${parts}${flag}${lights}${wreck}</g>`;
  },

  fighter(r, h, o) {
    const w = rr(r, 20, 28) * (o.sleek ? 0.8 : 1), len = rr(r, 26, 34);
    const body = poly([[len, 0], [6, -4.5], [-18, -5.5], [-22, -3], [-22, 3], [-18, 5.5], [6, 4.5]]);
    const wingT = poly([[6, -4], [-10, -w], [-17, -w + 2], [-12, -5]]), wingB = poly([[6, 4], [-10, w], [-17, w - 2], [-12, 5]]);
    const canopy = glow(`<ellipse cx="10" cy="0" rx="5" ry="1.8" fill="hsl(${o.raider ? 20 : 195},70%,60%)"/>`);
    const eng = glow(`<ellipse cx="-30" cy="-2.6" rx="9" ry="2" fill="url(#pm)"/><ellipse cx="-30" cy="2.6" rx="9" ry="2" fill="url(#pm)"/>`);
    const stripe = `<path d="M-6 -4.2L-12 -${f1(w - 4)}" stroke="hsl(${o.raider ? 15 : h},60%,50%)" stroke-width="1.4" opacity=".7"/>`;
    const extra = o.dropship ? `<rect class="h" x="-12" y="-9" width="20" height="18" rx="2"/><path class="l" d="M-8 -9V9M0 -9V9"/>` : '';
    return `<g transform="translate(78 54) rotate(${f1(rr(r, -38, -22))}) scale(1.35)">${eng}<path class="h" d="${wingT}"/><path class="h" d="${wingB}"/>${stripe}<path class="h" d="${body}"/>${extra}<path class="l" d="M-2 -4.5V4.5M-14 -5V5"/>${canopy}</g>`;
  },

  drone(r, h, o) {
    if (o.plan && DRONES[o.plan]) { const out = DRONES[o.plan](r, h, o, o.medic ? 'hsl(140,70%,55%)' : `hsl(${h + 160},70%,60%)`); if (out) return out; }
    const R = (o.small ? 8 : 12) * rr(r, 0.9, 1.1), cx = 80, cy = o.crawler ? 64 : 48;
    let m = '';
    const eye = o.medic ? 'hsl(140,70%,55%)' : o.bomb ? 'hsl(0,85%,55%)' : `hsl(${h + 160},70%,60%)`;
    if (o.crawler) {
      for (let k = -1; k <= 1; k++) for (const s of [-1, 1]) m += `<path d="M${f1(cx + k * 8)} ${cy} q ${f1(s * 10)} -8 ${f1(s * 16)} 14" class="leg"/>`;
      m += `<ellipse class="h" cx="${cx}" cy="${cy}" rx="${f1(R * 1.5)}" ry="${f1(R * 0.7)}"/><path class="l" d="M${cx - 10} ${cy}h20"/>`;
      m += glow(`<circle cx="${f1(cx + R * 1.3)}" cy="${f1(cy - 2)}" r="1.6" fill="${eye}"/>`);
      return m;
    }
    const arms = o.arms || (r() < 0.5 ? 2 : 4);
    for (let k = 0; k < arms; k++) {
      const a = (arms === 2 ? [Math.PI * 0.08, Math.PI * 0.92][k] : (k + 0.5) / arms * Math.PI * 2) - (arms === 2 ? 0 : 0.2);
      const ex = cx + Math.cos(a) * R * 2.1 * (arms === 2 ? 1.2 : 1), ey = cy + Math.sin(a) * R * 1.3 - (arms === 2 ? 4 : 0);
      m += `<path d="M${cx} ${cy} L${f1(ex)} ${f1(ey)}" stroke="hsl(${h},10%,30%)" stroke-width="2.4"/>`;
      m += `<ellipse class="h" cx="${f1(ex)}" cy="${f1(ey)}" rx="5" ry="2.6"/><ellipse cx="${f1(ex)}" cy="${f1(ey - 3)}" rx="9" ry="1.4" fill="hsl(${h},20%,70%)" opacity=".18"/>`;
    }
    if (o.gun) m += `<rect class="h" x="${cx - 3}" y="${f1(cy + R * 0.6)}" width="6" height="7"/><path d="M${cx - 2} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}M${cx} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}M${cx + 2} ${f1(cy + R * 0.6 + 7)}v${o.gun > 1 ? 14 : 10}" stroke="hsl(${h},10%,45%)" stroke-width="1"/>`;
    if (o.probe) m += `<path class="h" d="${poly([[cx - 3, cy - R], [cx + 3, cy - R], [cx + 1, cy - R - 14], [cx - 1, cy - R - 14]])}"/><ellipse class="h" cx="${cx}" cy="${f1(cy - R - 15)}" rx="7" ry="2"/>`;
    const body = r() < 0.5 ? `<circle class="h" cx="${cx}" cy="${cy}" r="${f1(R)}"/>` : `<path class="h" d="${poly(Array.from({ length: 8 }, (_, k) => [cx + Math.cos(k / 8 * Math.PI * 2 + Math.PI / 8) * R, cy + Math.sin(k / 8 * Math.PI * 2 + Math.PI / 8) * R]))}"/>`;
    m += body + `<path class="l" d="M${f1(cx - R)} ${cy}H${f1(cx + R)}"/><circle class="d" cx="${cx}" cy="${f1(cy + 1)}" r="${f1(R * 0.45)}"/>`;
    m += glow(`<circle cx="${cx}" cy="${f1(cy + 1)}" r="${f1(R * 0.25)}" fill="${eye}"/>`);
    if (o.bomb) m += `<path d="M${f1(cx - R * 0.8)} ${f1(cy - R * 0.5)}L${f1(cx + R * 0.8)} ${f1(cy - R * 0.5)}" stroke="hsl(45,90%,55%)" stroke-width="1.6" stroke-dasharray="2 2"/>`;
    if (o.shield) m += glow(`<ellipse cx="${cx}" cy="${cy}" rx="${f1(R * 2.6)}" ry="${f1(R * 2)}" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".8" stroke-dasharray="3 1.5"/>`, 0.7);
    if (o.junk) m += `<path d="${line([[cx - R, cy - R * 0.6], [cx - R * 0.2, cy - R * 0.9], [cx + R * 0.5, cy - R * 0.4]])}" stroke="hsl(25,40%,35%)" stroke-width="2" fill="none"/>`;
    m += `<ellipse cx="${cx}" cy="94" rx="${f1(R * 1.8)}" ry="2" fill="#000" opacity=".5" filter="url(#bl)"/>`;
    return m;
  },

  trooper(r, h, o) { return infantryScene(r, h, o); },

  bust(r, h, o) { return officer(r, h, o); },

  mech(r, h, o) {
    if (o.plan && MECHS[o.plan]) return MECHS[o.plan](r, h, o);
    const s = o.giant ? 1.15 : o.heavy ? 1.05 : 0.95;
    const cls = o.crystal ? 'cr' : 'h';
    let m = '';
    const leg = (x, flip) => `<path class="${cls}" d="${poly([[x, 60], [x + flip * 8, 60], [x + flip * 2, 76], [x + flip * 8, 92], [x + flip * 12, 98], [x - flip * 4, 98], [x - flip * 4, 92], [x - flip * 6, 76]])}"/><circle class="d" cx="${f1(x - flip * 2)}" cy="76" r="2.4"/>`;
    m += leg(70, -1) + leg(90, 1);
    if (o.tri) m += `<path class="${cls}" d="${poly([[78, 60], [82, 60], [84, 94], [76, 94]])}" opacity=".85"/>`;
    m += `<path class="${cls}" d="${poly([[60, 32], [100, 32], [106, 46], [98, 62], [62, 62], [54, 46]])}"/><path class="l" d="M60 46H100M80 32V62"/>`;
    m += glow(`<path d="${poly([[70, 38], [90, 38], [88, 42], [72, 42]])}" fill="${o.crystal ? 'hsl(190,90%,75%)' : o.sleek ? 'hsl(0,85%,58%)' : 'hsl(38,90%,58%)'}"/>`);
    // arms / weapons
    m += `<path class="${cls}" d="${poly([[50, 40], [58, 40], [60, 66], [52, 68]])}"/><rect class="d" x="51" y="66" width="7" height="12"/>`;
    m += `<path class="${cls}" d="${poly([[102, 40], [110, 40], [108, 66], [100, 66]])}"/><rect class="d" x="101" y="66" width="7" height="12"/>`;
    if (o.heavy || o.giant) m += `<rect class="${cls}" x="58" y="22" width="14" height="10"/><rect class="${cls}" x="88" y="22" width="14" height="10"/>` + glow(Array.from({ length: 6 }, (_, k) => `<circle cx="${f1(61 + (k % 3) * 4)}" cy="${f1(25 + Math.floor(k / 3) * 4)}" r=".9" fill="hsl(0,80%,55%)"/>`).join(''), 0.7);
    if (o.coil) m += glow(`<path d="${line([[54, 30], [50, 18], [56, 22], [52, 8]])}" stroke="hsl(190,90%,70%)" stroke-width=".9" fill="none"/>`);
    if (o.shield) m += glow(`<ellipse cx="80" cy="56" rx="38" ry="44" fill="none" stroke="hsl(45,80%,65%)" stroke-width=".7" stroke-dasharray="3 1.5"/>`, 0.6);
    if (o.wall) m += `<path class="${cls}" d="${poly([[40, 30], [58, 26], [60, 86], [42, 90]])}"/><path class="l" d="M41 50L59 47M42 70L60 67"/>` + glow(`<path d="M44 36L56 33" stroke="hsl(190,80%,60%)" stroke-width=".9"/>`);
    if (o.crane) m += `<path d="M104 40 L126 14 L140 20" stroke="hsl(${h},12%,40%)" stroke-width="3.2" fill="none" stroke-linejoin="round"/><path class="${cls}" d="${poly([[136, 20], [146, 30], [140, 32], [134, 26], [128, 30], [130, 22]])}"/>`;
    if (o.junk) m += `<path d="${line([[62, 34], [70, 50], [64, 60]])}" stroke="hsl(20,40%,35%)" stroke-width="2.5" fill="none"/><rect x="88" y="48" width="9" height="9" fill="hsl(20,30%,25%)" transform="rotate(12 92 52)"/>`;
    if (o.crystal) m += `<path d="${poly([[96, 32], [104, 12], [108, 34]])}" class="cr"/><path d="${poly([[60, 32], [56, 14], [66, 32]])}" class="cr"/>`;
    return `<ellipse cx="80" cy="99" rx="34" ry="4" fill="#000" opacity=".55" filter="url(#bl)"/><g transform="translate(80 60) scale(${s}) translate(-80 -60)">${m}</g>`;
  },

  tank(r, h, o) {
    let m = '';
    if (o.hover) m += glow(`<ellipse cx="80" cy="86" rx="36" ry="3" fill="hsl(190,80%,60%)"/>`, 0.8);
    m += `<path class="h" d="${poly([[40, 66], [118, 64], [126, 74], [116, 84], [46, 86], [36, 76]])}"/><path class="l" d="M50 66V85M70 65V85M95 65V84"/>`;
    if (!o.hover) { m += `<rect class="d" x="38" y="82" width="84" height="12" rx="6"/>`; for (let k = 0; k < 7; k++) m += `<circle cx="${46 + k * 12}" cy="88" r="4" fill="hsl(${h},8%,18%)" stroke="hsl(${h},15%,40%)" stroke-width=".4"/>`; }
    m += `<path class="h" d="${poly([[60, 52], [94, 50], [102, 60], [96, 66], [58, 66], [54, 60]])}"/>`;
    const bl = o.lance ? 46 : 34;
    m += `<path class="d" d="${poly([[98, 55], [98 + bl, 50], [98 + bl, 53], [98, 59]])}"/>`;
    if (o.lance) m += glow([0, 1, 2, 3].map(k => `<ellipse cx="${108 + k * 9}" cy="${f1(54.4 - k * 0.9)}" rx="1" ry="3" fill="hsl(190,90%,65%)"/>`).join(''));
    if (o.mines) m += `<rect class="h" x="40" y="56" width="16" height="10"/><path d="M42 61h12" stroke="hsl(45,90%,55%)" stroke-width="1.2" stroke-dasharray="2 1.5"/>`;
    m += glow(`<rect x="66" y="55" width="8" height="1.4" fill="hsl(38,90%,60%)"/>`, 0.8);
    return `<ellipse cx="80" cy="96" rx="48" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(-4 -6)">${m}</g>`;
  },

  structure(r, h, o) {
    const t = o.type;
    if (t === 'wall') {
      let m = '';
      for (let k = 0; k < 3; k++) m += `<path class="h" d="${poly([[40 + k * 26, 94], [44 + k * 26, 50 + (k % 2) * 6], [68 + k * 26, 46 + (k % 2) * 6], [66 + k * 26, 94]])}"/><path d="M${44 + k * 26} ${70 + k} L${67 + k * 26} ${68 + k}" stroke="hsl(45,90%,50%)" stroke-width="3" stroke-dasharray="4 3" opacity=".75"/>`;
      return `<ellipse cx="80" cy="96" rx="50" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/>${m}`;
    }
    if (t === 'coil') return `<path class="h" d="${poly([[66, 96], [94, 96], [88, 84], [72, 84]])}"/><rect class="h" x="76" y="34" width="8" height="52"/>${[40, 52, 64, 76].map(y => `<ellipse class="h" cx="80" cy="${y}" rx="12" ry="3"/>`).join('')}<circle class="h" cx="80" cy="28" r="8"/>` + glow(`<path d="${line([[80, 20], [70, 10], [76, 8], [62, -2]])}" stroke="hsl(195,90%,72%)" stroke-width="1" fill="none"/><path d="${line([[86, 24], [100, 18], [96, 12], [112, 6]])}" stroke="hsl(195,90%,72%)" stroke-width="1" fill="none"/><circle cx="80" cy="28" r="3" fill="hsl(195,90%,75%)"/>`);
    if (t === 'factory') {
      let wins = ''; for (let k = 0; k < 18; k++) wins += `<rect x="${f1(48 + (k % 6) * 10)}" y="${f1(60 + Math.floor(k / 6) * 9)}" width="5" height="3"/>`;
      return `<rect class="h" x="44" y="54" width="66" height="44"/><path class="h" d="${poly([[44, 54], [60, 44], [76, 54], [92, 44], [110, 54]])}"/><rect class="h" x="98" y="20" width="8" height="34"/><path d="M60 44 L60 18 L118 18" stroke="hsl(${h},15%,45%)" stroke-width="1.6" fill="none"/><rect class="d" x="112" y="18" width="2" height="16"/>` + glow(`<g fill="hsl(40,90%,62%)">${wins}</g><circle cx="102" cy="22" r="1.4" fill="hsl(0,90%,60%)"/>`, 0.75) + `<g filter="url(#bl)" opacity=".4"><ellipse cx="104" cy="12" rx="10" ry="6" fill="hsl(${h},10%,50%)"/></g>`;
    }
    if (t === 'reactor') return `<path class="h" d="${poly([[56, 96], [104, 96], [100, 30], [60, 30]])}"/><ellipse class="h" cx="80" cy="30" rx="20" ry="5"/>${[44, 58, 72, 86].map(y => `<path class="l" d="M58 ${y}H102"/>`).join('')}` + glow(`<rect x="72" y="40" width="16" height="50" fill="url(#core)"/><ellipse cx="80" cy="30" rx="10" ry="2.4" fill="hsl(${h},90%,75%)"/>`) + [48, 112].map(x => `<rect class="h" x="${x - 4}" y="50" width="8" height="46"/>`).join('');
    if (t === 'core') return `<path class="h" d="${poly([[66, 98], [94, 98], [90, 14], [70, 14]])}"/><path class="l" d="M80 14V98"/>` + glow(`<rect x="78.6" y="20" width="2.8" height="72" fill="hsl(${o.red ? 0 : 38},95%,60%)"/><circle cx="80" cy="44" r="5" fill="hsl(${o.red ? 0 : 38},95%,62%)"/>`) + `<ellipse cx="80" cy="56" rx="34" ry="9" fill="none" stroke="hsl(${h},30%,60%)" stroke-width="1.2" opacity=".6"/><ellipse cx="80" cy="56" rx="44" ry="13" fill="none" stroke="hsl(${h},30%,60%)" stroke-width=".5" opacity=".4" stroke-dasharray="2 3"/>`;
    if (t === 'cryo') return `<path class="h" d="${poly([[68, 96], [92, 96], [88, 50], [72, 50]])}"/>` + `<path class="cr" d="${poly([[72, 50], [80, 14], [88, 50]])}"/><path class="cr" d="${poly([[66, 60], [58, 34], [72, 54]])}"/><path class="cr" d="${poly([[94, 60], [104, 38], [90, 54]])}"/>` + glow(`<circle cx="80" cy="40" r="3" fill="hsl(195,90%,80%)"/>`);
    if (t === 'dummy') return `<rect class="h" x="78" y="60" width="4" height="38"/><path class="h" d="M66 60 Q64 24 80 22 Q96 24 94 60Z"/>${[0, 1, 2].map(k => `<circle cx="80" cy="42" r="${4 + k * 5}" fill="none" stroke="hsl(0,70%,55%)" stroke-width="1.2" opacity=".7"/>`).join('')}`;
    return '';
  },

  bug(r, h, o) {
    if (o.plan && BUGS[o.plan]) { const sc = o.small ? 0.82 : o.big ? 1.06 : 1; return `<ellipse cx="84" cy="98" rx="50" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 98) scale(${sc}) translate(-84 -98)">${BUGS[o.plan](r, h, `hsl(${h - 45},95%,58%)`, o)}</g>`; }
    const s = o.big || o.queen ? 1.1 : o.small ? 0.78 : 0.95, eye = `hsl(${h - 45},95%,58%)`;
    let m = '';
    const leg = (x, y, kx, ky, fx, fy, w) => `<path class="o" d="${poly([[x - w, y], [x + w, y], [kx + w * 0.7, ky], [fx + 1, fy], [fx - 1.5, fy], [kx - w * 0.7, ky]])}"/>`;
    // far legs (darker), body, near legs
    m += `<g opacity=".6">${leg(104, 66, 118, 52, 126, 96, 2.4)}${leg(88, 68, 96, 56, 102, 97, 2.2)}</g>`;
    // hunched body: tail low, back high, neck forward
    const back = o.queen ? 22 : 28;
    m += `<path class="o" d="M134 80 Q136 60 118 ${back + 12} Q100 ${back} 78 ${back + 8} Q64 ${back + 12} 58 46 L62 62 Q84 76 106 76 Q122 78 134 80Z"/>`;
    // carapace plates along the back
    for (let k = 0; k < 4; k++) { const x = 72 + k * 14; m += `<path class="o" d="M${x - 2} ${f1(back + 14 - Math.sin(k) * 2)} Q${x + 7} ${f1(back + 2 - (k === 1 || k === 2 ? 4 : 0))} ${x + 16} ${f1(back + 12 + k * 1.5)}" stroke="hsl(${h},35%,58%)" stroke-opacity=".55" stroke-width=".8"/>`; }
    for (let k = 0; k < (o.armored ? 7 : 5); k++) { const x = 70 + k * 10, y = back + 6 + Math.abs(k - 2) * 2.4; m += `<path class="o" d="${poly([[x, y + 3], [x + 2 + rr(r, 0, 2), y - rr(r, 8, 14) - (o.queen ? 8 : 0)], [x + 6, y + 3]])}"/>`; }
    // head and jaw
    m += `<path class="o" d="${poly([[62, 40], [46, 44], [34, 54], [38, 60], [50, 60], [64, 58]])}"/>`;
    m += `<path d="M38 58 Q30 64 34 72 L38 66 M44 60 Q42 70 48 74 L48 66" stroke="hsl(${h},25%,70%)" stroke-opacity=".8" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    m += glow(`<circle cx="46" cy="49" r="1.3" fill="${eye}"/><circle cx="50" cy="47.5" r="1" fill="${eye}"/><circle cx="52.5" cy="50.5" r=".8" fill="${eye}"/>`);
    // near legs, claws, extras
    m += leg(76, 66, 70, 70, 60, 97, 3) + leg(96, 72, 104, 66, 112, 98, 3);
    if (o.scythe) m += `<path class="o" d="${poly([[62, 50], [50, 26], [30, 16], [46, 30], [56, 56]])}"/><path d="M50 27 L31 17" stroke="hsl(${h},30%,75%)" stroke-opacity=".7" stroke-width=".7"/>`;
    else m += leg(64, 58, 52, 66, 44, 96, 2.6);
    if (o.tail) m += `<path d="M132 74 Q150 48 132 28 Q120 18 110 26" stroke="url(#o)" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M132 74 Q150 48 132 28 Q120 18 110 26" stroke="hsl(${h},30%,60%)" stroke-opacity=".4" stroke-width=".6" fill="none"/>` + glow(`<path d="${poly([[110, 26], [104, 33], [113, 30]])}" fill="${eye}"/>`);
    if (o.sac) m += glow(`<ellipse cx="116" cy="70" rx="11" ry="6" fill="hsl(${h - 40},55%,30%)" opacity=".45"/>`, 0.5);
    if (o.spit) m += glow(`<circle cx="30" cy="62" r="2.4" fill="${eye}"/><circle cx="23" cy="64" r="1.3" fill="${eye}"/>`);
    if (o.queen) m += `<path class="o" d="${poly([[60, 42], [52, 14], [62, 34], [66, 8], [72, 34], [80, 12], [80, 40]])}"/>`;
    return `<ellipse cx="82" cy="98" rx="52" ry="4" fill="#000" opacity=".6" filter="url(#bl)"/><g transform="translate(84 60) scale(${s}) translate(-84 -60)">${m}</g>`;
  },

  worm(r, h, o) {
    const R0 = o.big ? 16 : o.small ? 9 : 12.5, n = o.small ? 6 : 8;
    let m = `<ellipse cx="112" cy="96" rx="30" ry="6" fill="#000" opacity=".8"/><path d="M84 96 Q112 86 140 96" stroke="hsl(${h},20%,35%)" stroke-width="1.2" fill="none"/>`;
    // body arches out of the ground toward the upper left
    const pts = [];
    for (let k = 0; k < n; k++) { const t = k / (n - 1); pts.push([112 - t * 50 - Math.sin(t * Math.PI) * 6, 96 - Math.sin(t * Math.PI * 0.62) * 70]); }
    for (let k = 0; k < n; k++) {
      const [x, y] = pts[k], rad = R0 * (1 - 0.25 * (k / (n - 1)));
      m += `<ellipse class="o" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rad)}" ry="${f1(rad * 0.82)}"/>`;
      m += `<path d="M${f1(x - rad * 0.9)} ${f1(y - rad * 0.2)} Q${f1(x)} ${f1(y - rad * 0.9)} ${f1(x + rad * 0.9)} ${f1(y - rad * 0.2)}" stroke="hsl(${h},35%,60%)" stroke-opacity=".45" stroke-width=".7" fill="none"/>`;
    }
    // head: split jaw opening forward and down
    const [hx, hy] = pts[n - 1], R = R0 * 0.95;
    m += `<path class="o" d="${poly([[hx + R * 0.6, hy - R * 0.8], [hx - R * 1.6, hy - R * 0.3], [hx - R * 0.4, hy + R * 0.2]])}"/>`;
    m += `<path class="o" d="${poly([[hx + R * 0.6, hy + R * 0.5], [hx - R * 1.4, hy + R * 1.1], [hx - R * 0.4, hy + R * 0.25]])}"/>`;
    m += `<path class="d" d="${poly([[hx - R * 0.3, hy - R * 0.2], [hx - R * 1.3, hy + R * 0.1], [hx - R * 1.2, hy + R * 0.8], [hx - R * 0.3, hy + R * 0.3]])}"/>`;
    let teeth = ''; for (let k = 0; k < 5; k++) { const tx = hx - R * 0.5 - k * R * 0.18; teeth += `<path d="${poly([[tx, hy - R * 0.08], [tx - R * 0.06, hy + R * 0.18], [tx - R * 0.14, hy - R * 0.04]])}" fill="hsl(45,15%,62%)"/><path d="${poly([[tx, hy + R * 0.55], [tx - R * 0.07, hy + R * 0.32], [tx - R * 0.15, hy + R * 0.6]])}" fill="hsl(45,15%,62%)"/>`; }
    m += teeth + glow(`<ellipse cx="${f1(hx - R * 0.55)}" cy="${f1(hy + R * 0.25)}" rx="${f1(R * 0.35)}" ry="${f1(R * 0.12)}" fill="hsl(${o.small ? 0 : 10},85%,45%)"/>`, 0.8);
    return m;
  },

  pod(r, h, o) {
    let m = `<ellipse cx="80" cy="94" rx="50" ry="8" fill="hsl(${h},25%,12%)"/>`;
    const n = o.many ? 6 : o.big ? 1 : 3 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const big = o.big ? 1.8 : rr(r, 0.8, 1.15), x = o.big ? 80 : 50 + k * (60 / Math.max(1, n - 1)) + rr(r, -4, 4), y = 92 - 18 * big;
      m += `<ellipse class="o" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(11 * big)}" ry="${f1(17 * big)}"/>`;
      m += glow(`<ellipse cx="${f1(x)}" cy="${f1(y + 3)}" rx="${f1(5 * big)}" ry="${f1(9 * big)}" fill="hsl(${h - 40},80%,50%)" opacity=".55"/>`, 0.8);
      m += `<path d="M${f1(x - 6 * big)} ${f1(y - 10 * big)} Q ${f1(x)} ${f1(y)} ${f1(x - 3 * big)} ${f1(y + 14 * big)}" stroke="hsl(${h},30%,8%)" stroke-width=".8" fill="none"/>`;
    }
    if (o.spore) m += glow(Array.from({ length: 12 }, () => `<circle cx="${f1(rr(r, 40, 120))}" cy="${f1(rr(r, 10, 60))}" r="${f1(rr(r, 0.8, 2))}" fill="hsl(${h - 30},85%,60%)"/>`).join(''), 0.8);
    if (o.big) m += `<path d="M60 90 Q40 70 30 80 M100 90 Q120 70 132 82 M70 92 Q60 98 44 98" stroke="hsl(${h},25%,20%)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return m;
  },

  brain(r, h) {
    let m = `<path d="M70 70 Q66 86 58 98 M80 72 V100 M90 70 Q96 86 104 98" stroke="hsl(${h},25%,22%)" stroke-width="3" fill="none"/>`;
    m += `<ellipse class="o" cx="68" cy="46" rx="20" ry="22"/><ellipse class="o" cx="92" cy="46" rx="20" ry="22"/>`;
    for (let k = 0; k < 7; k++) { const x = rr(r, 54, 106), y = rr(r, 30, 62); m += `<path d="M${f1(x)} ${f1(y)} q 4 -5 8 0 t 8 0" stroke="#000" stroke-opacity=".45" stroke-width=".8" fill="none"/>`; }
    m += glow([[62, 40], [96, 36], [84, 58], [70, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="hsl(${h - 50},90%,60%)"/>`).join(''));
    return m;
  },

  psion(r, h, o) { return psionFigure(r, h, o); },

  horror(r, h, o) {
    const eyeC = `hsl(${h + 25},95%,66%)`;
    if (o.wisp) return glow(`<path d="M80 50 Q112 62 136 38 Q114 74 80 62Z" fill="hsl(${h},60%,50%)" opacity=".55"/><circle cx="80" cy="56" r="9" fill="hsl(${h},70%,62%)" opacity=".85"/><circle cx="80" cy="56" r="3.4" fill="#f3e9ff"/>`, 1);
    if (o.maw) {
      const R = o.giant ? 34 : 26;
      let teeth = '';
      for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2 + ring * 0.17, r1 = R * (1 - ring * 0.28), r2 = r1 * 0.72; teeth += `<path d="${poly([[80 + Math.cos(a) * r1, 54 + Math.sin(a) * r1 * 0.78], [80 + Math.cos(a + 0.09) * r2, 54 + Math.sin(a + 0.09) * r2 * 0.78], [80 + Math.cos(a + 0.18) * r1, 54 + Math.sin(a + 0.18) * r1 * 0.78]])}" fill="hsl(${h},12%,${48 - ring * 12}%)"/>`; }
      return `<ellipse class="o" cx="80" cy="54" rx="${R + 10}" ry="${f1((R + 10) * 0.8)}"/><ellipse fill="#000" cx="80" cy="54" rx="${R}" ry="${f1(R * 0.78)}"/>${teeth}` + glow(`<ellipse cx="80" cy="54" rx="${f1(R * 0.22)}" ry="${f1(R * 0.16)}" fill="hsl(${h},85%,52%)"/>`);
    }
    if (o.stalker) return `<g opacity=".85"><path class="o" d="M40 72 Q56 50 86 52 Q114 52 124 66 L118 70 Q100 62 84 66 Q64 68 50 78Z"/><path class="o" d="${poly([[44, 70], [30, 62], [36, 74]])}"/>`
      + `<path d="M58 70 L52 82 L48 98 M72 66 L74 98 M100 62 L106 78 L110 98 M114 64 L124 80 L126 94" stroke="url(#o)" stroke-width="3.4" fill="none" stroke-linejoin="round"/>` + glow(`<circle cx="38" cy="66" r="1.1" fill="${eyeC}"/><circle cx="42" cy="65" r="1.1" fill="${eyeC}"/>`) + '</g>';
    // eldritch mass: irregular silhouette, tapered tendrils, eye cluster in a vertical slit
    let m = '';
    for (let k = 0; k < 8; k++) {
      const a = Math.PI * (0.15 + 0.7 * (k / 7)) + (k % 2 ? 0 : Math.PI * 0.02), len = rr(r, 34, 52), side = k < 4 ? -1 : 1;
      const ex = 80 + side * Math.abs(Math.cos(a)) * len, ey = 60 + Math.sin(a) * len * 0.8;
      const cx = (80 + ex) / 2 + rr(r, -14, 14), cy = (60 + ey) / 2 - rr(r, 4, 14), w = rr(r, 2.4, 4);
      m += `<path d="M${f1(80 - w)} 60 Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)} Q${f1(cx + w)} ${f1(cy + w)} ${f1(80 + w)} 62Z" fill="url(#o)" stroke="hsl(${h},30%,55%)" stroke-opacity=".3" stroke-width=".4"/>`;
    }
    const pts = Array.from({ length: 14 }, (_, k) => { const a = k / 14 * Math.PI * 2, rad = rr(r, 15, 22) * (k > 2 && k < 6 ? 1.35 : 1); return [80 + Math.cos(a) * rad, 50 + Math.sin(a) * rad * 1.2]; });
    m += `<path class="o" d="${poly(pts)}"/>`;
    for (let k = 0; k < 4; k++) m += `<path d="M${f1(66 + k * 8)} 34 Q${f1(70 + k * 6)} 50 ${f1(68 + k * 7)} 70" stroke="hsl(${h},35%,58%)" stroke-opacity=".3" stroke-width=".7" fill="none"/>`;
    m += `<path class="d" d="M76 34 Q80 50 76 68 Q84 50 80 34Z"/>`;
    m += glow(Array.from({ length: 6 }, (_, k) => `<circle cx="${f1(78.5 + (k % 2) * 2)}" cy="${f1(38 + k * 5)}" r="${f1(1.4 - k * 0.12)}" fill="${eyeC}"/>`).join(''));
    m += glow(`<path d="M64 60 Q72 66 70 76M94 56 Q88 64 92 74" stroke="hsl(${h},85%,55%)" stroke-width=".5" fill="none" opacity=".7"/>`, 0.7);
    return m;
  },

  projectile(r, h, o) {
    const t = o.type, c = { plasma: 'hsl(195,90%,65%)', rail: 'hsl(200,70%,80%)', arc: 'hsl(200,90%,75%)', frost: 'hsl(190,80%,80%)', shards: `hsl(${h},85%,70%)`, psi: `hsl(${h},85%,70%)`, drain: 'hsl(0,80%,55%)' }[t] || 'hsl(40,90%,60%)';
    const x0 = 34, y0 = 78, x1 = 124, y1 = 28;
    let m = '';
    if (t === 'rail') m = glow(`<path d="M${x0} ${y0}L${x1} ${y1}" stroke="${c}" stroke-width="1.2"/>`) + [0.25, 0.45, 0.65].map(k => `<ellipse cx="${f1(x0 + (x1 - x0) * k)}" cy="${f1(y0 + (y1 - y0) * k)}" rx="2" ry="7" fill="none" stroke="${c}" stroke-width=".6" transform="rotate(-29 ${f1(x0 + (x1 - x0) * k)} ${f1(y0 + (y1 - y0) * k)})" opacity=".8"/>`).join('');
    else if (t === 'arc') { let p = [[x0, y0]]; for (let k = 1; k < 9; k++) p.push([x0 + (x1 - x0) * k / 9 + rr(r, -6, 6), y0 + (y1 - y0) * k / 9 + rr(r, -8, 8)]); p.push([x1, y1]); m = glow(`<path d="${line(p)}" stroke="${c}" stroke-width="1.4" fill="none"/>`) + glow(`<path d="${line(p.map(([x, y]) => [x + rr(r, -3, 3), y + rr(r, -3, 3)]))}" stroke="${c}" stroke-width=".5" fill="none" opacity=".6"/>`); }
    else if (t === 'frost' || t === 'shards') { const n = t === 'shards' ? 3 : 1; for (let k = 0; k < n; k++) { const ox = k * 10 - (n - 1) * 5, oy = -k * 12 + (n - 1) * 6; m += `<path d="M${x0 + ox} ${y0 + oy}L${96 + ox} ${44 + oy}" stroke="${c}" stroke-width=".8" opacity=".5"/>` + glow(`<path d="${poly([[96 + ox, 44 + oy], [112 + ox, 33 + oy], [100 + ox, 47 + oy]])}" fill="${c}"/>`); } }
    else if (t === 'psi') m = [10, 20, 30, 40].map((rad, k) => glow(`<path d="M${f1(80 - rad)} ${f1(70 - rad * 0.2)} Q 80 ${f1(70 - rad * 1.2)} ${f1(80 + rad)} ${f1(70 - rad * 0.2)}" stroke="${c}" stroke-width="${f1(1.4 - k * 0.25)}" fill="none" opacity="${f1(1 - k * 0.2)}"/>`)).join('');
    else if (t === 'drain') m = glow(`<path d="M40 74 Q80 20 122 40" stroke="${c}" stroke-width="1.2" fill="none" stroke-dasharray="4 2"/><path d="M40 78 Q84 40 122 46" stroke="${c}" stroke-width=".6" fill="none" opacity=".6"/>`) + glow(`<circle cx="40" cy="76" r="3" fill="${c}"/>`);
    else m = `<path d="M${x0} ${y0}L${x1 - 14} ${y1 + 8}" stroke="url(#tr)" stroke-width="5" stroke-linecap="round"/>` + glow(`<circle cx="${x1 - 12}" cy="${y1 + 7}" r="5" fill="${c}"/><circle cx="${x1 - 12}" cy="${y1 + 7}" r="2" fill="#fff"/>`);
    const target = `<g stroke="${c}" stroke-width=".6" fill="none" opacity=".7"><circle cx="${x1}" cy="${y1}" r="7"/><path d="M${x1 - 11} ${y1}h6M${x1 + 5} ${y1}h6M${x1} ${y1 - 11}v6M${x1} ${y1 + 5}v6"/></g>`;
    return m + (t === 'psi' || t === 'drain' ? '' : target);
  },

  blast(r, h, o) {
    const t = o.type, col = { flak: 'hsl(35,90%,60%)', orbital: 'hsl(30,95%,60%)', broadside: 'hsl(30,90%,60%)', acid: 'hsl(90,80%,55%)', arc: 'hsl(200,90%,72%)', emp: 'hsl(200,80%,70%)', cryo: 'hsl(190,80%,80%)', psi: `hsl(${h},85%,70%)`, void: `hsl(${h},70%,55%)` }[t] || 'hsl(30,90%,60%)';
    let m = `<path d="M-10 100 Q80 66 170 100Z" fill="hsl(${h},15%,10%)"/><path d="M-10 100 Q80 66 170 100" stroke="hsl(${h},40%,55%)" stroke-width=".6" fill="none" opacity=".5"/>`;
    const hits = Array.from({ length: t === 'flak' ? 8 : 4 }, () => [rr(r, 34, 126), t === 'flak' ? rr(r, 18, 60) : rr(r, 80, 90)]);
    if (t === 'orbital') m += glow(hits.map(([x, y]) => `<path d="M${f1(x + 10)} 0L${f1(x)} ${f1(y)}" stroke="${col}" stroke-width="1"/>`).join(''));
    if (t === 'broadside') m += `<path class="h" d="${poly([[16, 30], [56, 26], [60, 32], [18, 38]])}"/>` + glow(hits.map(([x, y]) => `<path d="M58 30L${f1(x)} ${f1(y - 6)}" stroke="${col}" stroke-width=".5" opacity=".8"/>`).join(''));
    if (t === 'acid') m += glow(Array.from({ length: 30 }, () => { const x = rr(r, 20, 150), y = rr(r, 0, 80); return `<path d="M${f1(x)} ${f1(y)}l-2 7" stroke="${col}" stroke-width=".6" opacity=".7"/>`; }).join(''), 0.8);
    if (t === 'emp' || t === 'cryo' || t === 'psi' || t === 'void') m += [12, 24, 38, 54].map((rad, k) => glow(`<ellipse cx="80" cy="60" rx="${rad}" ry="${f1(rad * 0.55)}" fill="none" stroke="${col}" stroke-width="${f1(1.4 - k * 0.25)}" opacity="${f1(1 - k * 0.2)}"/>`, 0.8)).join('');
    if (t === 'void') m += `<ellipse cx="80" cy="60" rx="10" ry="6" fill="#000"/>`;
    if (t === 'cryo') m += glow(Array.from({ length: 8 }, (_, k) => { const a = k / 8 * Math.PI * 2; return `<path d="M80 60L${f1(80 + Math.cos(a) * 30)} ${f1(60 + Math.sin(a) * 16)}" stroke="${col}" stroke-width=".7"/>`; }).join(''));
    if (t === 'arc') m += glow(hits.map(([x]) => { let p = [[x, 0]]; for (let y = 10; y < 86; y += 10) p.push([x + rr(r, -6, 6), y]); return `<path d="${line(p)}" stroke="${col}" stroke-width="1" fill="none"/>`; }).join(''));
    if (t !== 'emp' && t !== 'psi' && t !== 'void' && t !== 'cryo') m += glow(hits.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr(r, 3, 7))}" fill="${col}" opacity=".9"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="#fff"/>`).join(''));
    return m;
  },

  emblem(r, h, o) {
    const c = `hsl(${h},70%,68%)`, a = 'hsl(38,90%,60%)';
    const S = (d, w) => `<path d="${d}" stroke="${c}" stroke-width="${w || 1.4}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    const hex = (cx, cy, R) => poly(Array.from({ length: 6 }, (_, k) => [cx + Math.cos(k * Math.PI / 3 + Math.PI / 6) * R, cy + Math.sin(k * Math.PI / 3 + Math.PI / 6) * R]));
    const T = o.type;
    let g = '';
    if (T === 'shield' || T === 'fort') g = S(hex(80, 50, 30)) + S(hex(80, 50, 22), 0.6) + (T === 'fort' ? S('M62 66h36M66 58h28', 2) : S('M80 30V70M62 40l36 20M98 40L62 60', 0.4));
    else if (T === 'repair') g = S('M58 72L84 46') + S('M84 46a10 10 0 1 1 10 -10l-6 2l-2 6z') + S(hex(64, 66, 9), 0.7);
    else if (T === 'syringe') g = S(poly([[56, 70], [92, 34], [100, 42], [64, 78]])) + S('M92 34l8 -8M96 30l8 8M56 70l-8 8', 1.2) + `<path d="${poly([[66, 66], [84, 48], [88, 52], [70, 70]])}" fill="${a}" opacity=".7"/>`;
    else if (T === 'helix') { let p1 = '', p2 = '', rungs = ''; for (let k = 0; k <= 20; k++) { const y = 18 + k * 3.2, x1 = 80 + Math.sin(k * 0.6) * 14, x2 = 80 - Math.sin(k * 0.6) * 14; p1 += (k ? 'L' : 'M') + f1(x1) + ' ' + f1(y); p2 += (k ? 'L' : 'M') + f1(x2) + ' ' + f1(y); if (k % 2) rungs += `M${f1(x1)} ${f1(y)}L${f1(x2)} ${f1(y)}`; } g = S(p1) + S(p2) + S(rungs, 0.5); }
    else if (T === 'crate') g = S(poly([[60, 46], [100, 46], [100, 78], [60, 78]])) + S('M60 56h40M80 46v32', 0.8) + S('M60 46 Q80 14 100 46M66 46L80 22L94 46', 0.6) + S('M80 22v-8', 0.6);
    else if (T === 'target') g = S('M80 22v14M80 64v14M52 50h14M94 50h14') + S('M80 50m-20 0a20 20 0 1 0 40 0a20 20 0 1 0 -40 0', 1) + `<circle cx="80" cy="50" r="2" fill="${a}"/>`;
    else if (T === 'smoke') g = `<g filter="url(#bl)" opacity=".8">${[[66, 56, 18], [88, 50, 20], [80, 64, 16]].map(([x, y, rad]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="hsl(${h},10%,40%)"/>`).join('')}</g>` + S('M64 50h32', 0.6);
    else if (T === 'cycle') g = S('M60 50a20 20 0 0 1 36 -12') + S('M100 50a20 20 0 0 1 -36 12') + S('M90 30l6 8l-9 2M70 70l-6 -8l9 -2', 1.2);
    else if (T === 'chevrons') g = S('M62 70l18 -14l18 14', 2) + S('M62 54l18 -14l18 14', 2) + S('M62 38l18 -14l18 14', 1);
    else if (T === 'heat') g = S('M64 74c-6 -10 6 -14 0 -26M80 74c-6 -10 6 -14 0 -26M96 74c-6 -10 6 -14 0 -26') + S('M58 80h44', 2);
    else if (T === 'eye') g = S('M52 50 Q80 26 108 50 Q80 74 52 50Z') + `<circle cx="80" cy="50" r="9" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="80" cy="50" r="3.5" fill="${a}"/>`;
    else if (T === 'neural') g = S('M70 78V66c-8 -4 -12 -12 -10 -22c2 -12 14 -20 26 -18c12 2 18 12 16 24l4 8h-6v10h-10v8') + [[78, 40], [88, 46], [80, 54], [70, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${a}"/>`).join('') + S('M78 40L88 46L80 54L70 48Z', 0.5);
    else if (T === 'emp') g = S('M80 50m-26 0a26 26 0 1 0 52 0a26 26 0 1 0 -52 0', 1) + S('M84 28L72 52h12L76 72', 1.8) + S('M60 70L100 30', 0.8);
    else if (T === 'void') g = `<circle cx="80" cy="50" r="14" fill="#000"/>` + S('M80 50m-24 0a24 9 0 1 0 48 0a24 9 0 1 0 -48 0', 0.8);
    return glow(g, 0.9);
  },

  weapon(r, h, o) {
    const t = o.type;
    let m = '';
    if (t === 'blade' || t === 'knife') { const L = t === 'knife' ? 50 : 80; m = `<g transform="rotate(-24 80 52)"><rect class="h" x="${80 - L / 2}" y="50" width="22" height="7" rx="1"/><rect class="d" x="${80 - L / 2 + 20}" y="47" width="4" height="13"/><path class="h" d="${poly([[80 - L / 2 + 24, 49], [80 + L / 2, 51], [80 + L / 2 + 6, 53.5], [80 - L / 2 + 24, 56]])}"/>` + glow(`<path d="M${80 - L / 2 + 25} 55.6L${80 + L / 2 + 4} 53.6" stroke="hsl(${t === 'knife' ? 40 : 15},95%,62%)" stroke-width="1"/>`) + '</g>'; }
    else if (t === 'baton') m = `<g transform="rotate(-30 80 52)"><rect class="h" x="40" y="48" width="56" height="8" rx="2"/><rect class="d" x="96" y="46" width="14" height="12" rx="2"/>${[0, 1, 2].map(k => `<path class="l" d="M${48 + k * 10} 48v8"/>`).join('')}</g>` + glow(`<path d="${line([[112, 22], [118, 18], [114, 14], [122, 8]])}" stroke="hsl(195,90%,72%)" stroke-width="1" fill="none"/>`);
    else { // rifle / harpoon / cannon
      const big = t === 'cannon';
      m = `<g transform="rotate(-14 80 52)"><path class="h" d="${poly([[36, 50], [92, 46], [96, 52], [70, 56], [62, 66], [52, 66], [56, 56], [36, 58]])}"/><rect class="d" x="92" y="${big ? 44 : 47}" width="${t === 'rifle' ? 44 : 28}" height="${big ? 10 : 3.4}"/><rect class="h" x="60" y="40" width="22" height="5"/>`;
      if (t === 'harpoon') m += `<path class="h" d="${poly([[120, 46], [134, 48.4], [120, 51]])}"/><path d="M96 49 Q110 60 120 49" stroke="hsl(${h},15%,55%)" stroke-width=".6" fill="none"/>`;
      if (big) m += [0, 1, 2].map(k => `<circle class="d" cx="${100 + k * 8}" cy="49" r="3"/>`).join('');
      m += glow(`<rect x="62" y="41.5" width="6" height="1.5" fill="hsl(0,85%,58%)"/>`) + '</g>';
    }
    const dims = `<g stroke="hsl(${h},40%,65%)" stroke-width=".35" opacity=".55" fill="none"><path d="M34 86H126M34 83v6M126 83v6"/><path d="M30 20v66M27 20h6"/></g>`;
    return dims + m;
  },

  trap(r, h, o) {
    const t = o.type, c = `hsl(${h},75%,70%)`;
    if (t === 'singularity') return `<ellipse cx="80" cy="54" rx="40" ry="12" fill="none" stroke="${c}" stroke-width="1.4" opacity=".7" filter="url(#gl)"/><circle cx="80" cy="54" r="13" fill="#000"/><circle cx="80" cy="54" r="14" fill="none" stroke="${c}" stroke-width=".8"/>` + glow(`<path d="M40 54 Q80 66 120 54" stroke="${c}" stroke-width="1" fill="none"/>`);
    if (t === 'mirror') { let g = ''; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, x = 80 + Math.cos(a) * 22, y = 54 + Math.sin(a) * 22; g += `<path class="h" d="${poly(Array.from({ length: 6 }, (_, j) => [x + Math.cos(j * Math.PI / 3) * 9, y + Math.sin(j * Math.PI / 3) * 9]))}" opacity=".9"/>`; } return g + glow(`<circle cx="80" cy="54" r="8" fill="none" stroke="${c}" stroke-width="1.2"/>`); }
    if (t === 'null') return glow(`<circle cx="80" cy="52" r="26" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M62 70L98 34" stroke="${c}" stroke-width="2"/><circle cx="80" cy="52" r="34" fill="none" stroke="${c}" stroke-width=".5" stroke-dasharray="2 3"/>`);
    if (t === 'barrier') return glow(`<path d="${poly(Array.from({ length: 6 }, (_, k) => [80 + Math.cos(k * Math.PI / 3 + Math.PI / 6) * 32, 52 + Math.sin(k * Math.PI / 3 + Math.PI / 6) * 32]))}" fill="hsl(${h},60%,50%)" fill-opacity=".12" stroke="${c}" stroke-width="1.4"/>`) + `<path d="M64 52h32M80 36v32" stroke="${c}" stroke-width=".5" opacity=".6"/>`;
    // mine
    return `<ellipse cx="80" cy="84" rx="40" ry="5" fill="#000" opacity=".6" filter="url(#bl)"/><ellipse class="h" cx="80" cy="74" rx="26" ry="8"/><path class="h" d="M56 72 Q80 54 104 72"/>${[-18, -6, 6, 18].map(x => `<path d="M${80 + x} ${66 - Math.abs(x) * 0.2}l${f1(x * 0.3)} -10" stroke="hsl(${h},15%,50%)" stroke-width="1"/>`).join('')}` + glow(`<circle cx="80" cy="62" r="2.2" fill="hsl(0,90%,58%)"/>`) + `<g stroke="hsl(0,80%,60%)" stroke-width=".5" fill="none" opacity=".6"><circle cx="80" cy="62" r="18"/><circle cx="80" cy="62" r="30" stroke-dasharray="2 3"/></g>`;
  },

  battery(r, h) {
    return `<rect class="h" x="66" y="20" width="28" height="66" rx="3"/><rect class="d" x="72" y="14" width="16" height="8"/><path class="l" d="M66 34h28M66 72h28"/>` + glow([0, 1, 2, 3, 4].map(k => `<rect x="71" y="${40 + k * 6}" width="18" height="3.4" fill="hsl(195,90%,62%)" opacity="${1 - k * 0.12}"/>`).join(''));
  },
};

// ---------------------------------------------------------------- card → subject
const ART = {
  cadet: ['trooper', { pose: 'stand', helm: 'visor', visor: 'c', pad: 0.6, weapon: 'carbine', rig: false }], scout_drone: ['drone', { plan: 'disc' }], marine: ['trooper', { pose: 'aim', helm: 'visor', stripe: 1 }], heavy_trooper: ['trooper', { pose: 'stand', helm: 'heavy', bulk: 1.3, pad: 1.5 }],
  star_cruiser: ['ship', { size: 1.05 }], ion_lancer: ['tank', { hover: 1, lance: 1 }], patrol_frigate: ['ship', { size: 0.9 }],
  salvage_crew: ['trooper', { pose: 'work', helm: 'rebreather', weapon: 'tool', pack: 'tank', pad: 0.7, accent: 40, stripe: 1 }], siege_gunner: ['trooper', { pose: 'heavy', helm: 'heavy', bulk: 1.2, pad: 1.3, weapon: 'cannon', pack: 1 }], assault_drone: ['drone', { plan: 'gunship', gun: 1 }],
  rhino_tank: ['tank', {}], battlecruiser: ['ship', { size: 1.15, turrets: 3 }], medic_bot: ['drone', { medic: 1 }],
  field_engineer: ['trooper', { pose: 'work', helm: 'visor', visor: 'c', weapon: 'tool', pack: 1, antenna: 1 }], rifle_squad: ['trooper', { squad: 1, helm: 'visor', stripe: 1 }], recon_officer: ['bust', { headset: 1, boards: 1, skin: 1 }],
  sapper: ['trooper', { pose: 'kneel', helm: 'rebreather', visor: 'r', pack: 'charges', weapon: 'carbine' }], shield_trooper: ['trooper', { pose: 'brace', helm: 'visor', shield: 1, weapon: 'carbine', pad: 1.2 }], barricade: ['structure', { type: 'wall' }],
  bulwark_mech: ['mech', { heavy: 1, wall: 1 }], dreadnought: ['ship', { size: 1.2, turrets: 4 }], strike_fighter: ['fighter', {}],
  interceptor: ['fighter', { sleek: 1 }], hover_tank: ['tank', { hover: 1 }], breach_commando: ['trooper', { pose: 'charge', helm: 'crest', visor: 'r', weapon: 'blade', bulk: 1.15, stripe: 1, accent: 0 }],
  fleet_captain: ['bust', { cap: 1, beard: 1, old: 1, boards: 1, medals: 1, skin: 0 }], okonkwo: ['bust', { cap: 1, braid: 1, hair: 'bun', skin: 3, boards: 1, medals: 1 }], aurora: ['ship', { size: 1.25, turrets: 4, flag: 1 }],
  plasma_bolt: ['projectile', { type: 'plasma' }], railgun: ['projectile', { type: 'rail' }], flak_barrage: ['blast', { type: 'flak' }],
  orbital_strike: ['blast', { type: 'orbital' }], field_repair: ['emblem', { type: 'repair' }], supply_drop: ['emblem', { type: 'crate' }],
  combat_stims: ['emblem', { type: 'syringe' }], reinforcements: ['fighter', { dropship: 1 }], dig_in: ['emblem', { type: 'fort' }],
  kill_order: ['emblem', { type: 'target' }], drone: ['drone', { small: 1 }],
  energy_cell: ['battery', {}], scrap_rat: ['drone', { crawler: 1 }], junk_drone: ['drone', { junk: 1, small: 1 }], boarding_crew: ['trooper', { pose: 'charge', helm: 'rebreather', visor: 'r', weapon: 'blade', pad: 0.5, accent: 20, stripe: 1 }],
  smuggler: ['bust', { hood: 1, bandana: 1, hair: 'none', skin: 2 }], det_bot: ['drone', { plan: 'sphere', bomb: 1 }], gunrunner: ['bust', { goggles: 1, gogglesUp: 1, hair: 'mohawk', scar: 1, straps: 1, accent: 15, skin: 0 }], shadow_corsair: ['trooper', { pose: 'charge', helm: 'hood', cape: 1, weapon: 'blade', visor: 'r', pad: 0 }],
  mine_layer: ['tank', { mines: 1, hover: 1 }], cargo_hauler: ['ship', { hauler: 1, size: 0.95 }], quartermaster: ['bust', { beard: 1, cyber: 1, straps: 1, hair: 'none', skin: 1 }],
  plunderer: ['fighter', { raider: 1 }], scrap_golem: ['mech', { junk: 1 }], ghost_operative: ['trooper', { pose: 'kneel', helm: 'hood', cape: 1, weapon: 'sniper', visor: 'c', pad: 0 }],
  shipbreaker: ['mech', { giant: 1, junk: 1, crane: 1 }], salvaged_hull: ['ship', { wreck: 1, size: 0.9 }], vex: ['bust', { hat: 1, patch: 1, hair: 'long', coat: 1, skin: 0 }], mox: ['bust', { goggles: 1, hair: 'long', coat: 1, skin: 2 }],
  shock_baton: ['weapon', { type: 'baton' }], plasma_cutlass: ['weapon', { type: 'blade' }], harpoon_gun: ['weapon', { type: 'harpoon' }],
  rail_rifle: ['weapon', { type: 'rifle' }], cluster_cannon: ['weapon', { type: 'cannon' }], combat_knife: ['weapon', { type: 'knife' }],
  smoke_screen: ['emblem', { type: 'smoke' }], echo_protocol: ['emblem', { type: 'cycle' }], broadside: ['blast', { type: 'broadside' }],
  shakedown: ['emblem', { type: 'target' }], black_market: ['emblem', { type: 'crate' }],
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
};

const BACKDROP = { ship: 'space', fighter: 'space', drone: 'ground', trooper: 'ground', bust: 'ground', mech: 'ground', tank: 'ground', structure: 'ground',
  bug: 'hive', worm: 'hive', pod: 'hive', brain: 'hive', psion: 'void', horror: 'void', projectile: 'schematic', blast: 'space', emblem: 'schematic', weapon: 'schematic', trap: 'schematic', battery: 'schematic' };
const FACTION_CODE = { neutral: 'NTL', fleet: 'FLT', raider: 'RDR', swarm: 'SWM', synth: 'SYN', psi: 'PSI', void: 'VOID' };

function artFor(d) {
  if (ART[d.id]) return ART[d.id];
  if (d.type === 'spell') return ['emblem', { type: 'target' }];
  if (d.type === 'gear') return ['weapon', { type: 'rifle' }];
  if (d.type === 'trap') return ['trap', { type: 'mine' }];
  return [{ fleet: 'trooper', raider: 'trooper', swarm: 'bug', synth: 'drone', psi: 'psion', void: 'horror' }[d.faction] || 'drone', {}];
}

// Light between the backdrop and the subject: halo, shafts, haze.
function atmosphere(r, h, bg, kind) {
  let m = '';
  if (bg !== 'schematic') m += `<ellipse cx="${f1(rr(r, 74, 88))}" cy="52" rx="44" ry="38" fill="hsl(${h},55%,48%)" opacity="${bg === 'hive' ? 0.1 : 0.2}" filter="url(#bl)"/>`;
  if (bg === 'ground' || bg === 'hive') {
    const x0 = rr(r, 10, 70);
    for (let k = 0; k < 3; k++) { const x = x0 + k * rr(r, 18, 30), w = rr(r, 6, 14); m += `<path d="${poly([[x, -5], [x + w, -5], [x + w + 40, 105], [x + 30, 105]])}" fill="url(#sh)" opacity="${f1(rr(r, 0.25, 0.55))}"/>`; }
    m += `<rect y="56" width="160" height="30" fill="hsl(${h},30%,40%)" opacity=".1" filter="url(#bl)"/>`;
  }
  return m;
}
// Dust motes and dark framing shapes in front of the subject.
function foreground(r, h, bg, kind) {
  if (bg === 'schematic') return '';
  let m = Array.from({ length: 10 }, () => `<circle cx="${f1(r() * 160)}" cy="${f1(r() * 100)}" r="${f1(rr(r, 0.3, 0.9))}" fill="hsl(${h},40%,85%)" opacity="${f1(rr(r, 0.15, 0.5))}"/>`).join('');
  if (bg === 'ground') m += `<path d="M-4 104 L-4 ${f1(rr(r, 80, 90))} Q${f1(rr(r, 10, 22))} ${f1(rr(r, 84, 94))} ${f1(rr(r, 26, 36))} 104Z" fill="#000" opacity=".75" filter="url(#hz)"/><path d="M164 104 L164 ${f1(rr(r, 84, 92))} Q${f1(rr(r, 140, 150))} ${f1(rr(r, 88, 96))} ${f1(rr(r, 126, 136))} 104Z" fill="#000" opacity=".7" filter="url(#hz)"/>`;
  return m;
}

function serialFor(id, faction) { const n = hashStr(id) % 9000 + 1000; return `${FACTION_CODE[faction] || 'NTL'}-${n}`; }

// Muted, desaturated hue per faction for illustration tinting.
const ART_HUE = { neutral: 210, fleet: 208, raider: 24, swarm: 95, synth: 188, psi: 268, void: 312 };

function composeArt(key, kind, opts, faction, extraHue) {
  const r = seeded(hashStr(key));
  const h = Math.round((ART_HUE[faction] ?? 210) + (extraHue || 0) + (r() - 0.5) * 16);
  const bgKind = opts.bg || BACKDROP[kind] || 'space';
  const bg = BG[bgKind](r, h);
  const subject = (SUBJ[kind] || SUBJ.drone)(r, h, opts);
  const seed = hashStr(key) % 1000;
  const emis = `hsl(${h},80%,62%)`;
  const code = opts.code || serialFor(key, faction);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="m" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="hsl(${h},9%,52%)"/><stop offset=".4" stop-color="hsl(${h},8%,24%)"/><stop offset="1" stop-color="hsl(${h},12%,8%)"/></linearGradient>
<linearGradient id="mb" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="hsl(${h},8%,34%)"/><stop offset=".45" stop-color="hsl(${h},9%,15%)"/><stop offset="1" stop-color="hsl(${h},12%,5%)"/></linearGradient>
<linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(195,70%,55%)"/><stop offset=".55" stop-color="hsl(${h},20%,50%)"/><stop offset="1" stop-color="hsl(28,80%,52%)"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="hz"><feGaussianBlur stdDeviation=".45"/></filter>
<linearGradient id="o" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="hsl(${h},20%,27%)"/><stop offset=".45" stop-color="hsl(${h - 10},24%,11%)"/><stop offset="1" stop-color="hsl(${h - 20},30%,4%)"/></linearGradient>
<linearGradient id="crg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(195,40%,80%)"/><stop offset=".5" stop-color="hsl(200,40%,40%)"/><stop offset="1" stop-color="hsl(210,40%,14%)"/></linearGradient>
<linearGradient id="skn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(28,22%,46%)"/><stop offset=".55" stop-color="hsl(24,20%,22%)"/><stop offset="1" stop-color="hsl(20,20%,9%)"/></linearGradient>
<linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},30%,5%)"/><stop offset="1" stop-color="hsl(${h + 20},25%,9%)"/></linearGradient>
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},20%,7%)"/><stop offset=".75" stop-color="hsl(${h + 15},22%,20%)"/><stop offset="1" stop-color="hsl(${h + 25},30%,30%)"/></linearGradient>
<linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},12%,12%)"/><stop offset="1" stop-color="hsl(${h},15%,4%)"/></linearGradient>
<radialGradient id="hv" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="hsl(${h},28%,14%)"/><stop offset="1" stop-color="hsl(${h - 20},30%,3%)"/></radialGradient>
<radialGradient id="vd" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="hsl(${h},30%,11%)"/><stop offset="1" stop-color="hsl(${h},25%,2%)"/></radialGradient>
<linearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},35%,9%)"/><stop offset="1" stop-color="hsl(${h},35%,4%)"/></linearGradient>
<radialGradient id="pl" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="hsl(${h + 30},18%,30%)"/><stop offset=".6" stop-color="hsl(${h + 20},20%,10%)"/><stop offset="1" stop-color="#010204"/></radialGradient>
<linearGradient id="pm" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#e9f6ff"/><stop offset=".3" stop-color="hsl(200,90%,65%)"/><stop offset="1" stop-color="hsl(210,90%,50%)" stop-opacity="0"/></linearGradient>
<linearGradient id="tr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${emis}" stop-opacity="0"/><stop offset="1" stop-color="${emis}"/></linearGradient>
<linearGradient id="core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},90%,75%)"/><stop offset="1" stop-color="hsl(${h},90%,40%)"/></linearGradient>
<filter id="gl" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="bl" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .58  0 0 0 0 .62  0 0 0 .9 0"/></filter>
<radialGradient id="vg" cx=".5" cy=".5" r=".72"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>
</defs>
<style>.hb{fill:url(#mb);stroke:hsl(${h},20%,58%);stroke-opacity:.25;stroke-width:.4}.h{fill:url(#m);stroke:hsl(${h},25%,72%);stroke-opacity:.42;stroke-width:.45}.o{fill:url(#o);stroke:hsl(${h},40%,66%);stroke-opacity:.55;stroke-width:.5}.cr{fill:url(#crg);stroke:hsl(195,60%,85%);stroke-opacity:.6;stroke-width:.5}.d{fill:hsl(${h},12%,6%)}.l{fill:none;stroke:#000;stroke-opacity:.55;stroke-width:.45}.k{fill:none;stroke:hsl(${h},25%,75%);stroke-opacity:.3;stroke-width:.35}.leg{fill:none;stroke:hsl(${h},18%,16%);stroke-width:2.2;stroke-linecap:round}</style>
${bg}${atmosphere(r, h, bgKind, kind)}${subject}${foreground(r, h, bgKind, kind)}
<rect width="160" height="100" fill="url(#cg)" opacity=".22" style="mix-blend-mode:soft-light"/>
<rect width="160" height="100" filter="url(#gr)" opacity=".13"/>
<rect width="160" height="100" fill="url(#vg)"/>
<g stroke="hsl(${h},30%,78%)" stroke-width=".5" fill="none" opacity=".5"><path d="M6 14V6H14M146 6H154V14M154 86V94H146M14 94H6V86"/></g>
<text x="152" y="91" text-anchor="end" font-family="ui-monospace,Consolas,monospace" font-size="4.2" letter-spacing=".6" fill="hsl(${h},25%,78%)" opacity=".6">${code}</text>
</svg>`;
}

// ---------------------------------------------------------------- caching
// Vector art with grain filters is expensive to repaint, so each plate is
// rasterized once (in idle time) and the bitmap is used from then on.
const RASTER = {};
function rasterize(key, svgUrl) {
  if (key in RASTER || typeof document === 'undefined') return;
  RASTER[key] = null;
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = 480; c.height = 300;
      c.getContext('2d').drawImage(img, 0, 0, 480, 300);
      c.toBlob(b => { if (b) RASTER[key] = `url("${URL.createObjectURL(b)}")`; }, 'image/webp', 0.92);
    } catch (e) { /* tainted or unsupported: keep the vector version */ }
  };
  img.src = svgUrl.slice(5, -2);
}
const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 30));
function prewarmArt(keysAndMakers) {
  const queue = keysAndMakers.slice();
  const step = dl => { while (queue.length && dl.timeRemaining() > 4) queue.shift()(); if (queue.length) idle(step); };
  idle(step);
}

// public: art for a card id
function artPlate(id) {
  if (RASTER[id]) return RASTER[id];
  if (!ART_CACHE[id]) {
    const d = D(id); const [kind, opts] = artFor(d);
    ART_CACHE[id] = `url("data:image/svg+xml,${encodeURIComponent(composeArt(id, kind, opts, d.faction))}")`;
  }
  rasterize(id, ART_CACHE[id]);
  return ART_CACHE[id];
}

// public: portrait for a commander/boss/sector/pack by explicit art spec
function portraitPlate(key, faction, spec) {
  const k = 'p:' + key + (spec ? ':' + spec[0] : '');
  if (RASTER[k]) return RASTER[k];
  if (!ART_CACHE[k]) {
    const [kind, opts] = spec || ['bust', { cap: 1 }];
    ART_CACHE[k] = `url("data:image/svg+xml,${encodeURIComponent(composeArt(key, kind, opts || {}, faction || 'fleet'))}")`;
  }
  rasterize(k, ART_CACHE[k]);
  return ART_CACHE[k];
}

// Warm every card in idle time so most art is already a bitmap when needed.
function prewarmAllArt() { prewarmArt(CARD_LIST.map(d => () => artPlate(d.id))); }
