'use strict';
// ============================================================================
// STARFALL PROTOCOL — saved decks and the mission-tuned deck.
// save.decks = [{ name, deck, power }] and save.activeDeck (index). save.deck
// and save.power stay the live copy the rest of the game reads; syncDecks()
// copies them back into the active slot (persist() calls it on every save).
// ============================================================================

const DECK_NAME_MAX = 24;

// How many decks you can keep: 1, then 3 with the Armory (6 at Mk III).
function deckSlots(save) { return Math.max(1, typeof loadoutSlots === 'function' ? loadoutSlots(save) : 0); }

function ensureDecks(save) {
  if (!Array.isArray(save.decks) || !save.decks.length) {
    save.decks = [{ name: 'Main deck', deck: (save.deck || []).slice(), power: save.power }];
    // older saves kept up to 6 "loadouts" next to an unnamed working deck
    (save.loadouts || []).forEach((L, i) => { if (L && L.deck && L.deck.length) save.decks.push({ name: L.name || 'Deck ' + (i + 2), deck: L.deck.slice(), power: L.power }); });
    save.activeDeck = 0;
  }
  delete save.loadouts;
  if (!(save.activeDeck >= 0 && save.activeDeck < save.decks.length)) save.activeDeck = 0;
  return save.decks;
}

function activeDeck(save) { ensureDecks(save); return save.decks[save.activeDeck]; }

function syncDecks(save) {
  if (!save || !Array.isArray(save.decks)) return;
  const d = save.decks[save.activeDeck]; if (!d) return;
  d.deck = save.deck.slice(); d.power = save.power;
}

// Keep only cards you still own (within copy limits); top up to `size` when short.
function ownedDeck(save, ids) {
  const n = {};
  return ids.filter(id => CARDS[id] && (n[id] = (n[id] || 0) + 1) <= Math.min(save.coll[id] || 0, maxCopies(D(id))));
}

// Loads the active slot into save.deck. Returns true when it had to be topped up to `size`.
function loadDeck(save, size) {
  const d = save.decks[save.activeDeck];
  save.deck = ownedDeck(save, d.deck).slice(0, size);
  if (d.power && save.powers.includes(d.power)) save.power = d.power;
  const short = save.deck.length < size;
  if (short) autoFillDeck(save, size);
  syncDecks(save);
  return short;
}

function switchDeck(save, i, size) {
  ensureDecks(save); syncDecks(save);
  if (!save.decks[i]) return false;
  save.activeDeck = i;
  return loadDeck(save, size);
}

function uniqueDeckName(save, base) {
  const names = new Set(save.decks.map(d => d.name));
  if (!names.has(base)) return base;
  for (let k = 2; ; k++) if (!names.has(`${base} ${k}`)) return `${base} ${k}`;
}

// Adds a deck and makes it active. `cards` defaults to a copy of the current deck.
function addDeck(save, name, cards, size) {
  ensureDecks(save); syncDecks(save);
  if (save.decks.length >= deckSlots(save)) return false;
  save.decks.push({ name: uniqueDeckName(save, (name || 'New deck').slice(0, DECK_NAME_MAX)), deck: (cards || save.deck).slice(), power: save.power });
  switchDeck(save, save.decks.length - 1, size);
  return true;
}

function deleteDeck(save, i, size) {
  ensureDecks(save); syncDecks(save);
  if (save.decks.length <= 1 || !save.decks[i]) return false;
  const wasActive = i === save.activeDeck;
  save.decks.splice(i, 1);
  if (save.activeDeck > i) save.activeDeck--;
  if (wasActive) { save.activeDeck = Math.min(i, save.decks.length - 1); loadDeck(save, size); }
  return true;
}

function renameDeck(save, i, name) {
  const d = ensureDecks(save)[i]; if (!d) return;
  const n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, DECK_NAME_MAX);
  if (n) d.name = n;
}

// ---------------------------------------------------------------- mission-tuned deck
// Builds a few candidate decks from your collection, shaped for the enemy, then
// plays simulated battles (AI vs AI, with your commander power and difficulty)
// and keeps the deck that won most. Runs in small steps so the page stays responsive.

const AOE_RE = /all enemy units|all enemies|all units|\bcryo\*\* all|emp\*\* all/i;

function enemyProfile(enc) {
  const cards = enc.enemy.deck.map(D), units = cards.filter(d => d.type === 'unit');
  const share = f => units.length ? units.filter(f).length / units.length : 0;
  return {
    small: share(d => d.hp <= 2),
    big: share(d => d.hp >= 6 || d.cost >= 6),
    guard: share(d => d.kw.includes('guardian')),
    fast: share(d => d.kw.includes('blitz') || d.kw.includes('warp')),
    hp: enc.enemy.hp,
  };
}

function cardTraits(d) {
  return {
    aoe: AOE_RE.test(d.text || ''),
    removal: REMOVAL.has(d.id) || /destroy/i.test(d.text || ''),
    guard: d.kw.includes('guardian'),
    fast: d.kw.includes('blitz') || d.kw.includes('warp'),
    cheap: d.cost <= 2,
    heal: /restore|heal/i.test(d.text || ''),
    silence: d.tags.includes('emp'),
  };
}

