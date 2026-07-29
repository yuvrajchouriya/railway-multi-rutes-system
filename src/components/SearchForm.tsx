'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Search, CalendarDays, Loader2 } from 'lucide-react';
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
    if (from && to && date) {
      onSearch(from.code, to.code, date);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-[#121824] border border-[#233148] rounded-2xl p-4 sm:p-5 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-2 relative">
          
          {/* From Station */}
          <div className="flex-1 relative bg-[#182235] border border-[#2C3E5A] rounded-xl px-3 py-1 focus-within:border-cyan-500/50 transition-colors">
            <StationInput
              id="from-station-input"
              label="From Station"
              placeholder="Search source (e.g. NGP)"
              value={from}
              onChange={setFrom}
            />
          </div>

          {/* Swap Button */}
          <div className="flex items-center justify-center -my-1 lg:my-0 lg:-mx-1 z-10">
            <button
              type="button"
              onClick={swap}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform border-2 border-[#121824]"
            >
              <ArrowUpDown className="w-5 h-5 rotate-90 lg:rotate-0" />
            </button>
          </div>

          {/* To Station */}
          <div className="flex-1 relative bg-[#182235] border border-[#2C3E5A] rounded-xl px-3 py-1 focus-within:border-cyan-500/50 transition-colors">
            <StationInput
              id="to-station-input"
              label="To Station"
              placeholder="Search destination (e.g. CAPE)"
              value={to}
              onChange={setTo}
            />
          </div>

          {/* Date Picker */}
          <div className="w-full lg:w-48 relative">
            <label className="absolute top-2 left-3 z-10 text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest">Journey Date</label>
            <div className="pt-5 pl-3 pr-2 bg-[#182235] border border-[#2C3E5A] rounded-xl flex items-center justify-between text-sm font-bold text-white focus-within:border-cyan-500/50 transition-colors h-[54px]">
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none w-full font-mono text-sm [color-scheme:dark]"
              />
              <CalendarDays className="w-4 h-4 text-cyan-400 pointer-events-none flex-shrink-0" />
            </div>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || !from || !to}
            className="w-full lg:w-36 h-[54px] bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm tracking-wider"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>SEARCH</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
