// Flight schedule for Chloe's journey: Seattle -> London -> Johannesburg -> Durban
//
// ISO 8601 strings include the airport's local timezone offset.
//
// Time zones (May 2026, post-DST):
//   PDT  = America/Los_Angeles  (-07:00)
//   BST  = Europe/London        (+01:00, summer time)
//   SAST = Africa/Johannesburg  (+02:00, no DST)

export const TRAVELER = 'Chloe';

export const FLIGHTS = [
  {
    num: 'VS0106',
    airline: 'Virgin Atlantic',
    dep: { code: 'SEA', city: 'Seattle', iso: '2026-05-08T18:20:00-07:00' },
    arr: { code: 'LHR', city: 'London',  iso: '2026-05-09T12:10:00+01:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/VIR106',
    regions: [
      { at: 0.05, label: 'the Cascades' },
      { at: 0.25, label: 'the Canadian Prairies' },
      { at: 0.50, label: 'Hudson Bay' },
      { at: 0.75, label: 'Greenland' },
      { at: 0.90, label: 'the North Atlantic' },
      { at: 0.97, label: 'the British Isles' },
    ],
  },
  {
    num: 'VS0449',
    airline: 'Virgin Atlantic',
    dep: { code: 'LHR', city: 'London',       iso: '2026-05-09T20:50:00+01:00' },
    arr: { code: 'JNB', city: 'Johannesburg', iso: '2026-05-10T08:50:00+02:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/VIR449',
    regions: [
      { at: 0.05, label: 'the English Channel' },
      { at: 0.20, label: 'France' },
      { at: 0.40, label: 'the Mediterranean' },
      { at: 0.60, label: 'the Sahara' },
      { at: 0.80, label: 'the Equator' },
      { at: 0.95, label: 'Southern Africa' },
    ],
  },
  {
    num: 'SA0547',
    airline: 'South African Airways',
    dep: { code: 'JNB', city: 'Johannesburg', iso: '2026-05-10T11:05:00+02:00' },
    arr: { code: 'DUR', city: 'Durban',       iso: '2026-05-10T12:15:00+02:00' },
    miles: 300,
    flightAwareUrl: 'https://flightaware.com/live/flight/SAA547',
    regions: [
      { at: 0.10, label: 'the Witwatersrand' },
      { at: 0.40, label: 'the Drakensberg' },
      { at: 0.70, label: 'KwaZulu-Natal' },
      { at: 0.95, label: 'the Durban coast' },
    ],
  },
];

// Bonus awarded on full-journey completion.
export const ARRIVAL_BONUS = 500;

// Total possible Nook Miles — derived from the data above.
export const TOTAL_MILES =
  FLIGHTS.reduce((sum, f) => sum + f.miles, 0) + ARRIVAL_BONUS;
