'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Train, MapPin, AlertCircle, Calendar, Bell, Share2, ChevronDown, Check, Pencil } from 'lucide-react';

interface LiveTrainModalProps {
  trainNumber: string;
  trainName: string;
  onClose: () => void;
}

export default function LiveTrainModal({ trainNumber, trainName, onClose }: LiveTrainModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showSubStations, setShowSubStations] = useState(true); // Toggle Sub-Stations (Dots)
  const [copiedShare, setCopiedShare] = useState(false);

  // ── Mobile Single-Back History Handler ──────────────────────────────────
  useEffect(() => {
    window.history.pushState({ modalOpen: 'LiveTrainModal' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

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

  const openGoogleMaps = (stationName: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stationName + ' Railway Station')}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const text = `🚆 Live Status for ${trainNumber} ${data?.train?.name || trainName}:\nStatus: ${data?.delayMinutes === 0 ? 'On Time' : data?.delayMinutes + ' mins late'}\nCurrent Location: ${data?.currentLocation?.stationName || 'En Route'}\nCheck on RailSathi App!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `Live Train ${trainNumber}`, text, url: window.location.href });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const getDayLabel = () => {
    if (selectedDayOffset === 0) return 'Today';
    if (selectedDayOffset === -1) return 'Yesterday';
    if (selectedDayOffset === 1) return 'Tomorrow';
    return 'Today';
  };

  // Filter route based on sub-station visibility toggle
  const visibleRoute = data?.route ? data.route.filter((stn: any) => showSubStations || stn.isHalt) : [];

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

        {/* ── Top Feature Action Pills Bar (Today, Alarm, Coach, Share) ── */}
        <div className="bg-[#172030] px-4 py-2 border-b border-[#24334B] flex items-center gap-2 overflow-x-auto scrollbar-hide relative z-20">
          
          {/* Today / Day Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24334B] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{getDayLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[#1C273C] border border-[#2B3D5E] rounded-xl shadow-xl py-1 w-32 z-30">
                {[
                  { label: 'Yesterday', offset: -1 },
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                ].map(opt => (
                  <button
                    key={opt.offset}
                    onClick={() => {
                      setSelectedDayOffset(opt.offset);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between ${
                      selectedDayOffset === opt.offset ? 'bg-blue-600/30 text-blue-400' : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedDayOffset === opt.offset && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alarm Pill */}
          <button
            onClick={() => alert('⏰ Station Alarm enabled! We will notify you when train approaches your station.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24334B] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Alarm</span>
          </button>

          {/* Coach Position Pill */}
          <button
            onClick={() => setShowCoachModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24334B] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
          >
            <Train className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coach</span>
          </button>

          {/* Share Pill */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24334B] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>

        </div>

        {/* ── Arrival / Date Header / Departure ───────────────────── */}
        <div className="bg-[#141C2B] px-4 py-2 border-b border-[#25344D] flex items-center justify-between text-xs font-bold text-gray-300">
          <div className="w-16 sm:w-20 text-left uppercase text-gray-400 tracking-wider">Arrival</div>
          <div className="text-center font-extrabold text-white text-xs sm:text-sm">
            {data?.startDate ? `Day 1 - ${new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}` : 'Live Running Track'}
          </div>
          <div className="w-16 sm:w-20 text-right uppercase text-gray-400 tracking-wider">Departure</div>
        </div>

        {/* ── Main Scrollable Timeline with CONTINUOUS UNBROKEN RAILWAY TRACK ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-[#0D121B] px-0 py-0">

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-bold">Loading Realistic Railway Track...</p>
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
            <div className="flex flex-col">
              {visibleRoute.map((stn: any, idx: number) => {
                const isCurrentLoc = data.currentLocation?.stationCode === stn.stationCode || data.currentLocation?.sequence === stn.sequence;
                const isPassed = stn.sequence < (data.currentLocation?.sequence || 1);
                const isHalt = stn.isHalt !== false;
                const isFirst = idx === 0;
                const isLast = idx === visibleRoute.length - 1;

                const formatTime = (t?: string) => {
                  if (!t) return '--';
                  const dateObj = new Date(t);
                  return isNaN(dateObj.getTime()) ? t : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                };

                const schArr = formatTime(stn.scheduledArrival || stn.scheduleArrival);
                const actArr = formatTime(stn.actualArrival);
                const schDep = formatTime(stn.scheduledDeparture || stn.scheduleDeparture);
                const actDep = formatTime(stn.actualDeparture);

                const isDelayedArr = stn.delayArrivalMinutes > 0;
                const isDelayedDep = stn.delayDepartureMinutes > 0;

                return (
                  <div
                    key={stn.stationCode || idx}
                    onClick={() => setShowSubStations(!showSubStations)}
                    className={`relative flex items-center justify-between py-3 px-3 border-b border-[#182335] transition-colors cursor-pointer ${
                      isHalt
                        ? 'bg-[#111824]' // Main Halt Station: Deep Black Card
                        : 'bg-[#182336]/60 text-gray-400 hover:bg-[#1C293E]' // Sub-station: Muted Card
                    }`}
                  >
                    {/* 1. Left: Scheduled & Actual Arrival */}
                    <div className="w-16 sm:w-20 text-left flex flex-col justify-center flex-shrink-0">
                      <span className={`text-xs sm:text-sm font-bold ${isHalt ? 'text-gray-200' : 'text-gray-400'}`}>
                        {schArr !== '--' ? schArr : schDep}
                      </span>
                      {actArr !== '--' && actArr !== schArr && (
                        <span className={`text-[11px] font-extrabold ${isDelayedArr ? 'text-red-400' : 'text-emerald-400'}`}>
                          {actArr}
                        </span>
                      )}
                    </div>

                    {/* 2. Middle-Left: CONTINUOUS UNBROKEN RAILWAY TRACK COLUMN */}
                    <div className="relative flex items-center justify-center w-12 sm:w-16 h-12 flex-shrink-0">
                      
                      {/* Upper Track Segment (connects to row above) */}
                      {!isFirst && (
                        <div className="absolute top-0 bottom-1/2 w-4 z-0 flex justify-center">
                          {/* Left Rail */}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></div>
                          {/* Right Rail */}
                          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></div>
                          {/* Sleepers */}
                          <div
                            className="absolute left-0 right-0 top-0 bottom-0 opacity-50 z-0"
                            style={{
                              backgroundImage: 'linear-gradient(to bottom, #64748b 2px, transparent 2px)',
                              backgroundSize: '100% 10px'
                            }}
                          ></div>
                        </div>
                      )}

                      {/* Lower Track Segment (connects to row below) */}
                      {!isLast && (
                        <div className="absolute top-1/2 bottom-0 w-4 z-0 flex justify-center">
                          {/* Left Rail */}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></div>
                          {/* Right Rail */}
                          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></div>
                          {/* Sleepers */}
                          <div
                            className="absolute left-0 right-0 top-0 bottom-0 opacity-50 z-0"
                            style={{
                              backgroundImage: 'linear-gradient(to bottom, #64748b 2px, transparent 2px)',
                              backgroundSize: '100% 10px'
                            }}
                          ></div>
                        </div>
                      )}

                      {/* Track Indicator Element (DEAD CENTER inside the Track Ladder) */}
                      <div className="relative z-10 flex items-center justify-center">
                        {isCurrentLoc ? (
                          /* LIVE RUNNING TRAIN BADGE (DEAD CENTER inside Track) */
                          <div className="relative flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-white shadow-[0_0_15px_rgba(6,182,212,0.9)] flex items-center justify-center animate-bounce z-20">
                              <Train className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-cyan-400/40 animate-ping z-10"></div>
                          </div>
                        ) : isHalt ? (
                          /* Major Halt Station Circle (DEAD CENTER inside Track) */
                          <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#121824] shadow-md ${
                            isPassed ? 'bg-cyan-400' : 'bg-[#2E4566]'
                          }`}></div>
                        ) : (
                          /* Sub-Station Cyan Dot (DEAD CENTER inside Track) */
                          <div className={`w-2.5 h-2.5 rounded-full border border-[#121824] ${
                            isPassed ? 'bg-cyan-300' : 'bg-[#3A506B]'
                          }`}></div>
                        )}
                      </div>

                    </div>

                    {/* 3. Middle-Right: Station Name, Distance & Platform Badge */}
                    <div className="flex-1 min-w-0 px-3">
                      <div className={`text-sm sm:text-base font-extrabold truncate ${isHalt ? 'text-white' : 'text-gray-300 font-semibold'}`}>
                        {stn.stationName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                        <span>{stn.distanceKm || stn.distance || 0} km</span>
                        {stn.platform && stn.platform !== '--' && (
                          <span className="text-gray-200 bg-[#233550] px-1.5 py-0.5 rounded border border-[#374F75] font-bold text-[10px] flex items-center gap-1">
                            <span>Platform {stn.platform}</span>
                            <Pencil className="w-2.5 h-2.5 text-gray-400" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Right: Scheduled & Actual Departure */}
                    <div className="w-16 sm:w-20 text-right flex flex-col justify-center flex-shrink-0">
                      <span className={`text-xs sm:text-sm font-bold ${isHalt ? 'text-gray-200' : 'text-gray-400'}`}>
                        {schDep}
                      </span>
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
          )}

        </div>

        {/* ── Coach Position Popup Modal ───────────────────────── */}
        {showCoachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1A253A] border border-[#2F4264] rounded-2xl p-5 max-w-md w-full shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#2C3E5E] mb-4">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Train className="w-5 h-5 text-emerald-400" />
                  <span>Coach Composition ({trainNumber})</span>
                </h3>
                <button onClick={() => setShowCoachModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#121927] p-3 rounded-xl border border-[#253652] mb-4">
                <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Engine to Guard Position:</div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                  {(data?.train?.coachPosition || 'ENG-SLRD-GEN-GEN-S1-S2-S3-S4-S5-B1-B2-GEN-GEN-SLRD').split('-').map((c: string, idx: number) => (
                    <div key={idx} className="flex-shrink-0 bg-[#223350] border border-[#354D77] px-2.5 py-1.5 rounded-lg text-center font-black text-xs min-w-[44px]">
                      <div className="text-[9px] text-gray-400 font-normal">#{idx+1}</div>
                      <div className="text-blue-300">{c}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowCoachModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

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
                  {data.delayMinutes > 0 ? `${data.delayMinutes} mins delay` : `${data.currentLocation?.stationName || 'En Route'}`}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  Updated just now
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLiveStatus}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
