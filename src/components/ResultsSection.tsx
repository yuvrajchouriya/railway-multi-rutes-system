'use client';

import { useState, useEffect, useRef } from 'react';
import { Route, RouteTag } from '@/types/railway';
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
  
  // Scroll to active date when it changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('.date-btn-active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [date]);
  
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

  // ── Concurrent Fetching Logic ──────────────────────────────
  useEffect(() => {
    let isCancelled = false;
    
    const fetchAll = async () => {
      const processedThisRun = new Set<string>();
      
      // Sort routes by duration to match initial UI order so top routes fetch first
      const sortedForQueue = [...allRoutes].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
      
      const queue: any[] = [];
      for (const route of sortedForQueue) {
         for (const leg of route.legs) {
             const legKey = `${leg.trainNumber}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
             queue.push({ leg, legKey, route });
         }
      }

      // Concurrency limit
      const CONCURRENCY = 4;
      let activeWorkers = 0;
      let queueIndex = 0;

      const processNext = async () => {
         if (isCancelled || queueIndex >= queue.length) return;
         const current = queue[queueIndex++];
         activeWorkers++;
         
         const { leg, legKey } = current;
         
         try {
             let isCached = false;
             setGlobalFaresCache(prev => {
                if (prev[legKey]) isCached = true;
                return prev;
             });

             if (!isCached && !processedThisRun.has(legKey)) {
                 processedThisRun.add(legKey);
                 setFetchingLegs(prev => new Set(prev).add(legKey));

                 let apiDate = leg.journeyDate;
                 if (apiDate.includes('-') && apiDate.split('-')[0].length === 4) {
                    const parts = apiDate.split('-');
                    apiDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                 }

                 const res = await fetch(`/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}`);
                 if (res.ok) {
                    const data = await res.json();
                     if (data.success && data.data) {
                        setGlobalFaresCache(prev => {
                           const next = { ...prev };
                           next[legKey] = { data: data.data, updatedAt: data.updatedAt, originCode: data.originCode, originName: data.originName };
                           
                           if (data.bulkData) {
                              for (const tNo of Object.keys(data.bulkData)) {
                                 const bulkLegKey = `${tNo}|${leg.fromStation.code}|${leg.toStation.code}|${leg.journeyDate}`;
                                 next[bulkLegKey] = {
                                    data: data.bulkData[tNo].data,
                                    updatedAt: data.updatedAt,
                                    originCode: data.bulkData[tNo].originCode,
                                    originName: data.bulkData[tNo].originName
                                 };
                              }
                           }
                           return next;
                        });
                     }
                 }
             }
         } catch (err) {
            console.error("Fetch failed", err);
         } finally {
            setFetchingLegs(prev => {
               const next = new Set(prev);
               next.delete(legKey);
               return next;
            });
            activeWorkers--;
            setTimeout(() => {
                if (!isCancelled) processNext();
            }, 100);
         }
      };

      for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
         processNext();
      }
    };

    if (allRoutes.length > 0) {
       fetchAll();
    }

    return () => { isCancelled = true; };
  }, [directRoutes, connectingRoutes]);

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
    : allRoutes.filter(r => r.tags.includes(activeFilter as RouteTag));

  const isAvailableStatus = (s: string) => {
     if (!s) return false;
     const up = s.toUpperCase();
     if (up.includes('AVL') || up.includes('AVAILABLE') || up.includes('CURR_AV')) return true;
     // Exclude WL, RAC, REGRET, etc. based on user strict 'confirm seat available' request
     return false;
  };


  const getBestFareAndStatus = (route: Route) => {
    if (sortScoresRef.current[route.id]) {
        return sortScoresRef.current[route.id];
    }
  
    let bestStatusScore = 999;
    let minFare = 999999;
    
    let allAvailable = true;
    let totalFare = 0;
    
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
                 if (statusText.includes('AVL') || statusText.includes('AVAILABLE')) score = 1;
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
        
        if (legBestScore === 999) {
            allAvailable = false;
        }
        bestStatusScore = Math.max(bestStatusScore === 999 ? 0 : bestStatusScore, legBestScore);
        if (legMinFare < 999999) {
            totalFare += legMinFare;
        } else {
            allAvailable = false;
        }
    }
    
    if (allAvailable) {
        minFare = totalFare;
    } else {
        bestStatusScore = 999;
    }
    
    const stats = { statusScore: bestStatusScore, minFare };
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
            // Connecting routes often don't have initial classes, assume true until fetched
            return true;
         };
         return r.legs.every(leg => checkLeg(leg));
     });
  }

  // Smart Sorting logic
  filtered.sort((a, b) => {
    if (activeFilter !== 'high-confirm-chance') {
      // Fast to slow duration sort for 'All', 'Direct', 'Connecting'
      return a.totalDurationMinutes - b.totalDurationMinutes;
    }

    // Intelligence Sort (For High Confirm Chance)
    const aStats = getBestFareAndStatus(a);
    const bStats = getBestFareAndStatus(b);
    
    // In high-confirm-chance tab, prioritize Available routes first, then by cheapest fare
    if (activeFilter === 'high-confirm-chance') {
       if (aStats.statusScore !== bStats.statusScore) {
          return aStats.statusScore - bStats.statusScore;
       }
       return aStats.minFare - bStats.minFare;
    }
    
    if (aStats.statusScore !== bStats.statusScore) {
       return aStats.statusScore - bStats.statusScore;
    }
    
    if (aStats.minFare !== bStats.minFare && aStats.minFare < 999999 && bStats.minFare < 999999) {
       return aStats.minFare - bStats.minFare;
    }
    
    // Tie-breaker: direct over connecting
    if (a.type === 'direct' && b.type !== 'direct') return -1;
    if (a.type !== 'direct' && b.type === 'direct') return 1;
    
    return a.totalDurationMinutes - b.totalDurationMinutes;
  });

  return (
    <div className="space-y-2 md:space-y-4 pt-2 md:pt-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-2 md:mx-0">
        {/* ── Route Header Info ────────────────────────────── */}
      <div className="bg-white p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div>
          {from && to && (
            <h2 className="text-xl md:text-xl font-bold text-gray-900 mb-0 flex items-center gap-2">
              {from} <span className="text-[var(--color-brand-blue)] text-lg leading-none">»</span> {to}
            </h2>
          )}
          {/* Hide subtitle on mobile, show on desktop */}
          <p className="hidden md:block text-sm text-gray-500 font-medium mt-1">
            {allRoutes.length} Route{allRoutes.length > 1 ? 's' : ''} Found
          </p>
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

      <div className="p-1.5 md:p-4 bg-gray-50 space-y-2 md:space-y-4 min-h-screen">
        {filtered.length > 0 ? (
          filtered.map((route, idx) => (
             <RouteCard 
                key={route.id} 
                route={route} 
                globalFaresCache={globalFaresCache}
                fetchingLegs={fetchingLegs}
                setGlobalFaresCache={setGlobalFaresCache}
                activeFilter={activeFilter}
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
