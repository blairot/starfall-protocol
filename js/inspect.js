'use strict';
// ============================================================================
// STARFALL PROTOCOL — card inspector (right-click / long-press any card) and
// the Archive: universe lore, factions, people, places, recovered records,
// card dossiers and the field manual (rules and controls).
// ============================================================================

// ---------------------------------------------------------------- inspector
// Its own layer above dialogs, so inspecting a card inside the pack reveal or
// a reward screen doesn't close them.
const Inspect = { el: null, id: null };

function inspectLayer() {
  if (!Inspect.el) {
    const el = document.createElement('div'); el.id = 'inspect'; el.className = 'modal inspect'; el.hidden = true;
    document.body.appendChild(el); Inspect.el = el;
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-ia]');
      if (!a && !e.target.closest('.m-box')) return closeInspect();
      if (!a) return;
      const k = a.dataset.ia;
      if (k === 'close') closeInspect();
      if (k === 'faction') { closeInspect(); openArchive('faction:' + a.dataset.f); }
      if (k === 'sig') { const save = App.save; save.signature = save.signature === Inspect.id ? null : Inspect.id; persist(); SFX.click(); openInspect(Inspect.id, Inspect.opts); if (App.screen === 'hangar') renderHangar(); }
    });
    el.addEventListener('mousemove', e => {
      const st = e.target.closest('.ins-stage'); if (!st || REDUCED) return;
      const r = st.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      st.style.setProperty('--ry', (x * 16).toFixed(1) + 'deg'); st.style.setProperty('--rx', (-y * 12).toFixed(1) + 'deg');
    });
    el.addEventListener('mouseleave', () => { const st = el.querySelector('.ins-stage'); if (st) { st.style.setProperty('--rx', '0deg'); st.style.setProperty('--ry', '0deg'); } }, true);
  }
  return Inspect.el;
}
function closeInspect() { if (Inspect.el) { Inspect.el.hidden = true; Inspect.el.innerHTML = ''; } }

function unitStateHTML(uid) {
  const s = UI.s, c = s && getChar(s, uid); if (!c || isHero(c)) return '';
  const st = [`Right now: <b>${atkOf(s, c)}</b> Attack, <b>${c.hp}</b>/${c.maxHp} Health.`];
  if (c.frozen) st.push('<span class="st-frozen">Frozen: can\'t attack this turn.</span>');
  if (c.silenced) st.push('<span class="st-emp">EMP\'d: its text and keywords are gone.</span>');
  const kwNow = Object.keys(c.kw).filter(k => KEYWORDS[k] && c.kw[k]).map(k => KEYWORDS[k].name);
  if (kwNow.length) st.push('Active keywords: ' + kwNow.join(', ') + '.');
  if (c.extraDeath.length) st.push(`Salvage: summons ${c.extraDeath.length} Swarmling${c.extraDeath.length > 1 ? 's' : ''} when destroyed.`);
  return `<div class="ins-state">${st.join('<br>')}</div>`;
}

