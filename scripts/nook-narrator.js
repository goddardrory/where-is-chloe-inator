import { TRAVELER, TOTAL_MILES } from '../data/flights.js';
import { formatCountdownLong } from './countdown.js';

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
