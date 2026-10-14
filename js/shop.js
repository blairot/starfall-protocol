'use strict';
// ============================================================================
// STARFALL PROTOCOL — Supply Depot (pack shop), pack opening, crafting dialog
// ============================================================================

function packHTML(tier, cls) {
  const set = PACK_SETS[tier - 1];
  return `<div class="pack ${cls || ''}" style='--h:${set.hue};background-image:${extraArt('pack-' + tier) || portraitPlate(set.name, ENEMY_FACTION[tier - 1] === 'neutral' ? 'fleet' : ENEMY_FACTION[tier - 1], SECTOR_ART[tier - 1])}'>
    <div class="pk-band"></div>
    <div class="pk-name">${esc(set.name.replace(' Pack', ''))}</div><div class="pk-sub">Supply Pack</div></div>`;
}

const Shop = { back: null };

function openShop(back, autoOpen) {
  Shop.back = back || openMap;
  closeModal(); showScreen('shop'); renderShop();
  if (autoOpen) { const t = PACK_SETS.find(p => (App.save.packs[p.tier] || 0) > 0); if (t) openPackFlow(t.tier); }
}

function renderShop() {
  const save = App.save;
  const sets = PACK_SETS.map(set => {
    const ok = setUnlocked(save, set.tier), n = save.packs[set.tier] || 0, pr = setProgress(save, set.tier);
    if (!ok) return `<article class="set-tile locked"><div class="pack locked-pack"><div class="pk-icon">${ico('lock')}</div></div><div class="st-body"><h3>${esc(set.name)}</h3><p class="muted">Unlocks when you reach Sector ${set.tier}.</p></div></article>`;
    const cards = setCards(set.tier);
    const counts = RARITIES.map(r => `${cards.filter(d => d.rarity === r).length} ${RARITY_NAME[r]}`).join(' · ');
    return `<article class="set-tile" style="--h:${set.hue}">
      ${packHTML(set.tier, n ? 'has-packs' : '')}${n ? `<span class="pk-count">${n}</span>` : ''}
      <div class="st-body"><h3>${esc(set.name)}</h3><div class="muted small">${esc(set.sub)} · ${counts}</div>
        <div class="st-prog"><i style="width:${(pr.have / pr.total) * 100}%"></i></div><div class="muted small">Collected ${pr.have}/${pr.total}</div>
        <div class="st-btns"><button class="btn ${save.credits >= packPriceOf(save) ? 'primary' : ''}" data-buy="${set.tier}" ${save.credits >= packPriceOf(save) ? '' : 'disabled'}>Buy · ${ico('credits')} ${packPriceOf(save)}</button>
        <button class="btn" data-open="${set.tier}" ${n ? '' : 'disabled'}>Open${n ? ` (${n})` : ''}</button></div></div></article>`;
  }).join('');
  const contracts = save.contracts.map(c => { const d = CONTRACTS[c.id]; return `<div class="contract-row"><div><b>${esc(d.text)}</b><div class="ct-bar"><i style="width:${(c.progress / d.goal) * 100}%"></i></div><span class="muted small">${c.progress}/${d.goal}</span></div><span class="ct-rw">${ico('credits')} ${contractRewardOf(save, c.id)}</span></div>`; }).join('') || '<p class="muted">No contracts available.</p>';
  $('#shop').innerHTML = `<div class="nav-shell">
    ${cmdBar(save, 'shop')}
    <div class="sub-head"><div><div class="sh-tag">Quartermaster</div><h1>Supply Depot</h1></div><span class="muted">Buy and open Supply Packs. Each set holds one sector's cards.</span><button class="btn primary" id="sh-back">Done</button></div>
    <div class="shop-body">
      <section class="sets">${sets}</section>
      <aside class="shop-side">
        <div class="side-card"><h3>Contracts</h3><p class="muted small">Progress counts in every battle, won or lost. A new contract replaces each one you finish.</p>${contracts}</div>
        <div class="side-card"><h3>Pack odds</h3><p class="muted small">Each pack holds ${ECON.packSize} cards. Chance for each card:</p>
          <table class="odds">${RARITIES.map(r => `<tr><td><i class="gem g-${r}"></i>${RARITY_NAME[r]}</td><td>${(ECON.odds[r] * 100).toFixed(1)}%</td></tr>`).join('')}</table>
          <ul class="muted small guar"><li>Every pack contains at least one Rare or better.</li><li>An Epic is guaranteed within ${ECON.pityEpic} packs of a set.</li><li>A Legendary is guaranteed within ${ECON.pityLegendary} packs of a set.</li><li>No duplicate Legendaries until you own every Legendary in that set.</li><li>Extra copies become Scrap: ${RARITIES.map(r => `${ECON.scrapValue[r]} ${RARITY_NAME[r]}`).join(', ')}.</li></ul></div>
      </aside>
    </div></div>`;
  $('#shop').onclick = e => {
    SFX.init();
    if (cmdBarClick(e, Shop.back)) return;
    const b = e.target.closest('[data-buy]'), o = e.target.closest('[data-open]');
    if (b) { if (buyPack(save, +b.dataset.buy)) { SFX.play(); persist(); renderShop(); toast(`Bought a ${PACK_SETS[+b.dataset.buy - 1].name}.`); } return; }
    if (o) { openPackFlow(+o.dataset.open); return; }
    if (e.target.id === 'sh-back') Shop.back();
    if (e.target.id === 'sh-hangar') openHangar(Shop.back); // Done in the Hangar returns to where the Depot was opened from
  };
}

