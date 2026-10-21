#!/usr/bin/env node
'use strict';
// ============================================================================
// STARFALL PROTOCOL: text harness for AI playtesters.
// Plays the real game (the same engine, cards, enemy AI, campaign, rewards and
// story text as the browser build) as a turn-by-turn text game, so an agent can
// play a campaign the way a person would and report on it.
//
//   node tools/playtest-agents/play.js <run> <command> [args]
//   node tools/playtest-agents/play.js help
//
// A run's campaign save lives in tools/playtest-agents/runs/<run>/save.json.
// A battle in progress is stored as its random seed plus the actions taken and
// rebuilt on every command, so each command is a separate, stateless process.
// It shows only what the player would see: never the enemy's hand or deck.
// ============================================================================
const vm = require('vm'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RUNS = path.join(__dirname, 'runs');
const FILES = ['build', 'engine', 'cards', 'strategies', 'ai', 'campaign', 'economy', 'station', 'decks', 'lore', 'cinematics'];

// ---------------------------------------------------------------- the game, headless
let rngState = 1;
const rng = () => { rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0; let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const seed = n => { rngState = n | 0; };
const G = { console, Date, JSON, performance: { now: () => Date.now() }, setTimeout, clearTimeout };
G.Math = Object.create(Math); G.Math.random = rng;
G.window = G; vm.createContext(G);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), G, { filename: f + '.js' });
const g = name => vm.runInContext(name, G);
const { D, CARDS, KEYWORDS, ENCOUNTERS, SECTORS, HEROPOWERS, PASSIVES, DIFFICULTY, CINEMATICS, CAST, PACK_SETS, ECON } = ['D', 'CARDS', 'KEYWORDS', 'ENCOUNTERS', 'SECTORS', 'HEROPOWERS', 'PASSIVES', 'DIFFICULTY', 'CINEMATICS', 'CAST', 'PACK_SETS', 'ECON'].reduce((o, k) => (o[k] = g(k), o), {});
const fn = name => g(name);
const CINE_AFTER = { '1-6': 's1', '2-6': 's2', '3-6': 's3', '4-6': 's4', '5-6': 's5', '6-5': 'finale' };   // as js/cinema.js
const ENC = id => ENCOUNTERS.find(e => e.id.toLowerCase() === String(id).toLowerCase());

// ---------------------------------------------------------------- run files
const runDir = run => path.join(RUNS, run);
const readJ = (run, f) => { try { return JSON.parse(fs.readFileSync(path.join(runDir(run), f), 'utf8')); } catch (e) { return null; } };
const writeJ = (run, f, o) => { fs.mkdirSync(runDir(run), { recursive: true }); fs.writeFileSync(path.join(runDir(run), f), JSON.stringify(o, null, 1)); };
const delJ = (run, f) => { try { fs.unlinkSync(path.join(runDir(run), f)); } catch (e) { /* gone */ } };
const journal = (run, line) => { fs.mkdirSync(runDir(run), { recursive: true }); fs.appendFileSync(path.join(runDir(run), 'commands.log'), `${new Date().toISOString()}\t${line}\n`); };

// ---------------------------------------------------------------- text helpers
const out = []; const say = (...a) => out.push(a.join(' '));
const kwNames = d => (d.kw || []).map(k => (KEYWORDS[k] ? KEYWORDS[k].name : k));
function cardText(id, costNow) {
  const d = D(id);
  const cost = costNow != null && costNow !== d.cost ? `${costNow} (base ${d.cost})` : d.cost;
  const stats = d.type === 'unit' ? ` ${d.atk}/${d.hp}` : d.type === 'gear' ? ` ${d.atk}/${d.hp}` : '';
  const txt = (d.text || '').replace(/<[^>]+>/g, '').replace(/\*\*/g, ''); const kws = kwNames(d).filter(k => !txt.includes(k));
  return `${d.name} [${cost} Energy, ${d.rarity} ${d.type}${stats}]${kws.length ? ' ' + kws.join(', ') + '.' : ''}${txt ? ' ' + txt : ''}`;
}
function cardFull(id) {
  const d = D(id);
  const lines = [cardText(id), `  id: ${id} · faction: ${d.faction}${d.strat ? ' · strategy: ' + d.strat : ''}`];
  (d.kw || []).forEach(k => KEYWORDS[k] && lines.push(`  ${KEYWORDS[k].name}: ${KEYWORDS[k].text}`));
  if (d.flavor) lines.push(`  "${d.flavor.replace(/^"|"$/g, '')}"`);
  return lines.join('\n');
}
const findCard = q => { q = String(q).toLowerCase(); return CARDS[q] ? q : Object.keys(CARDS).find(k => CARDS[k].name.toLowerCase() === q) || Object.keys(CARDS).find(k => CARDS[k].name.toLowerCase().includes(q)); };
const deckCounts = deck => deck.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});

