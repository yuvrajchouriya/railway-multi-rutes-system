// ============================================================
// ROUTE FINDER — Direct + Connecting routes
//
// 🔒 API CALL BUDGET TRACKING:
//   Direct search:       1 call
//   Connecting search:   5 junctions × 2 legs = 10 calls
//   Availability:        N trains × M classes = many calls
//
// ⚡ STRATEGY (Free plan = 10 calls/month):
//   1. ALWAYS check Supabase cache FIRST (0 API calls if cached)
//   2. ONLY make 1 real API call: direct trains only
//   3. Connecting routes use MOCK data (never waste API calls)
//   4. Availability uses MOCK data when API is exhausted
// ============================================================

import { Route, TrainLeg } from '@/types/railway';
import { searchTrainsBetweenStations, getAllWeeklyTrains, searchLiveTrainsConfirmTkt } from './railway-client';
import { adaptIrctcTrain } from './adapters/railway-api-adapter';
import { pushLog } from '@/app/api/logs/route';
import { calculateDistanceKm } from './geo';

  // Top junctions pool for connecting route search
const JUNCTIONS = [
  'NGP', 'ET', 'BZA', 'MAS', 'SC', 'NDLS', 'HWH', 'BSL', 'JP', 'LKO', 
  'CNB', 'BPL', 'DDU', 'PRYJ', 'KGP', 'BBS', 'VSKP', 'RU', 'ERS', 'ADI',
  'ST', 'BRC', 'RTM', 'KOTA', 'AGC', 'MTJ', 'UMB', 'LDH', 'ASR', 'JAT'
];

// 30 min to 8 hours layover rule
const MIN_LAYOVER_MINUTES = 30;
const MAX_LAYOVER_MINUTES = 480;

// Long distance threshold (km) to force multi-route search
const LONG_DISTANCE_KM = 300;

// Metropolitan City Groups mapping
const CITY_GROUPS: Record<string, string[]> = {
  'DELHI_ALL': ['NDLS', 'DLI', 'NZM', 'ANVT', 'DEE'],
  'MUMBAI_ALL': ['CSMT', 'LTT', 'DR', 'BDTS', 'BCT', 'MMCT'],
  'KOLKATA_ALL': ['HWH', 'SDAH', 'KOAA', 'SHM'],
  'CHENNAI_ALL': ['MAS', 'MS', 'TBM'],
  'BANGALORE_ALL': ['SBC', 'YPR', 'BNC', 'KJM'],
  'HYDERABAD_ALL': ['SC', 'HYB', 'KCG'],
  'JBPN': ['JBP']
};

