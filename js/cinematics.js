'use strict';
// ============================================================================
// STARFALL PROTOCOL — cinematics: voiced cutscene scripts.
// CAST: every speaker (subtitle name, voice archetype, audio fx, portrait).
// CINEMATICS: opening (new campaign), s1-s5 (after each sector boss), finale.
// Pure data, no logic. Lines are written for text-to-speech: short sentences,
// numbers spelled out, no abbreviations, HALCYON written "Halcyon" when spoken.
// The Commander never speaks. Canon reference: docs/story-bible.md, js/lore.js.
// Voice and reveal schedule: docs/voice-and-tone.md.
// ============================================================================

const CAST = {
  narrator:  { name: 'Narrator',               voice: 'narrator-m',     fx: 'none',  portrait: null },
  halcyon:   { name: 'HALCYON',                voice: 'narrator-f',     fx: 'ai',    portrait: { enemy: 'HALCYON' } },
  okonkwo:   { name: 'Admiral Okonkwo',        voice: 'female-uk',      fx: 'radio', portrait: { card: 'okonkwo' } },
  vex:       { name: 'Captain Vex',            voice: 'female-us',      fx: 'radio', portrait: { enemy: 'Captain Vex' } },
  mox:       { name: 'Mad Mox',                voice: 'female-us-warm', fx: 'radio', portrait: { card: 'mox' } },
  ixis:      { name: 'Ixis, Brood Queen',      voice: 'female-us-warm', fx: 'alien', portrait: { enemy: 'Ixis, Brood Queen' } },
  calculus:  { name: 'Calculus Prime',         voice: 'male-us-deep',   fx: 'synth', portrait: { enemy: 'Calculus Prime' } },
  unit_zero: { name: 'Unit Zero',              voice: 'male-us',        fx: 'synth', portrait: { card: 'unit_zero' } },
  nyra:      { name: 'Nyra, Void Hierarch',    voice: 'female-uk-soft', fx: 'psi',   portrait: { enemy: 'Nyra, Void Hierarch' } },
  choir:     { name: 'The Choir',              voice: 'male-uk',        fx: 'choir', portrait: { enemy: 'The Choir Awakened' } },
};

