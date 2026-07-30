'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Train, RefreshCw, AlertCircle, X, ChevronRight, Calendar, MapPin, Sparkles } from 'lucide-react';

interface TrainSearchCardProps {
  onSelectTrain: (trainNumber: string, trainName: string) => void;
}

const POPULAR_TRAINS = [
  { number: '12642', name: 'Thirukkural SF Express', from: 'NZM', to: 'CAPE', days: 'Mon, Sat' },
  { number: '20423', name: 'Patalkot Express', from: 'CWA', to: 'BPL', days: 'Daily' },
  { number: '11201', name: 'Nagpur Chhindwara Express', from: 'NGP', to: 'CWA', days: 'Daily' },
  { number: '12511', name: 'Raptisagar Express', from: 'GKP', to: 'TVC', days: 'Tue, Thu, Sun' },
  { number: '12622', name: 'Tamil Nadu Express', from: 'NDLS', to: 'MAS', days: 'Daily' },
  { number: '12951', name: 'Mumbai Rajdhani Express', from: 'MMCT', to: 'NDLS', days: 'Daily' },
  { number: '12004', name: 'Lucknow Shatabdi Express', from: 'NDLS', to: 'LKO', days: 'Daily' },
  { number: '12296', name: 'Sanghamitra Express', from: 'DNR', to: 'SMVB', days: 'Daily' },
];

export default function TrainSearchCard({ onSelectTrain }: TrainSearchCardProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_searched_train_cards');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter local & API suggestions with 300ms debounce to prevent screen lagging
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      const qLower = query.toLowerCase().trim();
      
      // Look up popular trains first locally
      const localMatches = POPULAR_TRAINS.filter(
        t => t.number.includes(qLower) || 
             t.name.toLowerCase().includes(qLower) || 
             t.from.toLowerCase().includes(qLower) || 
             t.to.toLowerCase().includes(qLower)
      );

      // If user typed 4 or 5 digits, trigger dynamic API fetch
      if (/^\d{4,5}$/.test(qLower)) {
        setLoading(true);
        const timestamp = Date.now().toString();
        const clientSecret = "rls_internal_9x2k7m4p8q";
        const raw = timestamp + "_" + clientSecret;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
          const char = raw.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const token = Math.abs(hash).toString(36);

        fetch(`/api/train-info?number=${qLower}`, {
          headers: {
            'x-railsathi-token': token,
            'x-railsathi-time': timestamp
          }
        })
          .then(res => res.json())
          .then(json => {
            if (json?.success && json?.data?.train) {
              const tr = json.data.train;
              const apiTrain = {
                number: tr.number,
                name: tr.name,
                from: tr.source?.code || 'ORIGIN',
                to: tr.destination?.code || 'DEST',
                days: Array.isArray(tr.runDays) ? tr.runDays.join(', ') : 'Daily'
              };
              setSuggestions(prev => {
                const filtered = prev.filter(p => p.number !== apiTrain.number);
                return [apiTrain, ...filtered];
              });
            } else {
              setSuggestions(localMatches);
            }
          })
          .catch(() => {
            setSuggestions(localMatches);
          })
          .finally(() => setLoading(false));
      } else {
        setSuggestions(localMatches);
        setShowDropdown(true);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (number: string, name: string, from?: string, to?: string) => {
    try {
      let list = recentSearches.filter(t => t.number !== number);
      list.unshift({ number, name, from: from || '', to: to || '' });
      list = list.slice(0, 5);
      setRecentSearches(list);
      localStorage.setItem('recent_searched_train_cards', JSON.stringify(list));
    } catch (e) {}

    setShowDropdown(false);
    onSelectTrain(number, name);
  };

  const handleDirectSearch = () => {
    if (!query.trim()) return;
    const match = suggestions[0] || { number: query.trim(), name: `Train ${query.trim()}` };
    handleSelect(match.number, match.name, match.from, match.to);
  };

  return (
    <div className="bg-gradient-to-br from-[#121A29] via-[#172338] to-[#0F1623] border border-[#2B3E5C] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-visible mt-4">
      
      {/* Glow effect */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg text-white">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Search Train By Name or Number</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Direct Timetable
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Enter train number (e.g. 12642, 20423) or name (e.g. Patalkot, Rajdhani)
            </p>
          </div>
        </div>
      </div>

      {/* Input Box & Search Button with relative wrapper */}
      <div className="relative mb-3 z-30" ref={dropdownRef}>
        <div className="flex flex-col sm:flex-row gap-2 relative">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectSearch()}
              placeholder="Enter Train Number or Name (e.g. 12642 or Patalkot)"
              className="w-full bg-[#0B0F17] border border-[#2B3E5C] focus:border-cyan-400 rounded-xl px-4 py-3 text-sm font-extrabold text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner tracking-wide"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleDirectSearch}
            disabled={!query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Search className="w-4 h-4 text-white" />
            )}
            <span>Search Live Track</span>
          </button>
        </div>

        {/* Autocomplete Dropdown List */}
        {showDropdown && suggestions.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1.5 bg-[#141E2E] border border-[#2B3E5C] rounded-2xl shadow-2xl overflow-y-auto z-40 max-h-64 divide-y divide-[#202E44] [will-change:transform] overscroll-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {suggestions.map((st: any) => (
              <button
                key={st.number}
                onClick={() => handleSelect(st.number, st.name, st.from, st.to)}
                className="w-full text-left p-3.5 hover:bg-[#1C293F] active:bg-[#20314C] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black text-xs flex-shrink-0">
                    {st.number}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                      {st.name}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">
                      {st.from} ➔ {st.to} {st.days ? `• Runs: ${st.days}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Track Live</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Train Search Chips */}
      {recentSearches.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 mr-1">Recent Searches:</span>
          {recentSearches.map((t: any) => (
            <button
              key={t.number}
              onClick={() => handleSelect(t.number, t.name, t.from, t.to)}
              className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#192436] hover:bg-[#23334E] text-cyan-300 border border-[#2B3E5C] transition-all flex items-center gap-1"
            >
              <span>{t.number}</span>
              <span className="text-gray-400">•</span>
              <span className="truncate max-w-[120px]">{t.name}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
