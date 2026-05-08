import { TRAVELER, TOTAL_MILES } from '../data/flights.js';
import { formatCountdownLong } from './countdown.js';

// Iconic Tom Nook lines — used to alternate the hero bubble between
// live status and Tom Nook's greatest hits.
export const NOOK_QUOTES = [
  'Hooo!',
  'Yes, yes! Hm-hmm.',
  'I\'ll have you know my furniture comes from a reputable source, hooo!',
  'Are you sure? Are you really, really sure? Take your time, hm-hmm.',
  'Wonderful! …Or is it?',
  '"What\'s that, hm? Oh, I see, I see."',
  'Resetti is on holiday, yes yes. Turbulence is no concern.',
  'Welcome to Nook\'s Cranny! …in the sky, today, hooo.',
  'Loan repayment received! Now please, take out another. It is bigger! It is better!',
  'Hooo, where to begin? Where to begin…',
  'I have a special offer just for you, yes yes! …Bells, lots of Bells.',
  '49,800 Bells, please. Cash, card, or carrier-pigeon, hm-hmm.',
  'Hm-hmm. The loan can wait. The loan ALWAYS waits, yes yes.',
  'Did somebody say… in-flight furniture catalog, hooo?',
  'Cousin? Cousin! …oh wait, that\'s Timmy and Tommy, hm-hmm.',
  'I once flew economy. Once. We do not speak of it, yes yes.',
];

export function randomNookQuote() {
  return NOOK_QUOTES[Math.floor(Math.random() * NOOK_QUOTES.length)];
}

// Map a state object (from flight-state.js) to:
//   { hero: string, nook: string }
// The hero line is the big one-liner. The nook line is what Tom Nook says.
export function narrate(state) {
  switch (state.phase) {
    case 'pre-trip':
      return {
        hero: `Departure in ${formatCountdownLong(state.msUntilNext)}`,
        nook: `Hooo! ${TRAVELER}'s expedition begins soon, yes yes. Have you packed snacks? You should pack snacks.`,
      };

    case 'in-flight': {
      const f = state.flight;
      return {
        hero: `✈️ Cruising over ${state.region}`,
        nook: `Currently soaring above ${state.region} on flight ${f.num}, hm-hmm. ${flightCommentary(state)}`,
      };
    }

    case 'layover':
      return {
        hero: `🥨 On layover at ${state.atAirport}`,
        nook: `Resting safely at ${state.atAirport}. Loan repayment unaffected. ${formatCountdownLong(state.msUntilNext)} until next departure, hooo.`,
      };

    case 'arrived':
      return {
        hero: `🇿🇦 Safely in Durban!`,
        nook: `Welcome to Durban, traveler! ${TOTAL_MILES} Nook Miles earned, yes yes! What a journey, hooo!`,
      };

    default:
      return { hero: 'Loading…', nook: 'Hooo! Let me see, hm-hmm…' };
  }
}

function flightCommentary(state) {
  // Vary the secondary commentary slightly based on which leg
  const tag = `${state.flight.num}-${Math.floor(state.progress * 4)}`;
  const lines = [
    'Smooth skies ahead, yes yes.',
    'A fine adventure, hooo.',
    'Just like the days when I ran the airport on the island, hm-hmm.',
    'Pretzels are being served, probably.',
    'A traveler in fine spirits.',
  ];
  // Cheap deterministic pick based on the tag string
  const i = Math.abs(hash(tag)) % lines.length;
  return lines[i];
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
