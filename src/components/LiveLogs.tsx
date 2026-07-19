'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, X, Minus, ChevronUp } from 'lucide-react';

interface LogLine {
  id: number;
  raw: string;
}

interface LiveLogsProps {
  isSearching: boolean;
  from: string;
  to: string;
  date: string;
}

let logId = 0;

export default function LiveLogs({ isSearching }: LiveLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [hidden, setHidden] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Connect to SSE stream on mount
  useEffect(() => {
    const es = new EventSource('/api/logs');
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as string;
        setLogs(prev => [...prev.slice(-149), { id: ++logId, raw: msg }]);
        if (isSearching || msg.includes('🔍')) setHidden(false);
      } catch {}
    };

    es.onerror = () => {
      // SSE auto-reconnects, ignore errors
    };

    return () => es.close();
  }, []);

  // Show terminal when search starts
  useEffect(() => {
    if (isSearching) {
      setHidden(false);
      setMinimized(false);
    }
  }, [isSearching]);

  // Auto-scroll
  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, minimized]);

  // Color coding
  const lineColor = (raw: string) => {
    if (raw.includes('❌') || raw.includes('⚠')) return 'text-red-400';
    if (raw.includes('✅') || raw.includes('💾')) return 'text-green-400';
    if (raw.includes('📡') || raw.includes('🔍')) return 'text-cyan-400';
    if (raw.includes('🚂') || raw.includes('🔄')) return 'text-yellow-300';
    return 'text-gray-300';
  };

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-gray-900 text-green-400 text-xs px-3 py-2 rounded-full shadow-lg hover:bg-gray-800 transition-all"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>Live Logs</span>
        {isSearching && <span className="animate-pulse text-yellow-400">●</span>}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-[460px] bg-gray-950 border border-gray-700 rounded-xl shadow-2xl font-mono text-xs transition-all duration-300 ${minimized ? 'h-10' : 'h-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 rounded-t-xl border-b border-gray-700 select-none">
        <div className="flex items-center gap-2 text-green-400">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-wide">Live Server Logs</span>
          {isSearching && (
            <span className="flex items-center gap-1 text-yellow-400 text-[10px]">
              <span className="animate-pulse">●</span> SEARCHING
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLogs([])}
            className="text-gray-500 hover:text-gray-300 transition-colors text-[10px]"
          >
            CLEAR
          </button>
          <button onClick={() => setMinimized(!minimized)} className="text-gray-400 hover:text-white transition-colors">
            {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setHidden(true)} className="text-gray-400 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log content */}
      {!minimized && (
        <div className="overflow-y-auto h-[calc(100%-40px)] px-3 py-2 space-y-0.5 scrollbar-hide">
          {logs.length === 0 && (
            <div className="text-gray-500 text-center py-10">
              Koi search karo — real server logs yahan stream honge...
            </div>
          )}
          {logs.map(log => (
            <div key={log.id} className={`leading-relaxed ${lineColor(log.raw)}`}>
              {log.raw}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
