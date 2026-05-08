// Flight schedule for Chloe's journey: Seattle -> JFK -> Dubai -> Durban
//
// IMPORTANT — placeholder times below. Update these from Chloe's actual boarding
// passes before deploying. ISO 8601 strings with timezone offsets are required.
//
// Time zones used (offsets in May 2026, post-DST):
//   PT  = America/Los_Angeles  (-07:00 PDT)
//   ET  = America/New_York     (-04:00 EDT)
//   GST = Asia/Dubai           (+04:00, no DST)
//   SAST = Africa/Johannesburg (+02:00, no DST)

export const TRAVELER = 'Chloe';

export const FLIGHTS = [
  {
    num: 'AS0022',
    airline: 'Alaska Airlines',
    dep: { code: 'SEA', city: 'Seattle',  iso: '2026-05-08T06:30:00-07:00' },
    arr: { code: 'JFK', city: 'New York', iso: '2026-05-08T14:50:00-04:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/ASA22',
    // Poetic regions for the in-flight hero copy. {progress: 0..1, region: '...'}
    regions: [
      { at: 0.10, label: 'the Cascades' },
      { at: 0.40, label: 'the Great Plains' },
      { at: 0.70, label: 'the Great Lakes' },
      { at: 0.95, label: 'the Hudson Valley' },
    ],
  },
  {
    num: 'EK0204',
    airline: 'Emirates',
    dep: { code: 'JFK', city: 'New York', iso: '2026-05-09T22:30:00-04:00' },
    arr: { code: 'DXB', city: 'Dubai',    iso: '2026-05-10T19:55:00+04:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/UAE204',
    regions: [
      { at: 0.10, label: 'the North Atlantic' },
      { at: 0.30, label: 'Greenland' },
      { at: 0.55, label: 'Northern Europe' },
      { at: 0.80, label: 'the Caspian Sea' },
      { at: 0.95, label: 'the Persian Gulf' },
    ],
  },
  {
    num: 'EK0775',
    airline: 'Emirates',
    dep: { code: 'DXB', city: 'Dubai',  iso: '2026-05-10T22:00:00+04:00' },
    arr: { code: 'DUR', city: 'Durban', iso: '2026-05-11T04:30:00+02:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/UAE775',
    regions: [
      { at: 0.10, label: 'the Arabian Sea' },
      { at: 0.40, label: 'the Indian Ocean' },
      { at: 0.70, label: 'Madagascar' },
      { at: 0.95, label: 'the South African coast' },
    ],
  },
];

// Bonus awarded on full-journey completion.
export const ARRIVAL_BONUS = 500;

// Total possible Nook Miles — derived from the data above.
export const TOTAL_MILES =
  FLIGHTS.reduce((sum, f) => sum + f.miles, 0) + ARRIVAL_BONUS;