// ---------------------------------------------------------------- campaign
function loadSave(run) { const s = readJ(run, 'save.json'); if (!s) throw new Error(`No run "${run}". Start one with: new`); return s; }
function status(save) {
  const size = fn('deckSizeFor')(save), econ = fn('economyOpen')(save);
  say(`== ${save.name} · difficulty ${DIFFICULTY[save.diff].name} · ${save.stats.wins} wins, ${save.stats.losses} losses`);
  if (econ) say(`Credits ${save.credits} · Scrap ${save.scrap} · Alloy ${fn('ensureStation')(save).alloy} · unopened packs: ${Object.entries(save.packs).filter(([, n]) => n).map(([t, n]) => `${n} × ${PACK_SETS[t - 1].name} (tier ${t})`).join(', ') || 'none'}`);
  else say('Supply Depot and Anchorage are locked until you graduate the Academy (mission 1-6).');
  say(`Deck: ${save.deck.length}/${size} cards${save.deck.length !== size ? '  << the deck must have exactly ' + size + ' to launch (use: deck autofill, or deck add/remove)' : ''}`);
  say(`Commander power: ${save.power ? HEROPOWERS[save.power].name + ' — ' + HEROPOWERS[save.power].text : 'none yet'}${save.powers.length > 1 ? ' (others owned: ' + save.powers.filter(p => p !== save.power).map(p => HEROPOWERS[p].name).join(', ') + ')' : ''}`);
  say(`Collection: ${Object.values(save.coll).reduce((a, b) => a + b, 0)} cards, ${Object.keys(save.coll).length} different`);
  if (save.pendingCrate) say(`!! A supply crate is waiting: choose one with "crate <card>": ${save.pendingCrate.map(id => D(id).name + ' (' + id + ')').join(' | ')}`);
  say('');
  say('STAR MAP (missions you can launch):');
  ENCOUNTERS.forEach(e => {
    if (!fn('encUnlocked')(save, e)) return;
    const tag = e.boss ? 'BOSS' : e.elite ? 'ELITE (optional)' : 'mission';
    say(`  ${e.id.padEnd(5)} ${SECTORS[e.sector].name} · ${e.name} · ${tag}${save.cleared[e.id] ? ' · cleared (replay)' : ' · NEW'}`);
  });
  const nx = fn('nextEncounter')(save); if (nx) say(`Next story mission: ${nx.id} ${nx.name}`);
}
function brief(save, enc) {
  const e = enc.enemy, diff = DIFFICULTY[save.diff], hp = Math.round(e.hp * diff.hp);
  say(`== ${SECTORS[enc.sector].name} · ${enc.boss ? 'Boss' : enc.elite ? 'Elite (optional)' : 'Mission ' + enc.id}: ${enc.name}`);
  say(`Enemy commander: ${e.name} · ${hp} Health${e.phases ? ` · ${e.phases.length + 1} phases` : ''}`);
  if (e.power) say(`  Power: ${HEROPOWERS[e.power].name}: ${HEROPOWERS[e.power].text}`);
  (e.passives || []).forEach(id => say(`  ${PASSIVES[id].name}: ${PASSIVES[id].text}`));
  const p = fn('personaOf')(enc); say(`  Tactics: ${p.name}. ${p.text}`);
  if (e.startTraps) say(`  Starts with ${e.startTraps.length} Trap(s) armed.`);
  say('');
  say(enc.story);
  const teach = [...(enc.teaches || []), ...(enc.teachesAlso || [])].filter(k => !save.codex.includes(k) && KEYWORDS[k]);
  teach.forEach(k => say(`NEW: ${KEYWORDS[k].name}: ${KEYWORDS[k].text}`));
  (enc.previews || []).filter(k => !save.codex.includes(k) && !teach.includes(k) && KEYWORDS[k]).forEach(k => say(`IN YOUR REWARDS: ${KEYWORDS[k].name}: ${KEYWORDS[k].text}`));
  const reward = save.cleared[enc.id] ? 'replay reward' : [fn('describeEncReward')(enc, save), enc.unlockPowers ? 'a new commander power' : '', enc.grant ? (enc.elite ? Object.keys(enc.grant).map(id => D(id).name).join(' + ') : 'a supply crate of new cards') : ''].filter(Boolean).join(' + ');
  say(`Reward: ${(reward || 'Training credit').replace(/<[^>]+>/g, '')}`);
  say(enc.fixedDeck ? 'This simulation uses a standard training deck.' : `Your deck: ${save.deck.length}/${fn('deckSizeFor')(save)} cards.`);
}
function cutscene(cid) {
  const c = CINEMATICS[cid]; if (!c) return say(`No cutscene "${cid}". Known: ${Object.keys(CINEMATICS).join(', ')}`);
  say(`== CUTSCENE: ${c.title} (${c.kicker}) — what you see and hear, in order. Voiced; subtitles on.`);
  c.shots.forEach(sh => {
    const vis = sh.type === 'title' ? `[title card: ${sh.title || c.title}]` : sh.clip ? `[animated scene${sh.title ? ': ' + sh.title : ''}]` : sh.type === 'transmission' ? `[incoming transmission: ${CAST[(sh.lines || [])[0] && sh.lines[0].who] ? CAST[sh.lines[0].who].name : ''}]`
      : sh.type === 'log' ? `[on-screen record: ${sh.log.header}]\n    ${sh.log.body.replace(/\n/g, '\n    ')}` : sh.type === 'card' ? `[card art: ${D(sh.card).name}]` : `[${sh.type} shot]`;
    say(vis);
    (sh.lines || []).forEach(l => say(`  ${(CAST[l.who] || {}).name || l.who}: ${l.text}`));
  });
}

