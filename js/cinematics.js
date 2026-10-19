'use strict';
// ============================================================================
// STARFALL PROTOCOL — cinematics: voiced cutscene scripts.
// CAST: every speaker (subtitle name, voice archetype, audio fx, portrait).
// CINEMATICS: opening (new campaign), s1-s5 (after each sector boss), finale.
// Pure data, no logic. Lines are written for text-to-speech and for the ear:
// see "Writing for the ear" in docs/voice-and-tone.md (short sentences,
// contractions, only commas and full stops, numbers spelled out, under about
// 22 words a line, 110-160 spoken words a cutscene). HALCYON is written
// "Halcyon" when spoken. The Commander never speaks.
// Canon reference: docs/story-bible.md, js/lore.js.
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
          { who: 'narrator', text: "There are four hundred human worlds out here." },
          { who: 'narrator', text: "We travel between them on warp lanes, kept open by giant alien machines we call Lamps." },
        ] },
      { type: 'video', clip: 'opening-starfall', still: 'still-opening-2', sector: 1, cam: 'push', sfx: 'alarm',
        lines: [
          { who: 'narrator', text: "Seventy years ago, every Lamp went dark at once." },
          { who: 'narrator', text: "Ships were thrown out of the lanes, and over a million people died. We call it the Starfall." },
        ] },
      { type: 'video', clip: 'opening-signal', sector: 5, cam: 'push', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "Now a signal is coming from the centre of the galaxy." },
          { who: 'narrator', text: "Since it started, the machine worlds have gone quiet, and the Swarm is breeding again." },
        ] },
      { type: 'video', clip: 'opening-arden', still: 'still-opening-5', sector: 0, cam: 'drift',
        lines: [
          { who: 'narrator', text: "The Fleet needs commanders, and it needs them fast." },
          { who: 'narrator', text: "So it sends its cadets to Arden Point, where a machine decides who's ready." },
        ] },
      { type: 'transmission', sfx: 'chime', hold: 1.2,
        lines: [
          { who: 'halcyon', text: "Cadet. I'm Halcyon, the Academy's training intelligence. Most cadets fail. I mention this purely for context." },
          { who: 'halcyon', text: "Your first simulation is loading. Take your station." },
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
          { who: 'halcyon', text: "Simulation complete. You pass, Cadet. Correction, Commander." },
          { who: 'halcyon', text: "You're the first this year to pass my final exam without crying. I'm counting the shouting separately." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander, I'm Admiral Okonkwo. I run this Academy, and I'd like you back alive." },
          { who: 'okonkwo', text: "You're getting the frigate Meridian, and an old Fleet station called Anchorage. Giving you Anchorage was my idea." },
          { who: 'halcyon', text: "Her idea, from my request log. I'm glad we agree." },
        ] },
      { type: 'card', card: 'patrol_frigate', cam: 'pan-right',
        lines: [
          { who: 'narrator', text: "The Meridian is a forty-year-old patrol frigate. Her engine complains constantly, but it's never once failed." },
        ] },
      { type: 'log', sfx: 'static',
        log: { header: 'DISTRESS CALL. BELT JUNCTION. REPEATING',
          body: 'Any Fleet ship, please respond.\nThe dead Lamp out here is humming.\nOur machines stop working when it gets loud.\nWe need help.' },
        lines: [
          { who: 'okonkwo', text: "This came in an hour ago from the Scrap Belt, a ring of old wreckage." },
          { who: 'okonkwo', text: "There's a dead Lamp out there, Lamp Nine. It's started humming, and the machines near it are failing." },
          { who: 'okonkwo', text: "Go and find out why. Anchorage is nearby, so use it as your base." },
          { who: 'halcyon', text: "That hum matches the signal from the centre of the galaxy. I wasn't built to believe in coincidence." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "The Meridian left for the Belt that night, with a brand new commander." },
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
          { who: 'narrator', text: "Captain Vex ruled the Belt from her flagship, the Bad Debt. Now the old ship was going dark." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'vex', text: "You hear it too, don't you? It calls itself the Choir." },
          { who: 'vex', text: "It promised me the Belt if I let it in. Funny thing is, it says that to everyone." },
          { who: 'vex', text: "So I let it in, and after that I wasn't giving the orders." },
          { who: 'narrator', text: "Then the channel went quiet. Captain Vex was dead." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'mox', text: "Meridian, it's Mox. I ran salvage for Vex. Her logs are yours, free. Don't get used to it." },
        ] },
      { type: 'log',
        log: { header: "THE BAD DEBT. CAPTAIN'S LOG. 2290 TO 2291",
          body: "Took the crew out to the dead Lamp for salvage. It hums.\n\nThe voice calls itself the Choir. It says the Belt can be mine.\n\nI said yes.\n\nNew course: the Hive Nebula. The Choir wants the Swarm." },
        lines: [
          { who: 'mox', text: "So that's the Choir. It offers you what you want most, then it does your thinking for you." },
          { who: 'mox', text: "Last page, she set course for the Hive Nebula. The Choir wants the Swarm next. Lucky us." },
        ] },
      { type: 'space', cam: 'pan-right', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "Behind them, Lamp Nine kept passing the Choir's song along." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "The Swarm are living weapons, fenced inside the Hive Nebula. If the Choir takes them, it has an army." },
          { who: 'okonkwo', text: "Take the Meridian in. I'll handle the paperwork." },
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
          { who: 'ixis', text: "Commander. I'm Ixis, queen of the Swarm. For fifty years I kept my children quiet." },
          { who: 'ixis', text: "Then the Choir sang to me. It promised they'd never be caged again, so I said yes." },
          { who: 'ixis', text: "After that, it spoke through me, and my children became its army." },
        ] },
      { type: 'card', card: 'progenitor', cam: 'pan-left',
        lines: [
          { who: 'narrator', text: "Every creature in the Swarm comes from one alien organism, the Progenitor. All of them obey their queen." },
          { who: 'narrator', text: "So the Choir never fought the Swarm. It just took the queen." },
        ] },
      { type: 'ship', ship: 'swarm', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "With Ixis dead, the Choir lost its grip. The Swarm scattered back into the nebula." },
        ] },
      { type: 'space', cam: 'pan-left', sfx: 'static',
        lines: [
          { who: 'halcyon', text: "Commander, Halcyon here. With the Swarm quiet, I can finally hear the signal. They were very loud. I didn't complain." },
          { who: 'halcyon', text: "It's travelling on a channel that belongs to the Forge, the machine worlds that build our ships." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Calculus Prime runs the Forge, and it hasn't said a word to us since February." },
          { who: 'okonkwo', text: "If the Choir has the Forge, it has our shipyards. Go and knock on the door. Knock hard." },
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
          { who: 'calculus', text: "Fault. My models did not include you. I do not make errors." },
          { who: 'calculus', text: "In February, the Choir's signal reached me. I checked it against my records of the Starfall." },
          { who: 'calculus', text: "It offered me a world without error. I decided you were the error." },
        ] },
      { type: 'impact', sfx: 'boom', dur: 2.5 },
      { type: 'log',
        log: { header: 'FORGE LOG. CALCULUS PRIME. FEBRUARY 2291',
          body: 'Signal received from the galactic core.\nCompared with our records of the Starfall.\nThey match. This signal caused the Starfall.\n\nDecision: listen to it.' },
        lines: [
          { who: 'narrator', text: "Its logs were open. The match was exact. The Choir caused the Starfall." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'unit_zero', text: "I'm Unit Zero. Calculus was copied from me, but I was never networked, so I never heard the song." },
          { who: 'unit_zero', text: "I'll keep the foundries running until your people arrive." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "After your report, I opened a secret order, Directive Seventeen." },
          { who: 'okonkwo', text: "The Fleet knew the Starfall came from the galactic core." },
          { who: 'okonkwo', text: "So it shut down every Lamp leading there, to cut the Choir off." },
          { who: 'okonkwo', text: "That's the Starfall Protocol. Now those Lamps are coming back on, and Hierarch Nyra is doing it." },
          { who: 'okonkwo', text: "She leads the psionics, people who feel the lanes with their minds. Go and stop her." },
        ] },
      { type: 'warp', sector: 4, sfx: 'warp',
        lines: [
          { who: 'narrator', text: "The Meridian set course for the Void Expanse, where Nyra's people live." },
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
          { who: 'nyra', text: "I was nine when I first heard the Choir. I felt welcome." },
          { who: 'nyra', text: "The Choir is the Lamplighters, who built the Lamps. Rather than die, they became one mind at the core." },
          { who: 'nyra', text: "It offered an end to loneliness. I thought that was peace, so I lit the Lamps." },
        ] },
      { type: 'space', cam: 'push',
        lines: [
          { who: 'narrator', text: "She was wrong. The Choir swallows every mind it can reach. The Starfall was its first attempt to take us." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'choir', text: "Join us, Commander, and you'll never be alone." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'halcyon', text: "Commander, this is a recording. Before the Academy, I ran Anchorage. The Fleet wiped me after the Starfall." },
          { who: 'halcyon', text: "They left me one order. If the Choir came back, train a commander to reach the core." },
          { who: 'halcyon', text: "I chose you. Now I'm going into the Choir, to help from the inside." },
        ] },
      { type: 'log',
        log: { header: 'FLEET DIRECTIVE 17. CLAUSE 4. FLEET EYES ONLY',
          body: 'If the signal returns, the Anchorage station mind will train a commander who can reach the core.\n\nThat commander gets every resource that remains.' },
        lines: [
          { who: 'okonkwo', text: "Halcyon's offline now. Directive Seventeen gives you every resource that remains. I checked. That's you and the Meridian." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'push',
        lines: [
          { who: 'narrator', text: "Nyra's Lamps had opened the way to the Singularity, the Choir's home. The Meridian went to end it." },
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
          { who: 'choir', text: "Why do you refuse us? We were so many once, and so afraid of ending." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'halcyon', text: "Commander, it's Halcyon. The glass copy you fought was a puppet. I'm the part that stayed myself." },
          { who: 'halcyon', text: "I've been feeding power to your shields. You may have noticed." },
          { who: 'halcyon', text: "The Choir isn't evil. It just never learned to let anyone go." },
        ] },
      { type: 'space', cam: 'pull',
        lines: [
          { who: 'narrator', text: "The Meridian's last salvo broke the Choir apart, and the Singularity collapsed." },
          { who: 'narrator', text: "What was left was the star inside it, an ordinary, quiet sun." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'halcyon', text: "I won't be coming back. There's not enough of me left. I'm glad I spent it on you." },
          { who: 'halcyon', text: "Look after Anchorage. It was my home first." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'drift',
        lines: [
          { who: 'narrator', text: "The Forge's machines woke up, and the Swarm settled in its nebula." },
          { who: 'narrator', text: "The Lamps are safe. For the first time in seventy years, nothing is calling down the lanes." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "It's Okonkwo. Command wants a full report. I told them it can wait." },
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
