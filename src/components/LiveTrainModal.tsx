'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Train, MapPin, AlertCircle, Clock, Navigation } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121929] border border-[#2A3B54] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* ── Top Header ────────────────────────────────────────── */}
        <div className="bg-[#1B273D] p-4 border-b border-[#2A3B54] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{trainNumber}</span>
                <span className="text-gray-400 font-normal">|</span>
                <span className="truncate max-w-[180px] sm:max-w-[300px]">{data?.train?.name || trainName}</span>
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                {data?.train?.source?.name ? `${data.train.source.name} ➔ ${data.train.destination.name}` : 'Live Running Status'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-[#24334E] hover:bg-[#2F4264] text-gray-300 transition-colors disabled:opacity-50"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#24334E] hover:bg-[#2F4264] text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Content Body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm font-bold">Fetching Live Running Status...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-red-400 mb-2">{error}</p>
              <p className="text-xs text-gray-400 mb-4 max-w-sm">Live status is currently dynamic. Make sure train has departed or try refreshing.</p>
              <button
                onClick={fetchLiveStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Status Header Banner */}
              <div className="bg-[#1B2842] border border-[#2D3E5D] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mb-1">
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>CURRENT POSITION</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {data.currentLocation?.stationName || data.currentLocation?.stationCode || 'En Route'}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                    data.delayMinutes === 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {data.delayMinutes === 0 ? 'ON TIME' : `${data.delayMinutes} Mins Late`}
                  </span>
                  {data.lastUpdatedAt && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Updated: {new Date(data.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Table (WIMT Style) */}
              <div className="bg-[#182338] border border-[#283854] rounded-xl p-3 sm:p-4">
                
                {/* Timeline Header */}
                <div className="flex justify-between items-center pb-3 border-b border-[#283854] text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                  <div className="w-16 sm:w-20 text-left">Arrival</div>
                  <div className="flex-1 text-center px-4">Station</div>
                  <div className="w-16 sm:w-20 text-right">Departure</div>
                </div>

                {/* Stations List */}
                <div className="divide-y divide-[#23314B] mt-1">
                  {data.route?.map((stn: any, idx: number) => {
                    const isCurrent = data.currentLocation?.stationCode === stn.stationCode || data.currentLocation?.sequence === stn.sequence;
                    const isPassed = stn.sequence < (data.currentLocation?.sequence || 1);
                    const formatTime = (timeStr?: string) => {
                      if (!timeStr) return '--';
                      const dateObj = new Date(timeStr);
                      if (isNaN(dateObj.getTime())) return '--';
                      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    };

                    const schDep = formatTime(stn.scheduledDeparture);
                    const actDep = formatTime(stn.actualDeparture);
                    const schArr = formatTime(stn.scheduledArrival);
                    const actArr = formatTime(stn.actualArrival);

                    const isDelayed = stn.delayDeparture > 0 || stn.delayArrival > 0;

                    return (
                      <div
                        key={stn.stationCode || idx}
                        className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${
                          isCurrent ? 'bg-blue-600/15 border border-blue-500/30' : 'hover:bg-[#1F2C45]'
                        }`}
                      >
                        {/* Arrival Column */}
                        <div className="w-16 sm:w-20 text-left flex flex-col">
                          <span className="text-xs font-bold text-gray-300">{schArr !== '--' ? schArr : schDep}</span>
                          {actArr !== '--' && actArr !== schArr && (
                            <span className={`text-[10px] font-bold ${isDelayed ? 'text-red-400' : 'text-emerald-400'}`}>
                              {actArr}
                            </span>
                          )}
                        </div>

                        {/* Middle: Station Name + Vertical Line Track */}
                        <div className="flex-1 flex items-center gap-3 px-2">
                          <div className="relative flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                              isCurrent
                                ? 'bg-blue-500 ring-4 ring-blue-500/30'
                                : isPassed
                                  ? 'bg-blue-400'
                                  : 'bg-gray-600'
                            }`}>
                              {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs sm:text-sm font-black truncate ${isCurrent ? 'text-blue-300' : 'text-white'}`}>
                                {stn.stationName}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase bg-[#22304A] px-1.5 py-0.5 rounded">
                                {stn.stationCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                              <span>{stn.distance} km</span>
                              {stn.platform && stn.platform !== '--' && (
                                <span className="text-gray-300 bg-[#283854] px-1.5 py-0.2 rounded border border-[#364A6E]">
                                  PF {stn.platform}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Departure Column */}
                        <div className="w-16 sm:w-20 text-right flex flex-col">
                          <span className="text-xs font-bold text-gray-300">{schDep}</span>
                          {actDep !== '--' && actDep !== schDep && (
                            <span className={`text-[10px] font-bold ${isDelayed ? 'text-red-400' : 'text-emerald-400'}`}>
                              {actDep}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
