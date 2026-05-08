// Rotating trivia ticker. Each entry has an icon (the speaker) and text.
// Icons can be an emoji string, or 'img:<path>' to render an actual image.

// Each icon spec is either a plain emoji string or { img, emoji } where the
// image is preferred and the emoji is the fallback if the file 404s.
const NOOK_IMG    = { img: 'assets/img/tom-nook.png',     emoji: '🦝' };
const I_PERRY     = { img: 'assets/img/perry.png',         emoji: '🕵️' };
const I_DOOF      = { img: 'assets/img/doof.png',          emoji: '🦹' };
const I_RESETTI_IMG = { img: 'assets/img/resetti-angry.png', emoji: '😤' };
const I_TWINS     = '🦝';   // Timmy & Tommy
const I_SABLE     = '🦔';   // hedgehog stand-in for Sable/Mabel/Label
const I_RESETTI   = I_RESETTI_IMG; // angry mole — uses the supplied portrait
const I_SCHRUTE   = '🚜';   // beet farm tractor
const I_DWIGHT    = '🌽';   // identity-theft enthusiast
const I_MICHAEL   = '👔';   // World's Best Boss
const I_PAM       = '🎨';
const I_STANLEY   = '🥨';   // Pretzel Day
const I_KEVIN     = '🍲';   // chili
const I_ANDY      = '🎺';
const I_KK        = '🎸';
const I_ISABELLE  = '🐶';
const I_BLATHERS  = '🦉';
const I_CELESTE   = '🌌';
const I_DAISY     = '🌼';
const I_WILBUR    = '🦤';
const I_ORVILLE   = '🦤';
const I_GULLIVER  = '🌊';
const I_CJ        = '🎣';
const I_DUCK      = '🦆';
const I_GENERIC   = '✨';

