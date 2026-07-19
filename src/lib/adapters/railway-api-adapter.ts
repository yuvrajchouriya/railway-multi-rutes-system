// ============================================================
// ADAPTER — Local Scraper API (ZIP) → Internal Format
// ============================================================

import {
  TrainLeg,
  ClassAvailability,
  DatedClassAvailability,
  Station,
  ClassType,
  AvailabilityStatus,
  ConfirmProbability,
} from '@/types/railway';

import { LocalApiTrainResult } from './local-api-types';

// ─────────────────────────────────────────────
// Helper: "15.40" → 940 minutes
// ─────────────────────────────────────────────
function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr) return 0;
  const [hh, mm] = durationStr.split('.').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

// ─────────────────────────────────────────────
// Adapt one LocalApiTrainResult → TrainLeg 
// ─────────────────────────────────────────────
export function adaptIrctcTrain(rawWrapper: LocalApiTrainResult, searchDate: string): TrainLeg {
  const raw = rawWrapper.train_base;

  const fromStation: Station = {
    code: raw.from_stn_code,
    name: raw.from_stn_name,
    state: null,
    isJunction: false,
  };

  const toStation: Station = {
    code: raw.to_stn_code,
    name: raw.to_stn_name,
    state: null,
    isJunction: false,
  };

  // The local scraper doesn't provide class types directly in betweenStations, 
  // so we assume standard classes for the UI mock.
  const classes: ClassAvailability[] = (["1A", "2A", "3A", "SL"] as ClassType[]).map((cls) => ({
    classType: cls,
    availability: 'UNKNOWN' as AvailabilityStatus,
    availableSeats: undefined,
    waitlistNumber: undefined,
    fare: 0,
    confirmProbabilityPercent: undefined,
    confirmProbability: 'UNKNOWN' as ConfirmProbability,
    nextDatesAvailability: [],
  }));

  // Clean time format from "16.55" -> "16:55"
  const cleanTime = (t: string) => t ? t.replace('.', ':') : t;

  const rd = raw.running_days || '1111111';
  const uiRunningDays = rd.length === 7 ? [rd[6], rd[0], rd[1], rd[2], rd[3], rd[4], rd[5]] : rd.split('');

  return {
    trainNumber: raw.train_no,
    trainName: raw.train_name,
    trainType: "EXP", // Scraper doesn't give type explicitly in this endpoint
    fromStation,
    toStation,
    departureTime: cleanTime(raw.from_time),
    arrivalTime: cleanTime(raw.to_time),
    departureDayOffset: 0, 
    arrivalDayOffset: parseDurationToMinutes(raw.travel_time) > 1440 ? 1 : 0, 
    durationMinutes: parseDurationToMinutes(raw.travel_time),
    journeyDate: searchDate,
    classes,
    runningDays: uiRunningDays,
    distanceKm: 0, // Scraper doesn't give distance in this endpoint
    totalHalts: 0,
    hasPantry: false,
  };
}
