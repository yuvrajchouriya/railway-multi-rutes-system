'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Train, MapPin, AlertCircle, Clock } from 'lucide-react';

interface LiveTrainModalProps {
  trainNumber: string;
  trainName: string;
  onClose: () => void;
}

export default function LiveTrainModal({ trainNumber, trainName, onClose }: LiveTrainModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchLiveStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/live-status?trainNo=${trainNumber}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Unable to fetch live train status');
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load live status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
  }, [trainNumber]);

  const openGoogleMaps = (stationName: string, lat?: number, lng?: number) => {
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stationName + ' Railway Station')}`;
    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-[#233148] rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        
        {/* ── Top Header (WIMT App Style) ────────────────────────── */}
        <div className="bg-[#1C2638] px-4 py-3 border-b border-[#2B3B56] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-300">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{trainNumber}</span>
                <span className="text-gray-400 font-normal">-</span>
                <span className="truncate max-w-[170px] sm:max-w-[280px]">{data?.train?.name || trainName}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-[#273650] hover:bg-[#324567] text-gray-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Arrival / Date Header / Departure ───────────────────── */}
        <div className="bg-[#141C2B] px-4 py-2.5 border-b border-[#25344D] flex items-center justify-between text-xs font-bold text-gray-300">
          <div className="w-20 text-left uppercase text-gray-400 tracking-wider">Arrival</div>
          <div className="text-center font-extrabold text-white text-xs sm:text-sm">
            {data?.startDate ? `Day 1 - ${new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}` : 'Live Schedule'}
          </div>
          <div className="w-20 text-right uppercase text-gray-400 tracking-wider">Departure</div>
        </div>

        {/* ── Main Scrollable Timeline ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto relative bg-[#0D121B] px-0 py-0">

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm font-bold">Loading Live Track...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm font-bold text-red-400 mb-3">{error}</p>
              <button onClick={fetchLiveStatus} className="px-4 py-2 bg-blue-600 text-xs font-bold rounded-lg text-white">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data?.route && (
            <div className="relative">
              
              {/* Continuous Thick Blue Track Line */}
              <div className="absolute left-[88px] sm:left-[108px] top-0 bottom-0 w-[5px] bg-[#1E4C7A] z-0"></div>

              {/* Station Rows (Exact WIMT Layout) */}
              <div className="flex flex-col">
                {data.route.map((stn: any, idx: number) => {
                  const isCurrentLoc = data.currentLocation?.stationCode === stn.stationCode || data.currentLocation?.sequence === stn.sequence;
                  const isPassed = stn.sequence < (data.currentLocation?.sequence || 1);
                  const isHalt = stn.isHalt;

                  const formatTime = (t?: string) => {
                    if (!t) return '--';
                    const dateObj = new Date(t);
                    return isNaN(dateObj.getTime()) ? '--' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  };

                  const schArr = formatTime(stn.scheduledArrival);
                  const actArr = formatTime(stn.actualArrival);
                  const schDep = formatTime(stn.scheduledDeparture);
                  const actDep = formatTime(stn.actualDeparture);

                  const isDelayedArr = stn.delayArrival > 0;
                  const isDelayedDep = stn.delayDeparture > 0;

                  return (
                    <div
                      key={stn.stationCode || idx}
                      className={`relative flex items-center justify-between py-3.5 px-3 border-b border-[#182335] transition-colors z-10 ${
                        isHalt
                          ? 'bg-[#111824]' // Main Halt: Deep Black Card
                          : 'bg-[#1D293B]/70' // Non-halt: Grey Card
                      }`}
                    >
                      {/* Left: Arrival Column */}
                      <div className="w-[72px] sm:w-[88px] text-left flex flex-col justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-gray-200">{schArr !== '--' ? schArr : schDep}</span>
                        {actArr !== '--' && actArr !== schArr && (
                          <span className={`text-[11px] font-extrabold ${isDelayedArr ? 'text-red-400' : 'text-emerald-400'}`}>
                            {actArr}
                          </span>
                        )}
                      </div>

                      {/* Track Dot / Train Badge */}
                      <div className="relative flex items-center justify-center w-8 flex-shrink-0 z-20">
                        {isCurrentLoc ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 border-2 border-white shadow-xl flex items-center justify-center -ml-1 animate-pulse">
                            <Train className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#121824] ${
                            isPassed ? 'bg-blue-400' : 'bg-[#2E4566]'
                          }`}></div>
                        )}
                      </div>

                      {/* Middle: Station Name & Meta */}
                      <div className="flex-1 min-w-0 px-3">
                        <div className="text-sm sm:text-base font-extrabold text-white truncate">
                          {stn.stationName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                          <span>{stn.distance} km</span>
                          {stn.platform && stn.platform !== '--' && (
                            <span className="text-gray-300 bg-[#253650] px-1.5 py-0.2 rounded border border-[#384F75] font-bold text-[10px]">
                              Platform {stn.platform}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Departure Column */}
                      <div className="w-[72px] sm:w-[88px] text-right flex flex-col justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-gray-200">{schDep}</span>
                        {actDep !== '--' && actDep !== schDep && (
                          <span className={`text-[11px] font-extrabold ${isDelayedDep ? 'text-red-400' : 'text-emerald-400'}`}>
                            {actDep}
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* ── Bottom Floating Bar (Google Maps Pin + Live Status) ───── */}
        {data && (
          <div className="bg-[#162030] border-t border-[#263752] p-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Google Maps Pin Floating Button */}
              <button
                onClick={() => openGoogleMaps(data.currentLocation?.stationName || data.train?.name || 'Railway Station')}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
                title="View Station Map Directions"
              >
                <MapPin className="w-5 h-5 text-white" />
              </button>

              <div>
                <div className="text-xs sm:text-sm font-black text-red-400">
                  {data.delayMinutes > 0 ? `${data.delayMinutes} mins delay` : `${data.currentLocation?.stationName || 'At Station'}`}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  Updated just now
                </div>
              </div>
            </div>

            <button
              onClick={fetchLiveStatus}
              className="w-10 h-10 rounded-2xl bg-[#23334E] hover:bg-[#2E4368] text-blue-400 flex items-center justify-center shadow-md transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
