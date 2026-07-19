// ============================================================
// LOCAL SCRAPER API TYPES (erail.in scraper from ZIP)
// ============================================================

export interface LocalApiTrainBase {
  train_no: string;
  train_name: string;
  source_stn_name: string;
  source_stn_code: string;
  dstn_stn_name: string;
  dstn_stn_code: string;
  from_stn_name: string;
  from_stn_code: string;
  to_stn_name: string;
  to_stn_code: string;
  from_time: string; // e.g. "16.55"
  to_time: string;   // e.g. "08.35"
  travel_time: string; // e.g. "15.40"
  running_days: string; // e.g. "1111111"
}

export interface LocalApiTrainResult {
  train_base: LocalApiTrainBase;
}

export interface LocalApiBetweenStationsResponse {
  success: boolean;
  time_stamp: number;
  data: LocalApiTrainResult[];
}