function openInspect(id, opts) {
  opts = opts || {}; Inspect.id = id; Inspect.opts = opts;
  const d = D(id), f = FACTIONS[d.faction] || FACTIONS.neutral, save = App.save;
  const kws = keywordsFor(d).map(k => `<div class="kw"><b>${esc(k.name)}</b> ${esc(k.text)}</div>`).join('');
  const stats = [`<span class="s-cost"><b>${d.cost}</b>Energy</span>`];
  if (d.type === 'unit') stats.push(`<span class="s-atk"><b>${d.atk}</b>Attack</span>`, `<span class="s-hp"><b>${d.hp}</b>Health</span>`);
  if (d.type === 'gear') stats.push(`<span class="s-atk"><b>${d.atk}</b>Attack</span>`, `<span><b>${d.hp}</b>Durability</span>`);
  const lore = LORE_SAFE('cards', id);
  const fac = typeof LORE !== 'undefined' && LORE.factions && LORE.factions[d.faction];
  const owned = save && save.coll ? (save.coll[id] || 0) : 0;
  const sigOk = save && stationLv(save, 'armory') >= 2 && save.deck.includes(id) && App.screen === 'hangar';
  const isSig = save && save.signature === id;
  const el = inspectLayer();
  el.style.setProperty('--h', f.hue);
  el.innerHTML = `<button class="ins-x" type="button" data-ia="close" aria-label="Close">&times;</button><div class="m-box" role="dialog" aria-label="${esc(d.name)}"><div class="m-in">
    <div class="ins">
      <div class="ins-stage">${cardHTML(id, { cls: 'huge' })}</div>
      <div class="ins-side">
        <div class="m-eyebrow">${esc(typeLabel(d))}</div>
        <h2>${esc(d.name)}</h2>
        <div class="ins-meta"><span class="pill"><i class="gem g-${d.rarity}"></i>${RARITY_NAME[d.rarity]}</span>${d.token ? '<span class="pill">Token</span>' : `<span class="pill">${esc(PACK_SETS[d.tier - 1] ? PACK_SETS[d.tier - 1].name.replace(' Pack', '') + ' set' : '')}</span>`}${!d.token && save ? `<span class="pill">Owned ${owned}/${maxCopies(d)}</span>` : ''}${isSig ? '<span class="pill new">Signature</span>' : ''}</div>
        <div class="ins-rules">${d.text ? fmt(d.text) : '<span class="muted">No special rules. A solid body for the line.</span>'}<div class="ins-stats">${stats.join('')}</div></div>
        ${opts.uid != null ? unitStateHTML(opts.uid) : ''}
        ${kws ? `<div class="ins-kws">${kws}</div>` : ''}
        ${typeof STRATEGIES !== 'undefined' && (d.strat || []).length ? `<div class="ins-strat">${d.strat.filter(k => STRATEGIES[k]).map(k => `<p><span class="pill">${d.engine ? 'Engine' : 'Strategy'}</span> <b>${esc(STRATEGIES[k].name)}</b>: ${esc(STRATEGIES[k].text)}</p>`).join('')}</div>` : ''}
        <div class="ins-lore">
          <h3>Dossier</h3>
          ${d.flavor ? `<p class="flavor">${esc(d.flavor)}</p>` : ''}
          ${lore ? `<p>${esc(lore)}</p>` : '<p class="muted">No further records on file.</p>'}
          ${fac ? `<p class="muted"><b>${esc(fac.name)}.</b> ${esc(fac.tagline || '')}</p>` : ''}
        </div>
        <div class="m-actions left">
          ${fac ? `<button class="btn small" data-ia="faction" data-f="${d.faction}">${ico('book')} Faction file</button>` : ''}
          ${sigOk || isSig ? `<button class="btn small ${isSig ? '' : 'primary'}" data-ia="sig">${isSig ? 'Clear signature card' : 'Make signature card'}</button>` : ''}
          <button class="btn small ghost" data-ia="close">Close</button>
        </div>
        <div class="ins-hint">Esc or click outside to close</div>
      </div>
    </div></div></div>`;
  el.hidden = false; Tip.hide(); SFX.click && SFX.click();
}

// ---------------------------------------------------------------- commander dossier
// Enemy (or player) commander: portrait, health, power, passives, phases and lore.
// Basic intel is always free; deeper intel (deck lists, hand costs) comes from the Observatory.
function characterLore(name) {
  const chars = typeof LORE !== 'undefined' && LORE.characters ? Object.values(LORE.characters) : [];
  const base = name.replace(/\s*\((corrupted)\)/i, '').replace(/ (Reborn|Ascendant|Omega|Unbound)$/, ''), key = base.split(',')[0];
  return chars.find(c => c.name === name) || chars.find(c => c.name === base) || chars.find(c => c.name.startsWith(key)) || chars.find(c => c.name.includes(key)) || null;
}

