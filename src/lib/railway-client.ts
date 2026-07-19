// ============================================================
// RAILWAY API HTTP CLIENT — LOCAL SCRAPER (erail.in)
// ============================================================

import { TrainLeg, ClassAvailability, ClassType, Station } from '@/types/railway';
import { adaptIrctcTrain } from './adapters/railway-api-adapter';
import { LocalApiBetweenStationsResponse, LocalApiTrainResult } from './adapters/local-api-types';
import { getMockAvailability } from './adapters/mock';
import { getCachedTrainSearch, setCachedTrainSearch } from './cache';
import { pushLog } from '@/app/api/logs/route';

// Route through Next.js rewrite proxy → http://127.0.0.1:3001/trains
// This avoids server-side fetch restrictions to localhost
const BASE_URL = 'http://localhost:3000/scraper/trains';

// ─────────────────────────────────────────────
// Generic fetch wrapper
// ─────────────────────────────────────────────
async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      pushLog(`❌ API Error ${res.status}: ${url}`);
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    pushLog(`❌ Fetch failed: ${url} — ${(err as Error).message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// 1. Station search (local list only)
// ─────────────────────────────────────────────
export async function searchStations(query: string): Promise<Station[]> {
  return [];
}

// ─────────────────────────────────────────────
// 2. Trains between stations
// ─────────────────────────────────────────────
export async function getAllWeeklyTrains(from: string, to: string): Promise<LocalApiTrainResult[]> {
  try {
    const cached = await getCachedTrainSearch(from, to, undefined);
    if (cached) {
      pushLog(`💾 CACHE HIT (Weekly): ${from}→${to}`);
      return cached as LocalApiTrainResult[];
    }
  } catch {}

  pushLog(`📡 LOCAL API: GET /trains/betweenStations?from=${from}&to=${to}`);
  const url = `${BASE_URL}/betweenStations?from=${from}&to=${to}`;
  const data = await apiFetch<LocalApiBetweenStationsResponse>(url);

  if (!data?.success || !data.data || data.data.length === 0) {
    pushLog(`⚠️  No trains found on route: ${from}→${to}`);
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

  const jsDay = new Date(date).getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const erailDayIndex = (jsDay + 6) % 7; // 0 = Mon, 1 = Tue, ..., 6 = Sun

  const filterByDate = (t: LocalApiTrainResult) => {
    const rd = t.train_base?.running_days;
    return !rd || rd.length < 7 || rd[erailDayIndex] === '1';
  };

  const allTrains = await getAllWeeklyTrains(from, to);
  const filteredTrains = allTrains.filter(filterByDate);
  
  if (allTrains.length > 0) {
    pushLog(`✅ Found ${filteredTrains.length} train(s) running on ${date}: ${from}→${to} (out of ${allTrains.length} total)`);
  }

  return filteredTrains.map(t => adaptIrctcTrain(t, date));
}

// ─────────────────────────────────────────────
// 2.5 Live Train Search (ConfirmTkt) - All-In-One
// ─────────────────────────────────────────────
export async function searchLiveTrainsConfirmTkt(
  from: string,
  to: string,
  date: string
): Promise<TrainLeg[]> {
  // Format Date for ConfirmTkt API (DD-MM-YYYY)
  let formattedDate = date;
  if (date.includes('-') && date.split('-')[0].length === 4) {
    const [year, month, day] = date.split('-');
    formattedDate = `${day}-${month}-${year}`;
  }

  const apiUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${formattedDate}&querysource=ct-web`;
  pushLog(`📡 LIVE API: GET ${apiUrl}`);

  const json = await apiFetch<any>(apiUrl);
  if (!json || !json.data || (!json.data.trainList && !json.data.trains)) {
    pushLog(`⚠️ No live trains found or API failed for ${from}→${to}`);
    return [];
  }

  let trains = json.data.trainList || json.data.trains || [];
  
  // Filter out trains that don't run on the requested date
  const jsDay = new Date(formattedDate.split('-').reverse().join('-')).getDay(); // Date is DD-MM-YYYY, so parse correctly or use the YYYY-MM-DD date parameter
  const ctDayIndex = (new Date(date).getDay() + 6) % 7; // ConfirmTkt index: 0=Mon, ..., 6=Sun
  
  trains = trains.filter((t: any) => {
      if (t.runningDays && t.runningDays.length === 7) {
          if (t.runningDays[ctDayIndex] === '0') return false;
      }
      return true;
  });

  pushLog(`✅ LIVE API: Found ${trains.length} trains running on ${date}`);

  return trains.map((t: any): TrainLeg => {
    // Parse times (e.g. "16:55" or "16.55")
    const depTime = (t.departureTime || t.departureTimeStr || "00:00").replace('.', ':');
    const arrTime = (t.arrivalTime || t.arrivalTimeStr || "00:00").replace('.', ':');
    
    // Convert duration string "15:40" or raw minutes "390" to minutes
    const parseDur = (d: string) => {
      if (!d) return 0;
      if (!d.includes(':')) return parseInt(d) || 0; // Already in minutes or plain number
      const [h, m] = d.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const durMins = parseDur(String(t.duration || t.travelTime || "00:00").replace('.', ':'));

    const classes: ClassAvailability[] = [];
    const cache = t.avaiblityCache || t.availabilityCache || {};
    
    // Check if ConfirmTkt returned data for the requested date. If not, it's returning old cached data!
    const isSameDate = String(t.departureDate) === String(formattedDate);
    
    if (!isSameDate) {
       const allCls = t.avlClasses || Object.keys(cache) || ['SL', '3A', '2A', '1A'];
       for (const cls of allCls) {
           classes.push({
             classType: cls as ClassType,
             availability: 'UNKNOWN',
             availableSeats: undefined,
             waitlistNumber: undefined,
             fare: 0,
             confirmProbabilityPercent: 0,
             confirmProbability: 'MEDIUM',
             statusText: 'Not Available',
             nextDatesAvailability: []
           });
       }
    } else {
      // Parse live classes from ConfirmTkt's availabilityCache
      for (const cls of Object.keys(cache)) {
        const info = cache[cls];
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
        } else if (statusStr.includes('REGRET')) {
          availability = 'UNKNOWN'; // Maps to regret in UI logic usually, but keep simple here
        }

        classes.push({
          classType: cls as ClassType,
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
    } // Close else block

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


// ─────────────────────────────────────────────
// 3. Seat availability (Mock — no real API yet)
// ─────────────────────────────────────────────
export async function getClassAvailability(
  trainNo: string,
  from: string,
  to: string,
  classType: ClassType,
  date: string,
): Promise<ClassAvailability> {
  
  const url = `http://127.0.0.1:3001/availability/getAvailability?trainNo=${trainNo}&from=${from}&to=${to}&date=${date}&classType=${classType}`;
  pushLog(`[Scraper] GET ${url}`);
  
  let scrapedData;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch live availability');
    scrapedData = await res.json();
  } catch (error) {
    pushLog(`[Scraper Error] ${error}`);
    scrapedData = { success: false };
  }

  // Fallback to mock logic if scraper fails or returns no data
  const entries = scrapedData?.success && scrapedData?.data?.availability 
    ? scrapedData.data.availability 
    : getMockAvailability(date).map(e => ({
        date: e.JourneyDate,
        status: e.Availability,
        probability: e.Confirm + '%',
        fare: 1450
      }));

  const primary = entries[0];

  const parseStatus = (s: string) => {
    const st = s.toUpperCase();
    if (st.includes('AVL') || st.includes('AVAILABLE')) return { availability: 'AVAILABLE' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '16') };
    if (st.includes('RAC')) return { availability: 'RAC' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '12') };
    return { availability: 'WL' as const, seats: parseInt(st.replace(/[^0-9]/g, '') || '45') };
  };

  const { availability, seats } = parseStatus(primary.status);

  return {
    classType,
    availability,
    availableSeats: availability === 'AVAILABLE' ? seats : undefined,
    waitlistNumber: availability === 'WL' ? seats : undefined,
    fare: primary.fare || 1450,
    confirmProbabilityPercent: parseInt(primary.probability) || 50,
    confirmProbability: (parseInt(primary.probability) || 50) > 70 ? 'HIGH' : 'MEDIUM',
    nextDatesAvailability: entries.map((e: any) => {
      const { availability: a, seats: s } = parseStatus(e.status);
      return {
        date: e.date,
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

// ─────────────────────────────────────────────
// 4. All classes for one train
// ─────────────────────────────────────────────
export async function getAllClassesAvailability(leg: TrainLeg): Promise<TrainLeg> {
  const classAvailabilities = await Promise.all(
    leg.classes.map(cls =>
      getClassAvailability(leg.trainNumber, leg.fromStation.code, leg.toStation.code, cls.classType, leg.journeyDate)
    )
  );
  return { ...leg, classes: classAvailabilities };
}
