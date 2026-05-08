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
  // ✨ The two amazing hilarious additions ✨
  'Hm-hmm, did you know? The interest on your interest accrues interest, yes yes! It\'s loans all the way down, hooo!',
  'Hooo! "Nook" is short for "Nookington," yes yes. …it is not. I made that up just now. But doesn\'t it sound expensive, hm-hmm?',
  // === More loan / debt jokes per request ===
  'Welcome to the Nook Inc. frequent-borrower programme, yes yes! Your FIRST missed payment is on the house, hooo!',
  'Have you considered taking out a second loan to repay the first, hm-hmm? Very tidy. Very efficient. Very expensive, yes yes.',
  'Hooo! The good news is the loan is interest-free, yes yes. The bad news is I made up the good news.',
  'Yes yes, the terms are simple: you pay forever. That IS simple, hm-hmm. Quite simple.',
  'I have a bridge loan, an air-bridge loan, and a bridge-of-bridges loan. Whichever you fancy, hooo!',
  'Hooo! Hidden fees, you ask? Yes yes — they were hidden, that is rather the point. See page 47 of the contract, hm-hmm.',
  'Tom Nook says: "A loan a day keeps Resetti away." …that is incorrect, hooo. But it does rhyme, yes yes.',
  'Hm-hmm, the airline meal is on the house. The plate is 49,800 Bells, hooo. Just the plate.',
];

export function randomNookQuote() {
  return NOOK_QUOTES[Math.floor(Math.random() * NOOK_QUOTES.length)];
}

// Map a state object (from flight-state.js) to:
//   { hero: string, nookOptions: string[] }
// The hero line is the big one-liner. nookOptions is a list of Tom Nook line
// variants for the bubble — main.js picks one per state-mode entry so each
// alternation back to state mode gets a fresh line.
export function narrate(state) {
  switch (state.phase) {
    case 'pre-trip':
      return {
        hero: `Departure in ${formatCountdownLong(state.msUntilNext)}`,
        nookOptions: [
          `Hooo! ${TRAVELER}'s expedition begins soon, yes yes. Have you packed snacks? You should pack snacks.`,
          `Yes, yes! ${TRAVELER} is at the airport. Hm-hmm, exciting times, hooo.`,
          `Pre-flight preparations underway, hooo! May I interest you in a loan for the journey?`,
          `Hm-hmm, three flights total. Three opportunities to rack up Nook Miles, yes yes!`,
          `${TRAVELER}'s passport is checked. Hooo! What an organised traveler, yes yes.`,
        ],
      };

    case 'in-flight': {
      const f = state.flight;
      return {
        hero: `✈️ Cruising over ${state.region}`,
        nookOptions: [
          `Currently soaring above ${state.region} on flight ${f.num}, hm-hmm. Smooth skies ahead, yes yes.`,
          `${TRAVELER} is in the air over ${state.region}! Yes yes, fly safely, hooo.`,
          `Hooo! Looks like ${state.region} from up there. The view, the clouds, the catering — magnificent.`,
          `Flight ${f.num} is going swimmingly, hm-hmm. ${TRAVELER} is somewhere near ${state.region}.`,
          `Yes yes, ${TRAVELER}'s seat is fully reclined. As is appropriate over ${state.region}, hooo.`,
          `Pretzels are being served, probably. Possibly. Probably probably, hm-hmm.`,
          `Just like the days when I ran the airport on the island, yes yes. Wait, did I? Hm-hmm…`,
        ],
      };
    }

    case 'layover':
      return {
        hero: `🥨 On layover at ${state.atAirport} — ${formatCountdownLong(state.msUntilNext)} to go`,
        nookOptions: [
          `Resting at ${state.atAirport}, hm-hmm. Loan repayment unaffected, yes yes.`,
          `${TRAVELER} is safely on the ground at ${state.atAirport}. Time for tea, yes yes.`,
          `Hooo! Layover at ${state.atAirport}. Have you considered upgrading the next leg, hm-hmm?`,
          `${state.atAirport} layover in progress, yes yes. The duty free is calling, hooo!`,
          `Pretzel Day at ${state.atAirport}, probably. Stanley would approve, yes yes.`,
        ],
      };

    case 'arrived':
      return {
        hero: `🇿🇦 Safely in Durban!`,
        nookOptions: [
          `Welcome to Durban, traveler! ${TOTAL_MILES} Nook Miles earned, yes yes! What a journey, hooo!`,
          `Hooo! ${TRAVELER} has arrived in Durban! Time to celebrate with a tasteful furniture purchase, yes yes.`,
          `Yes yes, journey complete! ${TOTAL_MILES} Nook Miles in the bank. Beautiful day, hm-hmm.`,
          `${TRAVELER} is on the ground in Durban! The loan is just kidding! Mostly. Welcome home.`,
        ],
      };

    default:
      return { hero: 'Loading…', nookOptions: ['Hooo! Let me see, hm-hmm…'] };
  }
}
