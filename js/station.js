'use strict';
// ============================================================================
// STARFALL PROTOCOL — Anchorage: the derelict Fleet waystation the Commander
// restores with Alloy. Each module has three marks; the Reactor's mark caps
// every other module. Effects that touch the economy or battles are in
// economy.js (stationLv and friends) so the headless sim sees them.
// ============================================================================

const STATION = {
  order: ['command', 'reactor', 'medbay', 'fabricator', 'dock', 'comms', 'observatory', 'armory', 'archive'],
  mods: {
    command:     { name: 'Command Deck', icon: 'command', pos: [50, 50], max: 1, cost: [], levels: ['Station control restored. Anchorage is your forward base.'] },
    reactor:     { name: 'Reactor Core', icon: 'reactor', pos: [50, 86], max: 3, cost: [30, 90, 170],
      levels: ['Main power restored. Other modules can be repaired to Mk I.', 'Secondary loop online. Modules can be upgraded to Mk II.', 'Full output. Modules can be upgraded to Mk III.'] },
    medbay:      { name: 'Med Bay', icon: 'medbay', pos: [21, 30], max: 3, cost: [30, 70, 120],
      levels: ['Your commander has +2 Health in every battle.', 'Your commander has +4 Health in every battle.', 'Your commander has +6 Health in every battle.'] },
    fabricator:  { name: 'Fabricator', icon: 'wrench', pos: [79, 30], max: 3, cost: [30, 70, 120],
      levels: ['Crafting costs 10% less Scrap.', 'Crafting costs 20% less Scrap.', 'Crafting costs 30% less Scrap.'] },
    dock:        { name: 'Trade Dock', icon: 'dock', pos: [88, 63], max: 3, cost: [30, 70, 120],
      levels: ['Battles pay 10% more Credits.', 'Battles pay 20% more Credits.', 'Battles pay 30% more Credits, and Supply Packs cost 90.'] },
    comms:       { name: 'Comms Array', icon: 'antenna', pos: [50, 13], max: 3, cost: [30, 70, 120],
      levels: ['A third contract slot.', 'Contracts pay 50% more Credits.', 'A fourth contract slot.'] },
    observatory: { name: 'Deep-Scan Observatory', icon: 'scope', pos: [12, 63], max: 3, cost: [30, 70, 120],
      levels: ['Mission briefings show the enemy\'s key cards.', 'Mission briefings show the enemy\'s full deck list.', 'In battle, you can see the cost of every card in the enemy\'s hand.'] },
    armory:      { name: 'Armory', icon: 'blade', pos: [29, 81], max: 3, cost: [30, 70, 120],
      levels: ['Deck loadouts: save and swap up to 3 decks in the Hangar.', 'Signature card: one card you choose always starts in your opening hand.', 'Your signature card costs 1 less, and you get 6 loadout slots.'] },
    archive:     { name: 'Archive', icon: 'book', pos: [71, 81], max: 3, cost: [30, 70, 120],
      levels: ['Recovers the first block of lost records.', 'Recovers the second block of records.', 'Recovers the final, deepest records.'] },
  },
};

function ensureStation(save) {
  if (save.station) return save.station;
  save.station = { alloy: 0, mods: { command: 1 }, seen: false };
  // campaigns that started before Anchorage existed get the Alloy they would have earned
  if (economyOpen(save)) {
    let a = ECON.alloyGraduation;
    ENCOUNTERS.forEach(e => { if (e.sector > 0 && save.cleared[e.id]) a += ECON.alloyWin[encKind(e)]; });
    save.station.alloy = a;
  }
  return save.station;
}
function stationOpen(save) { return !!save && economyOpen(save); }
function modCap(save, id) { return id === 'reactor' || id === 'command' ? STATION.mods[id].max : Math.min(STATION.mods[id].max, stationLv(save, 'reactor')); }
function nextCost(save, id) { const m = STATION.mods[id], lv = stationLv(save, id); return lv < m.max ? m.cost[lv] : null; }
function canUpgrade(save, id) { const c = nextCost(save, id); return c != null && stationLv(save, id) < modCap(save, id) && save.station.alloy >= c; }
function upgradeModule(save, id) {
  if (!canUpgrade(save, id)) return false;
  save.station.alloy -= nextCost(save, id);
  save.station.mods[id] = stationLv(save, id) + 1;
  if (id === 'comms') refillContracts(save);
  return true;
}
function upgradesAvailable(save) { return stationOpen(save) ? STATION.order.filter(id => canUpgrade(save, id)).length : 0; }
function loadoutSlots(save) { const a = stationLv(save, 'armory'); return a >= 3 ? 6 : a >= 1 ? 3 : 0; }
// Archive records: the module's mark and campaign progress both gate them (no spoilers early)
function archiveLimit(save) { return Math.min(stationLv(save, 'archive') * 4, 2 + 2 * bossesCleared(save)); }