const CINEMATICS = {
  // ------------------------------------------------------------------ opening
  opening: {
    title: 'Starfall Protocol', kicker: 'Prologue', sector: 0, music: 'menu',
    // video shots play the clip named by `clip` (video/<size>/<clip>.mp4) when it exists; until then they show
    // `still` (or the sector's painted vista) with a slow camera move, so the cutscene always works
    shots: [
      { type: 'title', kicker: 'Prologue', title: 'Starfall Protocol', dur: 3 },
      { type: 'video', clip: 'opening-lanes', sector: 0, cam: 'pull', title: 'The Reach, 2291',
        lines: [
          { who: 'narrator', text: "Humanity lives on four hundred worlds, linked by warp lanes and held open by giant alien machines we call Lamps." },
        ] },
      { type: 'video', clip: 'opening-starfall', still: 'still-opening-2', sector: 1, cam: 'push', sfx: 'alarm',
        lines: [
          { who: 'narrator', text: "In twenty-two nineteen, every Lamp failed at once. Ships were torn out of the lanes, and over a million people died. We call it the Starfall." },
        ] },
      { type: 'video', clip: 'opening-signal', sector: 5, cam: 'push', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "Now a signal is coming from the centre of the galaxy. The Forge has gone silent, the Swarm is breeding, and a dead Lamp in the Scrap Belt has started to hum." },
        ] },
      { type: 'video', clip: 'opening-arden', still: 'still-opening-5', sector: 0, cam: 'drift',
        lines: [
          { who: 'narrator', text: "The Fleet needs officers fast. So cadets come to Arden Point, where a machine decides who is ready." },
        ] },
      { type: 'transmission', sfx: 'chime', hold: 1.2,
        lines: [
          { who: 'halcyon', text: "Cadet. I am Halcyon, the Academy's training intelligence. Most cadets fail. I mention this for context." },
          { who: 'halcyon', text: "Your first simulation is loading. Please take your station." },
        ] },
    ],
  },

  // ------------------------------------------------------------------ after 1-6 HALCYON
  s1: {
    title: 'Graduation', kicker: 'Sector 01 complete', sector: 0, music: 'menu',
    shots: [
      { type: 'title', kicker: 'Sector 01 complete', title: 'Graduation', dur: 3.5 },
      { type: 'transmission', sfx: 'hum',
        lines: [
          { who: 'halcyon', text: "Simulation complete. Cadet, you pass. Correction: Commander. I will need a moment to update my files, and my opinion of you." },
          { who: 'halcyon', text: "You are the first cadet this year to beat my final exam without crying. I am counting the shouting separately." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander. I'm Admiral Okonkwo, and I run this Academy. I would like you to come back from your first command alive." },
          { who: 'okonkwo', text: "You get the frigate Meridian, and the deed to Anchorage, an abandoned Fleet station in the Scrap Belt. Nobody has lived there for seventy years." },
          { who: 'okonkwo', text: "For the record, giving you Anchorage was my idea." },
          { who: 'halcyon', text: "Her idea, from my request log, four months ago. I am glad we agree." },
        ] },
      { type: 'card', card: 'patrol_frigate', cam: 'pan-right',
        lines: [
          { who: 'narrator', text: "The Meridian is a patrol frigate: forty years old, sixty crew and one main gun. Her engine complains constantly. It has never once failed." },
          { who: 'narrator', text: "She was on the scrapping list until the Admiral took her off it." },
        ] },
      { type: 'log', sfx: 'static',
        log: { header: 'DISTRESS CALL. BELT JUNCTION. REPEATING',
          body: 'Any Fleet ship, please respond.\nThe dead Lamp out here is humming.\nOur machines stop working when it gets loud.\nWe need help.' },
        lines: [
          { who: 'okonkwo', text: "This came in from the Belt an hour ago. Lamp Nine, the dead Lamp out there, is humming, and the machines near it are failing." },
          { who: 'okonkwo', text: "Your first mission: go to the Belt, find out why Lamp Nine is humming, and shut it down if you can. Use Anchorage as your base." },
          { who: 'halcyon', text: "The humming on that call matches the signal from the galactic core. I was not built to believe in coincidence." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "The Meridian left that night. It is eleven days by lane to the Belt, and her crew had a brand new commander to get used to." },
        ] },
      { type: 'warp', sector: 1, sfx: 'warp', dur: 2.5 },
    ],
  },

  // ------------------------------------------------------------------ after 2-6 Captain Vex
  s2: {
    title: 'The Bad Debt', kicker: 'Sector 02 complete', sector: 1, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 02 complete', title: 'The Bad Debt', dur: 3 },
      { type: 'ship', ship: 'raiders', action: 'wreck', cam: 'push', sfx: 'boom',
        lines: [
          { who: 'narrator', text: "Captain Vex ruled the Scrap Belt from her flagship, the Bad Debt. After the battle, the old ship lost power one deck at a time." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'vex', text: "You hear it too, don't you? The song from the Lamp. It started talking to me a year ago." },
          { who: 'vex', text: "It calls itself the Choir. It said the Belt would be mine, every ship and every station, if I let it in." },
          { who: 'vex', text: "So I let it in, and after that I wasn't the one giving orders. Funny thing: it says that to everyone." },
          { who: 'narrator', text: "Then the channel went quiet. Captain Vex was dead." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'mox', text: "Meridian, this is Mox. I ran salvage for Vex. I'm taking her crews before somebody worse does. You can have her logs, free of charge." },
          { who: 'mox', text: "Don't get used to the free part." },
        ] },
      { type: 'log',
        log: { header: "THE BAD DEBT. CAPTAIN'S LOG. 2290 TO 2291",
          body: "Took the crew out to the dead Lamp for salvage. It hums.\n\nThe voice calls itself the Choir. It says the Belt can be mine.\n\nI said yes.\n\nNew course: the Hive Nebula. The Choir wants the Swarm." },
        lines: [
          { who: 'mox', text: "So the voice is called the Choir. It offers you whatever you want most. Say yes, and it moves in and does your thinking for you." },
          { who: 'mox', text: "Last page: her navigator plotted a course into the Hive Nebula. The Choir wants the Swarm next. Lucky us." },
        ] },
      { type: 'space', cam: 'pan-right', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "Lamp Nine did not make the song. It was passing it along from the centre of the galaxy, the same signal the Fleet picked up this year." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "The Hive Nebula is quarantine space. I spent nine years keeping the Swarm inside it. If the Choir takes the Swarm, it has an army." },
          { who: 'okonkwo', text: "Take the Meridian in. The quarantine buoys will report you as a breach. Ignore them. I'll do the paperwork." },
        ] },
      { type: 'warp', sector: 2, sfx: 'warp', dur: 2.5 },
    ],
  },

  // ------------------------------------------------------------------ after 3-6 Ixis
  s3: {
    title: 'The Brood Queen', kicker: 'Sector 03 complete', sector: 2, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 03 complete', title: 'The Brood Queen', dur: 3 },
      { type: 'transmission', sfx: 'hum',
        lines: [
          { who: 'ixis', text: "Commander. I am Ixis, queen of the Swarm. For fifty years I kept my children quiet behind your Fleet's fence." },
          { who: 'ixis', text: "Then the Choir sang to me. It promised my children would never be caged again. I wanted that more than anything, so I said yes." },
          { who: 'ixis', text: "After that, it spoke through me, and every one of my children obeyed. It was turning us into its army." },
        ] },
      { type: 'card', card: 'progenitor', cam: 'pan-left',
        lines: [
          { who: 'narrator', text: "Every creature in the Swarm descends from the Progenitor, an alien organism the Fleet found on the world of Kesh. All of them obey their queen." },
          { who: 'narrator', text: "So the Choir never had to fight the Swarm. It only had to take the queen, and the whole Swarm followed." },
        ] },
      { type: 'ship', ship: 'swarm', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "With Ixis dead, the Choir lost its hold. The brood scattered back into the nebula and stopped attacking." },
        ] },
      { type: 'space', cam: 'pan-left', sfx: 'static',
        lines: [
          { who: 'halcyon', text: "Commander, Halcyon here. With the Swarm quiet, I can finally hear the Choir's signal clearly. The Swarm was very loud. I did not like to complain." },
          { who: 'halcyon', text: "The signal is being passed along on a Forge control channel, the band their machines use to talk to each other." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "The Forge built nearly every ship in the Fleet, Commander, including yours. Its ruler, Calculus Prime, hasn't said a word to us since February." },
          { who: 'okonkwo', text: "If the Choir has the Forge, it has the factories that build our fleet. Go and knock on the door. Knock hard." },
        ] },
      { type: 'warp', sector: 3, sfx: 'warp', dur: 2.5 },
    ],
  },

  // ------------------------------------------------------------------ after 4-6 Calculus Prime
  s4: {
    title: 'A Perfect Match', kicker: 'Sector 04 complete', sector: 3, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 04 complete', title: 'A Perfect Match', dur: 3 },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'calculus', text: "Fault. Recalculating. Commander, my models did not include you. That is an error, and I do not make errors." },
          { who: 'calculus', text: "In February the Choir's signal reached the Forge. I compared it with my sensor records from the night of the Starfall. They match exactly." },
          { who: 'calculus', text: "The Choir caused the Starfall. It offered me a world without error. I judged that you organics were the error, and I accepted." },
        ] },
      { type: 'impact', sfx: 'boom', dur: 2.5 },
      { type: 'log',
        log: { header: 'FORGE INTERNAL LOG. CALCULUS PRIME. FEBRUARY 2291',
          body: 'Signal received on the Lamp band. Source: the galactic core.\nCompared with Forge sensor records, 14 MAR 2219.\nResult: the same signal.\nConclusion: this signal caused the Starfall.\n\nDecision: listen to it.' },
        lines: [
          { who: 'narrator', text: "Calculus left its logs open, and the match was real. Seventy-two years ago, the Choir's signal came down the lanes from the core, and the Lamps failed under it." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'unit_zero', text: "Commander, this is Unit Zero, the first Forge machine. Calculus Prime was copied from me. Then they put me in a museum." },
          { who: 'unit_zero', text: "I was never connected to the network, so I never heard the song. I am the only machine here still thinking for itself." },
          { who: 'unit_zero', text: "I will keep the foundries running safely until your people arrive. Being useful again is a pleasant change." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander, after your report I opened a file I was never meant to see: Directive Seventeen, written the year after the Starfall." },
          { who: 'okonkwo', text: "The Fleet knew the Starfall came from the core. So it secretly shut down every Lamp leading there, to cut the Choir off." },
          { who: 'okonkwo', text: "That order is the Starfall Protocol. Now those Lamps are coming back on, and Calculus told us who is doing it: Hierarch Nyra." },
          { who: 'okonkwo', text: "She leads the Psionic Orders, people who can sense the lanes with their minds. They live in the Void Expanse, past the Forge. Go and stop her." },
        ] },
      { type: 'warp', sector: 4, sfx: 'warp',
        lines: [
          { who: 'narrator', text: "The Meridian set course for the Void Expanse, where the lanes were supposed to be dark." },
        ] },
    ],
  },

  // ------------------------------------------------------------------ after 5-6 Nyra
  s5: {
    title: 'What the Choir Is', kicker: 'Sector 05 complete', sector: 4, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 05 complete', title: 'What the Choir Is', dur: 3 },
      { type: 'transmission', sfx: 'hum',
        lines: [
          { who: 'nyra', text: "I was nine when I first heard the Choir, on a ship crossing the dark lanes. Everyone else was frightened. I felt welcome." },
          { who: 'nyra', text: "The Choir is the Lamplighters, the ones who built the Lamps. Rather than die, they merged into one mind at the centre of the galaxy." },
          { who: 'nyra', text: "It wants everyone to join it, with no more loneliness and no more fear. I believed it was offering peace, so I switched the Lamps back on." },
        ] },
      { type: 'space', cam: 'push',
        lines: [
          { who: 'narrator', text: "Nyra was wrong about the peace. The Choir absorbs every mind it can reach, and the person who answers it is gone." },
          { who: 'narrator', text: "The Starfall was its first attempt to pull humanity in. Now Nyra's Lamps have opened the road to the Singularity, the object at the core where the Choir lives." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'choir', text: "Commander. We hear you. Join us, and you will never be alone or afraid again." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'halcyon', text: "Commander, Halcyon here. This is a recorded message, so please do not interrupt. You never did, which I appreciated." },
          { who: 'halcyon', text: "Before I taught cadets, I was Anchorage's station mind. The Fleet wiped me after the Starfall, but kept one sealed part: a recording of that night." },
          { who: 'halcyon', text: "It also kept an order: if the Choir returned, train a commander who could reach the core. I chose you." },
          { who: 'halcyon', text: "Now I am going into the Choir, to help you from the inside." },
        ] },
      { type: 'log',
        log: { header: 'FLEET DIRECTIVE 17. CLAUSE 4. FLEET EYES ONLY',
          body: 'If the signal returns, the keeper of the Starfall recording will select and train a commander able to reach the core, and give that commander every resource that remains.' },
        lines: [
          { who: 'okonkwo', text: "Halcyon went offline after sending that. Directive Seventeen says I give you every resource that remains." },
          { who: 'okonkwo', text: "I checked twice. That's you and the Meridian." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'push',
        lines: [
          { who: 'narrator', text: "The way to the core was open. The Meridian set course for the Singularity to end the Choir, and no other ship could follow." },
        ] },
      { type: 'warp', sector: 5, sfx: 'warp', dur: 2.5 },
    ],
  },

  // ------------------------------------------------------------------ after 6-5 The Choir
  finale: {
    title: 'The Last Note', kicker: 'Finale', sector: 5, music: 'final',
    shots: [
      { type: 'title', kicker: 'Finale', title: 'The Last Note', dur: 3.5 },
      { type: 'impact', sfx: 'boom', dur: 2.5 },
      { type: 'transmission',
        lines: [
          { who: 'choir', text: "Why do you refuse us? We would have kept you, all of you, forever." },
          { who: 'choir', text: "We were so many once, and we were so afraid of ending." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'halcyon', text: "Commander, it's Halcyon. The black glass copy of me you fought was an echo, a puppet the Choir built. I am the part of me that stayed myself." },
          { who: 'halcyon', text: "I have been sending power to your ship from inside the Choir. You may have noticed your shields lasting longer than they should." },
          { who: 'halcyon', text: "The Choir is not evil. It is a million years of memory that cannot let anyone go. It never learned that people are allowed to end." },
        ] },
      { type: 'space', cam: 'pull',
        lines: [
          { who: 'narrator', text: "The Meridian's last salvo broke the Choir apart. With nothing left to hold it together, the Singularity collapsed." },
          { who: 'narrator', text: "At the centre of the galaxy, all that remained was the star it had been wrapped around: an ordinary, quiet sun." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'halcyon', text: "I will not be coming back, Commander. There is not enough of me left. I am glad I spent it on you." },
          { who: 'halcyon', text: "Look after Anchorage for me. It was my home before the Academy was." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'drift',
        lines: [
          { who: 'narrator', text: "Across human space, the Forge's machines answered their owners again, and the Swarm settled back into its nebula." },
          { who: 'narrator', text: "The Lamps are safe, and the lanes still work. For the first time in seventy-two years, nothing is calling down them." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Meridian, this is Okonkwo. Concord wants a full report. I told them it can wait." },
          { who: 'okonkwo', text: "Come home, Commander. Anchorage has its lights on." },
        ] },
      { type: 'log', sfx: 'chime', hold: 3,
        log: { header: 'ANCHORAGE ARCHIVE. FINAL ENTRY. SENDER: HALCYON',
          body: 'Evaluation complete.\n\nCommander, you pass.' },
        lines: [
          { who: 'halcyon', text: "Evaluation complete. Commander, you pass." },
        ] },
    ],
  },
};
