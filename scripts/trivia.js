// Rotating trivia ticker. 5 categories, weighted equally.

const SCHRUTE = [
  'Bears. Beets. Boeings.',
  'Identity theft is not a joke, Chloe. Millions of families suffer every year.',
  'Through concentration I can raise and lower my altitude at will.',
  'There are 4 kinds of business: tourism, food service, railroads, and sales.',
  'False. The real Bermuda Triangle is JFK, DXB, and DUR.',
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
];

const NOOK = [
  'Hooo! A journey of a thousand miles starts with one Nook Miles task, yes yes.',
  'Yes yes, every flight earns a tidy 300 Nook Miles. Quite reasonable.',
  'Hm-hmm, the loan can wait until landing. The loan ALWAYS waits.',
  'Three flights, three opportunities for souvenir shopping! Hooo!',
  'KK Slider sends his regards. He prefers night flights, yes yes.',
];

const OFFICE = [
  '"Planes are like buses, but they fly." — Kevin, probably.',
  '"I declare… safe travels!" — Michael Scott.',
  '"Did I stutter? Get on the plane." — Stanley.',
  '"That\'s what she said." — about every airline meal, somehow.',
  '"I\'m not superstitious, but I am a little stitious." — Michael, on layovers.',
  '"Boats and ducks. That\'s what we\'re doing now." — Andy, 2026.',
];

const POOL = [...SCHRUTE, ...DUCKS, ...PERRY, ...NOOK, ...OFFICE];

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
