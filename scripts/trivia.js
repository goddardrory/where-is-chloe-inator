// Rotating trivia ticker. Six categories, weighted equally.

const SCHRUTE = [
  'Bears. Beets. Boeings.',
  'Identity theft is not a joke, Chloe! Millions of families suffer every year.',
  'Through concentration I can raise and lower my altitude at will.',
  'There are 4 kinds of business: tourism, food service, railroads, and sales.',
  'False. The real Bermuda Triangle is JFK, DXB, and DUR.',
  'Whenever I\'m about to do something, I think, "would an idiot do that?" — and if they would, I do not do that thing.',
];

const DUCKS = [
  'Ducks have three eyelids.',
  'A duck\'s quack does echo, despite the myth.',
  'Ducks can sleep with one eye open to stay alert.',
  'Mallards are the ancestors of nearly every domestic duck breed.',
  'A flying group of ducks is called a "skein". A floating group is a "raft".',
  'Ducks have waterproof feathers thanks to a preen-gland oil.',
];

const PERRY = [
  '0900: Agent C boarded successfully. Doof status: foiled.',
  'Briefing from Major Monogram: maintain cover. Look casual.',
  'Agent C\'s in-flight nap counts as reconnaissance.',
  'Doofenshmirtz Evil Incorporated has not yet attacked the aircraft.',
  'Confidential: Agent P approved the carry-on. He says it\'s fine.',
  '1200: Sweet, sweet platypus power.',
  'Doofenshmirtz Evil Inc.: Tri-State Area takeover progress: 0%. (Curse you, Perry the Platypus.)',
  'Doof: "Behold! The Where-is-Chloe-inator! ...wait, that\'s just a flight tracker."',
  'Doof: "Ah Perry the Platypus. How unexpected. By which I mean expected."',
  'Doof: "I shall take over the entire TRI-STATE AREA — once Chloe lands, of course."',
];

// Tom Nook + Timmy & Tommy + the broader Nook universe.
// Long category — the user requested LOTS of Nook content.
const NOOK = [
  'Tom Nook says: "Hooo! Yes yes, Chloe is making excellent progress, hm-hmm."',
  'Tom Nook says: "I have just the loan for that long-haul flight, yes yes!"',
  'Tom Nook says: "49,800 Bells will cover the in-flight meal, hooo!"',
  'Tom Nook says: "Have you considered upgrading to first class, yes yes? I have a financing plan."',
  'Tom Nook says: "Hm-hmm, Resetti is on holiday — turbulence is no concern."',
  'Tom Nook says: "A traveler in fine spirits earns 100 bonus Nook Miles, yes yes!"',
  'Timmy & Tommy: "Hi-ho! / Hi-ho! Welcome to Nook\'s Cranny!"',
  'Timmy & Tommy: "Cousin? Cousin! Big bro says fly safe!"',
  'Timmy & Tommy: "We\'re saving Bells to start our own airline someday, yes yes!"',
  'Timmy & Tommy: "We\'ve got a sale on coconuts! ...Wait, that\'s not relevant."',
  'Timmy: "Big bro Tom Nook says he\'s very proud, hooo!"',
  'Tommy: "When the plane lands, can we get bubble tea? Pleeeease?"',
  'Tom Nook says: "Welcome aboard Nook Inc. Travel Bureau, yes yes! Mind the loan terms."',
  'Tom Nook says: "Hooo! That layover is just enough time for one more tea, hm-hmm."',
  'Sable says: "..."  (she\'s warming up to you, give her time)',
  'Mabel says: "Sister, look! A traveler! Hello, hello!"',
  'Label says: "Stunning! Absolutely stunning! Five stars for this travel outfit!"',
  'Tom Nook says: "Did somebody say… in-flight furniture catalog, hooo?"',
  'Tom Nook says: "Yes yes, the loan can wait. The loan ALWAYS waits, hm-hmm."',
];