// ---------------------------------------------------------------- screen
const Stn = { back: null, sel: 'reactor' };

function openStation(back) {
  const save = App.save; ensureStation(save);
  Stn.back = back || openMap;
  closeModal(); showScreen('station'); renderStation();
  if (!save.station.seen) {
    save.station.seen = true; persist();
    const lore = LORE_SAFE('places', 'anchorage');
    const m = modal(`${paintedBanner('station-exterior')}<div class="m-eyebrow">New command // Scrap Belt</div><h2>Anchorage Station</h2>
      <p class="story">${esc(lore || 'Anchorage is an old Fleet waystation in the Scrap Belt. It sheltered survivors after the Starfall and was abandoned in 2220. Its reactor is cold and most of its decks are open to vacuum. Admiral Okonkwo has signed it over to you as your forward base.')}</p>
      <p>Battles now pay <b>Alloy</b>. Spend it here to repair modules. Each one unlocks something new: more Health for your commander, cheaper crafting, deck loadouts, enemy intel and the station's old records in the Archive.</p>
      <p class="muted">Start with the Reactor Core. Every other module can only be repaired as far as the reactor can power it.</p>
      <div class="m-actions"><button class="btn primary" data-a="ok">Begin repairs</button></div>`);
    m.onclick = e => { if (e.target.dataset.a) closeModal(); };
  }
}

function stationSVG(save) {
  const P = STATION.mods, c = P.command.pos, on = id => stationLv(save, id) > 0;
  let g = '';
  // hull ring (tilted, so an ellipse) with damaged arcs drawn broken
  g += `<ellipse cx="50" cy="50" rx="38" ry="34" class="ring" vector-effect="non-scaling-stroke"/>`;
  g += `<ellipse cx="50" cy="50" rx="44" ry="40" class="ring2" vector-effect="non-scaling-stroke"/>`;
  STATION.order.filter(id => id !== 'command').forEach(id => {
    const p = P[id].pos;
    g += `<line x1="${c[0]}" y1="${c[1]}" x2="${p[0]}" y2="${p[1]}" class="spoke ${on(id) ? 'on' : ''}" vector-effect="non-scaling-stroke"/>`;
  });
  g += `<circle cx="50" cy="50" r="9" class="core ${on('reactor') ? 'on' : ''}" vector-effect="non-scaling-stroke"/>`;
  return `<svg class="stn-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs><radialGradient id="stnglow"><stop offset="0" stop-color="hsl(195,90%,60%)" stop-opacity=".5"/><stop offset="1" stop-color="hsl(195,90%,60%)" stop-opacity="0"/></radialGradient></defs>
    ${on('reactor') ? '<ellipse cx="50" cy="52" rx="30" ry="26" fill="url(#stnglow)"/>' : ''}${g}</svg>`;
}

