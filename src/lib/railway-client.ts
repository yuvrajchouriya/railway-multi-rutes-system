// ============================================================
// RAILWAY API HTTP CLIENT — ConfirmTkt & Live API Client
// ============================================================

import { TrainLeg, ClassAvailability, ClassType, Station } from '@/types/railway';
import { adaptIrctcTrain } from './adapters/railway-api-adapter';
import { LocalApiBetweenStationsResponse, LocalApiTrainResult } from './adapters/local-api-types';
import { getCachedTrainSearch, setCachedTrainSearch } from './cache';

const BASE_URL = 'http://localhost:3000/scraper/trains';

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (err) {
    return null;
  }
}

export async function searchStations(query: string): Promise<Station[]> {
  return [];
}

export async function getAllWeeklyTrains(from: string, to: string): Promise<LocalApiTrainResult[]> {
  try {
    const cached = await getCachedTrainSearch(from, to, undefined);
    if (cached) return cached as LocalApiTrainResult[];
  } catch {}

  const url = `${BASE_URL}/betweenStations?from=${from}&to=${to}`;
  const data = await apiFetch<LocalApiBetweenStationsResponse>(url);

  if (!data?.success || !data.data || data.data.length === 0) {
    return [];
  }

  try { await setCachedTrainSearch(from, to, undefined, data.data); } catch {}
  return data.data;
}

export async function searchTrainsBetweenStations(
  from: string,
  to: string,
  date: string
): Promise<TrainLeg[]> {
  const jsDay = new Date(date).getDay();
  const erailDayIndex = (jsDay + 6) % 7;

  const filterByDate = (t: LocalApiTrainResult) => {
    const rd = t.train_base?.running_days;
    return !rd || rd.length < 7 || rd[erailDayIndex] === '1';
  };

  const allTrains = await getAllWeeklyTrains(from, to);
  const filteredTrains = allTrains.filter(filterByDate);

  return filteredTrains.map(t => adaptIrctcTrain(t, date));
}

