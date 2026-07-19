'use client';

import { useState, useEffect } from 'react';
import { Route, TrainLeg, DatedClassAvailability } from '@/types/railway';
import AvailabilityBox from './AvailabilityBox';
import AvailabilityModal from './AvailabilityModal';
import {
  ChevronDown, ChevronUp, Clock, Utensils,
  Train, ArrowRight, ExternalLink, Star,
  Check, X, RefreshCw
} from 'lucide-react';

interface Props { 
  route: Route; 
  globalFaresCache: Record<string, { data: any[], updatedAt: string, originCode?: string, originName?: string }>;
  fetchingLegs: Set<string>;
  setGlobalFaresCache: React.Dispatch<React.SetStateAction<Record<string, { data: any[], updatedAt: string, originCode?: string, originName?: string }>>>;
  activeFilter?: string;
}

// ── Tag badge pill ─────────────────────────────────────────
const TAG_CONFIG = {
  'hidden-quota': { label: 'END-TO-END', bg: 'bg-[var(--color-brand-gold)] text-gray-900 border-[var(--color-brand-gold)]' },
  'best-availability': { label: 'RECOMMENDED', bg: 'bg-[#00C853] text-gray-900 border-[#00C853]' },
  'high-confirm-chance': { label: 'RECOMMENDED', bg: 'bg-[#00C853] text-gray-900 border-[#00C853]' },
  'cheapest':  { label: 'CHEAPEST',   bg: 'bg-white text-teal-600 border-teal-600' },
  'direct':    { label: 'DIRECT',     bg: 'bg-white text-gray-500 border-gray-400' },
  'connecting':{ label: 'CONNECTING', bg: 'bg-white text-gray-500 border-gray-400' },
} as const;