function renderStation() {
  const save = App.save, st = ensureStation(save), sel = STATION.mods[Stn.sel] ? Stn.sel : 'reactor';
  document.body.style.setProperty('--sec-h', 195);
  const nodes = STATION.order.map(id => {
    const m = STATION.mods[id], lv = stationLv(save, id), [x, y] = m.pos;
    const cls = ['stn-node', lv ? 'on' : 'off', lv >= m.max ? 'max' : '', canUpgrade(save, id) ? 'can' : '', id === sel ? 'sel' : ''].join(' ');
    return `<button class="${cls}" style="left:${x}%;top:${y}%" data-mod="${id}" aria-label="${esc(m.name)}, ${lv ? 'Mk ' + lv : 'offline'}">
      <span class="sn-hex">${ico(m.icon)}</span><span class="sn-label">${esc(m.name)}${m.max > 1 ? `<span class="sn-pips">${Array.from({ length: m.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span>` : ''}</span></button>`;
  }).join('');
  const m = STATION.mods[sel], lv = stationLv(save, sel), cost = nextCost(save, sel), cap = modCap(save, sel);
  const lore = LORE_SAFE('station', sel);
  const status = lv >= m.max ? '<span class="lamp ok"></span> Fully operational' : lv ? `<span class="lamp ok"></span> Online · Mk ${lv}` : '<span class="lamp bad"></span> Offline · damaged';
  const blocked = cost != null && lv >= cap ? `Needs Reactor Core Mk ${lv + 1}` : '';
  const need = cost != null && !blocked && st.alloy < cost ? `Need ${cost - st.alloy} more Alloy` : '';
  const levels = m.levels.map((t, k) => `<div class="stn-lv ${k < lv ? 'done' : k === lv ? 'next' : ''}"><span class="lv-n">${m.max > 1 ? ['I', 'II', 'III'][k] : '✓'}</span><span>${esc(t)}</span></div>`).join('');
  const total = STATION.order.reduce((a, id) => a + STATION.mods[id].max, 0), have = STATION.order.reduce((a, id) => a + stationLv(save, id), 0);
  const mods = STATION.order.map(id => { const mm = STATION.mods[id], l = stationLv(save, id); return `<button class="stn-mod ${l ? 'on' : ''} ${id === sel ? 'sel' : ''}" data-mod="${id}"><span class="sm-i">${ico(mm.icon)}</span><span><b>${esc(mm.name)}</b><span>${l ? (mm.max > 1 ? 'Mk ' + l + ' / ' + mm.max : 'Online') : 'Offline'}${canUpgrade(save, id) ? ' · ready' : ''}</span></span></button>`; }).join('');
  $('#station').innerHTML = `<div class="nav-shell">
    ${cmdBar(save, 'station')}
    <div class="sub-head"><div><div class="sh-tag">Forward base // Scrap Belt</div><h1>Anchorage</h1></div><span class="muted">Repair modules with Alloy from battles. Each one unlocks a new feature or upgrade.</span><button class="btn primary" id="stn-done">Done</button></div>
    <div class="stn-body">
      <section class="stn-map ${extraArt('station-exterior') ? 'painted' : ''}" data-key="stn-map" style='--stn-bg:${extraArt('station-exterior') || 'none'}'>
        <div class="stn-head"><div class="ch-n">Station integrity ${Math.round(have / total * 100)}%</div><h2>Anchorage</h2><div class="ch-prog"><b>${have}</b>/${total} systems restored</div></div>
        ${stationSVG(save)}${nodes}
        <div class="chart-coords">ALLOY ${st.alloy} · FLEET REGISTRY W-0417</div>
      </section>
      <aside class="stn-panel frame" data-key="stn-${sel}">
        ${paintedBanner('module-' + sel, 'stn-hero')}<div class="m-eyebrow">${ico(m.icon)} Module</div>
        <h2>${esc(m.name)}</h2>
        <div class="stn-status">${status}</div>
        ${lore ? `<p class="stn-lore">${esc(lore)}</p>` : ''}
        <div class="stn-levels">${levels}</div>
        ${cost != null ? `<div class="stn-cost"><button class="btn ${canUpgrade(save, sel) ? 'primary' : ''}" data-up="${sel}" ${canUpgrade(save, sel) ? '' : 'disabled'}>${lv ? 'Upgrade' : 'Repair'} to ${m.max > 1 ? 'Mk ' + ['I', 'II', 'III'][lv] : 'online'} · ${ico('alloy')} ${cost}</button><span class="need">${blocked || need}</span></div>` : ''}
        ${sel === 'archive' && lv ? '<button class="btn" data-a="archive">Open the Archive</button>' : ''}
      </aside>
    </div>
    <div class="stn-mods">${mods}</div>
  </div>`;
  $('#station').onclick = e => {
    SFX.init();
    if (cmdBarClick(e, Stn.back)) return;
    const md = e.target.closest('[data-mod]'), up = e.target.closest('[data-up]');
    if (up) {
      const id = up.dataset.up;
      if (upgradeModule(save, id)) {
        persist(); SFX.heal(); renderStation();
        const n = $(`.stn-node[data-mod="${id}"]`); if (n) burstAt(n.getBoundingClientRect(), '#4fd2ec', 40);
        toast(`${esc(STATION.mods[id].name)} ${stationLv(save, id) > 1 ? 'upgraded to Mk ' + stationLv(save, id) : 'is back online'}.`);
      }
      return;
    }
    if (md) { Stn.sel = md.dataset.mod; SFX.click(); renderStation(); return; }
    if (e.target.closest('[data-a="archive"]')) { openArchive('records'); return; }
    if (e.target.id === 'stn-done') Stn.back();
  };
}

// LORE is written separately (lore.js); never let a missing entry break a screen.
function LORE_SAFE(group, id) {
  if (typeof LORE === 'undefined' || !LORE[group] || !LORE[group][id]) return '';
  const v = LORE[group][id];
  return typeof v === 'string' ? v : v.body || '';
}
