'use client';

import { useState, useEffect, useRef } from 'react';
import { Route, RouteTag } from '@/types/railway';
import { apiFetch, apiFetchSecure } from '@/lib/shield';
import { ensureYYYYMMDD } from '@/lib/validators';
import RouteCard from './RouteCard';
import { Train, SlidersHorizontal } from 'lucide-react';

interface Props {
  isLoading: boolean;
  error: string | null;
  directRoutes: Route[];
  connectingRoutes: Route[];
  from?: string;
  to?: string;
  date?: string;
  onDateChange?: (date: string) => void;
}

type FilterId = RouteTag | 'all' | 'high-confirm-chance';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',                 label: 'All Routes' },
  { id: 'high-confirm-chance', label: '🌟 High Confirm' },
  { id: 'direct',              label: '🚆 Direct Only' },
  { id: 'connecting',          label: '🔄 Connecting' },
];

export default function ResultsSection({
  isLoading, error, directRoutes, connectingRoutes, from, to, date, onDateChange
}: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  
  // Global Fares Cache
  const [globalFaresCache, setGlobalFaresCache] = useState<Record<string, { data: any[], updatedAt: string, originCode?: string, originName?: string }>>({});
  const [fetchingLegs, setFetchingLegs] = useState<Set<string>>(new Set());
  const sortScoresRef = useRef<Record<string, { statusScore: number, minFare: number }>>({});

  // Generate 60 days starting from today
  const generateDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const datesList = generateDates();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('.date-btn-active') as HTMLElement;
      if (activeBtn) {
        const container = scrollContainerRef.current;
        // Manually center the active button in the scroll container (works on PC + mobile)
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const containerWidth = container.offsetWidth;
        container.scrollLeft = btnLeft - containerWidth / 2 + btnWidth / 2;
      }
    }
  }, [date]);
  
  // Clear cached fares when searching for a different route
  useEffect(() => {
    setGlobalFaresCache({});
    setFetchingLegs(new Set());
  }, [from, to, date]);
  
  const formatDateForApi = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayName = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };
  const getDayNum = (d: Date) => {
    return d.getDate();
  };
  const allRoutes = [...directRoutes, ...connectingRoutes];

  const handleFetchRouteFares = async (route: Route) => {
    for (const leg of route.legs) {
      const legKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
      
      let isAlreadyCached = false;
      setGlobalFaresCache(prev => {
        if (prev[legKey]) isAlreadyCached = true;
        return prev;
      });

      if (!isAlreadyCached) {
        setFetchingLegs(prev => new Set(prev).add(legKey));

        const apiDate = ensureYYYYMMDD(leg.journeyDate);

        try {
          const res = await apiFetchSecure('/api/fares', {
            trainNo: leg.trainNumber,
            from: leg.fromStation.code,
            to: leg.toStation.code,
            date: apiDate
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              setGlobalFaresCache(prev => {
                const next = { ...prev };
                const syncKey = `${leg.trainNumber}|${leg.journeyDate}`;
                const cacheObj = { data: data.data, updatedAt: data.updatedAt, originCode: data.originCode, originName: data.originName };
                next[legKey] = cacheObj;
                next[syncKey] = cacheObj;
                if (data.bulkData) {
                  for (const tNo of Object.keys(data.bulkData)) {
                    const bulkLegKey = `${tNo}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
                    const bulkSyncKey = `${tNo}|${leg.journeyDate}`;
                    const bulkCacheObj = {
                      data: data.bulkData[tNo].data,
                      updatedAt: data.updatedAt,
                      originCode: data.bulkData[tNo].originCode,
                      originName: data.bulkData[tNo].originName
                    };
                    next[bulkLegKey] = bulkCacheObj;
                    next[bulkSyncKey] = bulkCacheObj;
                  }
                }
                return next;
              });
            }
          }
        } catch (err) {
          console.error("Fetch route fares failed", err);
        } finally {
          setFetchingLegs(prev => {
            const next = new Set(prev);
            next.delete(legKey);
            return next;
          });
        }
      }
    }
  };

  // Zero Background Auto-Fetch: All fare/seat requests are strictly 100% On-Demand when user clicks card

  // ── Loading skeleton ─────────────────────────────────────
  if (isLoading && allRoutes.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="route-card p-6">
            <div className="animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-100 rounded w-full"></div>
              <div className="flex gap-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-24 w-24 bg-gray-100 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div className="route-card p-8 text-center">
        <p className="text-red-500 font-medium mb-3">{error}</p>
        <p className="text-gray-400 text-sm">Please try again or modify your search.</p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────
  if (allRoutes.length === 0) {
    return (
      <div className="route-card p-12 text-center">
        <Train className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-500 mb-2">No trains found</h3>
        <p className="text-gray-400 text-sm">Try a different date or route.</p>
      </div>
    );
  }

  // ── Filter & sort ────────────────────────────────────────
  let filtered = activeFilter === 'all'
    ? [...allRoutes]
    : activeFilter === 'high-confirm-chance'
    ? allRoutes.filter(r => (r.type === 'direct' || r.tags.includes('hidden-quota')))
    : allRoutes.filter(r => r.tags.includes(activeFilter as RouteTag));

  const isAvailableStatus = (s: string) => {
     if (!s) return false;
     const up = s.toUpperCase();
     if (up.includes('NOT AVAILABLE') || up.includes('NOT_AVAILABLE') || up.includes('NO ROOM') || up.includes('REGRET') || up.includes('TRAIN CANCELLED')) {
        return false;
     }
     if (up.includes('AVL') || up.includes('AVAILABLE') || up.includes('CURR_AV')) return true;
     return false;
  };

  const getBestFareAndStatus = (route: Route) => {
    if (sortScoresRef.current[route.id]) {
        return sortScoresRef.current[route.id];
    }
  
    let maxLegScore = 1; // 1 = AVAILABLE
    let totalFare = 0;
    let allLegsHaveFare = true;
    let isFullyFetched = true;

    for (const leg of route.legs) {
        const lKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
        const cacheData = globalFaresCache[lKey]?.data;
        if (!cacheData) isFullyFetched = false;
        
        const classesToCheck = cacheData || leg.classes || [];
        
        let legBestScore = 999;
        let legMinFare = 999999;

        if (classesToCheck.length > 0) {
           for (const c of classesToCheck) {
              if (c.fare > 0) {
                 const statusText = (c.status || c.statusText || (c.availability === 'AVAILABLE' ? 'AVAILABLE' : c.availability === 'RAC' ? 'RAC' : c.availability === 'WL' ? `WL ${c.waitlistNumber}` : '')).toUpperCase();
                 let score = 999;
                 if (isAvailableStatus(statusText)) score = 1;
                 else if (statusText.includes('RAC')) score = 2;
                 else if (statusText.includes('% CHANCE')) score = 3;
                 else if (statusText.includes('WL')) {
                     const m = statusText.match(/WL\s*[-/]?\s*(\d+)/i);
                     if (m) score = 10 + parseInt(m[1]);
                     else score = 998;
                 }
                 
                 if (score < legBestScore) {
                    legBestScore = score;
                    legMinFare = c.fare;
                 } else if (score === legBestScore && c.fare < legMinFare) {
                    legMinFare = c.fare;
                 }
              }
           }
        }
        
        maxLegScore = Math.max(maxLegScore, legBestScore);

        if (legMinFare < 999999) {
            totalFare += legMinFare;
        } else {
            allLegsHaveFare = false;
        }
    }
    
    const minFare = allLegsHaveFare && totalFare > 0 ? totalFare : 999999;
    const stats = { statusScore: maxLegScore, minFare };
    if (isFullyFetched) {
        sortScoresRef.current[route.id] = stats;
    }
    return stats;
  };

  if (activeFilter === 'high-confirm-chance') {
     filtered = allRoutes.filter(r => {
         if (r.tags.includes('hidden-quota')) return true;

         const checkLeg = (leg: any) => {
            const lKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
            const c = globalFaresCache[lKey];
            if (c?.data) {
                return c.data.some((cls:any) => isAvailableStatus(cls.status) && cls.fare > 0);
            }
            if (leg.classes && leg.classes.length > 0) {
                return leg.classes.some((cls:any) => {
                    const statusText = cls.statusText || (cls.availability === 'AVAILABLE' ? 'AVL' : cls.availability === 'RAC' ? 'RAC' : cls.availability === 'WL' ? `WL ${cls.waitlistNumber}` : '');
                    return isAvailableStatus(statusText) && cls.fare > 0;
                });
            }
            return true;
         };
         return r.legs.every(leg => checkLeg(leg));
     });
  }

  const getDepMinutes = (r: Route) => {
    const timeStr = r.legs[0]?.departureTime || "00:00";
    let h = 0, m = 0;
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
      const isPM = timeStr.toLowerCase().includes('pm');
      const clean = timeStr.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':');
      h = (parseInt(parts[0] || '0') % 12) + (isPM ? 12 : 0);
      m = parseInt(parts[1] || '0');
    } else {
      const parts = timeStr.split(':');
      h = parseInt(parts[0] || '0');
      m = parseInt(parts[1] || '0');
    }
    return h * 60 + m;
  };

  // 🚀 User Directive: Sort by Fastest Route (Total Duration) First!
  filtered.sort((a, b) => {
    if (activeFilter !== 'high-confirm-chance') {
      return a.totalDurationMinutes - b.totalDurationMinutes;
    }

    // Intelligence Sort for High Confirm Chance Tab:
    const aStats = getBestFareAndStatus(a);
    const bStats = getBestFareAndStatus(b);
    
    if (aStats.statusScore !== bStats.statusScore) {
       return aStats.statusScore - bStats.statusScore;
    }
    if (aStats.minFare !== bStats.minFare) {
       return aStats.minFare - bStats.minFare;
    }
    
    return getDepMinutes(a) - getDepMinutes(b);
  });

  return (
    <div className="space-y-3 pt-2 md:pt-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-1.5 md:mx-0">
        {/* ── Route Header Info ────────────────────────────── */}
      <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          {from && to && (
            <h2 className="text-xl md:text-xl font-bold text-gray-900 mb-0 flex items-center gap-2">
              {from} <span className="text-[var(--color-brand-blue)] text-lg leading-none">»</span> {to}
            </h2>
          )}
          <p className="hidden md:block text-sm text-gray-500 font-medium mt-1">
            Discover direct trains and smart connecting routes
          </p>
        </div>
        
        {/* Route count badge visible on both Mobile & Desktop */}
        <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-black text-blue-600 flex-shrink-0 shadow-sm">
          {allRoutes.length} Route{allRoutes.length !== 1 ? 's' : ''} Found
        </div>
      </div>

      {/* ── 7-Day Circular Date Picker ────────────────────── */}
      <div 
        ref={scrollContainerRef}
        className="bg-gray-50 px-3 md:px-4 py-3 border-b border-gray-100 flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide"
      >
        {datesList.map((d, i) => {
          const apiDate = formatDateForApi(d);
          const isSelected = date === apiDate || (i === 0 && !date);
          
          return (
            <button
              key={i}
              onClick={() => onDateChange && onDateChange(apiDate)}
              className={`flex flex-col items-center flex-shrink-0 transition-transform active:scale-95 ${isSelected ? 'date-btn-active' : ''}`}
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base md:text-lg font-bold shadow-sm border ${
                isSelected 
                  ? 'bg-[var(--color-brand-blue)] text-white border-blue-600' 
                  : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300'
              }`}>
                {getDayNum(d)}
              </div>
              <span className={`text-[10px] md:text-xs mt-1 font-medium ${isSelected ? 'text-[var(--color-brand-blue)]' : 'text-gray-500'}`}>
                {getDayName(d)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="bg-white px-3 md:px-4 py-3 flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] md:text-sm font-semibold border transition-colors ${
              activeFilter === f.id
                ? 'bg-transparent text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]'
                : 'bg-transparent text-gray-500 border-gray-300 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      </div>

      <div className="p-1 md:p-4 bg-gray-50 space-y-2 md:space-y-4 min-h-screen mx-1.5 md:mx-0 rounded-lg md:rounded-none">
        {filtered.length > 0 ? (
          filtered.map((route, idx) => (
             <RouteCard 
                key={route.id} 
                route={route} 
                globalFaresCache={globalFaresCache}
                fetchingLegs={fetchingLegs}
                setGlobalFaresCache={setGlobalFaresCache}
                activeFilter={activeFilter}
                onFetchFares={handleFetchRouteFares}
             />
          ))
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm">
            {isLoading ? 'Searching for more routes...' : 'No routes match this filter. Try "All Routes".'}
          </div>
        )}
        
        {/* Show a mini spinner at the bottom if still loading connecting routes */}
        {isLoading && allRoutes.length > 0 && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-brand-blue)]"></div>
            <span className="ml-2 text-sm text-gray-500 font-medium">Finding more connecting routes...</span>
          </div>
        )}
      </div>
    </div>
  );
}