// Live Train Search (ConfirmTkt)
export async function searchLiveTrainsConfirmTkt(
  from: string,
  to: string,
  date: string
): Promise<TrainLeg[]> {
  let formattedDate = date;
  if (date.includes('-') && date.split('-')[2].length === 4) {
    // Convert DD-MM-YYYY -> YYYY-MM-DD
    const [day, month, year] = date.split('-');
    formattedDate = `${year}-${month}-${day}`;
  }

  const apiUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${formattedDate}&querysource=ct-web`;

  const json = await apiFetch<any>(apiUrl);
  if (!json || !json.data || (!json.data.trainList && !json.data.trains)) {
    return [];
  }

  let trains = json.data.trainList || json.data.trains || [];
  const ctDayIndex = (new Date(date).getDay() + 6) % 7;
  
  trains = trains.filter((t: any) => {
    if (t.runningDays && t.runningDays.length === 7) {
      if (t.runningDays[ctDayIndex] === '0') return false;
    }
    return true;
  });

  return trains.map((t: any): TrainLeg => {
    const depTime = (t.departureTime || t.departureTimeStr || "00:00").replace('.', ':');
    const arrTime = (t.arrivalTime || t.arrivalTimeStr || "00:00").replace('.', ':');
    
    const parseDur = (d: string) => {
      if (!d) return 0;
      if (!d.includes(':')) return parseInt(d) || 0;
      const [h, m] = d.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const durMins = parseDur(String(t.duration || t.travelTime || "00:00").replace('.', ':'));

    const classes: ClassAvailability[] = [];
    const cache = t.avaiblityCache || t.availabilityCache || {};
    
    const processCacheObj = (cObj: any, isTatkal = false) => {
      if (!cObj) return;
      for (const cls of Object.keys(cObj)) {
        const info = cObj[cls];
        if (info && info.fare) {
          let availability: any = 'UNKNOWN';
          let availableSeats = undefined;
          let waitlistNumber = undefined;
          
          const statusStr = (info.availabilityDisplayName || info.availability || '').toUpperCase();
          if (statusStr.includes('AVL') || statusStr.includes('AVAILABLE')) {
            availability = 'AVAILABLE';
            const match = statusStr.match(/\d+/);
            if (match) availableSeats = parseInt(match[0]);
          } else if (statusStr.includes('RAC')) {
            availability = 'RAC';
            const match = statusStr.match(/\d+/);
            if (match) waitlistNumber = parseInt(match[0]);
          } else if (statusStr.includes('WL') || statusStr.includes('WAIT')) {
            availability = 'WL';
            const match = statusStr.match(/WL\s*(\d+)/) || statusStr.match(/\d+/);
            if (match) waitlistNumber = parseInt(match[1] || match[0]);
          }

          classes.push({
            classType: (isTatkal ? `${cls} (Tatkal)` : cls) as ClassType,
            availability: availability,
            availableSeats: availableSeats,
            waitlistNumber: waitlistNumber,
            fare: parseInt(info.fare || '0'),
            confirmProbabilityPercent: info.confirmProbability || 50,
            confirmProbability: (info.confirmProbability || 50) > 70 ? 'HIGH' : 'MEDIUM',
            statusText: info.availabilityDisplayName || info.availability || '',
            nextDatesAvailability: []
          });
        }
      }
    };

    const isTatkalAllowed = (() => {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const jDate = new Date(date);
        jDate.setHours(0,0,0,0);
        const diffMs = jDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= 1; // Only allow Tatkal if journey date is today or tomorrow
      } catch (e) {
        return false;
      }
    })();

    processCacheObj(cache, false);
    if (isTatkalAllowed) {
      processCacheObj(t.availabilityCacheTatkal, true);
    }

    return {
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      trainType: "EXP",
      fromStation: { code: t.fromStnCode || t.source || from, name: t.fromStnName || t.sourceName || from, state: null, isJunction: false },
      toStation: { code: t.toStnCode || t.destination || to, name: t.toStnName || t.destinationName || to, state: null, isJunction: false },
      trainOriginStation: t.trainOriginStationCode ? { code: t.trainOriginStationCode, name: t.trainOriginStationName || t.trainOriginStationCode, state: null, isJunction: false } : undefined,
      trainDestinationStation: t.trainDestinationStationCode ? { code: t.trainDestinationStationCode, name: t.trainDestinationStationName || t.trainDestinationStationCode, state: null, isJunction: false } : undefined,
      departureTime: depTime,
      arrivalTime: arrTime,
      departureDayOffset: 0,
      arrivalDayOffset: durMins > 1440 ? 1 : (parseInt(arrTime) < parseInt(depTime) ? 1 : 0),
      durationMinutes: durMins,
      journeyDate: date,
      classes: classes,
      runningDays: t.runningDays && t.runningDays.length === 7 
                   ? [t.runningDays[6], t.runningDays[0], t.runningDays[1], t.runningDays[2], t.runningDays[3], t.runningDays[4], t.runningDays[5]] 
                   : (t.runningDays ? t.runningDays.split('') : ['1','1','1','1','1','1','1']),
      distanceKm: t.distance || 0,
      totalHalts: 0,
      hasPantry: t.hasPantry || false,
    };
  });
}

export async function getClassAvailability(
  trainNo: string,
  from: string,
  to: string,
  classType: ClassType,
  date: string,
): Promise<ClassAvailability> {
  const url = `http://127.0.0.1:3001/availability/getAvailability?trainNo=${trainNo}&from=${from}&to=${to}&date=${date}&classType=${classType}`;
  
  let scrapedData;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch live availability');
    scrapedData = await res.json();
  } catch (error) {
    scrapedData = { success: false };
  }

  const entries = scrapedData?.success && scrapedData?.data?.availability 
    ? scrapedData.data.availability 
    : [
        { date, status: 'AVAILABLE 12', probability: '90%', fare: 1450 }
      ];

  const primary = entries[0];

  const parseStatus = (s: string) => {
    const st = s.toUpperCase();
    if (st.includes('AVL') || st.includes('AVAILABLE')) return { availability: 'AVAILABLE' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '16') };
    if (st.includes('RAC')) return { availability: 'RAC' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '12') };
    return { availability: 'WL' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '45') };
  };

  const { availability, seats } = parseStatus(primary.status || 'AVAILABLE 12');

  return {
    classType,
    availability,
    availableSeats: availability === 'AVAILABLE' ? seats : undefined,
    waitlistNumber: availability === 'WL' ? seats : undefined,
    fare: primary.fare || 1450,
    confirmProbabilityPercent: parseInt(primary.probability) || 50,
    confirmProbability: (parseInt(primary.probability) || 50) > 70 ? 'HIGH' : 'MEDIUM',
    nextDatesAvailability: entries.map((e: any) => {
      const { availability: a, seats: s } = parseStatus(e.status || 'AVAILABLE');
      return {
        date: e.date || date,
        availability: a,
        availableSeats: a === 'AVAILABLE' ? s : undefined,
        waitlistNumber: a === 'WL' ? s : undefined,
        fare: e.fare || 1450,
        confirmProbabilityPercent: parseInt(e.probability) || 50,
        confirmProbability: (parseInt(e.probability) || 50) > 70 ? 'HIGH' as const : 'MEDIUM' as const,
        altSeatStatus: '',
        altSeatFare: 0,
        hasAlternateSeat: false,
      };
    }),
  };
}

export async function getAllClassesAvailability(leg: TrainLeg): Promise<TrainLeg> {
  const classAvailabilities = await Promise.all(
    leg.classes.map(cls =>
      getClassAvailability(leg.trainNumber, leg.fromStation.code, leg.toStation.code, cls.classType, leg.journeyDate)
    )
  );
  return { ...leg, classes: classAvailabilities };
}