function openCommander(src) {
  // src: { pi } for a live battle commander, or { enc } for a mission briefing
  let name, portrait, hp, maxHp, armor = 0, power = null, passives = [], phases = [], faction = 'fleet', sector = 0, mine = false;
  if (src.pi != null && UI.s) {
    const p = UI.s.players[src.pi]; mine = src.pi === 0; sector = UI.enc ? UI.enc.sector : 0;
    name = p.name; portrait = heroArt(p); hp = p.hp; maxHp = p.maxHp; armor = p.armor;
    power = p.power && p.power.id; passives = p.passives; phases = p.phases; faction = mine ? 'fleet' : ENEMY_FACTION[sector];
  } else if (src.enc) {
    const e = src.enc.enemy; sector = src.enc.sector; faction = ENEMY_FACTION[sector];
    name = e.name; portrait = portraitPlate(e.name, faction, ENEMY_ART[e.name]);
    hp = maxHp = Math.round(e.hp * (DIFFICULTY[App.save.diff] || DIFFICULTY.officer).hp); power = e.power; passives = e.passives || []; phases = e.phases || [];
  } else return;
  const ch = mine ? (LORE.characters && LORE.characters.commander) : characterLore(name);
  const f = FACTIONS[faction] || FACTIONS.neutral, h = power && HEROPOWERS[power];
  const lore = ch ? (ch.body || '').split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('') : '<p class="muted">No further records on file.</p>';
  const el = inspectLayer(); Inspect.id = null;
  el.style.setProperty('--h', f.hue);
  el.innerHTML = `<button class="ins-x" type="button" data-ia="close" aria-label="Close">&times;</button><div class="m-box" role="dialog" aria-label="${esc(name)}"><div class="m-in">
    <div class="ins">
      <div class="ins-stage"><div class="cmdr-portrait" style='background-image:${portrait}'></div></div>
      <div class="ins-side">
        <div class="m-eyebrow">${mine ? 'Your commander' : 'Enemy commander'} · ${esc(SECTORS[sector].name)}</div>
        <h2>${esc(name)}</h2>
        ${ch && ch.role ? `<div class="ins-meta"><span class="pill">${esc(ch.role)}</span></div>` : ''}
        <div class="ins-rules"><div class="ins-stats" style="margin-top:0"><span class="s-hp"><b>${hp}</b>/${maxHp} Health</span>${armor ? `<span><b>${armor}</b>Armor</span>` : ''}${phases.length ? `<span class="s-atk"><b>${phases.length}</b>more phase${phases.length > 1 ? 's' : ''}</span>` : ''}</div></div>
        <div class="ins-kws">
          ${h ? `<div class="kw"><b>${powerIco(power)} ${esc(h.name)}</b> <span class="pill">${h.cost} Energy</span> ${esc(h.text)} <span class="muted">Commander power, once per turn.</span></div>` : '<div class="kw muted">No commander power.</div>'}
          ${passives.map(id => PASSIVES[id] ? `<div class="kw"><b>${passiveIco(id)} ${esc(PASSIVES[id].name)}</b> ${esc(PASSIVES[id].text)}</div>` : '').join('')}
          ${!mine ? tacticsLine(src.enc || UI.enc, 'kw') : ''}
          ${phases.length ? `<div class="kw warn"><b>Rises again</b> When its Health hits zero, this enemy returns in a new form ${phases.length > 1 ? phases.length + ' times' : 'once'}. Each form brings new powers.</div>` : ''}
        </div>
        <div class="ins-lore"><h3>Dossier</h3>${lore}</div>
        <div class="m-actions left"><button class="btn small ghost" data-ia="close">Close</button></div>
        <div class="ins-hint">${TOUCH.on ? 'Tap outside to close' : 'Esc or click outside to close'}</div>
      </div>
    </div></div></div>`;
  el.hidden = false; Tip.hide();
}