// ── Format HH:MM duration ─────────────────────────────────
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`;
}

// ── Next 6 Days Slider (expands when class is clicked) ─────
function NextDaysSlider({ entries, classType }: {
  entries: DatedClassAvailability[];
  classType: string;
}) {
  const avlColor = (a: string) =>
    a === 'AVAILABLE' ? 'border-green-400 bg-green-50 text-green-700'
    : a === 'RAC'     ? 'border-orange-400 bg-orange-50 text-orange-700'
    : a === 'WL'      ? 'border-red-400 bg-red-50 text-red-700'
    :                   'border-gray-200 bg-gray-50 text-gray-500';

  const probLabel = (p: string, pct: number) => {
    if (p === 'HIGH')   return `✅ ${pct}% High`;
    if (p === 'MEDIUM') return `🟡 ${pct}% Med`;
    if (p === 'LOW')    return `🔴 ${pct}% Low`;
    return '';
  };

  return (
    <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-2">
      {entries.map((e, i) => (
        <div key={i} className={`min-w-[130px] flex-shrink-0 rounded-lg border p-3 ${avlColor(e.availability)}`}>
          <div className="text-xs font-bold mb-1">{e.date}</div>
          <div className="text-sm font-bold">
            {e.availability === 'AVAILABLE' ? `AVL ${e.availableSeats ?? ''}` :
             e.availability === 'RAC'       ? `RAC ${e.waitlistNumber ?? ''}` :
             e.availability === 'WL'        ? `WL ${e.waitlistNumber ?? ''}` : '—'}
          </div>
          <div className="text-xs mt-1">₹{e.fare}</div>
          {e.confirmProbabilityPercent !== undefined && (
            <div className="text-[10px] mt-1 font-semibold">
              {probLabel(e.confirmProbability, e.confirmProbabilityPercent)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Single train leg ───────────────────────────────────────
function LegCard({ leg, showDivider = false, liveClasses }: { leg: TrainLeg; showDivider?: boolean; liveClasses?: any[] }) {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={showDivider ? 'pt-4 border-t border-[#3A506B]' : ''}>
      {/* Train header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-3 md:gap-0">
        <div>
          <span className="text-[15px] font-bold text-white">{leg.trainNumber}</span>
          <span className="ml-2 text-[16px] font-bold text-white">{leg.trainName}</span>
          {leg.hasPantry && (
            <span className="ml-2 text-[13px] font-bold text-gray-100 flex-inline items-center gap-1">
              <Utensils className="w-4 h-4 inline" /> Pantry
            </span>
          )}
        </div>
        
        {/* Running Days */}
        <div className="flex gap-2">
          {leg.runningDays.map((val, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[8px] font-black text-white mb-1 uppercase tracking-wider">{DAYS[idx]}</span>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${val === '1' || val === 'Y' ? 'bg-green-600 text-white border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}>
                {val === '1' || val === 'Y' ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {(() => {
        const hasBoarding = leg.boardingStation !== undefined;
        const hasDropping = leg.droppingStation !== undefined;
        const isExtendedOrigin = hasBoarding && leg.boardingStation!.code !== leg.fromStation.code;
        const isExtendedDest = hasDropping && leg.droppingStation!.code !== leg.toStation.code;
        
        if (!isExtendedOrigin && !isExtendedDest) {
          return (
            <div className="flex items-center justify-between mb-4">
              <div className="text-center w-[80px] sm:w-auto">
                <div className="text-lg sm:text-xl font-extrabold text-white">{leg.departureTime}</div>
                <div className="text-[12px] font-bold text-white">{leg.fromStation.code}</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate">{leg.fromStation.name}</div>
              </div>

              <div className="flex-1 mx-4 flex flex-col items-center mt-1">
                <div className="flex items-center w-full relative">
                  <div className="flex-1 h-px bg-[#3A506B]"></div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-gray-200 bg-[var(--color-brand-navy-card)] px-2 py-0.5 rounded-full border border-[#3A506B] shadow-sm z-10 relative">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {fmtDuration(leg.durationMinutes)}
                  </div>
                  <div className="flex-1 h-px bg-[#3A506B]"></div>
                </div>
              </div>

              <div className="text-center w-[80px] sm:w-auto">
                <div className="text-lg sm:text-xl font-extrabold text-white">{leg.arrivalTime}</div>
                <div className="text-[12px] font-bold text-white">{leg.toStation.code}</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate">{leg.toStation.name}</div>
                {leg.arrivalDayOffset > 0 && (
                  <div className="text-[10px] font-bold text-orange-400">+{leg.arrivalDayOffset}d</div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-3 mb-4 mt-2">
            <div className="bg-[#1e2a44] p-2 rounded border border-[var(--color-brand-gold)] border-dashed mb-2 text-center">
              <span className="text-[11px] font-bold text-[var(--color-brand-gold)]">
                ℹ️ To get a confirmed seat, book from {leg.fromStation.code} to {leg.toStation.code}, but board the train at {isExtendedOrigin ? leg.boardingStation!.code : leg.fromStation.code}{isExtendedDest ? ` and drop at ${leg.droppingStation!.code}` : ''}.
              </span>
            </div>
            <div className="flex items-center justify-between">
              {isExtendedOrigin && (
                <>
                  <div className="text-center w-[60px] sm:w-[80px]">
                    <div className="text-lg sm:text-xl font-extrabold text-gray-500">--:--</div>
                    <div className="text-[12px] font-bold text-gray-400">{leg.fromStation.code}</div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-gray-500 truncate">{leg.fromStation.name}</div>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center relative mx-1">
                    <div className="w-full h-px bg-gray-600 border-t border-dashed border-gray-500 absolute"></div>
                  </div>
                </>
              )}

              <div className="text-center w-[60px] sm:w-[80px]">
                <div className="text-lg sm:text-xl font-extrabold text-white">{leg.departureTime}</div>
                <div className="text-[12px] font-bold text-white">{isExtendedOrigin ? leg.boardingStation!.code : leg.fromStation.code}</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate">{isExtendedOrigin ? leg.boardingStation!.name : leg.fromStation.name}</div>
              </div>

              <div className="flex-1 flex items-center justify-center relative mx-1">
                <div className="w-full h-px bg-[#3A506B] absolute"></div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-200 bg-[var(--color-brand-navy-card)] px-1 py-0.5 rounded-full border border-[#3A506B] shadow-sm z-10 relative">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {fmtDuration(leg.durationMinutes)}
                </div>
              </div>

              <div className="text-center w-[60px] sm:w-[80px]">
                <div className="text-lg sm:text-xl font-extrabold text-white">{leg.arrivalTime}</div>
                <div className="text-[12px] font-bold text-white">{isExtendedDest ? leg.droppingStation!.code : leg.toStation.code}</div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate">{isExtendedDest ? leg.droppingStation!.name : leg.toStation.name}</div>
                {leg.arrivalDayOffset > 0 && (
                  <div className="text-[10px] font-bold text-orange-400">+{leg.arrivalDayOffset}d</div>
                )}
              </div>

              {isExtendedDest && (
                <>
                  <div className="flex-1 flex items-center justify-center relative mx-1">
                    <div className="w-full h-px bg-gray-600 border-t border-dashed border-gray-500 absolute"></div>
                  </div>

                  <div className="text-center w-[60px] sm:w-[80px]">
                    <div className="text-lg sm:text-xl font-extrabold text-gray-500">--:--</div>
                    <div className="text-[12px] font-bold text-gray-400">{leg.toStation.code}</div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-gray-500 truncate">{leg.toStation.name}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Availability boxes */}
      {liveClasses && liveClasses.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 py-1">
          {liveClasses.map((cls: any, i: number) => {
             const isAvailable = cls.status.toUpperCase().includes('AVL') || cls.status.toUpperCase().includes('AVAILABLE') || cls.status.toUpperCase().includes('CURR');
             const isRAC = cls.status.toUpperCase().includes('RAC');
             const isRegret = cls.status.toUpperCase().includes('REGRET') || cls.status.toUpperCase().includes('DEPARTED') || cls.status.toUpperCase().includes('NOT AV') || cls.status.toUpperCase().includes('CLOSED');
             const isWL = cls.status.toUpperCase().includes('WL') || cls.status.toUpperCase().includes('WAIT');
             const isUnreserved = cls.classType === 'UR';
             
             let statusColor = 'text-gray-400';
             let borderColor = 'border-gray-500/30';
             let bgColor = 'bg-gray-500/10';
             
             if (isUnreserved) {
                 statusColor = 'text-blue-400';
                 borderColor = 'border-blue-500/30';
                 bgColor = 'bg-blue-500/10';
             } else if (isRegret) {
                 statusColor = 'text-red-400';
                 borderColor = 'border-red-500/30';
                 bgColor = 'bg-red-500/10';
             } else if (isAvailable) {
                 statusColor = 'text-green-400';
                 borderColor = 'border-green-500/30';
                 bgColor = 'bg-green-500/10';
             } else if (isRAC || isWL) {
                 statusColor = 'text-orange-400';
                 borderColor = 'border-orange-500/30';
                 bgColor = 'bg-orange-500/10';
             }

             return (
                 <div key={i} className={`flex-shrink-0 min-w-[100px] border ${borderColor} ${bgColor} rounded-lg p-2 cursor-pointer hover:bg-[#203254] transition-colors relative overflow-hidden`} title={cls.quota === 'TQ' ? 'Tatkal Quota' : 'General Quota'}>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-sm font-extrabold text-white">{cls.classType}</span>
                       <span className="text-xs font-bold text-gray-300">{cls.fare > 0 ? `₹${cls.fare}` : ''}</span>
                    </div>
                    <div className={`text-xs font-bold ${statusColor} truncate`}>{cls.status}</div>
                    {cls.quota === 'TQ' && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-1 rounded-bl">TQ</div>
                    )}
                 </div>
             );
          })}
        </div>
      )}

      {/* Footer action */}
      <div className="flex items-center justify-between pt-3 border-t border-[#3A506B]">
        <div className="text-xs text-gray-400">
          {liveClasses && liveClasses.length > 0 ? "Select a class to book" : "Fetching classes..."}
        </div>
        <div className="flex items-center gap-4">
           <button
             disabled
             className="flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-gray-300 text-[15px] font-extrabold rounded-lg cursor-not-allowed shadow-md"
           >
             Book Now <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Availability modal temporarily disabled per user request
      {showAvailabilityModal && (
        <AvailabilityModal 
          leg={leg} 
          liveClasses={liveClasses}
          onClose={() => setShowAvailabilityModal(false)} 
        />
      )}
      */}
    </div>
  );
}

