// ============================================================
// MOCK DATA for Development (Local Scraper API Format)
// ============================================================
import { IndianRailAvailabilityEntry } from './indianrail-types';
import { LocalApiTrainResult } from './local-api-types';

export const getMockTrains = (from: string, to: string, date: string): LocalApiTrainResult[] => {
  return [
    {
      train_base: {
        train_no: "12616",
        train_name: "GRAND TRUNK EXP",
        source_stn_name: from,
        source_stn_code: from,
        dstn_stn_name: to,
        dstn_stn_code: to,
        from_stn_name: from,
        from_stn_code: from,
        to_stn_name: to,
        to_stn_code: to,
        from_time: "16.10",
        to_time: "15.20",
        travel_time: "23.10",
        running_days: "1111111"
      }
    },
    {
      train_base: {
        train_no: "12434",
        train_name: "RAJDHANI EXP",
        source_stn_name: from,
        source_stn_code: from,
        dstn_stn_name: to,
        dstn_stn_code: to,
        from_stn_name: from,
        from_stn_code: from,
        to_stn_name: to,
        to_stn_code: to,
        from_time: "20.00",
        to_time: "14.15",
        travel_time: "18.15",
        running_days: "1011101"
      }
    }
  ];
};

export const getMockAvailability = (date: string): IndianRailAvailabilityEntry[] => {
  return [
    {
      JourneyDate: date,
      Availability: "AVAILABLE-16",
      Confirm: "85 %"
    },
    {
      JourneyDate: "Next Date 1",
      Availability: "RAC12",
      Confirm: "65 %"
    },
    {
      JourneyDate: "Next Date 2",
      Availability: "GNWL45/WL23",
      Confirm: "30 %"
    }
  ];
};