// Which card does this element show? Hand, collection, deck rows, chips, pack reveals and units.
function cardAt(target) {
  if (!target || !target.closest) return null;
  const u = target.closest('[data-uid]');
  if (u && UI.s && App.screen === 'battle') { const c = getChar(UI.s, parseUid(u.dataset.uid)); if (c && !isHero(c)) return { id: c.id, uid: c.uid }; }
  const t = target.closest('[data-card]');
  if (t && CARDS[t.dataset.card]) return { id: t.dataset.card };
  const w = target.closest('[data-tip^="weapon:"]');
  if (w && UI.s) { const p = UI.s.players[+w.dataset.tip.split(':')[1]]; if (p.weapon) return { id: p.weapon.id }; }
  return null;
}

// A commander (or its power, passives, traps) under this element, in battle?
function commanderAt(target) {
  if (!target || !target.closest || App.screen !== 'battle' || !UI.s) return null;
  const row = target.closest('.hero-row');
  if (row && !target.closest('.weapon')) return row.classList.contains('enemy') ? 1 : 0;
  return null;
}

document.addEventListener('contextmenu', e => {
  if (App.screen === 'battle' && UI.mode) return;   // right-click cancels targeting in battle
  const cmd = commanderAt(e.target);
  if (cmd != null) { e.preventDefault(); openCommander({ pi: cmd }); return; }
  const hit = cardAt(e.target); if (!hit) return;
  e.preventDefault(); openInspect(hit.id, hit);
});
// Card name chips (briefing intel, rewards) and enemy portraits in briefings open on a tap or click.
document.addEventListener('click', e => {
  const chip = e.target.closest && e.target.closest('.chip[data-card]');
  if (chip && CARDS[chip.dataset.card]) { openInspect(chip.dataset.card); return; }
  const foe = e.target.closest && e.target.closest('[data-cmdr]');
  if (foe && ENC[foe.dataset.cmdr]) openCommander({ enc: ENC[foe.dataset.cmdr] });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && Inspect.el && !Inspect.el.hidden) { e.stopPropagation(); closeInspect(); } }, true);
// touch: press and hold
(() => {
  let timer = null, fired = false;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const cmd = commanderAt(e.target), hit = cmd == null && cardAt(e.target); if (cmd == null && !hit) return;
    fired = false; clearTimeout(timer);
    timer = setTimeout(() => { fired = true; cmd != null ? openCommander({ pi: cmd }) : openInspect(hit.id, hit); }, 480);
  }, { passive: true });
  const cancel = () => clearTimeout(timer);
  document.addEventListener('pointerup', cancel, { passive: true });
  document.addEventListener('pointercancel', cancel, { passive: true });
  document.addEventListener('pointermove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancel(); }, { passive: true });
  document.addEventListener('click', e => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
})();

// ---------------------------------------------------------------- archive
const Arch = { sec: 'universe', back: null };
const L = () => (typeof LORE !== 'undefined' ? LORE : {});

function archiveSections(save) {
  const lore = L(), lim = save ? archiveLimit(save) : 0;
  const recs = lore.archive || [];
  return [
    ['h', 'The setting'],
    ['universe', 'The Universe'], ['timeline', 'Timeline'], ['places', 'Places'],
    ['h', 'Dossiers'],
    ...Object.keys(lore.factions || {}).map(k => ['faction:' + k, lore.factions[k].name]),
    ['characters', 'People'], ['cards', 'Card dossiers'],
    ['cinematics', 'Mission logs', `${((save && save.seenCine) || []).length}/${Object.keys(typeof CINEMATICS !== 'undefined' ? CINEMATICS : {}).length}`],
    ['h', 'Anchorage'],
    ['records', 'Recovered records', `${recs.filter(r => r.unlock <= lim).length}/${recs.length}`],
    ['h', 'Field manual'],
    ['manual', 'Rules & keywords'], ['controls', 'Controls'],
  ];
}

