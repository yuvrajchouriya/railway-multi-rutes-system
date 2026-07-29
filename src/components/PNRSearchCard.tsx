'use client';

import { useState, useEffect } from 'react';
import { Ticket, Search, RefreshCw, CheckCircle, AlertCircle, Share2, Sparkles, User, Calendar, MapPin, ChevronRight, X, Clock, PlayCircle } from 'lucide-react';

export default function PNRSearchCard() {
  const [pnrInput, setPnrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowDemo, setAllowDemo] = useState(false);
  const [pnrResult, setPnrResult] = useState<any | null>(null);
  const [recentPnrs, setRecentPnrs] = useState<string[]>([]);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_searched_pnrs');
      if (saved) {
        setRecentPnrs(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const handlePnrSearch = async (targetPnr?: string, forceDemo = false) => {
    const pnrToSearch = targetPnr || pnrInput;
    const clean = pnrToSearch.replace(/\D/g, '');

    if (clean.length < 10) {
      setError('Please enter a valid 10-digit PNR number');
      return;
    }

    setLoading(true);
    setError(null);
    setAllowDemo(false);

    try {
      const url = forceDemo 
        ? `/api/pnr-status?pnr=${clean}&demo=true`
        : `/api/pnr-status?pnr=${clean}`;
      
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.error) {
        if (json.allowDemo) setAllowDemo(true);
        throw new Error(json.error || 'Failed to fetch PNR status');
      }

      setPnrResult(json);

      try {
        let list = recentPnrs.filter(p => p !== clean);
        list.unshift(clean);
        list = list.slice(0, 5);
        setRecentPnrs(list);
        localStorage.setItem('recent_searched_pnrs', JSON.stringify(list));
      } catch (e) {}

    } catch (err: any) {
      setError(err.message || 'Unable to check PNR status right now');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePnr = async () => {
    if (!pnrResult?.data) return;
    const d = pnrResult.data;
    const text = `🎟️ PNR Status: ${d.pnr}\n🚆 Train: ${d.trainNo} - ${d.trainName}\n📅 Date: ${d.date} (${d.fromCode} ➔ ${d.toCode})\n📊 Chance: ${d.confirmationChance}%\n👥 Passengers: ${d.passengers.map((p: any) => `P${p.passengerNo}: ${p.currentStatus}`).join(', ')}\nCheck on RailSathi App!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `PNR Status ${d.pnr}`, text, url: window.location.href });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const pnrData = pnrResult?.data;

  return (
    <div className="bg-gradient-to-br from-[#131B2A] via-[#1A263B] to-[#111827] border border-[#2B3E5C] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden mt-4">
      
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg text-white">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>PNR Status & Confirmation Tracker</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live IRCTC Engine
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Enter active 10-digit IRCTC ticket PNR for real-time status
            </p>
          </div>
        </div>
      </div>

      {/* Input Box & Search Button */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={10}
            value={pnrInput}
            onChange={(e) => {
              setPnrInput(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handlePnrSearch()}
            placeholder="Enter 10-digit Booked IRCTC PNR"
            className="w-full bg-[#0B0F17] border border-[#2B3E5C] focus:border-emerald-400 rounded-xl px-4 py-3 text-sm font-extrabold text-white placeholder-gray-500 focus:outline-none transition-all shadow-inner tracking-wider"
          />
          {pnrInput && (
            <button
              onClick={() => { setPnrInput(''); setPnrResult(null); setError(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => handlePnrSearch()}
          disabled={loading || pnrInput.length < 10}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 flex-shrink-0"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Fetching IRCTC Data...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-white" />
              <span>Check Live PNR</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message & Demo Preview Button */}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>

          {allowDemo && (
            <button
              onClick={() => handlePnrSearch(undefined, true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg flex items-center justify-center gap-1.5 flex-shrink-0 shadow transition-all active:scale-95"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Try UI Demo Preview</span>
            </button>
          )}
        </div>
      )}

      {/* Recent Searched PNR Chips */}
      {recentPnrs.length > 0 && !pnrResult && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-gray-400 mr-1">Recent:</span>
          {recentPnrs.map((pnr) => (
            <button
              key={pnr}
              onClick={() => {
                setPnrInput(pnr);
                handlePnrSearch(pnr);
              }}
              className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#182335] hover:bg-[#23334E] text-emerald-400 border border-[#2B3E5C] transition-all"
            >
              {pnr}
            </button>
          ))}
        </div>
      )}

      {/* ── PNR RESULT DISPLAY CARD ──────────────────────────────────── */}
      {pnrData && (
        <div className="mt-4 bg-[#0B0F17] border border-[#253752] rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
          
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#23354E] gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">{pnrData.trainNo}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm font-extrabold text-emerald-400">{pnrData.trainName}</span>
              </div>
              <div className="text-xs text-gray-400 font-bold mt-0.5 flex items-center gap-3">
                <span>{pnrData.fromCode} ➔ {pnrData.toCode}</span>
                <span>•</span>
                <span>Date: {pnrData.date}</span>
                <span>•</span>
                <span className="text-purple-400">Class: {pnrData.travelClass}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                pnrResult.isDemo
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
              }`}>
                {pnrResult.isDemo ? 'UI Demo Preview ℹ️' : 'Live IRCTC Server Data ✅'}
              </span>

              <button
                onClick={handleSharePnr}
                className="p-1.5 rounded-lg bg-[#1E2B40] hover:bg-[#2C3E5A] text-purple-300 border border-[#344A6F] transition-all"
                title="Share PNR Status"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 📊 Confirmation Probability Score Gauge */}
          <div className="bg-[#121A28] p-3 rounded-xl border border-[#23354E] mb-4">
            <div className="flex items-center justify-between text-xs font-black mb-1.5">
              <span className="text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Confirmation Probability Score:</span>
              </span>
              <span className={`text-sm font-black ${
                pnrData.confirmationChance >= 80 ? 'text-emerald-400' : pnrData.confirmationChance >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {pnrData.confirmationChance}% ({pnrData.confirmationChance >= 80 ? 'High Chance' : pnrData.confirmationChance >= 50 ? 'Medium Chance' : 'Low Chance'})
              </span>
            </div>

            <div className="relative w-full h-2.5 bg-[#1E2B40] rounded-full overflow-hidden">
              <div
                className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
                  pnrData.confirmationChance >= 80
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : pnrData.confirmationChance >= 50
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-600 to-orange-500'
                }`}
                style={{ width: `${pnrData.confirmationChance}%` }}
              ></div>
            </div>
          </div>

          {/* Passenger Status Table */}
          <div className="space-y-2 mb-3">
            <div className="text-xs text-gray-400 uppercase font-black tracking-wider px-1">
              Passenger Booking & Current Status:
            </div>

            {pnrData.passengers?.map((p: any, idx: number) => {
              const isConf = p.currentStatus.includes('CNF') || p.currentStatus.includes('CONFIRM');

              return (
                <div key={idx} className="p-3 rounded-xl bg-[#131B2A] border border-[#202E44] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1F2C42] text-xs font-black text-white flex items-center justify-center">
                      #{p.passengerNo}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 font-bold">
                        Booking: <span className="text-gray-200">{p.bookingStatus}</span>
                      </div>
                      <div className="text-xs text-gray-300 font-semibold mt-0.5">
                        Berth: {p.berthType || 'Standard'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border ${
                      isConf
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : 'bg-blue-950/80 text-cyan-300 border-cyan-500/50'
                    }`}>
                      {p.currentStatus}
                    </div>
                    {p.coach !== '--' && p.coach !== 'RAC' && (
                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                        Coach {p.coach} • Seat {p.berth}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {copiedShare && (
            <div className="text-center text-xs font-bold text-purple-400">
              Copied PNR details to clipboard!
            </div>
          )}

        </div>
      )}

    </div>
  );
}