export async function findDirectRoutes(
  from: string,
  to: string,
  date: string
): Promise<Route[]> {

  const fromStations = CITY_GROUPS[from] || [from];
  const toStations = CITY_GROUPS[to] || [to];

  pushLog(`🔍 New direct search: ${from} ➔ ${to} on ${date}`);

  let allDirectTrains: TrainLeg[] = [];
  
  // Parallel search for all combinations of origin/destination
  const searchPromises = [];
  for (const f of fromStations) {
    for (const t of toStations) {
      searchPromises.push(searchLiveTrainsConfirmTkt(f, t, date));
    }
  }

  const resultsArray = await Promise.all(searchPromises);
  resultsArray.forEach(trains => {
    allDirectTrains = allDirectTrains.concat(trains);
  });

  pushLog(`🟢 Direct trains: ${allDirectTrains.length} found across groups`);

  let allDirectRoutes: Route[] = allDirectTrains.map((leg, idx) => ({
    id: `direct-${leg.trainNumber}-${idx}`,
    type: 'direct' as const,
    legs: [leg],
    totalDurationMinutes: leg.durationMinutes,
    transferStations: [],
    bestAvailability: null,
    cheapestFare: null,
    bestConfirmProbability: 0,
    tags: ['direct'],
  }));

  // Sort by shortest duration (Fastest direct)
  allDirectRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);

  // Filter out any duplicate trains by train number (since parallel searches might return overlapping routes)
  const deduplicatedDirectRoutes: Route[] = [];
  const seenTrains = new Set();
  for (const r of allDirectRoutes) {
    if (!seenTrains.has(r.legs[0].trainNumber)) {
      seenTrains.add(r.legs[0].trainNumber);
      deduplicatedDirectRoutes.push(r);
    }
  }

  // Duplicate routes for hidden quota (if train origin/dest differ from passenger search)
  const hiddenQuotaRoutes: Route[] = [];
  deduplicatedDirectRoutes.forEach((route, idx) => {
    const leg = route.legs[0];
    const isOriginDifferent = leg.trainOriginStation && leg.trainOriginStation.code !== leg.fromStation.code;
    const isDestDifferent = leg.trainDestinationStation && leg.trainDestinationStation.code !== leg.toStation.code;
    
    if (isOriginDifferent) {
      const originLeg: TrainLeg = {
        ...leg,
        boardingStation: leg.fromStation,
        droppingStation: leg.toStation,
        fromStation: leg.trainOriginStation!,
        toStation: leg.toStation
      };
      hiddenQuotaRoutes.push({
        id: `hidden-quota-origin-${originLeg.trainNumber}-${idx}`,
        type: 'direct',
        legs: [originLeg],
        totalDurationMinutes: originLeg.durationMinutes,
        transferStations: [],
        bestAvailability: null,
        cheapestFare: null,
        bestConfirmProbability: 0,
        tags: ['hidden-quota', 'high-confirm-chance'],
      });
    }

    if (isDestDifferent) {
      const destLeg: TrainLeg = {
        ...leg,
        boardingStation: leg.fromStation,
        droppingStation: leg.toStation,
        fromStation: leg.fromStation,
        toStation: leg.trainDestinationStation!
      };
      hiddenQuotaRoutes.push({
        id: `hidden-quota-dest-${destLeg.trainNumber}-${idx}`,
        type: 'direct',
        legs: [destLeg],
        totalDurationMinutes: destLeg.durationMinutes,
        transferStations: [],
        bestAvailability: null,
        cheapestFare: null,
        bestConfirmProbability: 0,
        tags: ['hidden-quota', 'high-confirm-chance'],
      });
    }
    
    if (isOriginDifferent && isDestDifferent) {
      const fullLeg: TrainLeg = {
        ...leg,
        boardingStation: leg.fromStation,
        droppingStation: leg.toStation,
        fromStation: leg.trainOriginStation!,
        toStation: leg.trainDestinationStation!
      };
      
      hiddenQuotaRoutes.push({
        id: `hidden-quota-full-${fullLeg.trainNumber}-${idx}`,
        type: 'direct',
        legs: [fullLeg],
        totalDurationMinutes: fullLeg.durationMinutes,
        transferStations: [],
        bestAvailability: null,
        cheapestFare: null,
        bestConfirmProbability: 0,
        tags: ['hidden-quota', 'high-confirm-chance'],
      });
    }
  });

  const finalDirectRoutes: Route[] = [...deduplicatedDirectRoutes, ...hiddenQuotaRoutes];
  return finalDirectRoutes;
}