// ── Main RouteCard ─────────────────────────────────────────
export default function RouteCard({ route, globalFaresCache, fetchingLegs, setGlobalFaresCache, activeFilter }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const classOrder = ['UR', '2S', 'SL', 'CC', 'FC', '3E', '3A', '2A', '1A'];

  const getValidClasses = (classesArray: any[]) => {
     if (!classesArray || classesArray.length === 0) return [];
     
     // Filter out fully invalid/empty entries just to be safe, but keep all valid ones even if fare is 0
     const valid = classesArray.filter(cls => cls.classType && cls.quota);
     
     // Sorting logic
     valid.sort((a, b) => {
        const idxA = classOrder.indexOf(a.classType);
        const idxB = classOrder.indexOf(b.classType);
        if (idxA === -1 && idxB === -1) return a.classType.localeCompare(b.classType);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        if (idxA === idxB) {
            if (a.quota === 'GN' && b.quota === 'TQ') return -1;
            if (a.quota === 'TQ' && b.quota === 'GN') return 1;
        }
        return idxA - idxB;
     });
     return valid;
  };

  const displayTags = route.tags.filter(t => t !== 'direct' && t !== 'connecting');
  const firstLeg = route.legs[0];
  const lastLeg = route.legs[route.legs.length - 1];

  // Route summary headline
  const headline = route.type === 'direct'
    ? `${firstLeg.boardingStation?.name || firstLeg.fromStation.name} - ${lastLeg.droppingStation?.name || lastLeg.toStation.name}`
    : `${firstLeg.fromStation.name} - ${route.transferStations.map(s => s.name || s.code).join(' - ')} - ${lastLeg.toStation.name}`;

  // Dynamically calculate state based on global cache
  let calculatedFare = 0;
  let isAnyFetching = false;
  let isAllMissing = true;
  let hasAnyData = false;
  let latestUpdatedAt: string | null = null;
  let originCode: string | null = null;
  let originName: string | null = null;
  const liveClassesData: Record<string, any[]> = {};

  for (const leg of route.legs) {
    const legKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
    const cacheEntry = globalFaresCache[legKey];
    
    if (fetchingLegs.has(legKey)) {
       isAnyFetching = true;
    }

    if (cacheEntry) {
       isAllMissing = false;
       hasAnyData = true;
       liveClassesData[leg.trainNumber] = getValidClasses(cacheEntry.data);
       const slClass = cacheEntry.data.find((c: any) => c.classType === 'SL');
       if (slClass && slClass.fare) {
          calculatedFare += slClass.fare;
       } else {
          const validClasses = cacheEntry.data.filter((c: any) => c.fare > 0);
          if (validClasses.length > 0) {
              const minFare = Math.min(...validClasses.map((c: any) => c.fare));
              calculatedFare += minFare;
          }
       }
       if (cacheEntry.updatedAt) latestUpdatedAt = cacheEntry.updatedAt;
       if (cacheEntry.originCode) originCode = cacheEntry.originCode;
       if (cacheEntry.originName) originName = cacheEntry.originName;
    } else if (leg.classes && leg.classes.length > 0 && leg.classes.some(c => c.fare > 0)) {
       isAllMissing = false;
       hasAnyData = true;
       liveClassesData[leg.trainNumber] = getValidClasses(leg.classes.map(c => ({
           classType: c.classType,
           quota: (c as any).quota || 'GN',
           fare: c.fare,
           status: c.statusText ? c.statusText : (c.availability === 'AVAILABLE' ? (c.availableSeats ? `AVL ${c.availableSeats}` : 'AVAILABLE') : 
                   c.availability === 'RAC' ? (c.waitlistNumber ? `RAC ${c.waitlistNumber}` : 'RAC') :
                   c.availability === 'WL' ? (c.waitlistNumber ? `WL ${c.waitlistNumber}` : 'WL') : 'UNKNOWN')
       })));
       const slClass = leg.classes.find(c => c.classType === 'SL');
       if (slClass && slClass.fare) {
           calculatedFare += slClass.fare;
       } else {
           const validClasses = leg.classes.filter(c => c.fare > 0);
           if (validClasses.length > 0) {
               const minFare = Math.min(...validClasses.map(c => c.fare));
               calculatedFare += minFare;
           }
       }
       latestUpdatedAt = new Date().toISOString();
    }
  }

  // ── Smart Combinator Logic ──
  const smartCombos: any[] = [];
  if (route.type === 'connecting' && route.legs.length === 2 && !isAnyFetching && hasAnyData) {
     const leg1Classes = liveClassesData[route.legs[0].trainNumber] || [];
     const leg2Classes = liveClassesData[route.legs[1].trainNumber] || [];
     
     const isConfirm = (status: string) => {
        const s = status.toUpperCase();
        return s.includes('AVL') || s.includes('AVAILABLE') || s.includes('RAC');
     };
     
     const parseWlNumber = (status: string) => {
        const match = status.match(/WL\s*[-/]?\s*(\d+)/i);
        if (match) return parseInt(match[1], 10);
        return 999;
     };

     const isHighChanceWl = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('REGRET') || isConfirm(s)) return false;
        if (s.includes('WL')) {
           return parseWlNumber(s) <= 25; // Define < 25 as high chance for now
        }
        return false;
     };
     
     const l1Confirmed = leg1Classes.filter(c => isConfirm(c.status) && c.fare > 0);
     const l2Confirmed = leg2Classes.filter(c => isConfirm(c.status) && c.fare > 0);
     
     const l1Wl = leg1Classes.filter(c => isHighChanceWl(c.status) && c.fare > 0);
     const l2Wl = leg2Classes.filter(c => isHighChanceWl(c.status) && c.fare > 0);
     
     const classRank: Record<string, number> = { '2S': 1, 'SL': 2, '3E': 3, '3A': 4, '2A': 5, '1A': 6 };
     
     l1Confirmed.forEach(c1 => {
        l2Confirmed.forEach(c2 => {
           const r1 = classRank[c1.classType] || 99;
           const r2 = classRank[c2.classType] || 99;
           const score = r1 + r2; // lower is better (cheaper classes)
           smartCombos.push({
              leg1Class: c1.classType,
              leg2Class: c2.classType,
              leg1Fare: c1.fare,
              leg2Fare: c2.fare,
              totalFare: c1.fare + c2.fare,
              score: score,
              leg1Status: c1.status,
              leg2Status: c2.status,
           });
        });
     });
     
     // Sort by score (cheapest class combinations first), then by total fare
     smartCombos.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.totalFare - b.totalFare;
     });

     // Combine WL pairs (Either one is WL, or both are WL, but both must be at least WL High Chance or Confirm)
     const wlCombos: any[] = [];
     const l1AllPotential = [...l1Confirmed, ...l1Wl];
     const l2AllPotential = [...l2Confirmed, ...l2Wl];

     l1AllPotential.forEach(c1 => {
        l2AllPotential.forEach(c2 => {
           // We only want combinations where at least one is WL (otherwise it's already in smartCombos)
           if (!isConfirm(c1.status) || !isConfirm(c2.status)) {
              const r1 = classRank[c1.classType] || 99;
              const r2 = classRank[c2.classType] || 99;
              wlCombos.push({
                 leg1Class: c1.classType,
                 leg2Class: c2.classType,
                 leg1Fare: c1.fare,
                 leg2Fare: c2.fare,
                 totalFare: c1.fare + c2.fare,
                 score: r1 + r2,
                 leg1Status: c1.status,
                 leg2Status: c2.status,
              });
           }
        });
     });

     wlCombos.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.totalFare - b.totalFare;
     });
     
     (route as any).smartCombos = smartCombos;
     (route as any).wlCombos = wlCombos;
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fetchPromises = route.legs.map(async (leg) => {
        try {
          const legKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
          let apiDate = leg.journeyDate;
          if (apiDate.includes('-') && apiDate.split('-')[0].length === 4) {
             const parts = apiDate.split('-');
             apiDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          
          const url = `/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}&forceRefresh=true`;
          const res = await fetch(url);
          if (res.ok) {
             const data = await res.json();
             if (data.success && data.data) {
                 return { legKey, data: data.data, updatedAt: data.updatedAt, originCode: data.originCode, originName: data.originName };
             }
          }
        } catch (e) {
          console.error("Failed to refresh leg:", leg.trainNumber, e);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      
      const updates: Record<string, any> = {};
      results.forEach(res => {
         if (res) {
            updates[res.legKey] = { data: res.data, updatedAt: res.updatedAt, originCode: res.originCode, originName: res.originName };
         }
      });
      
      if (Object.keys(updates).length > 0) {
         setGlobalFaresCache(prev => ({ ...prev, ...updates }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getUpdatedAgoText = () => {
     if (!latestUpdatedAt) return '';
     const diffMs = new Date().getTime() - new Date(latestUpdatedAt).getTime();
     const diffMins = Math.floor(diffMs / 60000);
     if (diffMins < 1) return 'Just now';
     if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
     const diffHrs = Math.floor(diffMins / 60);
     return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="route-card overflow-hidden">
      {/* ── Collapsed Header ─────────────────────────────── */}
      <div className="p-5 relative">
        
        {/* Top row: Tags *        {/* ── MOBILE LAYOUT ── */}
        {(() => {
          const hasBoarding = firstLeg.boardingStation !== undefined;
          const hasDropping = lastLeg.droppingStation !== undefined;
          const isExtendedOrigin = hasBoarding && firstLeg.boardingStation!.code !== firstLeg.fromStation.code;
          const isExtendedDest = hasDropping && lastLeg.droppingStation!.code !== lastLeg.toStation.code;
          const depStationName = isExtendedOrigin ? firstLeg.boardingStation!.name : firstLeg.fromStation.name;
          const arrStationName = isExtendedDest ? lastLeg.droppingStation!.name : lastLeg.toStation.name;

          return (
            <div className="block md:hidden">
              {/* Tags (Mobile) */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {displayTags.slice(0, 3).map(tag => {
                  const cfg = TAG_CONFIG[tag as keyof typeof TAG_CONFIG];
                  return cfg ? (
                    <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  ) : null;
                })}
              </div>

              <div className="flex justify-between items-end mb-1">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Departure</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Arrival</div>
              </div>
              <div className="flex justify-between items-center mb-0.5">
                <div className="text-[13px] font-bold text-white text-left truncate w-[48%]">{depStationName}</div>
                <div className="text-[13px] font-bold text-white text-right truncate w-[48%]">{arrStationName}</div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-3xl font-black text-white">{firstLeg.departureTime}</div>
                <div className="text-3xl font-black text-white">{lastLeg.arrivalTime}</div>
              </div>
              
              <div className="flex items-center justify-center mb-6 relative">
                <div className="absolute w-full h-[1px] bg-[#2A3B54]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#2A3B54] absolute left-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-blue)]"></div>
                </div>
                <div className="bg-[var(--color-brand-navy-card)] p-1.5 z-10 rounded border border-[#2A3B54]">
                  <Train className="w-4 h-4 text-gray-300" />
                </div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#2A3B54] absolute right-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {fmtDuration(route.totalDurationMinutes)}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide">Fare Starting</span>
                  <span className="text-[22px] font-black text-white leading-none">
                    {calculatedFare > 0 && !isAnyFetching ? `₹${calculatedFare}` : '--'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold tracking-[0.1em] text-[var(--color-brand-blue)] border border-[#2A3B54] rounded-lg bg-[#111A2D]"
              >
                ROUTE DETAILS {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          );
        })()}

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden md:block">
          {/* Tags (Desktop) */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {displayTags.slice(0, 3).map(tag => {
              const cfg = TAG_CONFIG[tag as keyof typeof TAG_CONFIG];
              return cfg ? (
                <span key={tag} className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`}>
                  {cfg.label}
                </span>
              ) : null;
            })}
          </div>

          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-24"></div> {/* spacer for centering */}
            
            <h3 className="text-[17px] font-black text-white text-center flex-1">{headline}</h3>
            
            <div className="text-right w-24">
              {calculatedFare > 0 && !isAnyFetching && (
                <div className="text-[17px] font-black text-white">
                  <span className="text-[12px] text-gray-400 font-medium mr-1">from</span>
                  ₹{calculatedFare}
                </div>
              )}
            </div>
          </div>

          {/* MMT-style route timeline graphic */}
          {(() => {
            const hasBoarding = firstLeg.boardingStation !== undefined;
            const hasDropping = lastLeg.droppingStation !== undefined;
            const isExtendedOrigin = hasBoarding && firstLeg.boardingStation!.code !== firstLeg.fromStation.code;
            const isExtendedDest = hasDropping && lastLeg.droppingStation!.code !== lastLeg.toStation.code;
            
            if (!isExtendedOrigin && !isExtendedDest) {
              return (
                <div className="flex items-center justify-between mb-6 relative">
                  
                  {/* From */}
                  <div className="flex flex-col items-center w-20 sm:w-28 relative z-10 top-[-18px]">
                    <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                      {firstLeg.fromStation.name}
                    </div>
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  </div>

                  {/* Line and Transfer Stations */}
                  <div className="flex-1 relative flex items-center justify-center mx-1 top-[2px]">
                    <div className="absolute w-full h-[1px] bg-[#3A506B]"></div>
                    
                    {route.type === 'direct' ? (
                      <div className="flex-1 flex justify-center z-10 top-[-20px] relative">
                        <div className="bg-[var(--color-brand-navy-card)] px-1">
                          <Train className="w-5 h-5 text-[var(--color-brand-blue)]" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex justify-between absolute top-[-20px] z-10 px-4">
                        <div className="bg-[var(--color-brand-navy-card)] px-1">
                          <Train className="w-5 h-5 text-[var(--color-brand-blue)]" />
                        </div>
                        
                        {route.transferStations.map((s, i) => (
                          <div key={i} className="flex flex-col items-center relative bg-[var(--color-brand-navy-card)] px-1">
                            <div className="text-[11px] font-bold text-gray-100 mb-1 w-24 text-center leading-tight">
                              {s.name}
                            </div>
                            <div className="w-2 h-2 rounded-full border-2 border-blue-400 bg-[var(--color-brand-navy-card)]"></div>
                          </div>
                        ))}

                        <div className="bg-[var(--color-brand-navy-card)] px-1">
                          <Train className="w-5 h-5 text-[var(--color-brand-blue)]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* To */}
                  <div className="flex flex-col items-center w-20 sm:w-28 relative z-10 top-[-18px]">
                    <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                      {lastLeg.toStation.name}
                    </div>
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center justify-between mb-6 relative">
                {isExtendedOrigin && (
                  <>
                    <div className="flex flex-col items-center w-16 relative z-10 top-[-18px] opacity-50">
                      <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                        {firstLeg.fromStation.name}
                      </div>
                      <div className="w-2 h-2 rounded-full border-2 border-gray-400 bg-transparent"></div>
                    </div>
                    <div className="flex-1 relative flex items-center justify-center mx-1 top-[2px]">
                      <div className="absolute w-full h-[1px] bg-gray-500 border-t border-dashed border-gray-500"></div>
                    </div>
                  </>
                )}
                
                <div className="flex flex-col items-center w-16 relative z-10 top-[-18px]">
                  <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                    {isExtendedOrigin ? firstLeg.boardingStation!.name : firstLeg.fromStation.name}
                  </div>
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                </div>
                
                <div className="flex-1 relative flex items-center justify-center mx-1 top-[2px]">
                  <div className="absolute w-full h-[1px] bg-[#3A506B]"></div>
                  <div className="flex-1 flex justify-center z-10 top-[-20px] relative">
                    <div className="bg-[var(--color-brand-navy-card)] px-1">
                      <Train className="w-5 h-5 text-[var(--color-brand-blue)]" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center w-16 relative z-10 top-[-18px]">
                  <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                    {isExtendedDest ? lastLeg.droppingStation!.name : lastLeg.toStation.name}
                  </div>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>

                {isExtendedDest && (
                  <>
                    <div className="flex-1 relative flex items-center justify-center mx-1 top-[2px]">
                      <div className="absolute w-full h-[1px] bg-gray-500 border-t border-dashed border-gray-500"></div>
                    </div>

                    <div className="flex flex-col items-center w-16 relative z-10 top-[-18px] opacity-50">
                      <div className="text-[10px] sm:text-[12px] font-bold text-white text-center leading-tight mb-1 truncate w-full px-1">
                        {lastLeg.toStation.name}
                      </div>
                      <div className="w-2 h-2 rounded-full border-2 border-gray-400 bg-transparent"></div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Duration + expand button */}
          <div className="flex items-center justify-between mt-[-10px]">
            <div className="flex items-center gap-2 text-[15px] font-bold text-white">
              <Clock className="w-4 h-4 text-gray-100" />
              {fmtDuration(route.totalDurationMinutes)}
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold text-[var(--color-brand-blue)] border border-[var(--color-brand-blue)] rounded-lg hover:bg-[#3A506B]/50 transition-colors"
            >
              DETAILS {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

      {/* ── Expanded Details ─────────────────────────────── */}
      {expanded && (
        <div className="border-t border-[#3A506B] p-4 bg-[#15203b] space-y-4">
          
          {/* Refresh & Last Updated Bar */}
          <div className="flex flex-row justify-between items-center bg-[var(--color-brand-navy-card)] border border-[#3A506B] rounded-lg px-2 py-2 md:px-4 md:py-2 gap-2">
             <div className="text-[11px] md:text-sm font-medium text-gray-300 leading-tight">
                {latestUpdatedAt ? (
                   <>⏳ Last updated: <span className="text-white font-bold">{getUpdatedAgoText()}</span></>
                ) : (
                   isAnyFetching ? 'Fetching fresh data...' : 'Waiting for data...'
                )}
             </div>
             <button
               onClick={handleManualRefresh}
               disabled={isRefreshing || isAnyFetching}
               className={`flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                 isRefreshing || isAnyFetching
                 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                 : 'bg-[var(--color-brand-blue)] text-white hover:bg-blue-600'
               }`}
             >
               <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${(isRefreshing || isAnyFetching) ? 'animate-spin' : ''}`} />
               {isRefreshing ? 'Refreshing...' : 'Refresh'}
             </button>
          </div>

          {route.legs.map((leg, i) => (
            <LegCard key={i} leg={leg} showDivider={i > 0} liveClasses={liveClassesData[leg.trainNumber]} />
          ))}
        </div>
      )}
    </div>
  );
}
