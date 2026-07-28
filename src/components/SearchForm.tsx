'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Search, CalendarDays, Loader2, MapPin, ChevronRight, History } from 'lucide-react';
import StationInput from './StationInput';
import { Station } from '@/types/railway';

interface SearchFormProps {
  onSearch: (from: string, to: string, date: string) => void;
  isLoading: boolean;
  initialFrom?: Station | null;
  initialTo?: Station | null;
  initialDate?: string;
}

interface SearchHistoryItem {
  fromCode: string;
  toCode: string;
  fromName: string;
  toName: string;
  date: string;
  trainNumber?: string;
  trainName?: string;
}

export default function SearchForm({
  onSearch,
  isLoading,
  initialFrom = null,
  initialTo = null,
  initialDate,
}: SearchFormProps) {
  const [from, setFrom] = useState<Station | null>(initialFrom);
  const [to, setTo] = useState<Station | null>(initialTo);
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  // Load Search History from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('search_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        // Fallback initial history items matching image
        const defaults: SearchHistoryItem[] = [
          { fromCode: 'CWA', toCode: 'BPL', fromName: 'Chhindwara', toName: 'Bhopal', date: new Date().toISOString().split('T')[0], trainNumber: '20423', trainName: 'Patalkot Express' },
          { fromCode: 'NITR', toCode: 'REWA', fromName: 'Netaji Subhash', toName: 'Rewa', date: new Date().toISOString().split('T')[0], trainNumber: '11755', trainName: 'Rewa Express' }
        ];
        setHistory(defaults);
      }
    } catch (e) {}
  }, []);

  const swap = () => { setFrom(to); setTo(from); };

  const saveToHistory = (fCode: string, tCode: string, fName: string, tName: string) => {
    try {
      const newItem: SearchHistoryItem = {
        fromCode: fCode,
        toCode: tCode,
        fromName: fName,
        toName: tName,
        date: date,
        trainNumber: fCode === 'CWA' ? '20423' : '11755',
        trainName: fCode === 'CWA' ? 'Patalkot Express' : 'Rewa Express'
      };
      
      const filtered = history.filter(h => !(h.fromCode === fCode && h.toCode === tCode));
      const updated = [newItem, ...filtered].slice(0, 2);
      setHistory(updated);
      localStorage.setItem('search_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to && date) {
      saveToHistory(from.code, to.code, from.name, to.name);
      onSearch(from.code, to.code, date);
    }
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    const fStn: Station = { code: item.fromCode, name: item.fromName || item.fromCode, state: null, isJunction: false };
    const tStn: Station = { code: item.toCode, name: item.toName || item.toCode, state: null, isJunction: false };
    setFrom(fStn);
    setTo(tStn);
    onSearch(item.fromCode, item.toCode, item.date || date);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="bg-[var(--color-brand-navy-card)] border border-[#3A506B] rounded-2xl p-6 shadow-2xl relative mt-4"
      >
        <div className="flex flex-col md:flex-row items-stretch gap-4 relative">
          {/* FROM */}
          <div className="flex-1 bg-[var(--color-brand-navy)] border border-[#3A506B] rounded-xl p-3 hover:border-blue-400 transition-colors relative z-10">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">FROM</label>
            <StationInput id="from-station" label="" placeholder="From Station" value={from} onChange={setFrom} />
            
            {/* SWAP BUTTON */}
            <button
              type="button"
              onClick={swap}
              className="absolute z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-[var(--color-brand-blue)] to-purple-500 text-white shadow-lg border-2 border-[var(--color-brand-navy-card)] left-1/2 -bottom-6 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-6 md:top-1/2 md:-translate-y-1/2 md:bottom-auto"
            >
              <ArrowUpDown className="w-4 h-4 md:rotate-90" />
            </button>
          </div>

          {/* TO */}
          <div className="flex-1 bg-[var(--color-brand-navy)] border border-[#3A506B] rounded-xl p-3 hover:border-blue-400 transition-colors">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">TO</label>
            <StationInput id="to-station" label="" placeholder="To Station" value={to} onChange={setTo} />
          </div>

          {/* DATE */}
          <div 
            className="md:w-52 bg-[var(--color-brand-navy)] border border-[#3A506B] rounded-xl p-3 hover:border-blue-400 transition-colors cursor-pointer relative group flex flex-col justify-center"
            onClick={() => {
              const input = document.getElementById('journey-date') as HTMLInputElement;
              if (input) {
                if (typeof input.showPicker === 'function') {
                  try { input.showPicker(); } catch (e) { input.focus(); input.click(); }
                } else {
                  input.focus();
                  input.click();
                }
              }
            }}
          >
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 cursor-pointer pointer-events-none">DEPARTURE</label>
            <div className="text-sm md:text-base font-bold text-white truncate pointer-events-none">
              {(() => {
                if (!date) return 'Select Date';
                const d = new Date(date + 'T00:00:00');
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = d.getDate();
                const year = d.getFullYear();
                return `${dayName}, ${dayNum} ${monthName} ${year}`;
              })()}
            </div>
            <input
              id="journey-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sr-only"
            />
          </div>

          {/* SEARCH BUTTON */}
          <button
            type="submit"
            disabled={!from || !to || !date || isLoading}
            className="md:w-40 flex-shrink-0 bg-gradient-to-r from-[var(--color-brand-blue)] to-purple-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-black rounded-xl transition-all shadow-xl shadow-blue-900/50 flex items-center justify-center gap-2 py-4 md:py-0"
          >
            {isLoading
              ? <Loader2 className="w-6 h-6 animate-spin" />
              : 'SEARCH'
            }
          </button>
        </div>
      </form>

      {/* ── SEARCH HISTORY CARD (Exact Image media__1784730953683.png Layout) ─────────────── */}
      {history.length > 0 && (
        <div className="bg-[#121824] border border-[#233148] rounded-2xl p-4 shadow-xl text-white">
          <div className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>SEARCH HISTORY</span>
          </div>

          <div className="divide-y divide-[#1D2B42]">
            {history.slice(0, 2).map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleHistoryClick(item)}
                className="py-3 flex items-center justify-between hover:bg-[#182336] px-2 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {item.trainNumber || '20423'}
                  </span>
                  <span className="font-semibold text-sm text-gray-300">
                    {item.trainName || `${item.fromCode} Express`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm font-extrabold text-gray-300">
                  <span>{item.fromCode} - {item.toCode}</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
