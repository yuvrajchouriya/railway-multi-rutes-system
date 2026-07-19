// ============================================================
// ROUTE SCORER — Confirm Probability first, then price/duration
// ============================================================

import { Route, ClassAvailability, RouteTag, ConfirmProbability } from '@/types/railway';

function availabilityScore(avl: string): number {
  if (avl === 'AVAILABLE') return 100;
  if (avl === 'RAC') return 50;
  if (avl === 'WL') return 20;
  return 0;
}

function getBestClassAvailability(route: Route): ClassAvailability | null {
  const allClasses = route.legs.flatMap((leg) => leg.classes);
  if (allClasses.length === 0) return null;

  // Sort by: AVAILABLE > RAC > WL, then by confirm probability
  return allClasses.sort((a, b) => {
    const aScore = availabilityScore(a.availability) + (a.confirmProbabilityPercent || 0) / 100;
    const bScore = availabilityScore(b.availability) + (b.confirmProbabilityPercent || 0) / 100;
    return bScore - aScore;
  })[0];
}

export function scoreAndTagRoutes(routes: Route[]): Route[] {
  // Score each route
  const scored = routes.map((route) => {
    const tags: RouteTag[] = [route.type];
    const bestClass = getBestClassAvailability(route);

    // Cheapest fare across all classes
    const allFares = route.legs
      .flatMap((leg) => leg.classes)
      .map((cls) => cls.fare)
      .filter((f) => f > 0);
    const cheapestFare = allFares.length > 0 ? Math.min(...allFares) : null;

    // Best confirm probability across all legs × classes
    const allProbs = route.legs
      .flatMap((leg) => leg.classes)
      .map((cls) => cls.confirmProbabilityPercent || 0);
    const bestConfirmProbability = allProbs.length > 0 ? Math.max(...allProbs) : 0;

    // Tagging
    if (bestClass?.availability === 'AVAILABLE') {
      tags.push('best-availability');
    }
    if (bestConfirmProbability >= 75) {
      tags.push('high-confirm-chance');
    }

    return {
      ...route,
      bestAvailability: bestClass,
      cheapestFare,
      bestConfirmProbability,
      tags: Array.from(new Set(tags)) as RouteTag[],
    };
  });

  // Tag cheapest & fastest across the set
  if (scored.length > 0) {
    const minFare = Math.min(...scored.map((r) => r.cheapestFare ?? Infinity));
    const minDuration = Math.min(...scored.map((r) => r.totalDurationMinutes));

    scored.forEach((r) => {
      if (r.cheapestFare === minFare) r.tags.push('cheapest');
      if (r.totalDurationMinutes === minDuration) r.tags.push('fastest');
    });
  }

  // ────────────────────────────────────────────
  // SORT PRIORITY:
  // 1. Highest confirm probability (our USP)
  // 2. AVAILABLE > RAC > WL
  // 3. Direct before connecting
  // 4. Shortest duration
  // ────────────────────────────────────────────
  return scored.sort((a, b) => {
    if (b.bestConfirmProbability !== a.bestConfirmProbability) {
      return b.bestConfirmProbability - a.bestConfirmProbability;
    }
    const aAvl = availabilityScore(a.bestAvailability?.availability || 'UNKNOWN');
    const bAvl = availabilityScore(b.bestAvailability?.availability || 'UNKNOWN');
    if (bAvl !== aAvl) return bAvl - aAvl;
    if (a.type !== b.type) return a.type === 'direct' ? -1 : 1;
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });
}
