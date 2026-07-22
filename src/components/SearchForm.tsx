'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Search, CalendarDays, Loader2, MapPin, ChevronDown } from 'lucide-react';
import StationInput from './StationInput';
import { Station } from '@/types/railway';

interface SearchFormProps {
  onSearch: (from: string, to: string, date: string) => void;
  isLoading: boolean;
  initialFrom?: Station | null;
  initialTo?: Station | null;
  initialDate?: string;
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

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  const swap = () => { setFrom(to); setTo(from); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to && date) onSearch(from.code, to.code, date);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-brand-navy-card)] border border-[#3A506B] rounded-2xl p-6 shadow-2xl relative mt-10"
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
          className="md:w-52 bg-[var(--color-brand-navy)] border border-[#3A506B] rounded-xl p-3 hover:border-blue-400 transition-colors cursor-pointer relative"
          onClick={() => {
            try {
              (document.getElementById('journey-date') as any)?.showPicker();
            } catch (e) {
              document.getElementById('journey-date')?.focus();
            }
          }}
        >
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 cursor-pointer">DEPARTURE</label>
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
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
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
  );
}
