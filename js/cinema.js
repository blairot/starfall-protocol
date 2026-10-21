'use strict';
// ============================================================================
// STARFALL PROTOCOL — cutscene player.
// Plays a CINEMATICS script (cinematics.js) as a sequence of shots built from
// the game's own art: painted sector backdrops, ship silhouettes, portraits,
// card illustrations and typed logs. Voice lines are pre-rendered audio
// (audio/vo/*.mp3, durations and text hashes in vo.js); any line without
// matching audio still plays as a timed subtitle.
// ============================================================================

const Cinema = (() => {
  const SFX_MAP = { boom: 'bigHit', warp: 'warp', alarm: 'alarm', static: 'static', hum: 'hum', chime: 'chime' };
  const FX_COLOR = { none: 'var(--t-1)', radio: '#ffd08a', ai: '#bff3ff', synth: '#7fe3ff', alien: '#b8f07a', psi: '#d2b8ff', choir: '#ffb8e6' };
  let run = null;   // the cutscene in progress

  const hashText = t => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const voKey = (cid, si, li) => `${cid}-${si}-${li}`;
  function voFor(cid, si, li, text) {
    const v = typeof VO !== 'undefined' && VO[voKey(cid, si, li)];
    return v && v.h === hashText(text) ? v : null;   // stale audio (script edited since) falls back to subtitles
  }
  const estimate = text => Math.max(1.6, text.split(/\s+/).length / 2.6 + 0.3);

  // ---------------------------------------------------------------- audio
  let voiceBus = null;
  function bus() {
    const c = AudioBus.ctx; if (!c) return null;
    if (!voiceBus) { voiceBus = c.createGain(); voiceBus.connect(AudioBus.master); }
    voiceBus.gain.value = (Settings.get('voice') == null ? 90 : Settings.get('voice')) / 100;
    return voiceBus;
  }
  // one decoded file per cutscene (audio/vo/<cid>.mp3); each line is a slice of it (VO[key].o, .d)
  const buffers = {};
  async function load(cid) {
    if (buffers[cid] !== undefined) return buffers[cid];
    buffers[cid] = null;
    try {
      const c = AudioBus.ctx; if (!c) return null;
      const res = await fetch(`audio/vo/${cid}.mp3`); if (!res.ok) return null;
      buffers[cid] = await c.decodeAudioData(await res.arrayBuffer());
    } catch (e) { buffers[cid] = null; }
    return buffers[cid];
  }
  function duck(on) {
    const g = AudioBus.musicBus, c = AudioBus.ctx; if (!g || !c) return;
    if (on && run && run.musicLevel == null) run.musicLevel = g.gain.value;
    const base = run && run.musicLevel != null ? run.musicLevel : g.gain.value;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setTargetAtTime(on ? base * 0.32 : base, c.currentTime, 0.25);
  }
  function playLine(buf, from, dur) {
    const c = AudioBus.ctx, b = bus(); if (!c || !b || !buf) return null;
    const src = c.createBufferSource(); src.buffer = buf; src.connect(b); src.start(0, from, dur);
    const m = meter(); if (m) src.connect(m);
    return src;
  }
  // how loud the voice is right now (0..1): drives a speaker's glow (HALCYON has no mouth to move)
  let an = null, level = null;
  function meter() {
    const c = AudioBus.ctx; if (!c) return null;
    if (!an) { an = c.createAnalyser(); an.fftSize = 512; level = new Uint8Array(an.fftSize); const z = c.createGain(); z.gain.value = 0; an.connect(z); z.connect(c.destination); }
    return an;
  }
  function voiceLevel() {
    if (!an) return 0;
    an.getByteTimeDomainData(level); let e = 0;
    for (let i = 0; i < level.length; i++) { const d = (level[i] - 128) / 128; e += d * d; }
    return Math.min(1, Math.sqrt(e / level.length) * 5);
  }

  // ---------------------------------------------------------------- visuals
  const hueOf = si => (SECTORS[si] || SECTORS[0]).hue;
  // the sector's painted vista when it exists, else the code-drawn backdrop
  const bdUrl = si => extraArt('sector-' + (SECTORS[si] || SECTORS[0]).id) || `url(${Scene.backdrop(si, hueOf(si))})`;
  // painted images get the "pt" treatment: a sharp layer plus a blurred fill, so phones in portrait don't crop them to a sliver
  // cutscene clips: video/<720|1080>/<clip>.mp4, listed in VIDEOS (js/videos.js)
  const VIDEO_BASE = (typeof ART_BASE !== 'undefined' ? ART_BASE : 'art/').replace(/art\/$/, 'video/');
  // an entry may carry `a` (hosted copies: {720, 1080, p}) when its files live outside video/ (the artifact's asset store)
  const vEntry = clip => typeof VIDEOS !== 'undefined' && VIDEOS[clip];
  const videoSrc = clip => { const v = vEntry(clip); if (!v) return null; const q = typeof ART_LITE !== 'undefined' && ART_LITE ? 720 : 1080; if (v.loop) return (v.a && v.a.l) || `${VIDEO_BASE}loop/${clip}.mp4`; return (v.a && v.a[q]) || `${VIDEO_BASE}${q}/${clip}.mp4`; };
  const plainUrl = css => (/url\("?([^")]+)"?\)/.exec(css || '') || [])[1] || '';
  const posterSrc = clip => { const v = vEntry(clip); return (v && v.a && v.a.p) || `${VIDEO_BASE}poster/${clip}.webp`; };
  // one ready-to-play <video> per clip, made when the cutscene starts so every cut is instant
  function preloadVideo(clip, holder) {
    const v = document.createElement('video');
    v.className = 'cin-vid'; v.muted = true; v.playsInline = true; v.preload = 'auto';
    ['muted', 'playsinline', 'disablepictureinpicture'].forEach(a => v.setAttribute(a, ''));
    v.poster = posterSrc(clip); v.src = videoSrc(clip); v.dataset.clip = clip;
    holder.appendChild(v); v.load();
    return v;
  }
  const bgDiv = (cls, img) => /^url\("/.test(img) ? `<div class="cin-bg pt ${cls}" style='--img:${img}'></div>` : `<div class="cin-bg ${cls}" style="background-image:${img}"></div>`;
  function portraitCss(p) {
    if (!p) return '';
    if (p.card) return artPlate(p.card);
    if (p.commander) return portraitPlate('commander', 'fleet', PLAYER_ART);
    if (p.enemy) { const enc = ENCOUNTERS.find(e => e.enemy.name === p.enemy); return portraitPlate(p.enemy, ENEMY_FACTION[enc ? enc.sector : 0], ENEMY_ART[p.enemy]); }
    return '';
  }
  // ship silhouettes: hull path in a 200x60 box, nose pointing right
  const HULLS = {
    meridian: { d: 'M196 30 L150 20 L120 18 L112 8 L96 8 L92 18 L40 20 L30 12 L14 12 L18 24 L4 26 L4 34 L18 36 L14 48 L30 48 L40 40 L92 42 L96 52 L112 52 L120 42 L150 40 Z', glow: '#7fd6ff' },
    fleet:    { d: 'M190 30 L140 22 L60 20 L50 12 L30 12 L34 24 L10 27 L10 33 L34 36 L30 48 L50 48 L60 40 L140 38 Z', glow: '#7fd6ff' },
    raiders:  { d: 'M180 32 L150 22 L128 26 L120 14 L100 18 L90 26 L60 22 L52 30 L20 28 L26 36 L60 40 L94 38 L104 48 L122 44 L130 36 L150 40 Z', glow: '#ffae5a' },
    swarm:    { d: 'M190 30 C170 10 140 12 120 20 C100 6 70 8 58 22 C40 14 18 20 10 30 C18 40 40 46 58 38 C70 52 100 54 120 40 C140 48 170 50 190 30 Z', glow: '#a6f07a' },
    synth:    { d: 'M196 30 L160 14 L120 14 L110 4 L80 4 L70 14 L20 14 L4 30 L20 46 L70 46 L80 56 L110 56 L120 46 L160 46 Z', glow: '#5fe8ff' },
    psi:      { d: 'M196 30 L130 10 L110 22 L70 2 L60 24 L6 30 L60 36 L70 58 L110 38 L130 50 Z', glow: '#c9a2ff' },
    choir:    { d: 'M198 30 L140 6 L150 22 L90 0 L100 22 L20 14 L60 30 L20 46 L100 38 L90 60 L150 38 L140 54 Z', glow: '#ff8ad8' },
  };
  function ship(kind, cls, style) {
    const h = HULLS[kind] || HULLS.fleet;
    return `<svg class="cin-ship ${cls || ''}" style="--glow:${h.glow};${style || ''}" viewBox="-30 0 230 60" aria-hidden="true"><defs><radialGradient id="eg-${kind}"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${h.glow}"/><stop offset="1" stop-color="${h.glow}" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="eng" cx="0" cy="30" rx="26" ry="9" fill="url(#eg-${kind})"/><path d="${h.d}" fill="#06090e" stroke="${h.glow}" stroke-opacity=".55" stroke-width="1.2"/>
      <path d="${h.d}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="3" transform="translate(0 -1)"/></svg>`;
  }

  function shotHTML(cid, cine, sh, si) {
    const sec = sh.sector != null ? sh.sector : cine.sector, cam = sh.cam || 'drift';
    const bg = `${bgDiv(`cam-${cam}`, bdUrl(sec))}`;
    const ov = sh.title ? `<div class="cin-over">${sh.kicker ? `<div class="cin-kick">${esc(sh.kicker)}</div>` : ''}<div class="cin-big">${esc(sh.title)}</div></div>` : '';
    // any shot with a `clip` plays it once the clip exists; until then the shot shows as its own type
    const src = sh.clip && videoSrc(sh.clip);
    if (src) return `<div class="cin-bg cin-video cam-${cam}" style='--img:url("${posterSrc(sh.clip)}")'><video class="cin-vid" data-clip="${esc(sh.clip)}" src="${src}" poster="${posterSrc(sh.clip)}" muted playsinline preload="auto" disablepictureinpicture></video></div>` + ov;
    if (sh.type === 'title') return `${bgDiv(`cam-push dim`, bdUrl(sec))}<div class="cin-titlecard"><div class="cin-kick">${esc(sh.kicker || cine.kicker || '')}</div><div class="cin-big">${esc(sh.title || cine.title)}</div></div>`;
    if (sh.type === 'space') return bg + ov;
    if (sh.type === 'video') return bgDiv(`cam-${cam}`, (sh.still && extraArt(sh.still)) || bdUrl(sec)) + ov;   // no clip yet: the painted still with a slow camera move
    if (sh.type === 'ship') {
      const still = extraArt(`still-${cid}-${si}`);
      if (still) return `${bgDiv(`cam-${cam}`, still)}` + ov;
      const kind = sh.ship || 'meridian', act = sh.action || 'pass';
      let ships = ship(kind, 'act-' + act);
      if (act === 'battle') ships = ship(kind, 'act-battle a') + ship(kind, 'act-battle b') + ship(kind === 'meridian' || kind === 'fleet' ? 'raiders' : 'fleet', 'act-battle c foe') + '<div class="cin-tracers"></div>';
      if (act === 'pass' && (kind === 'swarm' || kind === 'fleet' || kind === 'raiders')) ships += ship(kind, 'act-pass two') + ship(kind, 'act-pass three');
      return bg + `<div class="cin-ships">${ships}</div>` + ov;
    }
    if (sh.type === 'transmission') {
      const who = (sh.lines && sh.lines[0] && sh.lines[0].who) || sh.who;
      const c = CAST[who] || {}, pd = sh.portrait || c.portrait, p = portraitCss(pd);
      return `${bgDiv(`cam-drift dim`, bdUrl(sec))}
        <div class="cin-comm fx-${c.fx || 'none'}"><div class="cc-portrait"${PortraitLoop.attr(pd && pd.enemy)} style='background-image:${p}'><i class="cc-scan"></i></div>
          <div class="cc-side"><div class="cc-h">Incoming transmission</div><div class="cc-name">${esc(c.name || who || '')}</div>
          <div class="cc-wave">${Array.from({ length: 28 }, (_, i) => `<i style="--d:${(i * 0.05).toFixed(2)}s"></i>`).join('')}</div></div></div>`;
    }
    if (sh.type === 'card') return `${bgDiv(`cin-card cam-${cam}`, artPlate(sh.card))}<div class="cin-cardname">${esc(D(sh.card).name)}</div>` + ov;
    if (sh.type === 'log') {
      const L = sh.log || {};
      return `${bgDiv(`cam-drift dim`, bdUrl(sec))}<div class="cin-log"><div class="cl-h">${esc(L.header || 'Recovered record')}</div><div class="cl-body" data-type="${esc(L.body || '')}"></div></div>`;
    }
    if (sh.type === 'impact') return bg + `<div class="cin-flash"></div><div class="cin-ring"></div><div class="cin-ring r2"></div>`;
    if (sh.type === 'warp') return `${bgDiv(`cam-push`, bdUrl(sec))}<div class="cin-warp"></div>`;
    return bg;
  }

  // ---------------------------------------------------------------- timeline
  function plan(cid, cine) {
    return cine.shots.map((sh, si) => {
      const lines = (sh.lines || []).map((ln, li) => { const v = voFor(cid, si, li, ln.text); return { who: ln.who, text: ln.text, key: v ? voKey(cid, si, li) : null, from: v ? v.o : 0, dur: v ? v.d : estimate(ln.text) }; });
      const speech = lines.reduce((a, l) => a + l.dur + 0.35, 0);
      const dur = lines.length ? 0.6 + speech + (sh.hold != null ? sh.hold : 0.8) : (sh.dur || 3);
      return { sh, lines, dur };
    });
  }

  async function play(cid, onDone) {
    const cine = typeof CINEMATICS !== 'undefined' && CINEMATICS[cid];
    if (!cine) { if (onDone) onDone(); return; }
    stop(true);
    SFX.init();
    const shots = plan(cid, cine);
    const el = document.createElement('div'); el.id = 'cinema'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', cine.title);
    el.innerHTML = `<div class="cin-stage"></div><div class="cin-bars"></div><div class="cin-sub" aria-live="polite"><b></b><span></span></div>
      <button class="cin-skip" type="button">Skip <span aria-hidden="true">›</span></button>`;
    document.body.appendChild(el); Tip.hide();
    const me = run = { cid, el, done: false, onDone, srcs: [], timers: [] };
    el.querySelector('.cin-skip').onclick = () => finish();
    me.key = e => { if (e.key === 'Escape') finish(); };
    document.addEventListener('keydown', me.key);
    if (typeof Music !== 'undefined') { if (Music.setTheme) Music.setTheme(cine.sector); Music.setMood(cine.music || 'menu'); if (Music.setIntensity) Music.setIntensity(0.25); }
    // decode this cutscene's voice while the title card shows
    const loads = shots.some(s => s.lines.some(l => l.key)) ? load(cid) : Promise.resolve(null);
    const hold = document.createElement('div'); hold.className = 'cin-preload'; el.appendChild(hold);
    const pre = {}; shots.forEach(x => { if (x.sh.clip && videoSrc(x.sh.clip) && !pre[x.sh.clip]) pre[x.sh.clip] = preloadVideo(x.sh.clip, hold); });
    const stage = el.querySelector('.cin-stage'), sub = el.querySelector('.cin-sub');
    const wait = ms => new Promise(r => { const t = setTimeout(r, ms); me.timers.push(t); });
    for (let i = 0; i < shots.length && !me.done; i++) {
      const { sh, lines, dur } = shots[i];
      if (i === 1) await Promise.race([loads, wait(2500)]);
      if (me.done) break;
      const div = document.createElement('div'); div.className = `cin-shot t-${sh.type}`; div.style.setProperty('--dur', dur + 's');
      div.innerHTML = shotHTML(cid, cine, sh, i);
      stage.appendChild(div);
      void div.offsetWidth; div.classList.add('on');   // reflow, then fade in (no rAF: works in background tabs too)
      PortraitLoop.mount(div);
      let vid = div.querySelector('video.cin-vid');
      if (vid && pre[vid.dataset.clip]) { const ready = pre[vid.dataset.clip]; vid.replaceWith(ready); vid = ready; }
      if (vid) {
        // run right up to the cut (and through the crossfade), never stopping early
        const fit = () => { if (vid.duration) vid.playbackRate = Math.max(0.6, Math.min(1, vid.duration / (dur + 0.6))); };
        vid.addEventListener('loadedmetadata', fit); fit();
        vid.addEventListener('error', () => div.querySelector('.cin-video').classList.add('novid'));
        const p = vid.play(); if (p && p.catch) p.catch(() => {});
      }
      const prev = stage.children.length > 1 ? stage.children[0] : null;
      if (prev) { prev.classList.remove('on'); prev.classList.add('off'); setTimeout(() => prev.remove(), 900); }
      if (sh.sfx && SFX[SFX_MAP[sh.sfx]]) SFX[SFX_MAP[sh.sfx]]();
      if (sh.type === 'impact') shakeEl(el);
      const typer = div.querySelector('.cl-body'); if (typer) typeOut(typer, typer.dataset.type, Math.max(1.5, dur - 1.2), me);
      const t0 = performance.now();
      await wait(600);
      for (const ln of lines) {
        if (me.done) break;
        const c = CAST[ln.who] || {};
        sub.querySelector('b').textContent = c.name || ln.who; sub.querySelector('b').style.color = FX_COLOR[c.fx] || FX_COLOR.none;
        sub.querySelector('span').textContent = ln.text;
        sub.classList.toggle('show', Settings.get('subs') !== false);
        div.classList.add('talking');
        const buf = ln.key ? buffers[cid] : null;
        if (buf) { duck(true); const s = playLine(buf, ln.from, ln.dur); if (s) me.srcs.push(s); }
        if (buf && c.fx === 'ai') { const glow = () => { if (me.done || !div.classList.contains('talking')) { div.style.setProperty('--amp', 0); return; } div.style.setProperty('--amp', voiceLevel().toFixed(2)); setTimeout(glow, 33); }; glow(); }
        await wait(ln.dur * 1000);
        div.classList.remove('talking');
        await wait(350);
      }
      duck(false); sub.classList.remove('show');
      const left = dur * 1000 - (performance.now() - t0);
      if (left > 0) await wait(left);
    }
    finish();

    function finish() {
      if (me.done) return; me.done = true;
      me.timers.forEach(clearTimeout); me.srcs.forEach(s => { try { s.stop(); } catch (e) { /* already ended */ } });
      duck(false); document.removeEventListener('keydown', me.key);
      el.classList.add('out'); setTimeout(() => el.remove(), 600);
      const save = App.save; if (save) { save.seenCine = save.seenCine || []; if (!save.seenCine.includes(cid)) { save.seenCine.push(cid); persist(); } }
      if (run === me) run = null;
      if (me.onDone) setTimeout(me.onDone, 250);
    }
  }
  function typeOut(node, text, secs, me) {
    const n = text.length, step = Math.max(12, (secs * 1000) / Math.max(1, n));
    let i = 0; const tick = () => { if (me.done) return; i = Math.min(n, i + Math.max(1, Math.round(16 / step))); node.textContent = text.slice(0, i); if (i < n) me.timers.push(setTimeout(tick, Math.max(16, step))); };
    tick();
  }
  function shakeEl(el) { if (!Settings.get('shake') || REDUCED) return; try { el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(7px,-4px)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(0,0)' }], { duration: 500 }); } catch (e) { /* decoration */ } }
  function stop(silent) { if (run && !run.done) { const r = run; r.onDone = silent ? null : r.onDone; r.el.querySelector('.cin-skip').click(); } }

  // dev preview (tools/preview.html#still-<cid>-<shot>): one shot, frozen, with its first subtitle
  function still(cid, si) {
    const cine = CINEMATICS[cid], sh = cine && cine.shots[si]; if (!sh) return;
    const el = document.createElement('div'); el.id = 'cinema';
    const ln = (sh.lines || [])[0], c = ln ? CAST[ln.who] || {} : {};
    el.innerHTML = `<div class="cin-stage"><div class="cin-shot t-${sh.type} on" style="--dur:9s">${shotHTML(cid, cine, sh, si)}</div></div><div class="cin-bars"></div>
      <div class="cin-sub ${ln ? 'show' : ''}"><b>${esc(c.name || (ln && ln.who) || '')}</b><span>${esc(ln ? ln.text : '')}</span></div><button class="cin-skip" type="button">Skip <span aria-hidden="true">›</span></button>`;
    document.body.appendChild(el); PortraitLoop.mount(el);
  }
  return { play, stop, plan, hashText, still, videoSrc, playing: () => !!run };
})();

// ============================================================================
// Portrait loops: a character's painted portrait brought to life (a short square
// clip in video/loop). One <video> per clip, always playing; mount() moves it into
// whichever element currently asks for it (data-loop), so redraws never restart it.
// ============================================================================
// a loop only plays once its clip exists (js/videos.js); until then the portrait stays a still
const PORTRAIT_LOOPS = { 'HALCYON': 'halcyon-idle', 'HALCYON (Corrupted)': 'halcyon-corrupted', 'Ixis, Brood Queen': 'ixis-idle',
  'Calculus Prime': 'calculus-idle', 'The Choir Awakened': 'choir-idle', 'Nyra, Void Hierarch': 'nyra-idle' };
const PortraitLoop = (() => {
  const pool = {};
  const clipFor = name => { const c = name && PORTRAIT_LOOPS[name]; return c && !REDUCED && Cinema.videoSrc(c) ? c : null; };
  function video(clip) {
    if (pool[clip]) return pool[clip];
    const v = document.createElement('video');
    v.className = 'p-loop'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    ['muted', 'loop', 'playsinline', 'disablepictureinpicture', 'aria-hidden'].forEach(a => v.setAttribute(a, a === 'aria-hidden' ? 'true' : ''));
    v.src = Cinema.videoSrc(clip);
    v.addEventListener('error', () => v.remove());
    return (pool[clip] = v);
  }
  function mount(root) {
    (root || document).querySelectorAll('[data-loop]').forEach(host => {
      const v = video(host.dataset.loop);
      if (v.parentNode !== host) host.appendChild(v);
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    });
  }
  return { attr: name => { const c = clipFor(name); return c ? ` data-loop="${c}"` : ''; }, mount };
})();

// Which cutscene follows which boss, and the gate for the opening.
const CINE_AFTER = { '1-6': 's1', '2-6': 's2', '3-6': 's3', '4-6': 's4', '5-6': 's5', '6-5': 'finale' };
