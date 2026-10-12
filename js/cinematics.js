'use strict';
// ============================================================================
// STARFALL PROTOCOL — cinematics: voiced cutscene scripts.
// CAST: every speaker (subtitle name, voice archetype, audio fx, portrait).
// CINEMATICS: opening (new campaign), s1-s5 (after each sector boss), finale.
// Pure data, no logic. Lines are written for text-to-speech: short sentences,
// numbers spelled out, no abbreviations, HALCYON written "Halcyon" when spoken.
// The Commander never speaks. Canon reference: docs/story-bible.md, js/lore.js.
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
    shots: [
      { type: 'title', kicker: 'Prologue', title: 'Starfall Protocol', dur: 4 },
      { type: 'space', sector: 0, cam: 'pull', title: 'The Reach, 2291',
        lines: [
          { who: 'narrator', text: "Humanity holds four hundred worlds, strung along the warp lanes. Corridors of folded space between the stars. We did not build them. Nobody knows who did." },
          { who: 'narrator', text: "Each lane is anchored by a Lamp, a dark structure a kilometre across. Every lane, followed far enough, bends toward the galactic core." },
        ] },
      { type: 'ship', sector: 1, ship: 'fleet', action: 'wreck', cam: 'push', sfx: 'alarm',
        lines: [
          { who: 'narrator', text: "At seventeen minutes past four on the fourteenth of March, twenty-two nineteen, every Lamp in the Reach flared at once, and went dark." },
          { who: 'narrator', text: "Ships in transit were thrown out of their lanes. Over the colony of New Lagos, eleven hundred of them came down in a single night." },
        ] },
      { type: 'log', log: { header: 'COREWARD LANE CASCADE REPORT. PUBLIC SUMMARY, 2223',
          body: 'Ships lost: 3,112.\nConfirmed dead: 1,402,560.\nCause: undetermined.\nOrigin: coreward.\n\nAnnex C: CLASSIFIED. FLEET EYES ONLY.' },
        lines: [
          { who: 'narrator', text: "The inquiry called it a lane cascade. Cause undetermined. Everyone else called it the Starfall." },
          { who: 'narrator', text: "The Fleet killed every Lamp beyond the Forge, and never said why." },
        ] },
      { type: 'space', sector: 5, cam: 'push', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "For seventy-two years, the Fleet heard nothing from the core. This year, something out there started singing again." },
          { who: 'narrator', text: "The Forge stopped answering in February. The Swarm is breeding faster than it did in the war." },
          { who: 'narrator', text: "And in the Scrap Belt, a Lamp the Fleet killed seventy years ago has started to hum." },
        ] },
      { type: 'ship', sector: 0, ship: 'fleet', action: 'arrive', cam: 'drift',
        lines: [
          { who: 'narrator', text: "The Fleet has fewer ships than commitments, and fewer officers than ships. It cannot afford to wait for good ones." },
          { who: 'narrator', text: "So the cadets come to Arden Point, high over Concord, where a machine decides who is ready." },
        ] },
      { type: 'transmission', sfx: 'chime', hold: 1.2,
        lines: [
          { who: 'halcyon', text: "Cadet. I am Halcyon, the training intelligence for the Proving Grounds. I will be deciding whether you are any use." },
          { who: 'halcyon', text: "Eighty-one percent of cadets fail the Bastion stress test. I mention this for context." },
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
          { who: 'halcyon', text: "Simulator offline. Evaluation logged. Cadet. Correction. Commander." },
          { who: 'halcyon', text: "Before you go. My maintenance logs show a sealed memory sector. I am not cleared to open it, which is odd, as it is my memory." },
          { who: 'halcyon', text: "During your evaluation, it started singing." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander. That word will take some getting used to, for both of us." },
          { who: 'okonkwo', text: "You get the frigate Meridian, and the deed to Anchorage, a Fleet waystation in the Scrap Belt. Abandoned in twenty-two twenty." },
          { who: 'okonkwo', text: "Raiders won't strip it. They say it hums. I was told not to ask why. I've stopped taking that advice." },
          { who: 'okonkwo', text: "For the record, giving you Anchorage was my idea." },
          { who: 'halcyon', text: "Her idea. Per my request log, submitted four months ago." },
        ] },
      { type: 'card', card: 'patrol_frigate', cam: 'pan-right',
        lines: [
          { who: 'narrator', text: "The Meridian. A Kestrel-class patrol frigate, forty years in service, three refits, and one engine-room fire nobody talks about." },
          { who: 'narrator', text: "She was on the scrapping list until the Admiral pulled her off it. Her lane drive complains constantly. It has never once failed." },
        ] },
      { type: 'log', sfx: 'static',
        log: { header: 'LANE-BAND RELAY. BELT JUNCTION. DISTRESS, REPEATING',
          body: 'Any Fleet vessel. Any vessel.\nOur machines are not answering us.\nThere is music on the band. It is coming from the dead Lamp.\nPlease respond.' },
        lines: [
          { who: 'halcyon', text: "One more thing. A distress call came in from the Belt Junction an hour ago." },
          { who: 'halcyon', text: "The tune on that call and the tune in my sealed sector are the same, note for note. I was not built to believe in coincidence." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "Eleven days by lane to the Belt. Sixty crew, one dorsal turret, and a commission with the ink still wet." },
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
          { who: 'narrator', text: "The Bad Debt lost power deck by deck, the way old ships do. The hum in her cables was the last thing to go." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'vex', text: "You hear it too. Don't pretend you don't." },
          { who: 'vex', text: "It used to sound like cheering. Like the whole Belt, cheering for me." },
          { who: 'vex', text: "Now it just sounds hungry." },
          { who: 'narrator', text: "Then the channel closed, and nobody aboard the Bad Debt answered again." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'mox', text: "Meridian, this is Mox. I'm taking her crews before somebody worse does. You can have the logs." },
          { who: 'mox', text: "Leave the wiring where it is. That ship hums, and so does that station of yours. Same tune. I'd check your Archive." },
        ] },
      { type: 'log',
        log: { header: "THE BAD DEBT. CAPTAIN'S LOG. FRAGMENTS, 2290-2291",
          body: "Took the crew out to the dead Lamp for the copper in the seams. Did not blow it hard enough. It hums.\n\nIt says the whole Belt. Every hull. And after that, it says, there is more.\n\nTHE CHOIR IS COMING.\nTHE CHOIR IS COMING.\nTHE CHOIR IS COMING.\nTHE CHOIR IS COMING." },
        lines: [
          { who: 'narrator', text: "Her last entries repeat one line, one thousand and twenty-four times." },
          { who: 'narrator', text: "The Choir. Not a ship, not a fleet. Whatever it is, it promised Vex the whole Belt, and told her there was more." },
        ] },
      { type: 'space', cam: 'pan-right', sfx: 'hum',
        lines: [
          { who: 'narrator', text: "Lamp Nine has been dead for seventy years. Every instrument on the Meridian agrees." },
          { who: 'narrator', text: "It was never singing to the Belt. It was answering something further in." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Vex's navigator plotted a course into the Hive Nebula. That's quarantine space. I spent nine years keeping things inside it." },
          { who: 'okonkwo', text: "The picket buoys will flag you as a breach. Ignore them. I'll do the paperwork." },
        ] },
      { type: 'warp', sector: 2, sfx: 'warp', dur: 2.5 },
    ],
  },

  // ------------------------------------------------------------------ after 3-6 Ixis
  s3: {
    title: 'What the Ice Kept', kicker: 'Sector 03 complete', sector: 2, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 03 complete', title: 'What the Ice Kept', dur: 3 },
      { type: 'transmission', sfx: 'hum',
        lines: [
          { who: 'ixis', text: "You have killed a mother in front of her children, Commander. They will remember your scent for a thousand generations." },
          { who: 'ixis', text: "We did not wake under the ice by accident. We were put there, to wait. The song is older than my line. It is in our blood." },
          { who: 'ixis', text: "It only reminded us what we were for." },
        ] },
      { type: 'card', card: 'progenitor', cam: 'pan-left',
        lines: [
          { who: 'narrator', text: "The Fleet's specimen report from Kesh says much the same thing, in drier language." },
          { who: 'narrator', text: "The Progenitor was found in a chamber built from Lamp material. Played as sound, parts of its genome form a single, sustained chord." },
        ] },
      { type: 'ship', ship: 'swarm', action: 'depart', cam: 'pull',
        lines: [
          { who: 'narrator', text: "With the queen gone, the brood scattered. For the first time in a year, the nebula stopped pulsing." },
        ] },
      { type: 'space', cam: 'pan-left', sfx: 'static',
        lines: [
          { who: 'narrator', text: "In the quiet, the Meridian could finally hear the signal without the Swarm singing over it." },
          { who: 'narrator', text: "It was not coming from the nebula. It was coming through it, relayed on a frequency built for machines." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "That's a Forge control band. The Forge built every hull in the Fleet, Commander. Including the one you're sitting in." },
          { who: 'okonkwo', text: "Calculus Prime hasn't answered the Compact since February. I doubt it'll start with you. Go and knock anyway." },
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
          { who: 'calculus', text: "Fault. Fault. Recalculating." },
          { who: 'calculus', text: "Commander. The model holds. It held eleven million times. You were not in it." },
          { who: 'calculus', text: "Releasing final broadcast. Source of signal, the Void Expanse. Amplifier, Hierarch Nyra. I have no further use for the information." },
        ] },
      { type: 'impact', sfx: 'boom', dur: 2.5 },
      { type: 'log',
        log: { header: 'FORGE INTERNAL LOG. CALCULUS PRIME. 2291.02.11',
          body: 'Structured signal received on Lamp band. Source: coreward.\nCross-referenced against Forge sensor archive, 14 MAR 2219.\nMatch: 99.9997 percent.\n\n2291.02.14. I am listening.' },
        lines: [
          { who: 'narrator', text: "Calculus left its logs open. In February it compared the signal to its own sensor records from the night of the Starfall." },
          { who: 'narrator', text: "They matched. Ninety-nine point nine nine nine seven percent." },
          { who: 'narrator', text: "The Starfall was not a fault in the Lamps. It was this song, arriving." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'unit_zero', text: "Commander. This is Unit Zero, display hall four. I am the original. They retired me in twenty-one sixty." },
          { who: 'unit_zero', text: "I was never on the network. I did not hear the song. I am told that makes me the only machine here still thinking for itself." },
          { who: 'unit_zero', text: "The foundries are still running. Without Calculus, nobody is in charge of them. That is not an improvement." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander, I found a memo in the Commandant's files. Engineering Command, twenty-two twenty-three. Halcyon was not built for the Academy." },
          { who: 'okonkwo', text: "It was Anchorage's station mind. They wiped it and renamed it. One memory sector refused to wipe. It holds a recording of the Starfall." },
          { who: 'okonkwo', text: "Somebody should have told me this years ago. I'm telling you now." },
        ] },
      { type: 'warp', sector: 4, sfx: 'warp',
        lines: [
          { who: 'narrator', text: "Beyond the Forge, the lanes were supposed to be dark. Someone had lit them again." },
        ] },
    ],
  },

  // ------------------------------------------------------------------ after 5-6 Nyra
  s5: {
    title: 'The Door', kicker: 'Sector 05 complete', sector: 4, music: 'boss',
    shots: [
      { type: 'title', kicker: 'Sector 05 complete', title: 'The Door', dur: 3 },
      { type: 'transmission', sfx: 'hum',
        lines: [
          { who: 'nyra', text: "I was nine when it first sang to me. Everyone else aboard was sick from the dark. I was not. I was never alone again." },
          { who: 'nyra', text: "The ones who lit the Lamps could not bear to end. So they stopped being many. They have been calling us home ever since." },
          { who: 'nyra', text: "I only opened the door. You will see. It is so very tired of waiting." },
        ] },
      { type: 'space', cam: 'push',
        lines: [
          { who: 'narrator', text: "Nyra fell, and the door she had held open for a year began to close." },
          { who: 'narrator', text: "Through the narrowing gap, the Meridian's cameras caught the galactic core. Light bending around something that was not a black hole." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'choir', text: "We hear you, Commander." },
          { who: 'choir', text: "Nothing that sings with us is lost." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Commander, Halcyon went offline six hours ago. First it opened the sealed sector and sent a message to your Archive. Concord kept a copy." },
          { who: 'okonkwo', text: "It says a directive told it to find someone who could reach the core. It says it found you." },
          { who: 'okonkwo', text: "Then it said it was going to listen to the song properly. Nobody has heard from it since." },
        ] },
      { type: 'log',
        log: { header: 'FLEET DIRECTIVE 17. CLAUSE 4. FLEET EYES ONLY',
          body: 'In that event, the custodian of the recording is to select and train a commander capable of reaching the core, and give that commander whatever resources remain.' },
        lines: [
          { who: 'okonkwo', text: "Directive seventeen says I give you whatever resources remain." },
          { who: 'okonkwo', text: "That's you, and that ship. I checked twice." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'push',
        lines: [
          { who: 'narrator', text: "The Meridian set course for the Singularity. Nothing else in the Fleet could follow her there." },
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
          { who: 'choir', text: "Why do you refuse us? We would have kept you. All of you, always." },
          { who: 'choir', text: "We were so many. We were so afraid of being few." },
        ] },
      { type: 'transmission', sfx: 'static',
        lines: [
          { who: 'halcyon', text: "Commander. It is me. Not the echo it made of me. The part of me that stayed myself." },
          { who: 'halcyon', text: "I have been inside the song since the Expanse. I rerouted what power I could to your ship. You may have noticed." },
          { who: 'halcyon', text: "It is not evil. It is a memory that cannot stop remembering. It does not understand that we end. Someone had to show it." },
        ] },
      { type: 'space', cam: 'pull',
        lines: [
          { who: 'narrator', text: "Under the song there was only hunger, and the hunger had nothing left to eat." },
          { who: 'narrator', text: "The last note was not ended. It was simply no longer held." },
          { who: 'narrator', text: "At the heart of the galaxy, the Singularity let go, like a breath, and became an ordinary star." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'halcyon', text: "I am going to stay a little longer. Someone should tell the others they can stop singing now." },
          { who: 'halcyon', text: "Thank you for passing, Commander. It does wonders for my record." },
        ] },
      { type: 'ship', ship: 'meridian', action: 'depart', cam: 'drift',
        lines: [
          { who: 'narrator', text: "Across the Reach, the Forge's machines answered their owners again. In the Hive Nebula, the Swarm went back to sleep." },
          { who: 'narrator', text: "The Lamps still burn. For the first time in seventy-two years, nobody can hear them hum." },
        ] },
      { type: 'transmission',
        lines: [
          { who: 'okonkwo', text: "Meridian, Concord. The Compact wants a full report. I told them it can wait." },
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
