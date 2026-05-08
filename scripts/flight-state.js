import { FLIGHTS } from '../data/flights.js';

// Compute the trip state from a Date "now". Pure function — easy to test.
//
// Returns one of:
//   { phase: 'pre-trip',   nextDep, msUntilNext }
//   { phase: 'in-flight',  flight, index, progress, region }
//   { phase: 'layover',    fromFlight, toFlight, msUntilNext, atAirport }
//   { phase: 'arrived',    finalFlight }
export function computeState(now = new Date()) {
  const t = now.getTime();
  const flights = FLIGHTS.map((f) => ({
    ...f,
    depMs: new Date(f.dep.iso).getTime(),
    arrMs: new Date(f.arr.iso).getTime(),
  }));

  // Before first departure
  if (t < flights[0].depMs) {
    return {
      phase: 'pre-trip',
      nextDep: flights[0],
      msUntilNext: flights[0].depMs - t,
    };
  }

  // After final arrival
  const last = flights[flights.length - 1];
  if (t >= last.arrMs) {
    return { phase: 'arrived', finalFlight: last };
  }

  // In flight or layover
  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    if (t >= f.depMs && t < f.arrMs) {
      const progress = (t - f.depMs) / (f.arrMs - f.depMs);
      return {
        phase: 'in-flight',
        flight: f,
        index: i,
        progress: clamp01(progress),
        region: regionFor(f, progress),
      };
    }
    const next = flights[i + 1];
    if (next && t >= f.arrMs && t < next.depMs) {
      return {
        phase: 'layover',
        fromFlight: f,
        toFlight: next,
        msUntilNext: next.depMs - t,
        atAirport: f.arr.code,
      };
    }
  }

  // Defensive fallback (shouldn't be reachable given checks above)
  return { phase: 'pre-trip', nextDep: flights[0], msUntilNext: 0 };
}

// Total journey progress as a fraction [0, 1].
// Each leg is weighted by its scheduled duration so the bar moves
// proportionally over the whole trip.
export function computeJourneyProgress(now = new Date()) {
  const t = now.getTime();
  const flights = FLIGHTS.map((f) => ({
    depMs: new Date(f.dep.iso).getTime(),
    arrMs: new Date(f.arr.iso).getTime(),
  }));

  const totalAir = flights.reduce((s, f) => s + (f.arrMs - f.depMs), 0);
  if (totalAir <= 0) return 0;

  let elapsed = 0;
  for (const f of flights) {
    if (t >= f.arrMs) {
      elapsed += f.arrMs - f.depMs;
    } else if (t >= f.depMs) {
      elapsed += t - f.depMs;
      break;
    } else {
      break;
    }
  }
  return clamp01(elapsed / totalAir);
}

// Total miles earned: 300 per landed flight + arrival bonus once trip complete.
export function computeMilesEarned(now = new Date()) {
  const t = now.getTime();
  let earned = 0;
  for (const f of FLIGHTS) {
    if (t >= new Date(f.arr.iso).getTime()) {
      earned += f.miles;
    }
  }
  if (t >= new Date(FLIGHTS[FLIGHTS.length - 1].arr.iso).getTime()) {
    earned += 500; // ARRIVAL_BONUS
  }
  return earned;
}

function regionFor(flight, progress) {
  // pick the region whose `at` is the closest below `progress`
  let chosen = flight.regions[0];
  for (const r of flight.regions) {
    if (r.at <= progress) chosen = r;
  }
  return chosen.label;
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