function archivePage(sec, save) {
  const lore = L(), P = (t) => (t || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('');
  if (sec === 'universe') {
    const u = lore.universe || { title: 'The Universe', intro: '', sections: [] };
    return `<div class="m-eyebrow">Archive // The setting</div><h2>${esc(u.title || 'The Universe')}</h2>${P(u.intro)}${(u.sections || []).map(s => `<article><h4>${esc(s.h)}</h4>${P(s.body)}</article>`).join('')}`;
  }
  if (sec === 'timeline') return `<div class="m-eyebrow">Archive // History</div><h2>Timeline</h2><dl class="arch-tl">${(lore.timeline || []).map(t => `<dt>${esc(t.when)}</dt><dd>${esc(t.text)}</dd>`).join('')}</dl>`;
  if (sec === 'places') return `<div class="m-eyebrow">Archive // Astrography</div><h2>Places</h2>${Object.entries(lore.places || {}).map(([k, p]) => `<article>${paintedBanner(k === 'anchorage' ? 'station-exterior' : 'sector-' + k, 'arch-hero')}<h4>${esc(p.name)}${SECTORS.find(s => s.id === k) ? ` <small>Sector ${SECTORS.findIndex(s => s.id === k) + 1}</small>` : ''}</h4>${P(p.body)}</article>`).join('')}`;
  if (sec.startsWith('faction:')) {
    const k = sec.split(':')[1], f = (lore.factions || {})[k]; if (!f) return '<p class="muted">No file.</p>';
    const cards = CARD_LIST.filter(d => !d.token && d.faction === k);
    return `<div class="m-eyebrow">Archive // Faction file</div><h2>${esc(f.name)}</h2><p class="story">${esc(f.tagline || '')}</p>${P(f.body)}
      ${cards.length ? `<h3>Known assets</h3><div class="arch-cards">${cardList(cards, save)}</div>` : ''}`;
  }
  if (sec === 'characters') return `<div class="m-eyebrow">Archive // Personnel and threats</div><h2>People</h2>${Object.values(lore.characters || {}).map(c => `<article><h4>${esc(c.name)} <small>${esc(c.role || '')}</small></h4>${P(c.body)}</article>`).join('')}`;
  if (sec === 'cards') {
    const seen = CARD_LIST.filter(d => !d.token);
    return `<div class="m-eyebrow">Archive // Card dossiers</div><h2>Card dossiers</h2><p class="muted">Every card you own has a dossier. Right-click any card in the game to open it.</p><div class="arch-cards">${cardList(seen, save)}</div>`;
  }
  if (sec === 'records') {
    const lim = save ? archiveLimit(save) : 0, lv = save ? stationLv(save, 'archive') : 0;
    const head = `<div class="m-eyebrow">Anchorage // Archive module</div><h2>Recovered records</h2>`;
    if (!save || !stationOpen(save)) return head + '<p class="muted">Records are recovered at Anchorage station, which you take command of after the Academy.</p>';
    if (!lv) return head + '<p class="muted">The Archive module is offline. Repair it at Anchorage to start recovering lost records.</p>';
    return head + `<p class="muted">Archive Mk ${lv}. Higher marks, and pushing deeper into the campaign, recover more.</p>` + (lore.archive || []).map(r => r.unlock <= lim
      ? `<div class="arch-rec"><h4>${esc(r.title)}</h4><p>${esc(r.body)}</p></div>`
      : `<div class="arch-rec locked"><h4>Corrupted record</h4><p class="muted">${r.unlock > stationLv(save, 'archive') * 4 ? `Needs Archive Mk ${Math.ceil(r.unlock / 4)}.` : 'Push deeper into the campaign to recover this record.'}</p></div>`).join('');
  }
  if (sec === 'cinematics') {
    const seen = (save && save.seenCine) || [];
    const items = Object.entries(typeof CINEMATICS !== 'undefined' ? CINEMATICS : {}).map(([id, c]) => seen.includes(id)
      ? `<button class="cine-item" data-cine="${id}" style="background-image:url(${Scene.backdrop(c.sector, SECTORS[c.sector].hue)})"><small>${esc(c.kicker || '')}</small><b>${esc(c.title)}</b></button>`
      : `<div class="cine-item locked"><small>Classified</small><b>Not yet recorded</b></div>`).join('');
    return `<div class="m-eyebrow">Archive // Mission logs</div><h2>Mission logs</h2><p class="muted">Replay the story so far. New logs are recorded as you clear each sector.</p><div class="cine-list">${items}</div>`;
  }
  if (sec === 'manual') {
    const list = Object.keys(KEYWORDS).map(k => save && save.codex.includes(k)
      ? `<div class="cx"><b>${esc(KEYWORDS[k].name)}</b><span>${esc(KEYWORDS[k].text)}</span></div>`
      : '<div class="cx locked"><b>???</b><span>Not yet encountered.</span></div>').join('');
    return `<div class="m-eyebrow">Field manual</div><h2>Rules & keywords</h2><div class="codex">${list}</div>`;
  }
  if (sec === 'controls') return `<div class="m-eyebrow">Field manual</div><h2>Controls</h2><div class="codex">
    <div class="cx"><b>Play a card</b><span>Click it. If it needs a target, click the target.</span></div>
    <div class="cx"><b>Attack</b><span>Click a glowing unit (or your commander with Gear), then an enemy.</span></div>
    <div class="cx"><b>Cancel</b><span>Right-click or press Esc while targeting.</span></div>
    <div class="cx"><b>End turn</b><span>The END TURN button, or press E.</span></div>
    <div class="cx"><b>Details</b><span>Hover anything for a quick look.</span></div>
    <div class="cx"><b>Inspect</b><span>Right-click any card or unit (press and hold on touch) to see it full size with its lore.</span></div></div>`;
  return '';
}

function cardList(cards, save) {
  return cards.sort((a, b) => a.tier - b.tier || a.cost - b.cost || a.name.localeCompare(b.name)).map(d => {
    const known = !save || (save.coll[d.id] || 0) > 0 || (save.cleared && ENCOUNTERS.some(e => save.cleared[e.id] && e.enemy.deck.includes(d.id)));
    if (!known) return `<div class="arch-card unknown"><span class="ac-art"></span><span><b>Unknown asset</b><p>Encounter or collect this card to open its dossier.</p></span></div>`;
    const lore = LORE_SAFE('cards', d.id);
    return `<button class="arch-card" data-card="${d.id}" data-open="${d.id}"><span class="ac-art" style='background-image:${artPlate(d.id)}'></span><span><b>${esc(d.name)}</b><p>${esc(lore ? lore.split('. ')[0] + '.' : d.flavor || '')}</p></span></button>`;
  }).join('');
}

function openArchive(sec, back) {
  const save = App.save;
  Arch.sec = sec || Arch.sec; if (back !== undefined) Arch.back = back;
  const nav = archiveSections(save).map(([k, l, meta]) => k === 'h' ? `<div class="an-h">${esc(l)}</div>` : `<button class="${k === Arch.sec ? 'on' : ''}" data-sec="${k}">${esc(l)}${meta ? `<span>${meta}</span>` : ''}</button>`).join('');
  const m = modal(`<button class="m-x" type="button" data-a="close" aria-label="Close the Archive">&times;</button><div class="arch"><nav class="arch-nav">${nav}<div class="an-h"></div><button data-a="close">Close</button></nav><section class="arch-page">${archivePage(Arch.sec, save)}</section></div>`, 'xl archive');
  m.onclick = e => {
    const s = e.target.closest('[data-sec]'); if (s) { SFX.click(); openArchive(s.dataset.sec); return; }
    const o = e.target.closest('[data-open]'); if (o) { openInspect(o.dataset.open); return; }
    const cv = e.target.closest('[data-cine]'); if (cv) { closeModal(); Cinema.play(cv.dataset.cine, () => openArchive('cinematics')); return; }
    if (e.target.closest('[data-a="close"]')) { closeModal(); const b = Arch.back; Arch.back = null; if (b) b(); }
  };
}
