// ============================================================
// INTERNAL TYPE DEFINITIONS
// ये types पूरे app में use होती हैं — UI, logic, scoring सब यही देखते हैं।
// कोई भी component directly API response नहीं देखता।
// ============================================================

export interface Station {
  code: string;        // "NGP"
  name: string;        // "NAGPUR"
  state: string | null;
  isJunction: boolean; // true = connecting routes calculation में use
}

export type ClassType = '1A' | '2A' | '3A' | 'SL' | 'CC' | '2S' | 'GN';

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'RAC'
  | 'WL'
  | 'REGRET'   // No more bookings
  | 'UNKNOWN'; // Not fetched yet

export type ConfirmProbability = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

// ─────────────────────────────────────────────
// Per-date availability for the 6-day slider UI
// ─────────────────────────────────────────────
export interface DatedClassAvailability {
  date: string;                         // "20-7-2026"
  availability: AvailabilityStatus;
  availableSeats?: number;              // if AVAILABLE
  waitlistNumber?: number;              // if WL — e.g. 10 from "RLWL17/WL10"
  fare: number;                         // ₹ total fare for this date
  confirmProbabilityPercent: number;    // 0-100
  confirmProbability: ConfirmProbability;
  altSeatStatus?: string;              // "AVAILABLE-0067" or "RAC 72"
  altSeatFare?: number;
  hasAlternateSeat: boolean;
}

// ─────────────────────────────────────────────
// Class availability for ONE class on ONE train for the JOURNEY DATE
// Also includes the next-6-dates data for the UI slider
// ─────────────────────────────────────────────
export interface ClassAvailability {
  classType: ClassType;
  availability: AvailabilityStatus;     // for the journey date
  availableSeats?: number;
  waitlistNumber?: number;
  fare: number;                         // ₹ for journey date
  confirmProbabilityPercent?: number;   // 0-100 (from irctc API)
  confirmProbability: ConfirmProbability;
  statusText?: string;                  // Raw text from API
  nextDatesAvailability: DatedClassAvailability[]; // next 6 run dates
}

// ─────────────────────────────────────────────
// One train journey segment (leg)
// Direct route = 1 leg. Connecting route = 2+ legs.
// ─────────────────────────────────────────────
export interface TrainLeg {
  trainNumber: string;      // "12642"
  trainName: string;        // "Thirukkural SF Express"
  trainType: string;        // "SUF", "EXP", "MEM"
  fromStation: Station;
  toStation: Station;
  trainOriginStation?: Station;
  trainDestinationStation?: Station;
  boardingStation?: Station;
  droppingStation?: Station;
  departureTime: string;    // "22:25" (HH:MM)
  arrivalTime: string;      // "04:05"
  departureDayOffset: number; // 0 = day of journey
  arrivalDayOffset: number;   // 2 = 2 days after departure
  durationMinutes: number;  // 1780
  journeyDate: string;      // "20-07-2026" (DD-MM-YYYY)
  classes: ClassAvailability[];
  runningDays: string[];    // ["Mon", "Sat"]
  distanceKm: number;       // 1843
  totalHalts: number;       // 15
  hasPantry: boolean;
}

export type RouteTag =
  | 'direct'
  | 'connecting'
  | 'cheapest'
  | 'fastest'
  | 'best-availability'
  | 'high-confirm-chance' // 🆕 Our unique selling point
  | 'hidden-quota';

// ─────────────────────────────────────────────
// A complete route (direct OR connecting)
// ─────────────────────────────────────────────
export interface Route {
  id: string;
  type: 'direct' | 'connecting';
  legs: TrainLeg[];
  totalDurationMinutes: number;
  transferStations: Station[];          // junction stations for connecting
  bestAvailability: ClassAvailability | null;
  cheapestFare: number | null;
  bestConfirmProbability: number;       // 0-100 — used for smart sorting
  tags: RouteTag[];
}
