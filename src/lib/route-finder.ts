// ============================================================
// ROUTE FINDER — Direct + Connecting (Multi-Route) Engine
// ============================================================

import { Route, TrainLeg, RouteTag } from '@/types/railway';
import { searchLiveTrainsConfirmTkt, searchTrainsBetweenStations } from './railway-client';
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

// Fallback top central hubs when distance calculation is unavailable
const DEFAULT_FALLBACK_JUNCTIONS = [
  'NGP', 'ET', 'BPL', 'NDLS', 'CNB', 'DDU', 'LKO', 'VGLJ', 'PRYJ', 'BSL', 'JP', 'HWH'
];

// Realistic Layover rules: min 30 mins (platform change), max 6 hours (360 mins)
const MIN_LAYOVER_MINUTES = 30;
const MAX_LAYOVER_MINUTES = 360;

// Threshold for skipping connecting routes if direct trains already exist
const LONG_DISTANCE_KM = 200;

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

// Strict User Rule: Max Allowed Multi-Route Duration Table based on Direct Train Time
const getMaxAllowedDurationMinutes = (fastestMins: number | null, distanceKm: number = Infinity) => {
  let baseMins = fastestMins;
  if (baseMins === null || baseMins === undefined || baseMins === Infinity) {
    if (distanceKm !== Infinity && distanceKm > 0) {
      // Estimate baseline duration at average train speed ~45 km/h
      baseMins = Math.round((distanceKm / 45) * 60);
    } else {
      return Infinity;
    }
  }

  const hours = baseMins / 60;
  let allowedExtraHours = 15;
  if (hours < 5) allowedExtraHours = 2;
  else if (hours < 10) allowedExtraHours = 3;
  else if (hours < 15) allowedExtraHours = 5;
  else if (hours < 20) allowedExtraHours = 7;
  else if (hours < 30) allowedExtraHours = 10;
  else if (hours < 40) allowedExtraHours = 13;

  return baseMins + (allowedExtraHours * 60);
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

  const tripDistance = calculateDistanceKm(primaryFrom, primaryTo);
  const hasDirectTrains = fastestDirectDurationMinutes !== null;

  // Rule: Skip connecting routes if direct trains exist AND trip distance is under 200 km
  if (hasDirectTrains && tripDistance !== Infinity && tripDistance < LONG_DISTANCE_KM) {
    return connectingRoutes;
  }

  const maxAllowedDuration = getMaxAllowedDurationMinutes(fastestDirectDurationMinutes, tripDistance);

  const junctionScores = JUNCTIONS
    .filter(j => j !== primaryFrom && j !== primaryTo)
    .map(j => {
      const d1 = calculateDistanceKm(primaryFrom, j);
      const d2 = calculateDistanceKm(j, primaryTo);
      return { junction: j, detourDist: d1 + d2, valid: d1 !== Infinity && d2 !== Infinity };
    })
    .filter(j => j.valid)
    .sort((a, b) => a.detourDist - b.detourDist);

  const relevantJunctions = junctionScores.length > 0 
    ? junctionScores.slice(0, 15).map(j => j.junction)
    : DEFAULT_FALLBACK_JUNCTIONS.filter(j => j !== primaryFrom && j !== primaryTo);

  // 1. Parallel Fetch Leg 1 offline to prevent rate limiting
  const leg1Results = await Promise.all(
    relevantJunctions.map(j => searchTrainsBetweenStations(primaryFrom, j, date))
  );

  // 2. Parallel Fetch Leg 2 offline for both day 1 and day 2 to support overnight layovers
  const dateObj = new Date(date);
  const nextDateObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
  const nextDate = nextDateObj.toISOString().split('T')[0];

  const leg2Results = await Promise.all(
    relevantJunctions.map(async (j, idx) => {
      if (!leg1Results[idx] || leg1Results[idx].length === 0) return [];
      const day1Trains = await searchTrainsBetweenStations(j, primaryTo, date);
      const day2Trains = await searchTrainsBetweenStations(j, primaryTo, nextDate);
      return [...day1Trains, ...day2Trains];
    })
  );

  const seenRouteIds = new Set<string>();

  for (let idx = 0; idx < relevantJunctions.length; idx++) {
    const junction = relevantJunctions[idx];
    const leg1Trains = leg1Results[idx];
    const leg2Trains = leg2Results[idx];
    if (!leg1Trains || leg1Trains.length === 0 || !leg2Trains || leg2Trains.length === 0) continue;

    let foundForJunction = 0;

    for (const leg1 of leg1Trains) {
      if (foundForJunction >= 6) break;

      const l1Dep = parseT(leg1.departureTime);
      const l1Arr = parseT(leg1.arrivalTime);
      const leg1ArrDayOffset = leg1.arrivalDayOffset || (l1Arr < l1Dep ? 1 : 0);

      for (const leg2 of leg2Trains) {
        if (leg1.trainNumber === leg2.trainNumber) continue;

        const l2Dep = parseT(leg2.departureTime);
        let layover = l2Dep - l1Arr;
        let leg2DepartureDayOffset = leg1ArrDayOffset;

        // If departure is next day
        if (leg2.departureDayOffset && leg2.departureDayOffset > 0) {
          layover += 1440 * leg2.departureDayOffset;
        }

        if (layover < MIN_LAYOVER_MINUTES) {
          layover += 1440;
          leg2DepartureDayOffset += 1;
        }

        if (layover >= MIN_LAYOVER_MINUTES && layover <= MAX_LAYOVER_MINUTES) {
          const routeId = `conn-${junction}-${leg1.trainNumber}-${leg2.trainNumber}`;
          if (seenRouteIds.has(routeId)) continue;

          const totalDuration = leg1.durationMinutes + layover + leg2.durationMinutes;

          // Enforce strict User Time Rule: Filter out routes exceeding max allowed duration
          if (totalDuration > maxAllowedDuration) continue;

          seenRouteIds.add(routeId);

          const l2Arr = parseT(leg2.arrivalTime);
          const leg2DurationDays = l2Arr < l2Dep ? 1 : 0;

          const updatedLeg2: TrainLeg = {
            ...leg2,
            departureDayOffset: leg2DepartureDayOffset,
            arrivalDayOffset: leg2DepartureDayOffset + leg2DurationDays
          };

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

  // If no connecting routes found, fall back to live fetching as a safety mechanism
  if (connectingRoutes.length === 0) {
    const liveLeg1 = await Promise.all(
      relevantJunctions.slice(0, 3).map(j => searchLiveTrainsConfirmTkt(primaryFrom, j, date))
    );
    const liveLeg2 = await Promise.all(
      relevantJunctions.slice(0, 3).map(j => searchLiveTrainsConfirmTkt(j, primaryTo, date))
    );

    for (let idx = 0; idx < Math.min(3, relevantJunctions.length); idx++) {
      const junction = relevantJunctions[idx];
      const leg1Trains = liveLeg1[idx];
      const leg2Trains = liveLeg2[idx];
      if (!leg1Trains || leg1Trains.length === 0 || !leg2Trains || leg2Trains.length === 0) continue;

      for (const leg1 of leg1Trains) {
        const l1Dep = parseT(leg1.departureTime);
        const l1Arr = parseT(leg1.arrivalTime);
        const leg1ArrDayOffset = leg1.arrivalDayOffset || (l1Arr < l1Dep ? 1 : 0);

        for (const leg2 of leg2Trains) {
          if (leg1.trainNumber === leg2.trainNumber) continue;
          const l2Dep = parseT(leg2.departureTime);
          let layover = l2Dep - l1Arr;
          let leg2DepartureDayOffset = leg1ArrDayOffset;

          if (layover < MIN_LAYOVER_MINUTES) {
            layover += 1440;
            leg2DepartureDayOffset += 1;
          }

          if (layover >= MIN_LAYOVER_MINUTES && layover <= MAX_LAYOVER_MINUTES) {
            const routeId = `conn-live-${junction}-${leg1.trainNumber}-${leg2.trainNumber}`;
            if (seenRouteIds.has(routeId)) continue;

            const totalDuration = leg1.durationMinutes + layover + leg2.durationMinutes;
            seenRouteIds.add(routeId);

            const route: Route = {
              id: routeId,
              type: 'connecting',
              legs: [leg1, { ...leg2, departureDayOffset: leg2DepartureDayOffset, arrivalDayOffset: leg2DepartureDayOffset + (parseT(leg2.arrivalTime) < l2Dep ? 1 : 0) }],
              totalDurationMinutes: totalDuration,
              transferStations: [{ code: junction, name: leg2.fromStation.name, state: null, isJunction: true }],
              bestAvailability: null,
              cheapestFare: null,
              bestConfirmProbability: 0,
              tags: ['connecting'],
            };
            connectingRoutes.push(route);
            if (onRouteFound) onRouteFound(route);
          }
        }
      }
    }
  }

  connectingRoutes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  return connectingRoutes;
}

export function findNearbyHubs(stationCode: string, maxRadiusKm = 250): { code: string, distance: number }[] {
  const hubs: { code: string, distance: number }[] = [];

  for (const j of JUNCTIONS) {
    if (j === stationCode) continue;
    const dist = calculateDistanceKm(stationCode, j);
    if (dist <= maxRadiusKm && dist > 0) {
      hubs.push({ code: j, distance: dist });
    }
  }

  return hubs.sort((a, b) => a.distance - b.distance).slice(0, 5);
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD HUB CONNECTING ROUTES: from → hub → to (proper 2-leg journey)
// When no trains exist directly from `from`, we search:
//   Leg 1: from → hub (e.g. CWA → ET)
//   Leg 2: hub  → to  (e.g. ET → CNB)
// and stitch them into a complete connecting Route object.
// ──────────────────────────────────────────────────────────────────────────────
export async function buildHubConnectingRoutes(
  from: string,
  to: string,
  date: string,
  onRouteFound?: (route: Route) => void
): Promise<Route[]> {
  const nearbyHubs = findNearbyHubs(from);
  const routes: Route[] = [];
  const seenIds = new Set<string>();

  const dateObj = new Date(date);
  const nextDateObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
  const nextDate = nextDateObj.toISOString().split('T')[0];

  for (const hub of nearbyHubs) {
    if (hub.code === from || hub.code === to) continue;

    // Leg 1: from → hub
    const leg1Trains = await searchTrainsBetweenStations(from, hub.code, date);
    if (!leg1Trains || leg1Trains.length === 0) continue;

    // Leg 2: hub → to (day 1 + day 2 for overnight layovers)
    const leg2Day1 = await searchTrainsBetweenStations(hub.code, to, date);
    const leg2Day2 = await searchTrainsBetweenStations(hub.code, to, nextDate);
    const leg2Trains = [...leg2Day1, ...leg2Day2];
    if (!leg2Trains || leg2Trains.length === 0) continue;

    let foundForHub = 0;

    for (const leg1 of leg1Trains) {
      if (foundForHub >= 5) break;

      const l1Dep = parseT(leg1.departureTime);
      const l1Arr = parseT(leg1.arrivalTime);
      const leg1ArrDayOffset = leg1.arrivalDayOffset || (l1Arr < l1Dep ? 1 : 0);

      for (const leg2 of leg2Trains) {
        if (leg1.trainNumber === leg2.trainNumber) continue;

        const l2Dep = parseT(leg2.departureTime);
        let layover = l2Dep - l1Arr;
        let leg2DepartureDayOffset = leg1ArrDayOffset;

        if (leg2.departureDayOffset && leg2.departureDayOffset > 0) {
          layover += 1440 * leg2.departureDayOffset;
        }

        // If layover is negative, leg2 departs next day
        if (layover < MIN_LAYOVER_MINUTES) {
          layover += 1440;
          leg2DepartureDayOffset += 1;
        }

        if (layover >= MIN_LAYOVER_MINUTES && layover <= MAX_LAYOVER_MINUTES) {
          const routeId = `hub-conn-${hub.code}-${leg1.trainNumber}-${leg2.trainNumber}`;
          if (seenIds.has(routeId)) continue;

          const totalDuration = leg1.durationMinutes + layover + leg2.durationMinutes;

          const l2Arr = parseT(leg2.arrivalTime);
          const leg2DurationDays = l2Arr < l2Dep ? 1 : 0;

          const updatedLeg2: TrainLeg = {
            ...leg2,
            departureDayOffset: leg2DepartureDayOffset,
            arrivalDayOffset: leg2DepartureDayOffset + leg2DurationDays,
          };

          const route: Route = {
            id: routeId,
            type: 'connecting',
            legs: [leg1, updatedLeg2],
            totalDurationMinutes: totalDuration,
            transferStations: [{ code: hub.code, name: leg2.fromStation.name, state: null, isJunction: true }],
            bestAvailability: null,
            cheapestFare: null,
            bestConfirmProbability: 0,
            tags: ['connecting'],
          };

          seenIds.add(routeId);
          routes.push(route);
          if (onRouteFound) onRouteFound(route);
          foundForHub++;
        }
      }
    }
  }

  routes.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  return routes;
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

  // Auto Multi-Hub Fallback: Build proper 2-leg routes (from→hub→to)
  if (directRoutes.length === 0 && connectingRoutes.length === 0) {
    const hubRoutes = await buildHubConnectingRoutes(from, to, date);
    if (hubRoutes.length > 0) {
      return { directRoutes: [], connectingRoutes: hubRoutes };
    }
  }

  return { directRoutes, connectingRoutes };
}