const OFFICE = [
  '"Dwight, you ignorant slut!" — Michael Scott',
  '"I declare… BANKRUPTCY!" — Michael Scott',
  '"Bears. Beets. Battlestar Galactica." — Jim, impersonating Dwight',
  '"Identity theft is not a joke, Jim! Millions of families suffer every year!" — Dwight',
  '"FALSE." — Dwight Schrute',
  '"I\'m not superstitious… but I am a little stitious." — Michael',
  '"Pretzel Day is the best day of the year." — Stanley',
  '"Why are you the way that you are?" — Michael',
  '"Boom. Roasted." — Michael',
  '"That\'s what she said." — Michael, on the in-flight blanket',
  '"Would I rather be feared or loved? Easy. Both." — Michael',
  '"I\'m running away from my responsibilities. And it feels good." — Michael',
  '"Through concentration, I can raise and lower my cholesterol at will." — Dwight',
  '"Sometimes I\'ll start a sentence and I don\'t even know where it\'s going. I just hope I find it along the way." — Michael',
];

// Animal Crossing villager cameos. Wilbur & Orville are AC\'s actual airline
// crew (the Dodo Airlines dodos), so they\'re central to a flight tracker.
const VILLAGERS = [
  'Wilbur (Dodo Airlines): "Welcome aboard! Where ya headin\', dood?"',
  'Wilbur: "We\'ve got a window seat with your name on it, dood."',
  'Orville (Dodo Airlines): "Buckle up! Flight crew checking in!"',
  'Orville: "If you\'re heading to a mystery island, just say the word!"',
  'Isabelle says: "Make an announcement! Chloe is doing great, everyone!"',
  'Isabelle says: "Ohhh, I love watching the Departures board. So exciting!"',
  'KK Slider: "Hey there. KK Airline Theme is loaded if you wanna toggle it."',
  'KK Slider: "Catch a smooth flight, kiddo. I\'ll cue up something mellow."',
  'Blathers: "WHO… WHOOO would have guessed flight EK0204 spans three continents! Astonishing!"',
  'Celeste: "Look up, traveler — even from 39,000 feet the constellations are the same."',
  'Daisy Mae: "Daisy Mae here! Turnip prices are spiking — too bad you\'re mid-flight!"',
  'Resetti: "Don\'t let me catch you closing this tab! …kidding. I\'m on holiday."',
  'Resetti: "LISTEN UP, KID! If you refresh this page mid-flight, so help me—"',
  'Resetti: "What did I say about closing browser tabs!? You did it anyway, didn\'t ya?!"',
  'Resetti: "Mr. Resetti, at your service. RELUCTANTLY."',
  'Resetti: "I see you typing \'doof\'. Knock it off! …actually keep going, that one\'s funny."',
  'Resetti: "If this flight loops back to Seattle I\'m holdin\' YOU personally responsible!"',
  'Resetti: "Cold up there at 39,000 feet? Underground digs are a steady 18°C, just sayin\'."',
  'Gulliver: "Ack… please tell me which leg of the journey we\'re on, friend."',
  'CJ: "Fishing tournament back home! …But honestly, watching this trip is more fun."',
];

const POOL = [...SCHRUTE, ...DUCKS, ...PERRY, ...NOOK, ...OFFICE, ...VILLAGERS];

const ROTATE_MS = 8_000;

export function initTrivia() {
  const el = document.getElementById('trivia-text');
  if (!el) return;

  let i = Math.floor(Math.random() * POOL.length);
  el.textContent = POOL[i];

  setInterval(() => {
    let next = i;
    while (next === i) next = Math.floor(Math.random() * POOL.length);
    i = next;
    fade(el, POOL[i]);
  }, ROTATE_MS);
}

function fade(el, newText) {
  el.style.transition = 'opacity 0.3s';
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = newText;
    el.style.opacity = '1';
  }, 320);
}
