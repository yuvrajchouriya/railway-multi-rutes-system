// ============================================================
// RAW TYPES — irctc1.p.rapidapi.com
// ये types ONLY इस API के लिए हैं।
// अगर API provider बदले, तो सिर्फ यह file और railway-api-adapter.ts बदलना होगा।
// UI और App Logic का एक भी line नहीं बदलेगा।
// ============================================================

// GET /api/v1/searchStation?query={text}
export interface IrctcStation {
  name: string;       // "NAGPUR"
  eng_name: string;   // "NAGPUR"
  code: string;       // "NGP"
  state_name: string; // "Maharashtra"
}

// GET /api/v3/trainBetweenStations
export interface IrctcTrain {
  train_number: string;       // "12642"
  train_name: string;         // "Thirukkural SF Express"
  run_days: string[];         // ["Mon", "Sat"]
  train_src: string;          // "NZM" (origin station of train)
  train_dstn: string;         // "CAPE" (final destination of train)
  from: string;               // "NGP" (search from)
  to: string;                 // "CAPE" (search to)
  from_station_name: string;  // "NAGPUR"
  to_station_name: string;    // "KANYAKUMARI"
  from_std: string;           // "22:25" (scheduled departure)
  to_std: string;             // "04:05" (scheduled arrival)
  from_sta: string;           // "22:20" (actual time)
  to_sta: string;             // "04:05"
  from_day: number;           // 0 = same day as journey start
  to_day: number;             // 2 = arrives 2 days after departure
  duration: string;           // "29:40" (HH:MM)
  distance: number;           // 1843 (km)
  halt_stn: number;           // 15 (number of halts)
  has_pantry: boolean;
  special_train: boolean;
  train_type: string;         // "SUF", "EXP", etc.
  train_date: string;         // "20-07-2026" (DD-MM-YYYY)
  class_type: string[];       // ["SL", "3A", "2A"]
}

// GET /api/v1/checkSeatAvailability
// Returns array of next 6 run dates
export interface IrctcAvailabilityEntry {
  availablity_date: string;           // "20-7-2026"
  availablity_status: string;         // "RLWL17/WL10" or "AVAILABLE-0045"
  seat_avl_text: string;              // "WAITLIST" | "AVAILABLE" | "RAC"
  seat_avl: number;                   // seats remaining / waitlist number
  ticket_fare: number;                // 800
  catering_charge: number;            // 0
  total_fare: number;                 // 800
  last_updated_at: string;            // ISO datetime
  alt_cnf_seat: boolean;              // true if alternate class has seats
  cp_percentage: number;              // 44 (Confirmation probability %)
  cp_prob: string;                    // "HIGH" | "MEDIUM" | "LOW"
  alt_seat_status: string;            // "RAC  72/RAC  70" or "AVAILABLE-0067"
  alt_seat_fare: number;              // 1005
  date: string;                       // "20-7-2026"
  confirm_probability_percent: string; // "44"
  confirm_probability: string;         // "Med" | "High" | "Low"
  current_status: string;             // same as availablity_status
}

export interface IrctcTrainSearchResponse {
  status: boolean;
  message: string;
  timestamp: number;
  data: IrctcTrain[];
}

export interface IrctcStationSearchResponse {
  status: boolean;
  message: string;
  timestamp: number;
  data: IrctcStation[];
}

export interface IrctcAvailabilityResponse {
  status: boolean;
  message: string;
  timestamp: number;
  data: IrctcAvailabilityEntry[];
}