// ---------------------------------------------------------------- battle (rebuilt from seed + actions)
function names(s) { const m = {}; s.players.forEach(p => { m[p.uid] = p.i === 0 ? 'your commander' : p.name; p.board.forEach(x => m[x.uid] = (p.i === 0 ? 'your ' : 'enemy ') + D(x.id).name); }); return m; }
function refOf(s, uid) {
  if (uid === 'H1') return 'E0'; if (uid === 'H0') return 'A0';
  for (const pi of [0, 1]) { const k = s.players[pi].board.findIndex(m => m.uid === uid); if (k >= 0) return (pi ? 'E' : 'A') + (k + 1); }
  return '?';
}
function uidOf(s, ref) {
  ref = String(ref).toUpperCase();
  if (ref === 'E0' || ref === 'EH' || ref === 'ENEMY' || ref === 'H') return 'H1';
  if (ref === 'A0' || ref === 'ME' || ref === 'AH' || ref === 'SELF') return 'H0';
  const tag = /^#(\d+)$/.exec(ref);   // stable unit tag: never changes when other units die
  if (tag) { for (const p of s.players) { const u = p.board.find(x => String(x.uid) === tag[1] && fn('alive')(x)); if (u) return u.uid; } return null; }
  const m = /^([EA])(\d+)$/.exec(ref); if (!m) return null;
  const b = s.players[m[1] === 'E' ? 1 : 0].board[+m[2] - 1]; return b ? b.uid : null;
}
function describe(s, evs, nm) {
  const who = pi => (pi === 0 ? 'You' : s.players[1].name);
  const lines = [];
  evs.forEach(e => { if (e.t === 'summon' && nm[e.uid] == null) nm[e.uid] = (e.pi === 0 ? 'your ' : 'enemy ') + D(e.id).name; });
  for (const e of evs) {
    const n = u => nm[u] || '?';
    switch (e.t) {
      case 'play': lines.push(e.pi === 1 && D(e.id).type === 'trap' ? `${who(e.pi)} armed a hidden Trap.` : `${who(e.pi)} played ${D(e.id).name}${e.tgt != null && nm[e.tgt] ? ' on ' + nm[e.tgt] : ''}.`); break;
      case 'power': { const p = s.players[e.pi].power; lines.push(`${who(e.pi)} used ${p ? HEROPOWERS[p.id].name : 'their power'}.`); break; }
      case 'attack': lines.push(`${n(e.from)} attacked ${n(e.to)}.`); break;
      case 'dmg': lines.push(`  ${n(e.uid)} took ${e.n} damage.`); break;
      case 'heal': lines.push(`  ${n(e.uid)} healed ${e.n}.`); break;
      case 'death': lines.push(`  ${n(e.uid)} was destroyed.`); break;
      case 'trap': lines.push(`${e.pi === 0 ? 'Your' : 'Enemy'} Trap fired: ${D(e.id).name}.`); break;
      case 'countered': lines.push('  The spell was cancelled by a Trap.'); break;
      case 'burn': lines.push(`${who(e.pi)} had a full hand and lost ${D(e.id).name}.`); break;
      case 'fatigue': lines.push(`${who(e.pi)} ran out of cards: ${e.n} fatigue damage.`); break;
      case 'steal': lines.push(`  ${n(e.uid)} changed sides.`); break;
      case 'phase': lines.push(`!! ${e.name} rises! ${e.text || ''}`); break;
      case 'equip': lines.push(`${who(e.pi)} equipped ${D(e.id).name}.`); break;
      case 'freeze': lines.push(`  ${n(e.uid)} was frozen.`); break;
      case 'silence': lines.push(`  ${n(e.uid)} was silenced.`); break;
      case 'transform': lines.push(`  ${n(e.uid)} was transformed.`); break;
      case 'bounce': lines.push(`  ${n(e.uid)} returned to hand.`); break;
      case 'summon': if (!evs.some(x => x.t === 'play' && x === e)) { /* summoned by an effect */ } break;
    }
  }
  return lines;
}
function newBattle(save, enc, opts) {
  const sd = Math.floor(Math.random() * 2 ** 31);
  const snap = JSON.parse(JSON.stringify(save));
  if (opts.easy) snap.diff = 'cadet';
  return { enc: enc.id, seed: sd, snap, actions: [], mull: enc.noMulligan ? [] : null, playerTurns: 0, easy: !!opts.easy };
}
// Rebuild the battle; returns { s, log } where log holds the event text of the LAST step only.
function rebuild(b) {
  seed(b.seed);
  const enc = ENC(b.enc);
  const s = fn('newGame')(fn('buildBattle')(b.snap, enc));
  fn('aiMulligan')(s, 1);
  let nm = names(s), log = [], turns = 0;
  const enemyTurn = () => {
    for (let n = 0; n < 45 && !s.over; n++) { const a = fn('aiChoose')(s, 1, s.players[1].ai); if (!a) break; nm = Object.assign(names(s), nm); fn('applyAct')(s, 1, a); }
    if (!s.over) fn('endTurn')(s);
  };
  if (b.mull === null) return { s, log, phase: 'mulligan', turns };
  fn('mulligan')(s, 0, b.mull);
  fn('beginPlay')(s); s.events = [];
  if (s.active === 1) { enemyTurn(); }
  turns = 1; log = describe(s, s.events, Object.assign(nm, names(s))); s.events = [];
  for (const a of b.actions) {
    nm = names(s); s.events = [];
    if (a.k === 'end') { fn('endTurn')(s); nm = Object.assign(names(s), nm); if (!s.over) enemyTurn(); turns++; }
    else if (a.k === 'concede') { s.over = true; s.winner = 1; }
    else if (a.k === 'choose') fn('resolveChoice')(s, a.i);
    else if (a.k === 'play') fn('playCard')(s, 0, a.hi, a.t);
    else if (a.k === 'pow') fn('usePower')(s, 0, a.t);
    else fn('attack')(s, a.a, a.t);
    log = describe(s, s.events, Object.assign(names(s), nm));
  }
  return { s, log, phase: s.over ? 'over' : 'play', turns };
}
function board(s, enc, b, turns) {
  const P = s.players[0], E = s.players[1];
  const st = m => {
    const f = [];
    Object.keys(m.kw || {}).forEach(k => m.kw[k] && f.push(KEYWORDS[k] ? KEYWORDS[k].name : k));
    if (m.frozen) f.push('Frozen'); if (m.sick && !m.kw.warp && !m.kw.blitz && m.owner === 0) f.push('Standby (just arrived)');
    if (m.owner === 0 && fn('canAttack')(s, 0, m.uid)) f.push('CAN ATTACK');
    return f.length ? ' [' + f.join(', ') + ']' : '';
  };
  const unit = (m, ref) => `  ${ref} #${m.uid} ${D(m.id).name} ${fn('atkOf')(s, m)}/${m.hp}${m.hp < m.maxHp ? ' (max ' + m.maxHp + ')' : ''}${st(m)}`;
  say(`== TURN ${Math.max(1, Math.ceil(s.turnNo / 2))} · ${s.over ? 'battle over' : s.active === 0 ? 'YOUR TURN' : 'enemy turn'} · Energy ${P.mana}/${P.maxMana}${P.locked ? ' (' + P.locked + ' locked by Overheat)' : ''} · your deck ${P.deck.length}`);
  const ep = E.power ? `${HEROPOWERS[E.power.id].name}` : 'none';
  say(`ENEMY E0: ${E.name} · Health ${E.hp}/${E.maxHp}${E.armor ? ' + ' + E.armor + ' armor' : ''} · hand ${E.hand.length} · deck ${E.deck.length} · power ${ep}${E.weapon ? ' · gear ' + D(E.weapon.id).name + ' ' + E.weapon.atk + '/' + E.weapon.dur : ''}${E.traps.length ? ' · ' + E.traps.length + ' hidden Trap(s)' : ''}${E.phases && E.phases.length ? ' · ' + E.phases.length + ' more phase(s)' : ''}`);
  E.board.forEach((m, i) => say(unit(m, 'E' + (i + 1))));
  if (!E.board.length) say('  (no enemy units)');
  const pw = P.power ? `${HEROPOWERS[P.power.id].name} (${HEROPOWERS[P.power.id].cost}): ${HEROPOWERS[P.power.id].text}${P.power.used ? ' [used this turn]' : fn('canPower')(s, 0) ? ' [ready]' : ''}` : 'none';
  say(`YOU A0: Health ${P.hp}/${P.maxHp}${P.armor ? ' + ' + P.armor + ' armor' : ''}${P.weapon ? ' · gear ' + D(P.weapon.id).name + ' ' + P.weapon.atk + '/' + P.weapon.dur : ''}${fn('canAttack')(s, 0, 'H0') ? ' [CAN ATTACK]' : ''} · power ${pw}${P.traps.length ? ' · your Traps: ' + P.traps.map(t => D(t.id).name).join(', ') : ''}`);
  P.board.forEach((m, i) => say(unit(m, 'A' + (i + 1))));
  if (!P.board.length) say('  (no units of yours)');
  say('YOUR HAND:');
  P.hand.forEach((c, i) => {
    const ok = !s.over && s.active === 0 && fn('canPlay')(s, 0, i);
    const tg = ok ? fn('cardTargets')(s, 0, c).map(u => refOf(s, u)) : [];
    say(`  ${i + 1}. ${cardText(c.id, fn('costOf')(s, 0, c))}${ok ? ' <playable' + (tg.length ? ', targets: ' + tg.join(' ') : '') + '>' : ''}`);
  });
  if (!P.hand.length) say('  (empty)');
  if (s.choice && s.choice.pi === 0) say(`CHOOSE A CARD (command: choose <n>): ${s.choice.opts.map((id, i) => `${i + 1}. ${cardText(id)}`).join(' | ')}`);
  const tips = enc.tips || [];
  if (tips.length && !s.over) { s._adv = b.adv || (b.adv = { shown: [], at: {} }); const t = fn('advisorTip')(s, enc, Math.max(1, turns)); if (t) say(`Tactical Advisor: ${t.replace(/<[^>]+>/g, '')}`); }
}

