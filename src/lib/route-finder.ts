// ============================================================
// ROUTE FINDER — Direct + Connecting (Multi-Route) Engine
// ============================================================

import { Route, TrainLeg } from '@/types/railway';
import { searchLiveTrainsConfirmTkt } from './railway-client';
import { pushLog } from '@/app/api/logs/route';
import { calculateDistanceKm } from './geo';

// Comprehensive pool of major railway junctions across India
const JUNCTIONS = [
  'NGP', 'ET', 'BZA', 'MAS', 'SC', 'NDLS', 'HWH', 'BSL', 'JP', 'LKO', 
  'CNB', 'BPL', 'DDU', 'PRYJ', 'KGP', 'BBS', 'VSKP', 'RU', 'ERS', 'ADI',
  'ST', 'BRC', 'RTM', 'KOTA', 'AGC', 'MTJ', 'UMB', 'LDH', 'ASR', 'JAT',
  'JBP', 'KTE', 'STA', 'BINA', 'VGLJ', 'GWL', 'CWA', 'NIR', 'G', 'R',
  'BSP', 'UJN', 'INDB', 'MMR', 'PUNE', 'GKP', 'PNBE', 'GAYA', 'TATA', 'RNC',
  'SUR', 'MRJ', 'MAO', 'MYS', 'SBC', 'TVC', 'CLT', 'DURG', 'ROU', 'REWA',
  'BTI', 'SLN', 'AY', 'BE', 'MB', 'BJU', 'GHY'
];

// Layover rules: min 30 mins, max 12 hours (720 mins)
const MIN_LAYOVER_MINUTES = 30;
const MAX_LAYOVER_MINUTES = 720;

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

  pushLog(`🔍 Direct search: ${from} ➔ ${to} on ${date}`);

  let allDirectTrains: TrainLeg[] = [];
  
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

  pushLog(`🟢 Direct trains: ${allDirectTrains.length} found`);

  const allDirectRoutes: Route[] = allDirectTrains.map((leg, idx) => ({
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

  allDirectRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);

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

  return [...deduplicatedDirectRoutes, ...hiddenQuotaRoutes];
}

const parseT = (t: string) => {
  if (!t) return 0;
  const parts = t.includes('.') ? t.split('.') : t.split(':');
  return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
};

export async function findConnectingRoutes(
  from: string,
  to: string,
  date: string,
  fastestDirectDurationMinutes: number | null = null,
  onRouteFound?: (route: Route) => void
): Promise<Route[]> {
  const fromStations = CITY_GROUPS[from] || [from];
  const toStations = CITY_GROUPS[to] || [to];
  const primaryFrom = fromStations[0];
  const primaryTo = toStations[0];
  const connectingRoutes: Route[] = [];

  pushLog(`🔄 Multi-route search: ${from} ➔ ${to} on ${date}`);

  // Rank candidate junctions by distance efficiency
  const junctionScores = JUNCTIONS
    .filter(j => j !== primaryFrom && j !== primaryTo)
    .map(j => {
      const d1 = calculateDistanceKm(primaryFrom, j);
      const d2 = calculateDistanceKm(j, primaryTo);
      return { junction: j, detourDist: d1 + d2, valid: d1 !== Infinity && d2 !== Infinity };
    })
    .filter(j => j.valid)
    .sort((a, b) => a.detourDist - b.detourDist);

  // Take top candidate junctions (up to 12)
  const relevantJunctions = junctionScores.length > 0 
    ? junctionScores.slice(0, 12).map(j => j.junction)
    : JUNCTIONS.filter(j => j !== primaryFrom && j !== primaryTo).slice(0, 12);

  // Parallel fetch for Leg 1 across candidate junctions
  const leg1Promises = relevantJunctions.map(j => searchLiveTrainsConfirmTkt(primaryFrom, j, date));
  const leg1Results = await Promise.all(leg1Promises);

  const seenRouteIds = new Set<string>();

  for (let idx = 0; idx < relevantJunctions.length; idx++) {
    const junction = relevantJunctions[idx];
    const leg1Trains = leg1Results[idx];
    if (!leg1Trains || leg1Trains.length === 0) continue;

    // Search Leg 2 from junction to destination
    const leg2Trains = await searchLiveTrainsConfirmTkt(junction, primaryTo, date);
    if (!leg2Trains || leg2Trains.length === 0) continue;

    let foundForJunction = 0;

    for (const leg1 of leg1Trains) {
      if (foundForJunction >= 6) break;

      const l1Dep = parseT(leg1.departureTime);
      const l1Arr = parseT(leg1.arrivalTime);
      const leg1ArrDayOffset = leg1.arrivalDayOffset || (l1Arr < l1Dep ? 1 : 0);

      for (const leg2 of leg2Trains) {
        if (leg1.trainNumber === leg2.trainNumber) continue; // Same train

        const l2Dep = parseT(leg2.departureTime);
        let layover = l2Dep - l1Arr;
        let leg2DepartureDayOffset = leg1ArrDayOffset;

        if (layover < MIN_LAYOVER_MINUTES) {
          layover += 1440;
          leg2DepartureDayOffset += 1;
        }

        if (layover >= MIN_LAYOVER_MINUTES && layover <= MAX_LAYOVER_MINUTES) {
          const routeId = `conn-${junction}-${leg1.trainNumber}-${leg2.trainNumber}`;
          if (seenRouteIds.has(routeId)) continue;
          seenRouteIds.add(routeId);

          const l2Arr = parseT(leg2.arrivalTime);
          const leg2DurationDays = l2Arr < l2Dep ? 1 : 0;

          const updatedLeg2: TrainLeg = {
            ...leg2,
            departureDayOffset: leg2DepartureDayOffset,
            arrivalDayOffset: leg2DepartureDayOffset + leg2DurationDays
          };

          const totalDuration = leg1.durationMinutes + layover + leg2.durationMinutes;

          const route: Route = {
            id: routeId,
            type: 'connecting',
            legs: [leg1, updatedLeg2],
            totalDurationMinutes: totalDuration,
            transferStations: [{ code: junction, name: leg2.fromStation.name, state: null, isJunction: true }],
            bestAvailability: null,
            cheapestFare: null,
            bestConfirmProbability: 0,
            tags: ['connecting'],
          };

          connectingRoutes.push(route);
          if (onRouteFound) onRouteFound(route);
          foundForJunction++;
        }
      }
    }
  }

  connectingRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  pushLog(`✅ Found ${connectingRoutes.length} connecting routes in total`);
  return connectingRoutes;
}

export async function findRoutes(
  from: string,
  to: string,
  date: string
): Promise<{ directRoutes: Route[]; connectingRoutes: Route[] }> {
  const directRoutes = await findDirectRoutes(from, to, date);
  let fastestDirectMins = null;
  if (directRoutes.length > 0) {
    fastestDirectMins = Math.min(...directRoutes.map(r => r.totalDurationMinutes));
  }
  const connectingRoutes = await findConnectingRoutes(from, to, date, fastestDirectMins);
  return { directRoutes, connectingRoutes };
}