function walletHTML(save) {
  const n = unopenedPacks(save);
  return `<div class="wallet"><span title="Credits buy Supply Packs">${ico('credits')} <b>${save.credits}</b> Credits</span><span title="Scrap crafts cards in the Hangar">${ico('scrap')} <b>${save.scrap}</b> Scrap</span>${n ? `<span>${ico('pack')} <b>${n}</b> unopened</span>` : ''}${save.station ? `<span class="w-alloy" title="Alloy repairs Anchorage station">${ico('alloy')} <b>${save.station.alloy}</b> Alloy</span>` : ''}</div>`;
}

// ---------------------------------------------------------------- pack opening
function openPackFlow(tier) {
  const save = App.save;
  if (!(save.packs[tier] > 0)) return;
  const set = PACK_SETS[tier - 1];
  const m = modal(`<div class="po-stage"><div class="m-eyebrow">${esc(set.name)}</div><h2>Open your pack</h2>
    <button class="po-pack" id="po-pack" aria-label="Open pack">${packHTML(tier, 'big')}</button><p class="muted">Click the pack to tear it open.</p></div>`, 'wide packopen');
  m.onclick = async e => {
    if (!e.target.closest('#po-pack')) return;
    m.onclick = null;
    save.packs[tier]--; if (!save.packs[tier]) delete save.packs[tier];
    const res = openPack(save, tier);
    persist();
    const pk = $('#po-pack'); pk.classList.add('tearing'); SFX.trap();
    await sleep(T(650));
    revealPack(tier, res);
  };
}

