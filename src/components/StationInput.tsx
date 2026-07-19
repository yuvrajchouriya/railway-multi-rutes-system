'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { Station } from '@/types/railway';

interface StationInputProps {
  label: string;
  placeholder: string;
  value: Station | null;
  onChange: (station: Station | null) => void;
  id: string;
}

export default function StationInput({ label, placeholder, value, onChange, id }: StationInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync display when value changes externally (e.g. swap)
  useEffect(() => {
    setQuery(value ? `${value.name} (${value.code})` : '');
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    // Don't re-search if already selected
    if (value && query === `${value.name} (${value.code})`) return;
    if (query.length < 2) { setSuggestions([]); setIsOpen(false); return; }

    const t = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stations?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: Station[] = await res.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, value]);

  const select = (station: Station) => {
    onChange(station);
    setIsOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-[#3A506B]" />
        </div>
        <input
          id={id}
          type="text"
          autoComplete="off"
          className="block w-full pl-9 pr-9 py-2.5 border-none rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading
            ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            : query && (
              <button type="button" onClick={clear} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )
          }
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-[var(--color-brand-navy-card)] border border-[#3A506B] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((station) => (
            <li
              key={station.code}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#3A506B]/50 group border-b border-[#3A506B] last:border-0"
              onClick={() => select(station)}
            >
              <div>
                <div className="font-medium text-sm text-white group-hover:text-blue-400 transition-colors">
                  {station.name}
                </div>
                <div className="text-xs text-gray-400">{station.state || 'India'}</div>
              </div>
              <span className="font-mono text-xs font-bold text-gray-300 bg-[var(--color-brand-navy)] border border-[#3A506B] px-2 py-1 rounded">
                {station.code}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
