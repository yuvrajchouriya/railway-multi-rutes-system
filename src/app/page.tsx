'use client';

import { useState } from 'react';
import { Route } from '@/types/railway';
import SearchForm from '@/components/SearchForm';
import ResultsSection from '@/components/ResultsSection';
import LiveLogs from '@/components/LiveLogs';
import { Train } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ directRoutes: Route[]; connectingRoutes: Route[] } | null>(null);
  const [searchedFrom, setSearchedFrom] = useState('');
  const [searchedTo, setSearchedTo] = useState('');
  const [searchedDate, setSearchedDate] = useState('');

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

  return (
    <div className="min-h-screen bg-[var(--color-brand-navy)] pb-10">
      {/* ── Top Nav (How2Go) ─────────────────────────────────────── */}
      <nav className="bg-[var(--color-brand-navy-card)] sticky top-0 z-40 border-b border-[#3A506B] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--color-brand-blue)] to-purple-600 flex items-center justify-center text-white font-black shadow-md">
              H2
            </div>
            <span className="font-black text-xl tracking-tight text-white">
              How2<span className="text-[var(--color-brand-blue)]">Go</span>
            </span>
          </div>
          <button className="text-sm font-medium text-[var(--color-brand-blue)] px-4 py-1.5 rounded-full border border-[#3A506B] hover:bg-[#3A506B]/50 transition-colors">
            Login
          </button>
        </div>
      </nav>

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
