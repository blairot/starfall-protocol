'use strict';
// ============================================================================
// STARFALL PROTOCOL: route events (roadmap E).
// Stops on the sector map between missions: a salvage find, a distress call,
// a merchant. Each opens a short scene with a choice of routes. Pure data and
// rules (no DOM), so the game and the headless tools share them.
// save.events[id] = { done: true, pick } once chosen; merchants keep { offer }.
// ============================================================================

// after: the main mission that opens the stop. Choice kinds:
//   credits / alloy / scrap: gain that much   card: a random card from `set` you don't have two of
//   pack: a Supply Pack of `set`              shop: the merchant's three cards for Credits    leave: nothing
const EVENTS = [
  { id: 'ev-freighter', sector: 1, after: '2-2', kind: 'Salvage find', name: 'Drifting Freighter',
    text: 'A freighter is tumbling through the Belt with its engines dead and its hold sealed. Mox: "First come, first served out here. Pick what you want and leave before Vex\'s crews smell it."',
    choices: [{ label: 'Strip the hold for parts', kind: 'credits', n: 60 }, { label: 'Pull the armour plating for Anchorage', kind: 'alloy', n: 50 }, { label: 'Take the crated weapons', kind: 'card', set: 2 }] },
  { id: 'ev-blackmarket', sector: 1, after: '2-4', kind: 'Merchant', name: 'The Black Market',
    text: 'A smuggler\'s barge broadcasts a price list on an open channel. Sable: "Credits only, Commander. No questions, no refunds, and absolutely no Fleet paperwork."',
    choices: [{ label: 'Browse the stock', kind: 'shop', set: 2 }, { label: 'Fly on', kind: 'leave' }] },
  { id: 'ev-scout', sector: 2, after: '3-2', kind: 'Distress call', name: 'Pinned Down',
    text: 'A Fleet scout is pinned down in a spore field, surrounded by Swarm. Okonkwo: "We can pull them out, but it costs us a day. Your call, Commander."',
    choices: [{ label: 'Pull the scout out (they share their field notes: a Hive card)', kind: 'card', set: 3 }, { label: 'Hold course (strip the abandoned outpost instead)', kind: 'scrap', n: 60 }] },
  { id: 'ev-hivecache', sector: 2, after: '3-4', kind: 'Salvage find', name: 'Quarantine Cache',
    text: 'An old Fleet supply cache from the quarantine line, still sealed. Okonkwo: "I stocked that one myself, nine years ago. Take what you need."',
    choices: [{ label: 'Open the supply crates', kind: 'pack', set: 3 }, { label: 'Take the fuel cells for Anchorage', kind: 'alloy', n: 60 }] },
  { id: 'ev-foundry', sector: 3, after: '4-1', kind: 'Salvage find', name: 'Silent Foundry',
    text: 'A foundry on the outer ring has stopped mid-shift, its line still loaded. HALCYON: "The parts are good. The machines that made them are not. I would not stay long."',
    choices: [{ label: 'Take a finished unit off the line', kind: 'card', set: 4 }, { label: 'Melt down the stock for Scrap', kind: 'scrap', n: 80 }, { label: 'Ship the alloy home', kind: 'alloy', n: 60 }] },
  { id: 'ev-requisition', sector: 3, after: '4-3', kind: 'Merchant', name: 'Forge Requisitions',
    text: 'A requisition terminal still answers, and it still takes Fleet Credits. HALCYON: "It thinks we are a routine order. I see no reason to correct it."',
    choices: [{ label: 'Place an order', kind: 'shop', set: 4 }, { label: 'Leave it running', kind: 'leave' }] },
  { id: 'ev-oracle', sector: 4, after: '5-2', kind: 'Distress call', name: 'The Oracle\'s Price',
    text: 'A psionic oracle who has broken with Nyra asks for safe passage, and offers what she has in return. Okonkwo: "Could be a trap. Could be a friend. In the Void it\'s usually both."',
    choices: [{ label: 'Grant passage (she teaches you a Psionic card)', kind: 'card', set: 5 }, { label: 'Take her supplies and send her on', kind: 'credits', n: 80 }] },
  { id: 'ev-vault', sector: 4, after: '5-3', kind: 'Merchant', name: 'The Archive Vault',
    text: 'A keeper of the Psionic Archive will trade copies of its records for Credits. Archivist Prime: "Knowledge is free. Copying it is not."',
    choices: [{ label: 'Browse the records', kind: 'shop', set: 5 }, { label: 'Move on', kind: 'leave' }] },
  { id: 'ev-beacon', sector: 5, after: '6-1', kind: 'Salvage find', name: 'Lost Fleet Beacon',
    text: 'A Fleet distress beacon from the Starfall, seventy years old, still transmitting. Okonkwo: "Eleven hundred ships went down that night. This one left us something."',
    choices: [{ label: 'Recover the cargo', kind: 'pack', set: 6 }, { label: 'Recover the fuel', kind: 'credits', n: 120 }] },
];
const EVENT_PRICE = { common: 40, rare: 100, epic: 250, legendary: 600 };