// Flat item list. Pure silliness — no fact-shaped objects, no truths,
// nothing earnest. If a line has a chance of being mistaken for a fact,
// it gets revised until it isn't.
const ITEMS = [
  // === Tom Nook ===
  { icon: NOOK_IMG, text: 'Tom Nook says: "Hooo! Yes yes, Chloe is making excellent progress, hm-hmm."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "I have just the loan for that long-haul flight, yes yes! Only 49,800 Bells, hooo!"' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Have you considered upgrading to a slightly bigger plane, yes yes? I have a financing plan."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Hm-hmm, the loan can wait. The loan ALWAYS waits, yes yes."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Did somebody say… in-flight furniture catalog, hooo?"' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Sweet, sweet rate of 0% APR. Just kidding, hooo. It is 19.99%."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "I once flew economy. Once, hm-hmm. We do not speak of it."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Welcome aboard Nook Inc. Travel Bureau, yes yes. Mind the loan terms. Mind them well."' },
  { icon: NOOK_IMG, text: 'Tom Nook says: "Chloe earned bonus Nook Miles for not crying during turbulence, hooo!"' },

  // === Timmy & Tommy ===
  { icon: I_TWINS, text: 'Timmy & Tommy: "Hi-ho! / Hi-ho! Welcome to Nook\'s Cranny in the Sky!"' },
  { icon: I_TWINS, text: 'Timmy & Tommy: "Cousin? Cousin! Big bro Tom says fly safe!"' },
  { icon: I_TWINS, text: 'Timmy & Tommy: "We\'re saving Bells to start our own airline someday, yes yes!"' },
  { icon: I_TWINS, text: 'Tommy: "When the plane lands, can we get bubble tea? Pleeeease?"' },
  { icon: I_TWINS, text: 'Timmy: "Big bro Tom Nook says he\'s very proud, hooo!"' },

  // === Sable Sisters ===
  { icon: I_SABLE, text: 'Sable says: "..." (she\'s warming up to you, give her time)' },
  { icon: I_SABLE, text: 'Mabel says: "Sister, look! A traveler! At cruising altitude!"' },
  { icon: I_SABLE, text: 'Label says: "Stunning! Absolutely stunning! Five stars for the in-flight pyjamas!"' },

  // === Resetti ===
  { icon: I_RESETTI, text: 'Resetti: "DON\'T LET ME CATCH YOU CLOSING THIS TAB! …kidding. I\'m on holiday."' },
  { icon: I_RESETTI, text: 'Resetti: "LISTEN UP, KID! If you refresh this page mid-flight, so help me—"' },
  { icon: I_RESETTI, text: 'Resetti: "What did I say about closing browser tabs!? You did it anyway, didn\'t ya?!"' },
  { icon: I_RESETTI, text: 'Resetti: "Mr. Resetti, at your service. RELUCTANTLY."' },
  { icon: I_RESETTI, text: 'Resetti: "I see you typing \'doof\'. Knock it off! …actually keep going, that one\'s funny."' },
  { icon: I_RESETTI, text: 'Resetti: "If this flight loops back to Seattle I\'m holdin\' YOU personally responsible!"' },
  { icon: I_RESETTI, text: 'Resetti: "Type \'bomb\' one more time. I dare ya."' },
  { icon: I_RESETTI, text: 'Resetti: "BOMBOCLAAT! …sorry, that just slipped out."' },

  // === Dwight Schrute ===
  { icon: I_SCHRUTE, text: 'Dwight: "Bears. Beets. Boeings."' },
  { icon: I_SCHRUTE, text: 'Dwight: "Identity theft is not a joke, Chloe! Millions of families suffer every year!"' },
  { icon: I_SCHRUTE, text: 'Dwight: "Through concentration I can raise and lower my altitude at will. FALSE — but my cholesterol, yes."' },
  { icon: I_SCHRUTE, text: 'Dwight: "FALSE. The real Bermuda Triangle is JFK, DXB, and DUR."' },
  { icon: I_DWIGHT, text: 'Dwight: "Whenever I\'m about to do something I think \'would an idiot do that?\' If they would, I do not."' },
  { icon: I_DWIGHT, text: 'Dwight: "I am the Lackawanna County Volunteer Sheriff\'s Deputy AND a frequent flyer. Both roles are important."' },

  // === Michael Scott ===
  { icon: I_MICHAEL, text: 'Michael: "Dwight, you ignorant slut!"' },
  { icon: I_MICHAEL, text: 'Michael: "I declare… BANKRUPTCY!"' },
  { icon: I_MICHAEL, text: 'Michael: "I\'m not superstitious… but I am a little stitious."' },
  { icon: I_MICHAEL, text: 'Michael: "Why are you the way that you are?"' },
  { icon: I_MICHAEL, text: 'Michael: "Boom. Roasted."' },
  { icon: I_MICHAEL, text: 'Michael: "That\'s what she said. (about the in-flight blanket.)"' },
  { icon: I_MICHAEL, text: 'Michael: "Would I rather be feared or loved? Easy. Both."' },
  { icon: I_MICHAEL, text: 'Michael: "I\'m running away from my responsibilities. And it feels good."' },
  { icon: I_MICHAEL, text: 'Michael: "Sometimes I\'ll start a sentence and I don\'t even know where it\'s going. I just hope I find it along the way."' },

  // === Other Office cast ===
  { icon: I_STANLEY, text: 'Stanley: "Pretzel Day is the best day of the year."' },
  { icon: I_STANLEY, text: 'Stanley: "Did I stutter? Get on the plane."' },
  { icon: I_KEVIN, text: 'Kevin: "Why say lots word, when few word do trick. ✈ Chloe ✈ go."' },
  { icon: I_KEVIN, text: 'Kevin: "Planes are like buses, but they fly."' },
  { icon: I_PAM, text: 'Pam: "I always wanted to be the kind of mom that ships her sister to Durban."' },
  { icon: I_ANDY, text: 'Andy: "I wish there was a way to know you\'re in the good old days before you\'ve actually left them. ALSO: ROAD TRIP!"' },

  // === Perry the Platypus ===
  { icon: I_PERRY, text: '0900: Agent C boarded successfully. Doof status: foiled.' },
  { icon: I_PERRY, text: 'Briefing from Major Monogram: maintain cover. Look casual. Do not emote.' },
  { icon: I_PERRY, text: 'Agent C\'s in-flight nap counts as reconnaissance.' },
  { icon: I_PERRY, text: 'Confidential: Agent P approved the carry-on. He says it\'s fine.' },
  { icon: I_PERRY, text: '1200: Sweet, sweet platypus power.' },

  // === Dr. Doofenshmirtz ===
  { icon: I_DOOF, text: 'Doof: "Behold! The Where-is-Chloe-inator! ...wait, that\'s just a flight tracker."' },
  { icon: I_DOOF, text: 'Doof: "I shall take over the entire TRI-STATE AREA — once Chloe lands, of course."' },
  { icon: I_DOOF, text: 'Doof: "Ah Perry the Platypus. How unexpected. By which I mean expected."' },
  { icon: I_DOOF, text: 'Doof: "Curse you, Perry the Platypus! Curse you, gluten! Curse you, anyone who has ever wronged me!"' },
  { icon: I_DOOF, text: 'Doof: "My backstory? Glad you asked. When I was a boy in Drusselstein…"' },
  { icon: I_DOOF, text: 'Doofenshmirtz Evil Inc.: Tri-State Area takeover progress: 0%.' },

  // === Animal Crossing villagers ===
  { icon: I_WILBUR, text: 'Wilbur (Dodo Airlines): "Welcome aboard! Where ya headin\', dood?"' },
  { icon: I_WILBUR, text: 'Wilbur: "We\'ve got a window seat with your name on it, dood."' },
  { icon: I_ORVILLE, text: 'Orville (Dodo Airlines): "Buckle up! Flight crew checking in!"' },
  { icon: I_ORVILLE, text: 'Orville: "If you\'re heading to a mystery island, just say the word!"' },
  { icon: I_ISABELLE, text: 'Isabelle: "Make an announcement! Chloe is doing great, everyone!"' },
  { icon: I_ISABELLE, text: 'Isabelle: "Ohhh, I love watching the Departures board. So exciting!"' },
  { icon: I_KK, text: 'KK Slider: "Hey there. KK Airline Theme is loaded if you wanna toggle it."' },
  { icon: I_KK, text: 'KK Slider: "Catch a smooth flight, kiddo. I\'ll cue up something mellow."' },
  { icon: I_BLATHERS, text: 'Blathers: "WHO… WHOOO would have guessed flight EK0204 spans three continents! Astonishing!"' },
  { icon: I_BLATHERS, text: 'Blathers: "Bugs?! Don\'t talk to me about bugs. Especially in the cabin."' },
  { icon: I_CELESTE, text: 'Celeste: "Look up, traveler — even from 39,000 feet the constellations are the same."' },
  { icon: I_DAISY, text: 'Daisy Mae: "Daisy Mae here! Turnip prices are spiking — too bad you\'re mid-flight!"' },
  { icon: I_GULLIVER, text: 'Gulliver: "Ack… please tell me which leg of the journey we\'re on, friend."' },
  { icon: I_CJ, text: 'CJ: "Fishing tournament back home! …But honestly, watching this trip is more fun."' },

  // === Pure unhinged nonsense ===
  { icon: I_DUCK, text: 'BREAKING: Local duck spotted reading in-flight magazine. Refuses to comment. Refuses to even quack.' },
  { icon: I_DUCK, text: 'A duck is reportedly handling air traffic control today. Results have been mixed but vibes are immaculate.' },
  { icon: I_GENERIC, text: 'Important reminder: the plane is not technically held up by hopes and dreams. But mostly, hopes and dreams.' },
  { icon: I_GENERIC, text: 'Schrute Bucks accepted at all in-flight refreshment trolleys. Stanley nickels accepted nowhere.' },
  { icon: I_GENERIC, text: 'Today\'s flight is brought to you by: Bells. Lots and lots of Bells.' },
  { icon: I_GENERIC, text: 'Doofenshmirtz Evil Incorporated approves of this travel itinerary, which is alarming.' },
  { icon: I_GENERIC, text: 'Aircraft cup-of-tea status: hot. Aircraft loan status: also hot, financially speaking.' },
  { icon: I_GENERIC, text: '"And then I said, fly her to Durban!" — every airline employee handling Chloe\'s ticket' },
  { icon: I_GENERIC, text: 'Chloe\'s carry-on contains: 73% snacks, 22% snacks, 5% essentials. Math is correct.' },
];

const ROTATE_MS = 8_000;

export function initTrivia() {
  const text = document.getElementById('trivia-text');
  const icon = document.getElementById('trivia-icon');
  if (!text || !icon) return;

  let i = Math.floor(Math.random() * ITEMS.length);
  apply(icon, text, ITEMS[i]);

  setInterval(() => {
    let next = i;
    while (next === i) next = Math.floor(Math.random() * ITEMS.length);
    i = next;
    fade(icon, text, ITEMS[i]);
  }, ROTATE_MS);
}

function apply(iconEl, textEl, item) {
  iconEl.replaceChildren();
  iconEl.appendChild(buildIcon(item.icon));
  textEl.textContent = item.text;
}

function fade(iconEl, textEl, item) {
  const els = [iconEl, textEl];
  els.forEach((e) => { e.style.transition = 'opacity 0.3s'; e.style.opacity = '0'; });
  setTimeout(() => {
    apply(iconEl, textEl, item);
    els.forEach((e) => { e.style.opacity = '1'; });
  }, 320);
}

function buildIcon(spec) {
  // Spec can be:
  //   - plain emoji string ('🦆')
  //   - 'img:path' string (legacy)
  //   - { img, emoji } object — image preferred, emoji is fallback if 404s
  if (typeof spec === 'object' && spec && spec.img) {
    const img = document.createElement('img');
    img.src = spec.img;
    img.alt = '';
    img.className = 'trivia-icon-img';
    img.width = 32;
    img.height = 32;
    img.addEventListener('error', () => {
      const fallback = makeEmojiSpan(spec.emoji || '✨');
      img.replaceWith(fallback);
    }, { once: true });
    return img;
  }
  if (typeof spec === 'string' && spec.startsWith('img:')) {
    const img = document.createElement('img');
    img.src = spec.slice(4);
    img.alt = '';
    img.className = 'trivia-icon-img';
    img.width = 32;
    img.height = 32;
    return img;
  }
  return makeEmojiSpan(spec);
}

function makeEmojiSpan(emoji) {
  const span = document.createElement('span');
  span.className = 'trivia-icon-emoji';
  span.textContent = emoji;
  return span;
}