function revealPack(tier, res) {
  const save = App.save, set = PACK_SETS[tier - 1];
  const flipped = new Set();
  const best = res.reduce((a, r) => Math.max(a, RARITIES.indexOf(r.rarity)), 0);
  const m = modal(`<div class="po-stage"><div class="m-eyebrow">${esc(set.name)}</div><h2>${best === 3 ? 'Something legendary is inside…' : best === 2 ? 'An Epic glows inside' : 'Reveal your cards'}</h2>
    <div class="po-row">${res.map((r, i) => `<button class="po-card r-${r.rarity}" data-i="${i}" aria-label="Reveal card ${i + 1}"><div class="po-inner"><div class="po-back"><span>✦</span></div><div class="po-front">${cardHTML(r.id)}${r.isNew ? '<span class="po-tag new">NEW</span>' : ''}${r.scrap ? `<span class="po-tag dup">+${r.scrap} Scrap</span>` : ''}</div></div></button>`).join('')}</div>
    <div class="po-foot"><span class="muted" id="po-sum">Click each card to reveal it.</span><div class="m-actions"><button class="btn" data-a="all">Reveal all</button></div></div></div>`, 'wide packopen');
  const finish = () => {
    const scrap = res.reduce((a, r) => a + r.scrap, 0), fresh = res.filter(r => r.isNew).length;
    const left = save.packs[tier] || 0, other = unopenedPacks(save) - left;
    $('#po-sum').innerHTML = `${fresh} new card${fresh === 1 ? '' : 's'}${scrap ? ` · +${scrap} Scrap from duplicates` : ''} · You now have ${ico('scrap')} ${save.scrap} Scrap`;
    $('.po-foot .m-actions').innerHTML = `${left ? `<button class="btn primary" data-a="again">Open another (${left})</button>` : ''}${!left && other ? `<button class="btn primary" data-a="next">Open next pack (${other})</button>` : ''}<button class="btn" data-a="hangar">Hangar</button><button class="btn ${left || other ? '' : 'primary'}" data-a="done">Done</button>`;
  };
  const flip = i => {
    if (flipped.has(i)) return; flipped.add(i);
    const el = $(`.po-card[data-i="${i}"]`); el.classList.add('flipped');
    const r = res[i], rect = el.getBoundingClientRect();
    if (r.rarity === 'legendary') { SFX.win(); burstAt(rect, '#ffae2b', 60); }
    else if (r.rarity === 'epic') { SFX.heal(); burstAt(rect, '#c47bff', 34); }
    else if (r.rarity === 'rare') { SFX.shield(); burstAt(rect, '#4ea5ff', 18); }
    else SFX.click();
    if (flipped.size === res.length) finish();
  };
  m.onclick = e => {
    const c = e.target.closest('.po-card'); if (c) return flip(+c.dataset.i);
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'all') res.forEach((_, i) => setTimeout(() => flip(i), i * T(160)));
    if (a === 'again') openPackFlow(tier);
    if (a === 'next') { const t = PACK_SETS.find(p => (save.packs[p.tier] || 0) > 0); if (t) openPackFlow(t.tier); }
    if (a === 'done') { closeModal(); if (App.screen === 'shop') renderShop(); else if (App.screen === 'map') openMap(); }
    if (a === 'hangar') { closeModal(); openHangar(App.screen === 'shop' ? Shop.back : openMap); }
  };
}

// Little DOM spark burst for screens without the battle canvas.
function burstAt(rect, color, n) {
  if (!Settings.get('particles')) return;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  for (let k = 0; k < n; k++) {
    const p = document.createElement('i'); p.className = 'burst'; p.style.background = color;
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
    p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], { duration: T(700 + Math.random() * 500), easing: 'cubic-bezier(.2,.7,.3,1)' });
    document.body.appendChild(p); setTimeout(() => p.remove(), T(1300));
  }
}

// ---------------------------------------------------------------- crafting dialog
function craftDialog(id, back) {
  const save = App.save, d = D(id), own = save.coll[id] || 0, max = maxCopies(d);
  const cost = craftCostOf(save, d.rarity), val = ECON.scrapValue[d.rarity];
  const unlocked = setUnlocked(save, d.tier);
  const m = modal(`<div class="craft">
    <div class="craft-card">${cardHTML(id, { cls: 'big' })}</div>
    <div class="craft-side"><div class="m-eyebrow">${RARITY_NAME[d.rarity]} · ${esc(PACK_SETS[d.tier - 1].name.replace(' Pack', ''))} set</div><h2>${esc(d.name)}</h2>
      <p>You own <b>${own}/${max}</b>. You have ${ico('scrap')} <b>${save.scrap}</b> Scrap.</p>
      <div class="craft-btns">
        <button class="btn primary" data-a="craft" ${canCraft(save, id) ? '' : 'disabled'}>Craft · ${ico('scrap')} ${cost}</button>
        <button class="btn danger" data-a="scrap" ${own ? '' : 'disabled'}>Scrap one · +${val}</button>
      </div>
      <p class="muted small">${!unlocked ? 'This set is not available yet.' : own >= max ? 'You already own the maximum copies for a deck.' : save.scrap < cost ? `You need ${cost - save.scrap} more Scrap.` : 'Crafting adds one copy to your collection.'}</p>
      <div class="m-actions left"><button class="btn ghost" data-a="back">Back</button></div></div></div>`, 'wide');
  m.onclick = e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'craft' && craftCard(save, id)) { SFX.heal(); persist(); toast(`Crafted ${esc(d.name)}.`); return craftDialog(id, back); }
    if (a === 'scrap' && scrapCard(save, id)) { SFX.death(); persist(); toast(`Scrapped ${esc(d.name)} for ${val} Scrap.`); return craftDialog(id, back); }
    if (a === 'back') { closeModal(); if (back) back(); }
  };
}