// ---------------------------------------------------------------- end of battle: same rules as endBattle() in js/ui.js
function finish(run, save, b, s) {
  const enc = ENC(b.enc), won = s.winner === 0;
  delJ(run, 'battle.json');
  const res = readJ(run, 'results.json') || [];
  res.push({ m: enc.id, r: won ? 'win' : 'loss', turns: Math.ceil(s.turnNo / 2), hp: [s.players[0].hp, s.players[1].hp], easy: b.easy, at: new Date().toISOString() });
  writeJ(run, 'results.json', res);
  save.streak = won ? null : { id: enc.id, n: save.streak && save.streak.id === enc.id ? save.streak.n + 1 : 1 };
  if (!won) {
    save.stats.losses++;
    say(`== DEFEAT: ${enc.name}`);
    say('Your forces pull back to regroup. Adjust your deck in the Hangar and try again.');
    const hurt = Object.entries(s.hurt || {}).sort((x, y) => y[1] - x[1]).slice(0, 3);
    if (hurt.length) say('What hurt you most: ' + hurt.map(([k, n]) => `${k} ${n} damage`).join(' · '));
    { const adv = fn('defeatAdvice')(s, enc, save); if (adv) say(`Advisor: ${adv.replace(/<[^>]+>/g, '')}`); }
    if (save.streak.n >= (enc.boss ? 1 : 2) && save.diff !== 'cadet' && !b.easy) say(`${save.streak.n > 1 ? `That's ${save.streak.n} losses in a row here.` : 'Bosses are tough.'} You may retry this one battle on Cadet (weaker enemies): launch ${enc.id} --easy`);
    else if (save.diff !== 'cadet' && save.stats.losses >= 3) say('Struggling? You can switch to Cadet difficulty in Settings at any time (command: difficulty cadet).');
    return;
  }
  const firstClear = !save.cleared[enc.id], prevSector = fn('highestSector')(save), DECK_SIZES_PREV = fn('deckSizeFor')(save);
  save.cleared[enc.id] = true; save.stats.wins++;
  const rw = fn('battleRewards')(save, enc, firstClear);
  save.credits += rw.credits;
  if (rw.packs) save.packs[rw.packTier] = (save.packs[rw.packTier] || 0) + rw.packs;
  const graduated = enc.graduation && firstClear && !fn('economyOpen')(save);
  if (graduated) { ['packs', 'crafting', 'anchorage'].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); }); fn('refillContracts')(save); }
  if (rw.alloy) fn('ensureStation')(save).alloy += rw.alloy;
  if (rw.scrap) save.scrap += rw.scrap;
  if (rw.legendary) fn('gainCard')(save, rw.legendary);
  const crate = firstClear ? fn('crateChoice')(enc) : null, granted = [];
  if (firstClear && enc.grant && !crate) Object.entries(enc.grant).forEach(([id, n]) => { fn('grantCard')(save, id, n); for (let k = 0; k < n; k++) granted.push(id); });
  const loaded = firstClear && enc.sector === 0 && !enc.elite && granted.length ? fn('academyLoad')(save, [...new Set(granted)]) : [];
  const unlocked = [];
  if (firstClear && enc.unlockPowers) enc.unlockPowers.forEach(p => { if (!save.powers.includes(p)) { save.powers.push(p); unlocked.push(p); } });
  if (!save.power && save.powers.length) save.power = save.powers[0];
  const newSector = fn('highestSector')(save) > prevSector;
  if (newSector) fn('refillContracts')(save);
  say(`== VICTORY: ${enc.name}`);
  if (enc.victory && firstClear) say(enc.victory);
  if (rw.credits) say(`+${rw.credits} Credits (${graduated ? 'graduation bonus' : firstClear ? 'mission reward' : 'replay reward'})`);
  if (rw.packs) say(`+${rw.packs} ${PACK_SETS[rw.packTier - 1].name}${rw.packs > 1 ? 's' : ''}`);
  if (rw.alloy) say(`+${rw.alloy} Alloy for Anchorage`);
  if (rw.scrap) say(`+${rw.scrap} Scrap`);
  if (rw.legendary) say(`Legendary acquired: ${cardText(rw.legendary)}`);
  if (granted.length) say(`New cards: ${Object.entries(deckCounts(granted)).map(([id, n]) => D(id).name + (n > 1 ? ' ×' + n : '')).join(', ')}. ${loaded.length ? `HALCYON has loaded them into your deck for the next lesson${loaded.removed.length ? ', swapping out ' + loaded.removed.map(id => D(id).name).join(', ') : ''}. Change it any time in the Hangar.` : "They're in your collection; add them to a deck in the Hangar."}`);
  if (crate) { save.pendingCrate = crate; say(`SUPPLY CRATE: choose one card to keep (command: crate <card>). The others go back:`); crate.forEach(id => say(`  ${id}: ${cardText(id)}${fn('crateCopies')(id) > 1 ? ' (×' + fn('crateCopies')(id) + ')' : ''} · ${save.coll[id] ? 'you have ' + save.coll[id] : 'new'}`)); }
  unlocked.forEach(p => say(`New commander power: ${HEROPOWERS[p].name}: ${HEROPOWERS[p].text} (equip with: power set ${p})`));
  if (newSector && fn('deckSizeFor')(save) > DECK_SIZES_PREV) say(`Deck size increased to ${fn('deckSizeFor')(save)}. Add ${Math.max(0, fn('deckSizeFor')(save) - save.deck.length)} cards before your next battle. A new pack set is at the Supply Depot.`);
  if (graduated) say('Training complete. Three things are now open: Supply Depot (spend Credits on packs of new cards); Crafting (spare copies become Scrap; spend Scrap in the Hangar on the cards you want); Anchorage (your forward base; spend Alloy there on upgrades). Each is explained in the Archive (command: codex). Battles and contracts earn Credits and Alloy from now on.');
  if (fn('economyOpen')(save)) say(`Wallet: ${save.credits} Credits · ${save.scrap} Scrap · ${fn('ensureStation')(save).alloy} Alloy · unopened packs: ${Object.values(save.packs).reduce((a, c) => a + c, 0)}`);
  if (CINE_AFTER[enc.id] && firstClear) say(`A cutscene plays now. Watch it with: cutscene ${CINE_AFTER[enc.id]}`);
}