export async function findConnectingRoutes(
  from: string,
  to: string,
  date: string,
  fastestDirectDurationMinutes: number | null = null,
  onRouteFound?: (route: Route) => void
): Promise<Route[]> {

  const fromStations = CITY_GROUPS[from] || [from];
  const toStations = CITY_GROUPS[to] || [to];
  const connectingRoutes: Route[] = [];

  const tripDistance = calculateDistanceKm(from, to);
  pushLog(`📏 Trip Distance: ${tripDistance === Infinity ? 'Unknown' : tripDistance + ' km'}`);

  const hasDirectTrains = fastestDirectDurationMinutes !== null;

  // Skip connecting search if we already have direct trains AND trip is short
  if (hasDirectTrains && tripDistance < LONG_DISTANCE_KM) {
    pushLog(`⏩ Short trip with direct trains found, skipping connecting routes`);
    return connectingRoutes;
  }

  const getMaxAllowedDurationMinutes = (fastestMins: number | null) => {
    if (fastestMins === null) return Infinity;
    const hours = fastestMins / 60;
    if (hours < 5) return fastestMins + (2 * 60);
    if (hours < 10) return fastestMins + (3 * 60);
    if (hours < 15) return fastestMins + (5 * 60);
    if (hours < 20) return fastestMins + (7 * 60);
    if (hours < 30) return fastestMins + (10 * 60);
    if (hours < 40) return fastestMins + (13 * 60);
    return fastestMins + (15 * 60);
  };
  
  const maxAllowedDuration = getMaxAllowedDurationMinutes(fastestDirectDurationMinutes);

  // --- Connecting Routes Engine ---
  // (We use the primary station if a group is provided to simplify connecting calculations)
  const primaryFrom = fromStations[0];
  const primaryTo = toStations[0];

  if (hasDirectTrains) {
    pushLog('⏩ Direct trains are available. Searching for smart connecting alternatives...');
  } else {
    pushLog('❌ No direct trains found! Searching for connecting routes via hubs...');
  }

  // Find best junctions by minimizing detour distance: dist(primaryFrom, J) + dist(J, primaryTo)
  const junctionScores = JUNCTIONS
    .filter(j => j !== primaryFrom && j !== primaryTo)
    .map(j => {
      const d1 = calculateDistanceKm(primaryFrom, j);
      const d2 = calculateDistanceKm(j, primaryTo);
      return { junction: j, detourDist: d1 + d2, valid: d1 !== Infinity && d2 !== Infinity };
    })
    .filter(j => j.valid)
    .sort((a, b) => a.detourDist - b.detourDist);

  // Take top 8 best geographically placed junctions for more route options
  const relevantJunctions = junctionScores.length > 0 
    ? junctionScores.slice(0, 8).map(j => j.junction)
    : JUNCTIONS.filter(j => j !== primaryFrom && j !== primaryTo).slice(0, 8); // fallback

  const dayOfWeek = new Date(date).getDay();

  const parseT = (t: string) => {
    if (!t) return 0;
    const parts = t.includes('.') ? t.split('.') : t.split(':');
    return parseInt(parts[0]||'0')*60 + parseInt(parts[1]||'0');
  };

  for (const junction of relevantJunctions) {
    if (calculateDistanceKm(primaryFrom, junction) < 30) {
      pushLog(`[ROUTE FINDER] Skipping junction ${junction}: too close to origin (<30km)`);
      continue;
    }
    if (calculateDistanceKm(junction, primaryTo) < 30) {
      pushLog(`[ROUTE FINDER] Skipping junction ${junction}: too close to destination (<30km)`);
      continue;
    }

    pushLog(`[ROUTE FINDER] Checking connecting via ${junction}`);
    const leg1Weekly = await getAllWeeklyTrains(primaryFrom, junction);
    const leg2Weekly = await getAllWeeklyTrains(junction, primaryTo);

    if (leg1Weekly.length === 0 || leg2Weekly.length === 0) {
      pushLog(`[ROUTE FINDER] No trains for ${primaryFrom}➔${junction} or ${junction}➔${primaryTo}`);
      continue;
    }

    const leg1Today = leg1Weekly.filter(t => {
      const rd = t.train_base?.running_days;
      const erailDayIndex = (dayOfWeek + 6) % 7; // 0=Mon, ..., 6=Sun
      return !rd || rd.length < 7 || rd[erailDayIndex] === '1';
    });

    let foundForJunction = 0;

    for (const l1 of leg1Today) {
      if (foundForJunction >= 6) break; // Limit 6 routes per junction

      const leg1: TrainLeg = adaptIrctcTrain(l1, date);
      
      const l1Dep = parseT(l1.train_base.from_time);
      const l1Arr = parseT(l1.train_base.to_time);
      const leg1ArrDayOffset = l1Arr < l1Dep ? 1 : 0;
      const leg1ArrivalMins = leg1ArrDayOffset * 1440 + l1Arr;

      // Find matching leg2
      for (const l2 of leg2Weekly) {
         const l2DepTime = parseT(l2.train_base.from_time);
         
         let layover = l2DepTime - l1Arr; // Compare against wall-clock arrival
         let leg2DepartureDayOffset = leg1ArrDayOffset; 
         
         if (layover < MIN_LAYOVER_MINUTES) {
            layover += 1440; // Push to next day
            leg2DepartureDayOffset += 1;
         }

         if (layover >= MIN_LAYOVER_MINUTES && layover <= MAX_LAYOVER_MINUTES) {
            const jsDepartureDay = (dayOfWeek + leg2DepartureDayOffset) % 7;
            const requiredDayOfWeek = (jsDepartureDay + 6) % 7; // 0=Mon, ..., 6=Sun
            const rd = l2.train_base?.running_days;
            if (!rd || rd.length < 7 || rd[requiredDayOfWeek] === '1') {
               
               const leg2DateObj = new Date(date);
               leg2DateObj.setDate(leg2DateObj.getDate() + leg2DepartureDayOffset);
               const leg2DateStr = leg2DateObj.toISOString().split('T')[0];

               const leg2: TrainLeg = adaptIrctcTrain(l2, leg2DateStr);
               
               // Override offsets for the full route timeline
               leg2.departureDayOffset = leg2DepartureDayOffset;
               leg2.arrivalDayOffset = leg2DepartureDayOffset + (parseT(l2.train_base.to_time) < parseT(l2.train_base.from_time) ? 1 : 0);

               const totalDuration = leg1.durationMinutes + layover + leg2.durationMinutes;

               if (totalDuration > maxAllowedDuration) {
                   continue;
               }

               const route = {
                 id: `conn-${junction}-${leg1.trainNumber}-${leg2.trainNumber}`,
                 type: 'connecting' as const,
                 legs: [leg1, leg2],
                 totalDurationMinutes: totalDuration,
                 transferStations: [{ code: junction, name: leg2.fromStation.name, state: null, isJunction: true }],
                 bestAvailability: null,
                 cheapestFare: null,
                 bestConfirmProbability: 0,
                 tags: ['connecting'] as any,
               };
               connectingRoutes.push(route);
               if (onRouteFound) onRouteFound(route);
               foundForJunction++;
               break; 
            }
         }
      }
      if (foundForJunction > 0) {
        pushLog(`    ✔️ Found ${foundForJunction} trains from ${junction} -> Destination`);
      }

      // Add small delay to avoid hitting mock API rate limits locally
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Sort connecting routes by total duration
  connectingRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);

  return connectingRoutes;
}

export async function findRoutes(
  from: string,
  to: string,
  date: string
): Promise<{ directRoutes: Route[]; connectingRoutes: Route[] }> {
  const directRoutes = await findDirectRoutes(from, to, date);
  const connectingRoutes = await findConnectingRoutes(from, to, date, directRoutes.length > 0);
  
  // Time-based Intelligence Filter: Remove connecting routes that are absurdly long
  let filteredConnecting = connectingRoutes;
  if (directRoutes.length > 0) {
    const minDirectTime = Math.min(...directRoutes.map(r => r.totalDurationMinutes));
    // Max allowed connecting time: min direct time + 8 hours, or 1.5x direct time, whichever is greater
    const maxAllowedTime = Math.max(minDirectTime + 480, minDirectTime * 1.5);
    filteredConnecting = connectingRoutes.filter(r => r.totalDurationMinutes <= maxAllowedTime);
    pushLog(`⏰ Filtered out ${connectingRoutes.length - filteredConnecting.length} overly long connecting routes`);
  }
  
  return { directRoutes, connectingRoutes: filteredConnecting };
}

function applyTags(route: Route, allRoutes: Route[]) {
  if (allRoutes.length === 0) return;

  const minDuration = Math.min(...allRoutes.map(r => r.totalDurationMinutes));
  if (route.totalDurationMinutes === minDuration && !route.tags.includes('fastest')) {
    route.tags.push('fastest');
  }

  const routesWithFares = allRoutes.filter(r => r.cheapestFare !== null);
  if (routesWithFares.length > 0 && route.cheapestFare !== null) {
    const minFare = Math.min(...routesWithFares.map(r => r.cheapestFare!));
    if (route.cheapestFare === minFare && !route.tags.includes('cheapest')) {
      route.tags.push('cheapest');
    }
  }

  if (route.bestConfirmProbability > 80 && !route.tags.includes('high-confirm-chance')) {
    route.tags.push('high-confirm-chance');
  }
}


