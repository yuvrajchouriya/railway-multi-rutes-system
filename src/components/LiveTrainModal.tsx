'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Train, MapPin, AlertCircle, Clock, ChevronDown, ChevronUp, Share2, Bell, Navigation } from 'lucide-react';

interface LiveTrainModalProps {
  trainNumber: string;
  trainName: string;
  onClose: () => void;
}

export default function LiveTrainModal({ trainNumber, trainName, onClose }: LiveTrainModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openGoogleMaps = (stationName: string, lat?: number, lng?: number) => {
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stationName + ' Railway Station')}`;
    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-[#233148] rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
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
        <div className="bg-[#182131] px-4 py-2.5 border-b border-[#25344D] flex items-center justify-between text-xs font-bold text-gray-300">
          <div className="w-20 text-left uppercase text-gray-400 tracking-wider">Arrival</div>
          <div className="text-center font-extrabold text-blue-400">
            {data?.startDate ? `Day 1 - ${new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}` : 'Live Schedule'}
          </div>
          <div className="w-20 text-right uppercase text-gray-400 tracking-wider">Departure</div>
        </div>

        {/* ── Main Scrollable Timeline ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto relative bg-[#0D121B] px-2 sm:px-4 py-3">

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
            <div className="relative pl-6 sm:pl-8">
              
              {/* Continuous Blue Vertical Track Line */}
              <div className="absolute left-[29px] sm:left-[37px] top-4 bottom-4 w-[6px] bg-[#1F3354] rounded-full z-0"></div>

              {/* Grouping Stations by Main Halts & Intermediate Non-Halts */}
              {(() => {
                const route = data.route || [];
                const currentSeq = data.currentLocation?.sequence || 1;
                const elements = [];
                let intermediateBuffer: any[] = [];
                let bufferKey = '';

                const renderIntermediateBox = (buffer: any[], key: string) => {
                  const isExpanded = expandedSections[key];
                  return (
                    <div key={key} className="my-1.5 ml-4 sm:ml-6 relative z-10">
                      {/* Collapse / Expand Toggle Bar */}
                      <button
                        onClick={() => toggleSection(key)}
                        className="w-full bg-[#1A2538]/90 hover:bg-[#23324C] border border-[#2A3C5B] rounded-xl px-3 py-2 flex items-center justify-between text-xs text-gray-300 transition-all shadow-md"
                      >
                        <span className="font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          <span>{buffer.length} Intermediate non-halt station{buffer.length > 1 ? 's' : ''}</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                      </button>

                      {/* Collapsible List (Grey WIMT Style) */}
                      {isExpanded && (
                        <div className="mt-1 bg-[#151E2E] border border-[#23324A] rounded-xl divide-y divide-[#1D2A3F] overflow-hidden shadow-inner">
                          {buffer.map((stn: any) => {
                            const isLoc = currentSeq === stn.sequence;
                            const formatTime = (t?: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                            const schDep = formatTime(stn.scheduledDeparture);
                            const schArr = formatTime(stn.scheduledArrival);
                            
                            return (
                              <div key={stn.sequence} className={`flex items-center justify-between p-2.5 text-xs ${isLoc ? 'bg-blue-600/20' : ''}`}>
                                <div className="w-16 text-left text-gray-400 font-bold">{schArr !== '--' ? schArr : schDep}</div>
                                <div className="flex-1 px-3">
                                  <div className="font-bold text-gray-200">{stn.stationName}</div>
                                  <div className="text-[10px] text-gray-400">{stn.distance} km</div>
                                </div>
                                <div className="w-16 text-right text-gray-400 font-bold">{schDep}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                };

                route.forEach((stn: any, i: number) => {
                  const isMainHalt = stn.isHalt || i === 0 || i === route.length - 1;
                  const isCurrentLoc = currentSeq === stn.sequence;
                  
                  if (!isMainHalt && !isCurrentLoc) {
                    if (intermediateBuffer.length === 0) bufferKey = `group-${stn.sequence}`;
                    intermediateBuffer.push(stn);
                  } else {
                    if (intermediateBuffer.length > 0) {
                      elements.push(renderIntermediateBox(intermediateBuffer, bufferKey));
                      intermediateBuffer = [];
                    }

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

                    elements.push(
                      <div key={stn.sequence} className="relative my-3 z-10">
                        
                        {/* WIMT Station Row */}
                        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCurrentLoc
                            ? 'bg-[#1D2D48] border-blue-500/80 shadow-lg ring-2 ring-blue-500/30'
                            : 'bg-[#151D2C] border-[#223048] hover:bg-[#1A2436]'
                        }`}>

                          {/* Left Arrival */}
                          <div className="w-16 sm:w-20 text-left flex flex-col justify-center">
                            <span className="text-xs sm:text-sm font-bold text-white">{schArr !== '--' ? schArr : schDep}</span>
                            {actArr !== '--' && actArr !== schArr && (
                              <span className={`text-[10px] font-bold ${isDelayedArr ? 'text-red-400' : 'text-emerald-400'}`}>
                                {actArr}
                              </span>
                            )}
                          </div>

                          {/* Middle: Station Node dot & Name */}
                          <div className="flex-1 flex items-center gap-3 px-2">
                            
                            {/* Track Circle Node or Train Badge */}
                            <div className="relative flex items-center justify-center -ml-6 sm:-ml-8 z-20">
                              {isCurrentLoc ? (
                                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-xl flex items-center justify-center animate-bounce">
                                  <Train className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-[#1F3354] border-2 border-blue-400 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm sm:text-base font-black truncate ${isCurrentLoc ? 'text-blue-300' : 'text-white'}`}>
                                  {stn.stationName}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2.5 text-[11px] text-gray-400 mt-1 flex-wrap">
                                <span>{stn.distance} km</span>
                                {stn.platform && stn.platform !== '--' && (
                                  <span className="text-gray-200 bg-[#22324D] px-2 py-0.5 rounded border border-[#304468] font-bold">
                                    Platform {stn.platform}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Departure */}
                          <div className="w-16 sm:w-20 text-right flex flex-col justify-center">
                            <span className="text-xs sm:text-sm font-bold text-white">{schDep}</span>
                            {actDep !== '--' && actDep !== schDep && (
                              <span className={`text-[10px] font-bold ${isDelayedDep ? 'text-red-400' : 'text-emerald-400'}`}>
                                {actDep}
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  }
                });

                if (intermediateBuffer.length > 0) {
                  elements.push(renderIntermediateBox(intermediateBuffer, bufferKey));
                }

                return elements;
              })()}

            </div>
          )}

        </div>

        {/* ── Bottom Floating Bar (Google Maps Pin + Live Status) ───── */}
        {data && (
          <div className="bg-[#182233] border-t border-[#273650] p-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Google Maps Pin Floating Button (Option A) */}
              <button
                onClick={() => openGoogleMaps(data.currentLocation?.stationName || data.train?.name || 'Railway Station')}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
                title="View Station Map Directions"
              >
                <MapPin className="w-5 h-5 text-white" />
              </button>

              <div>
                <div className="text-xs sm:text-sm font-black text-red-400">
                  {data.delayMinutes > 0 ? `${data.delayMinutes} km/min delay` : `${data.currentLocation?.stationName || 'At Station'}`}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  Updated just now
                </div>
              </div>
            </div>

            <button
              onClick={fetchLiveStatus}
              className="w-10 h-10 rounded-full bg-[#253552] hover:bg-[#304468] text-blue-400 flex items-center justify-center shadow-md transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
