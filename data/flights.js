// Flight schedule for Chloe's journey: Seattle -> JFK -> Dubai -> Durban
//
// Times sourced from rclcrewtravel.com itinerary (reservation LXFDRQ).
// ISO 8601 strings include the airport's local timezone offset.
//
// Time zones (May 2026, post-DST):
//   PDT  = America/Los_Angeles  (-07:00)
//   EDT  = America/New_York     (-04:00)
//   GST  = Asia/Dubai           (+04:00, no DST)
//   SAST = Africa/Johannesburg  (+02:00, no DST)

export const TRAVELER = 'Chloe';

export const FLIGHTS = [
  {
    num: 'AS0022',
    airline: 'Alaska Airlines',
    dep: { code: 'SEA', city: 'Seattle',  iso: '2026-05-08T22:53:00-07:00' },
    arr: { code: 'JFK', city: 'New York', iso: '2026-05-09T07:20:00-04:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/ASA22',
    // Poetic regions for the in-flight hero copy. {progress: 0..1, region: '...'}
    regions: [
      { at: 0.05, label: 'the Cascades' },
      { at: 0.30, label: 'the Rocky Mountains' },
      { at: 0.55, label: 'the Great Plains' },
      { at: 0.80, label: 'the Great Lakes' },
      { at: 0.95, label: 'the Hudson Valley' },
    ],
  },
  {
    num: 'EK0204',
    airline: 'Emirates',
    dep: { code: 'JFK', city: 'New York', iso: '2026-05-09T11:20:00-04:00' },
    arr: { code: 'DXB', city: 'Dubai',    iso: '2026-05-10T07:55:00+04:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/UAE204',
    regions: [
      { at: 0.05, label: 'the North Atlantic' },
      { at: 0.25, label: 'Greenland' },
      { at: 0.45, label: 'the North Sea' },
      { at: 0.65, label: 'Eastern Europe' },
      { at: 0.85, label: 'the Caspian Sea' },
      { at: 0.95, label: 'the Persian Gulf' },
    ],
  },
  {
    num: 'EK0775',
    airline: 'Emirates',
    dep: { code: 'DXB', city: 'Dubai',  iso: '2026-05-10T10:15:00+04:00' },
    arr: { code: 'DUR', city: 'Durban', iso: '2026-05-10T16:35:00+02:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/UAE775',
    regions: [
      { at: 0.05, label: 'the Arabian Sea' },
      { at: 0.35, label: 'the Indian Ocean' },
      { at: 0.65, label: 'the Mozambique Channel' },
      { at: 0.85, label: 'the South African coast' },
      { at: 0.95, label: 'KwaZulu-Natal' },
    ],
  },
];

// Bonus awarded on full-journey completion.
export const ARRIVAL_BONUS = 500;

// Total possible Nook Miles — derived from the data above.
export const TOTAL_MILES =
  FLIGHTS.reduce((sum, f) => sum + f.miles, 0) + ARRIVAL_BONUS;