function tuneCandidates(save, enc, size) {
  const p = enemyProfile(enc);
  const shaped = d => { const t = cardTraits(d); return (t.aoe ? 2.2 * p.small + 0.4 : 0) + (t.removal ? 1.6 * p.big + 0.3 : 0) + (t.silence ? 1.5 * (p.guard + p.big) : 0) + (t.guard ? 1.4 * p.fast : 0); };
  const scorers = [
    ['Balanced', id => cardRating(id)],
    ['Counter', id => cardRating(id) + shaped(D(id))],
    ['Fast', id => { const d = D(id), t = cardTraits(d); return cardRating(id) + (t.cheap ? 0.9 : 0) + (t.fast ? 0.9 : 0) - Math.max(0, d.cost - 4) * 0.4; }],
    ['Sturdy', id => { const d = D(id), t = cardTraits(d); return cardRating(id) + (t.guard ? 1.1 : 0) + (t.heal ? 0.8 : 0) + (d.type === 'unit' ? d.hp * 0.12 : 0) + shaped(d) * 0.5; }],
    ['Counter+', id => cardRating(id) + shaped(D(id)) * 1.6 + Math.random() * 0.6],
  ];
  const seen = new Set(), out = [];
  const key = deck => deck.slice().sort().join(',');
  const add = (label, deck) => { if (deck.length !== size) return; const k = key(deck); if (seen.has(k)) return; seen.add(k); out.push({ label, deck }); };
  // your current deck goes first, so we can tell you how it compares
  add('Your deck', ownedDeck(save, save.deck));
  scorers.forEach(([label, fn]) => { const tmp = { coll: save.coll, deck: [] }; autoFillDeck(tmp, size, fn); add(label, tmp.deck); });
  return out;
}

function simulateOnce(save, enc, deck) {
  const cfg = buildBattle(Object.assign({}, save, { deck }), enc);
  cfg.player.isAI = true;
  const s = newGame(cfg);
  aiMulligan(s, 0); aiMulligan(s, 1); beginPlay(s);
  for (let n = 0; !s.over && n < 90; n++) {
    const pi = s.active, lvl = pi === 0 ? 2 : s.players[1].ai;
    for (let k = 0; k < 45 && !s.over; k++) { const a = aiChoose(s, pi, lvl); if (!a) break; applyAct(s, pi, a); if (s.choice) resolveChoice(s, 0); }
    if (!s.over) endTurn(s);
    s.events = [];
  }
  return s.winner === 0;
}

// onProgress(done, total); onDone({ best, base, candidates }) — base is your deck's result (or null).
// Returns a cancel function.
function tuneDeck(save, enc, onProgress, onDone) {
  const size = deckSizeFor(save);
  const cands = tuneCandidates(save, enc, size).map(c => Object.assign(c, { wins: 0, games: 0 }));
  const R1 = 5, R2 = 7;
  const queue = []; cands.forEach(c => { for (let g = 0; g < R1; g++) queue.push(c); });
  let total = queue.length + R2 * Math.min(3, cands.length), done = 0, stage = 1, cancelled = false;
  const rate = c => (c.wins + 1) / (c.games + 2); // smoothed, so 5/5 doesn't beat 9/10 by luck
  const step = () => {
    if (cancelled) return;
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 40) {
      const c = queue.shift();
      try { if (simulateOnce(save, enc, c.deck)) c.wins++; } catch (e) { /* a broken sim game counts as a loss */ }
      c.games++; done++;
    }
    onProgress(done, total);
    if (queue.length) return void setTimeout(step, 0);
    if (stage === 1) {
      stage = 2;
      // second round: the top two, plus your deck so the comparison is fair
      const top = cands.slice().sort((a, b) => rate(b) - rate(a)).slice(0, 2);
      const base = cands.find(c => c.label === 'Your deck');
      const again = base && !top.includes(base) ? top.concat(base) : top;
      total = done + R2 * again.length;
      again.forEach(c => { for (let g = 0; g < R2; g++) queue.push(c); });
      return void setTimeout(step, 0);
    }
    const ranked = cands.slice().sort((a, b) => rate(b) - rate(a));
    onDone({ best: ranked[0], base: cands.find(c => c.label === 'Your deck') || null, candidates: ranked });
  };
  setTimeout(step, 30);
  return () => { cancelled = true; };
}

// Cards added and removed going from deck `a` to deck `b`, as [{ id, n }] lists.
function deckDiff(a, b) {
  const count = l => l.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
  const ca = count(a), cb = count(b), add = [], rem = [];
  new Set([...a, ...b]).forEach(id => { const d = (cb[id] || 0) - (ca[id] || 0); if (d > 0) add.push({ id, n: d }); if (d < 0) rem.push({ id, n: -d }); });
  const byCost = (x, y) => D(x.id).cost - D(y.id).cost || D(x.id).name.localeCompare(D(y.id).name);
  return { add: add.sort(byCost), rem: rem.sort(byCost) };
}