function eventOpen(save, ev) { return !!save.cleared[ev.after]; }
function eventDone(save, ev) { return !!(save.events && save.events[ev.id] && save.events[ev.id].done); }
function eventsAvailable(save, sector) { return EVENTS.filter(ev => (sector == null || ev.sector === sector) && eventOpen(save, ev) && !eventDone(save, ev)); }
function eventState(save, ev) { save.events = save.events || {}; return save.events[ev.id] || (save.events[ev.id] = {}); }
// a random card from a set you don't have two of yet (or any card from it, if you do)
function eventCard(save, set) {
  const pool = setCards(set), fresh = pool.filter(d => (save.coll[d.id] || 0) < maxCopies(d) && d.rarity !== 'legendary');
  return pick(fresh.length ? fresh : pool).id;
}
// The merchant's three cards (fixed once you've seen them), one of them rare or better when the set has one.
function eventOffer(save, ev, set) {
  const st = eventState(save, ev); if (st.offer) return st.offer;
  const pool = setCards(set).filter(d => d.rarity !== 'legendary'), rare = pool.filter(d => d.rarity !== 'common'), common = pool.filter(d => d.rarity === 'common');
  const out = []; const take = arr => { const a = arr.filter(d => !out.includes(d.id)); if (a.length) out.push(pick(a).id); };
  if (rare.length) take(rare); while (out.length < 3 && out.length < pool.length) take(out.length < 2 ? common.length ? common : pool : pool);
  st.offer = out; return out;
}
// Resolve choice `k` (and, for a merchant, `buy` = the card id to buy). Returns { text, cards } for the result screen.
function resolveEvent(save, ev, k, buy) {
  const ch = ev.choices[k]; if (!ch || eventDone(save, ev)) return null;
  const st = eventState(save, ev), res = { text: '', cards: [] };
  if (ch.kind === 'credits') { save.credits += ch.n; res.text = `+${ch.n} Credits`; }
  else if (ch.kind === 'alloy') { ensureStation(save).alloy += ch.n; res.text = `+${ch.n} Alloy for Anchorage`; }
  else if (ch.kind === 'scrap') { save.scrap += ch.n; res.text = `+${ch.n} Scrap`; }
  else if (ch.kind === 'card') { const id = eventCard(save, ch.set); grantCard(save, id); res.cards.push(id); res.text = `New card: ${D(id).name}`; }
  else if (ch.kind === 'pack') { save.packs[ch.set] = (save.packs[ch.set] || 0) + 1; res.text = `+1 ${PACK_SETS[ch.set - 1].name}`; }
  else if (ch.kind === 'shop') {
    if (!buy) return null;
    const offer = eventOffer(save, ev, ch.set), price = EVENT_PRICE[D(buy).rarity];
    if (!offer.includes(buy) || save.credits < price) return null;
    save.credits -= price; grantCard(save, buy); res.cards.push(buy); res.text = `Bought ${D(buy).name} for ${price} Credits`;
  } else res.text = 'You move on.';
  st.done = true; st.pick = k;
  return res;
}