// ---------------------------------------------------------------- commands
const HELP = `Starfall playtest harness. Usage: node tools/playtest-agents/play.js <run> <command> [args]
Campaign:  new [--diff cadet|officer|admiral] [--name N] [--from <sector 2-6>]   status   brief <mission>   cutscene <id>
           deck   deck add <card> | deck remove <card> | deck autofill | deck clear   card <card>   codex
           power list | power set <id>   difficulty <cadet|officer|admiral>
           packs   buy <tier>   open <tier>   crate <card>   collection [filter]
Battle:    launch <mission> [--easy]   mulligan <n...> | keep   look
           play <handNo|"card name"> [target]   attack <attacker> <target>   power [target]   choose <n>   end   concede
Targets:   E0 = enemy commander, E1..E7 = enemy units left to right; A0 = you, A1..A7 = your units.
           Each unit also has a fixed tag like #34 that never changes: use it when chaining several commands.`;

function main(argv) {
  const [run, cmd, ...args] = argv;
  if (!run || run === 'help' || !cmd || cmd === 'help') { say(HELP); return; }
  journal(run, [cmd, ...args].join(' '));
  if (cmd === 'new') {
    const diff = args.includes('--diff') ? args[args.indexOf('--diff') + 1] : 'officer';
    const name = args.includes('--name') ? args[args.indexOf('--name') + 1] : 'Commander';
    const save = fn('newSave')(name, diff); delJ(run, 'battle.json'); writeJ(run, 'results.json', []);
    const from = args.includes('--from') ? +args[args.indexOf('--from') + 1] : 1;
    if (from > 1) {
      // Start at a later sector with a typical save: every earlier mission (and optional mission) cleared
      // with its normal rewards, packs opened as they arrive and bought when affordable, crates picked,
      // and the deck rebuilt from what you own. Cutscenes for skipped sectors are listed, not shown.
      seed(Date.now() & 0x7fffffff);
      for (const enc of ENCOUNTERS.filter(e => e.sector < from - 1)) {
        save.cleared[enc.id] = true; save.stats.wins++;
        const rw = fn('battleRewards')(save, enc, true);
        save.credits += rw.credits; if (rw.packs) save.packs[rw.packTier] = (save.packs[rw.packTier] || 0) + rw.packs;
        if (enc.graduation) ['packs', 'crafting', 'anchorage'].forEach(k => save.codex.includes(k) || save.codex.push(k));
        if (rw.alloy) fn('ensureStation')(save).alloy += rw.alloy;
        if (rw.legendary) fn('gainCard')(save, rw.legendary);
        const crate = fn('crateChoice')(enc);
        if (crate) fn('grantCard')(save, crate[0], fn('crateCopies')(crate[0])); else if (enc.grant) Object.entries(enc.grant).forEach(([id, n]) => fn('grantCard')(save, id, n));
        if (enc.unlockPowers) enc.unlockPowers.forEach(pw => save.powers.includes(pw) || save.powers.push(pw));
        [...(enc.teaches || []), ...(enc.teachesAlso || []), ...(enc.previews || [])].forEach(k => save.codex.includes(k) || save.codex.push(k));
        if (fn('economyOpen')(save)) {
          const tier = Math.min(fn('highestSector')(save) + 1, PACK_SETS.length);
          while (save.credits >= ECON.packPrice) { save.credits -= ECON.packPrice; save.packs[tier] = (save.packs[tier] || 0) + 1; }
          Object.keys(save.packs).forEach(t => { while (save.packs[t] > 0) { save.packs[t]--; fn('openPack')(save, +t); } });
        }
      }
      if (!save.power && save.powers.length) save.power = save.powers[0];
      save.deck = []; fn('autoFillDeck')(save, fn('deckSizeFor')(save));
      say(`Started at Sector ${from} with a typical save: Sectors 1 to ${from - 1} cleared (including optional missions), rewards collected, deck auto-built from your collection (${save.deck.length} cards). Review it with: deck / collection.`);
      say(`Story so far (cutscenes you would have seen): ${Object.entries(CINE_AFTER).filter(([id]) => save.cleared[id]).map(([, c]) => c).join(', ')}. Read any with: cutscene <id>`);
    }
    writeJ(run, 'save.json', save);
    say(`New campaign "${run}" on ${DIFFICULTY[diff].name}: ${DIFFICULTY[diff].text}`);
    say('The game opens with this cutscene:'); cutscene('opening'); say(''); status(save);
    return;
  }
  const save = loadSave(run);
  const b = readJ(run, 'battle.json');
  const persist = () => { save.updated = Date.now(); writeJ(run, 'save.json', save); };
  const battleCmds = ['mulligan', 'keep', 'look', 'play', 'attack', 'power', 'choose', 'end', 'concede'];
  if (battleCmds.includes(cmd) && !(cmd === 'power' && ['list', 'set'].includes(args[0]))) {
    if (!b) return say('No battle in progress. Use: launch <mission>');
    const enc = ENC(b.enc);
    if (cmd === 'mulligan' || cmd === 'keep') {
      if (b.mull !== null) return say('The opening hand is already decided.');
      b.mull = cmd === 'keep' ? [] : args.map(n => +n - 1).filter(n => n >= 0);
      writeJ(run, 'battle.json', b);
      const r = rebuild(b); if (r.log.length) { say('Before your first turn:'); r.log.forEach(l => say(l)); }
      if (r.s.over) { finish(run, save, b, r.s); return persist(); }
      board(r.s, enc, b, r.turns); return writeJ(run, 'battle.json', b);
    }
    let r = rebuild(b);
    if (r.phase === 'mulligan') {
      const P = r.s.players[0];
      say(`OPENING HAND (${r.s.first === 0 ? 'you go first' : 'you go second: +1 card and an Energy Cell'}). Swap cards with "mulligan <n...>" or "keep".`);
      P.hand.forEach((c, i) => say(`  ${i + 1}. ${cardText(c.id)}`));
      return;
    }
    if (cmd === 'look') { board(r.s, enc, b, r.turns); return writeJ(run, 'battle.json', b); }
    const s = r.s; let a = null;
    if (cmd === 'end') a = { k: 'end' };
    else if (cmd === 'concede') a = { k: 'concede' };
    else if (cmd === 'choose') { if (!s.choice) return say('There is no choice to make.'); const i = +args[0] - 1; if (!(i >= 0 && i < s.choice.opts.length)) return say('Pick one of the listed numbers.'); a = { k: 'choose', i }; }
    else if (s.choice) return say('First choose a card: choose <n>.');
    else if (cmd === 'play') {
      let hi = +args[0] - 1;
      if (isNaN(hi)) { const q = String(args[0]).toLowerCase(); hi = s.players[0].hand.findIndex(x => D(x.id).name.toLowerCase() === q || x.id === q); if (hi < 0) hi = s.players[0].hand.findIndex(x => D(x.id).name.toLowerCase().includes(q)); }
      const c = s.players[0].hand[hi];
      if (!c) return say(`No card ${args[0]} in your hand.`);
      if (!fn('canPlay')(s, 0, hi)) return say(`Can't play ${D(c.id).name}: ${fn('whyCantPlay')(s, 0, hi)}`);
      const tg = fn('cardTargets')(s, 0, c); let t;
      if (tg.length) { t = args[1] ? uidOf(s, args[1]) : null; if (!t && !D(c.id).targetOptional) return say(`${D(c.id).name} needs a target: ${tg.map(u => refOf(s, u)).join(' ')}`); if (t && !tg.includes(t)) return say(`Not a valid target. Valid: ${tg.map(u => refOf(s, u)).join(' ')}`); }
      a = { k: 'play', hi, t };
    } else if (cmd === 'attack') {
      const at = uidOf(s, args[0]), t = uidOf(s, args[1]);
      if (!at || !t) return say('Usage: attack <attacker> <target>, e.g. attack A1 E2 (A0 = your commander, E0 = enemy commander).');
      if (!fn('canAttack')(s, 0, at)) { const m = fn('getChar')(s, at); return say(`${at === 'H0' ? 'Your commander' : D(m.id).name} can't attack now${m && m.sick ? ' (units can attack the turn after they arrive, unless they have Warp or Blitz)' : m && m.frozen ? ' (frozen)' : m && m.attacks ? ' (already attacked)' : ''}.`); }
      const ok = fn('attackTargets')(s, at); if (!ok.includes(t)) return say(`Can't attack that. Valid targets: ${ok.map(u => refOf(s, u)).join(' ')}${s.players[1].board.some(m => m.kw.guardian) ? ' (a Guardian must be attacked first)' : ''}`);
      a = { k: 'atk', a: at, t };
    } else if (cmd === 'power') {
      if (!fn('canPower')(s, 0)) return say("Can't use your power now (once per turn, needs Energy).");
      const tg = fn('powerTargets')(s, 0); let t;
      if (tg.length) { t = args[0] ? uidOf(s, args[0]) : null; if (!t || !tg.includes(t)) return say(`Your power needs a target: ${tg.map(u => refOf(s, u)).join(' ')}`); }
      a = { k: 'pow', t };
    }
    b.actions.push(a); writeJ(run, 'battle.json', b);
    r = rebuild(b);
    if (a.k === 'end') { say('You end your turn. ENEMY TURN:'); r.log.forEach(l => say('  ' + l)); if (!r.s.over) say('YOUR TURN.'); }
    else r.log.forEach(l => say(l));
    if (r.s.over) { say(''); finish(run, save, b, r.s); return persist(); }
    say(''); board(r.s, enc, b, r.turns); return writeJ(run, 'battle.json', b);
  }
  if (b && ['launch', 'deck', 'buy', 'open', 'crate', 'difficulty'].includes(cmd) && !(cmd === 'deck' && !args.length)) return say('A battle is in progress. Finish it (or concede) first. Use: look');
  switch (cmd) {
    case 'status': status(save); if (b) say(`\nBattle in progress: ${b.enc} (use: look)`); break;
    case 'brief': { const enc = ENC(args[0]); if (!enc) return say('Unknown mission.'); brief(save, enc); break; }
    case 'cutscene': cutscene(args[0]); break;
    case 'card': { const id = findCard(args.join(' ')); if (!id) return say('No such card.'); say(cardFull(id)); say(`  You own ${save.coll[id] || 0}${save.deck.includes(id) ? ', ' + save.deck.filter(x => x === id).length + ' in your deck' : ''}.`); break; }
    case 'codex': save.codex.filter(k => KEYWORDS[k]).forEach(k => say(`${KEYWORDS[k].name}: ${KEYWORDS[k].text}`)); break;
    case 'collection': {
      const f = (args[0] || '').toLowerCase();
      Object.entries(save.coll).filter(([id]) => !f || (D(id).name + ' ' + D(id).type + ' ' + (D(id).kw || []).join(' ')).toLowerCase().includes(f))
        .sort((x, y) => D(x[0]).cost - D(y[0]).cost).forEach(([id, n]) => say(`${n}× ${id}: ${cardText(id)}${save.deck.includes(id) ? ` (${save.deck.filter(x => x === id).length} in deck)` : ''}`));
      break;
    }
    case 'deck': {
      const size = fn('deckSizeFor')(save);
      if (args[0] === 'add' || args[0] === 'remove') {
        const id = findCard(args.slice(1).join(' ')); if (!id) return say('No such card.');
        if (args[0] === 'add') { const have = save.coll[id] || 0, used = save.deck.filter(x => x === id).length; if (used >= have) return say(`You only own ${have} ${D(id).name}.`); if (save.deck.length >= size) return say(`The deck is full (${size}). Remove a card first.`); save.deck.push(id); }
        else { const k = save.deck.indexOf(id); if (k < 0) return say(`${D(id).name} is not in your deck.`); save.deck.splice(k, 1); }
        save.deckEdited = true; persist(); say(`${args[0] === 'add' ? 'Added' : 'Removed'} ${D(id).name}. Deck: ${save.deck.length}/${size}.`); break;
      }
      if (args[0] === 'autofill') { fn('autoFillDeck')(save, size); persist(); say(`Filled empty slots. Deck: ${save.deck.length}/${size}.`); }
      if (args[0] === 'clear') { save.deck = []; persist(); say(`Deck cleared. 0/${size}.`); break; }
      say(`DECK ${save.deck.length}/${size}:`);
      Object.entries(deckCounts(save.deck)).sort((x, y) => D(x[0]).cost - D(y[0]).cost).forEach(([id, n]) => say(`  ${n}× ${id}: ${cardText(id)}`));
      break;
    }
    case 'power': {
      if (args[0] === 'set') { if (!save.powers.includes(args[1])) return say('You do not have that power.'); save.power = args[1]; persist(); say(`Equipped ${HEROPOWERS[args[1]].name}.`); break; }
      save.powers.forEach(p => say(`${p}: ${HEROPOWERS[p].name} (${HEROPOWERS[p].cost}): ${HEROPOWERS[p].text}${p === save.power ? ' [equipped]' : ''}`)); break;
    }
    case 'difficulty': { if (!DIFFICULTY[args[0]]) return say('cadet, officer or admiral'); save.diff = args[0]; persist(); say(`Difficulty: ${DIFFICULTY[args[0]].name}: ${DIFFICULTY[args[0]].text}`); break; }
    case 'packs': {
      if (!fn('economyOpen')(save)) return say('The Supply Depot unlocks after you graduate the Academy.');
      say(`Supply Depot · Credits ${save.credits} · a pack costs ${ECON.packPrice} Credits (${ECON.packSize} cards)`);
      PACK_SETS.forEach((p, i) => { if (fn('setUnlocked')(save, i + 1)) say(`  tier ${i + 1}: ${p.name}${save.packs[i + 1] ? ' · you have ' + save.packs[i + 1] + ' unopened' : ''}`); });
      break;
    }
    case 'buy': { const t = +args[0]; if (!fn('economyOpen')(save) || !fn('setUnlocked')(save, t)) return say('That pack is not available.'); if (save.credits < ECON.packPrice) return say(`Not enough Credits (${save.credits}/${ECON.packPrice}).`); save.credits -= ECON.packPrice; save.packs[t] = (save.packs[t] || 0) + 1; persist(); say(`Bought a ${PACK_SETS[t - 1].name}. Credits left: ${save.credits}.`); break; }
    case 'open': {
      const t = +args[0]; if (!save.packs[t]) return say('No unopened pack of that tier.');
      seed(Math.floor(Math.random() * 2 ** 31) ^ Date.now());
      save.packs[t]--; const got = fn('openPack')(save, t); persist();
      say(`You tear open the ${PACK_SETS[t - 1].name}:`);
      got.forEach(c => say(`  ${c.rarity.toUpperCase()}${c.isNew ? ' NEW' : ''}: ${cardText(c.id)}${c.scrap ? ' (duplicate beyond the limit: +' + c.scrap + ' Scrap)' : ''}`));
      break;
    }
    case 'crate': {
      if (!save.pendingCrate) return say('No crate to open.');
      const id = findCard(args.join(' ')); if (!id || !save.pendingCrate.includes(id)) return say(`Choose one of: ${save.pendingCrate.join(', ')}`);
      const n = fn('crateCopies')(id); fn('grantCard')(save, id, n); delete save.pendingCrate; persist();
      say(`You keep ${D(id).name}${n > 1 ? ' ×' + n : ''}. Add it to your deck with: deck add ${id}`); break;
    }
    case 'launch': {
      const enc = ENC(args[0]); if (!enc) return say('Unknown mission.');
      if (!fn('encUnlocked')(save, enc)) return say('That mission is not unlocked yet.');
      if (save.pendingCrate) return say('Open your supply crate first (crate <card>).');
      const size = fn('deckSizeFor')(save);
      if (!enc.fixedDeck && save.deck.length !== size) return say(`Your deck has ${save.deck.length}/${size} cards. It needs exactly ${size}.`);
      const easy = args.includes('--easy');
      if (easy && !(save.streak && save.streak.id === enc.id && save.streak.n >= (enc.boss ? 1 : 2))) return say('Retry on Cadet is offered after two losses in a row on the same mission (one, on a boss).');
      [...(enc.teaches || []), ...(enc.teachesAlso || []), ...(enc.previews || [])].forEach(k => { if (!save.codex.includes(k)) save.codex.push(k); });
      persist();
      const nb = newBattle(save, enc, { easy }); writeJ(run, 'battle.json', nb);
      say(`Launching ${enc.id}: ${enc.name}${easy ? ' (Cadet retry)' : ''}.`);
      const r = rebuild(nb), P = r.s.players[0];
      if (nb.mull !== null) { if (r.log.length) { say('Before your first turn:'); r.log.forEach(l => say(l)); } board(r.s, enc, nb, r.turns); return writeJ(run, 'battle.json', nb); }   // this mission skips the mulligan
      say(`OPENING HAND (${r.s.first === 0 ? 'you go first' : 'you go second: +1 card and an Energy Cell'}). Swap cards with "mulligan <n...>" or "keep".`);
      P.hand.forEach((c, i) => say(`  ${i + 1}. ${cardText(c.id)}`));
      break;
    }
    default: say(`Unknown command "${cmd}".\n` + HELP);
  }
}

process.stdout.on('error', e => { if (e.code === 'EPIPE') process.exit(0); });   // output piped into head/tail and closed early
try { main(process.argv.slice(2)); } catch (e) { out.push('ERROR: ' + (e && e.stack || e)); }
process.stdout.write(out.join('\n') + '\n');
