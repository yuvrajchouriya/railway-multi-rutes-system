'use client';

import { useState, useEffect } from 'react';
import { Route } from '@/types/railway';
import SearchForm from '@/components/SearchForm';
import ResultsSection from '@/components/ResultsSection';
import LiveLogs from '@/components/LiveLogs';
import RouteCard from '@/components/RouteCard';
import LiveTrainModal from '@/components/LiveTrainModal';
import { Train, Heart, X } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ directRoutes: Route[]; connectingRoutes: Route[] } | null>(null);
  const [searchedFrom, setSearchedFrom] = useState('');
  const [searchedTo, setSearchedTo] = useState('');
  const [searchedDate, setSearchedDate] = useState('');
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [savedFullRoutes, setSavedFullRoutes] = useState<Route[]>([]);
  const [selectedSavedRoute, setSelectedSavedRoute] = useState<Route | null>(null);
  const [globalFaresCache, setGlobalFaresCache] = useState<Record<string, { data: any[], updatedAt: string, originCode?: string, originName?: string }>>({});
  const [fetchingLegs, setFetchingLegs] = useState<Set<string>>(new Set());

  // ── Mobile Single Back Navigation Fix (Page Level) ─────────────────────
  useEffect(() => {
    if (results !== null) {
      window.history.pushState({ view: 'results' }, '');
    }
  }, [results !== null]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state || e.state.view !== 'results') {
        setResults(null);
        setIsLoading(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSearch = async (from: string, to: string, date: string) => {
    setIsLoading(true);
    setError(null);
    setSearchedFrom(from);
    setSearchedTo(to);
    setSearchedDate(date);
    setResults(null); // Clear previous results

    try {
      // Step 1: Fetch Direct Routes immediately
      const directRes = await fetch(`/api/search?from=${from}&to=${to}&date=${date}&type=direct`);
      const directData = await directRes.json();
      
      if (!directRes.ok || directData.error) throw new Error(directData.error || 'Search failed');
      
      // Show direct routes instantly
      setResults({ directRoutes: directData.directRoutes || [], connectingRoutes: [] });

      // Step 2: Fetch Connecting Routes progressively via NDJSON Stream
      fetch(`/api/search?from=${from}&to=${to}&date=${date}&type=connecting`)
        .then(async (res) => {
          if (!res.body) return;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const route = JSON.parse(line) as Route;
                  setResults(prev => prev ? { ...prev, connectingRoutes: [...prev.connectingRoutes, route] } : null);
                } catch (e) {
                  console.error("Error parsing streaming route:", e);
                }
              }
            }
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Connecting routes fetch failed:", err);
          setIsLoading(false);
        });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const [selectedLiveTrain, setSelectedLiveTrain] = useState<{ trainNumber: string; trainName: string } | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-brand-navy)] pb-10">
      {/* ── Top Nav (How2Go) ─────────────────────────────────────── */}
      <nav className="bg-[var(--color-brand-navy-card)] sticky top-0 z-40 border-b border-[#3A506B] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--color-brand-blue)] to-purple-600 flex items-center justify-center text-white font-black shadow-md">
              RS
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              Rail<span className="text-[var(--color-brand-blue)]">Sathi</span>
            </span>
          </div>

          {/* Top Nav Wishlist Heart Button (Opposite to RailSathi Logo) */}
          <button
            onClick={() => {
              try {
                const saved = localStorage.getItem('saved_wishlist_trains');
                const savedRoutes = localStorage.getItem('saved_wishlist_full_routes');
                setWishlistItems(saved ? JSON.parse(saved) : []);
                setSavedFullRoutes(savedRoutes ? JSON.parse(savedRoutes) : []);
              } catch (e) {}
              setShowWishlistModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e2a44] border border-[#3A506B] hover:border-pink-500/50 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
            <span>Wishlist</span>
          </button>
        </div>
      </nav>

      {/* ── Wishlist Saved Routes Modal ─────────────────────────────── */}
      {showWishlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A253A] border border-[#2F4264] rounded-2xl p-5 max-w-lg w-full shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C3E5E] mb-4">
              <h3 className="text-base font-black flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                <span>Wishlist Saved Items ({savedFullRoutes.length + wishlistItems.length})</span>
              </h3>
              <button onClick={() => setShowWishlistModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
              {savedFullRoutes.length === 0 && wishlistItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No saved routes in your wishlist yet. Click the Heart icon on any route card to save!</p>
              ) : (
                <>
                  {/* Saved Full Routes (Direct & Connecting Combinations) */}
                  {savedFullRoutes.map((route: Route, idx: number) => {
                    const firstLeg = route.legs[0];
                    const lastLeg = route.legs[route.legs.length - 1];
                    const routeName = route.legs.map(l => `${l.trainNumber} ${l.trainName}`).join(' ➔ ');

                    return (
                      <div key={`route-${idx}`} className="p-3.5 bg-[#121927] border border-[#2B3D5E] rounded-xl flex items-center justify-between shadow-md">
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${route.type === 'direct' ? 'bg-green-600 text-white' : 'bg-purple-600 text-white'}`}>
                              {route.type === 'direct' ? 'DIRECT' : 'CONNECTING'}
                            </span>
                            <span className="font-extrabold text-xs text-white truncate max-w-[220px]">{routeName}</span>
                          </div>
                          <div className="text-xs text-gray-300 font-bold">
                            {firstLeg.fromStation.code} ({firstLeg.departureTime}) ➔ {lastLeg.toStation.code} ({lastLeg.arrivalTime})
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSavedRoute(route);
                            setShowWishlistModal(false);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95"
                        >
                          View Route
                        </button>
                      </div>
                    );
                  })}

                  {/* Saved Trains */}
                  {wishlistItems.map((item: any, idx: number) => {
                    const tNo = typeof item === 'string' ? item : item.trainNumber;
                    const tName = typeof item === 'string' ? (item === '20423' ? 'Patalkot Express' : 'Rewa Express') : (item.trainName || 'Saved Train');
                    const fCode = typeof item === 'object' && item.fromCode ? item.fromCode : (tNo === '20423' ? 'CWA' : 'NITR');
                    const tCode = typeof item === 'object' && item.toCode ? item.toCode : (tNo === '20423' ? 'BPL' : 'REWA');

                    return (
                      <div key={`item-${idx}`} className="p-3 bg-[#121927] border border-[#253652] rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-sm text-white">{tNo} - {tName}</div>
                          <div className="text-xs text-gray-400 font-semibold">{fCode} ➔ {tCode}</div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedLiveTrain({ trainNumber: tNo, trainName: tName });
                            setShowWishlistModal(false);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow transition-all active:scale-95"
                        >
                          Live Status
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <button
              onClick={() => setShowWishlistModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Direct Live Train Modal from Wishlist ── */}
      {selectedLiveTrain && (
        <LiveTrainModal
          trainNumber={selectedLiveTrain.trainNumber}
          trainName={selectedLiveTrain.trainName}
          onClose={() => setSelectedLiveTrain(null)}
        />
      )}

      {/* ── Dedicated Saved Route Preview Modal (OPENS ONLY THIS EXACT ROUTE) ── */}
      {selectedSavedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121824] border border-[#2A3C58] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            <div className="bg-[#1C2638] px-4 py-3 border-b border-[#2B3B56] flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                <span>Wishlist Saved Route Preview</span>
              </h3>
              <button onClick={() => setSelectedSavedRoute(null)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <RouteCard
                route={selectedSavedRoute}
                globalFaresCache={globalFaresCache}
                fetchingLegs={fetchingLegs}
                setGlobalFaresCache={setGlobalFaresCache}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Hero + Search ────────────────────────────────── */}
      <div className={`bg-[var(--color-brand-navy-card)] border-b border-[#3A506B] py-6 px-4 ${
        (isLoading || error || results) ? 'hidden md:block' : 'block'
      }`}>
        <div className="max-w-5xl mx-auto">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} initialDate={searchedDate} />
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {(isLoading || error || results) ? (
          <ResultsSection
            isLoading={isLoading}
            error={error}
            directRoutes={results?.directRoutes ?? []}
            connectingRoutes={results?.connectingRoutes ?? []}
            from={searchedFrom}
            to={searchedTo}
            date={searchedDate}
            onDateChange={(newDate) => handleSearch(searchedFrom, searchedTo, newDate)}
          />
        ) : (
          /* ── Landing tips ─────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: '🎯', title: 'Confirm Chance First', desc: 'Routes with highest ticket confirmation probability shown first.' },
              { icon: '🔄', title: 'Smart Connecting', desc: 'When direct trains are full, we find connecting routes via major junctions.' },
              { icon: '📅', title: 'Next 6 Dates', desc: 'Click any class box to see availability for the next 6 run dates.' },
            ].map((tip, i) => (
              <div key={i} className="route-card p-5">
                <div className="text-3xl mb-3">{tip.icon}</div>
                <div className="font-bold text-white mb-1">{tip.title}</div>
                <div className="text-sm text-gray-400">{tip.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note: LiveLogs has been hidden from UI per user request */}
    </div>
  );
}
