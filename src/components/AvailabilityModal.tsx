import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { TrainLeg } from '../types/railway';
import { apiFetch } from '@/lib/shield';
import { ensureYYYYMMDD } from '@/lib/validators';

const fmtDuration = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

interface AvailabilityModalProps {
  leg: TrainLeg;
  onClose: () => void;
  liveClasses?: any[];
}

export default function AvailabilityModal({ leg, onClose, liveClasses }: AvailabilityModalProps) {
  const [classesData, setClassesData] = useState<any[]>(liveClasses || []);
  const [loading, setLoading] = useState(!liveClasses || liveClasses.length === 0);

  // ── Mobile Single-Back History Handler ──────────────────────────────────
  useEffect(() => {
    window.history.pushState({ modalOpen: 'AvailabilityModal' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Secure status fetch function
  const fetchAvailability = (forceRefresh = false) => {
    setLoading(true);
    const apiDate = ensureYYYYMMDD(leg.journeyDate);

    const timestamp = Date.now().toString();
    const clientSecret = "rls_internal_9x2k7m4p8q";
    const raw = timestamp + "_" + clientSecret;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const token = Math.abs(hash).toString(36);

    const url = `/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}${forceRefresh ? '&forceRefresh=true' : ''}`;

    apiFetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const validClasses = data.data.filter((c: any) => c.status !== null);
          setClassesData(validClasses);
        }
      })
      .catch(err => console.error("Failed to fetch live availability", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAvailability(false);
  }, [leg]);

  const formattedDate = new Date(leg.journeyDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-brand-navy)] flex flex-col overflow-y-auto pb-10 font-sans text-white">
      
      {/* Header Bar */}
      <div className="bg-[var(--color-brand-navy-card)] shadow-sm px-4 py-3 flex items-center justify-between border-b border-[#3A506B]">
         <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 hover:bg-[#3A506B] rounded-full text-gray-300">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="font-bold text-white text-xl">
               Seat Availability
            </div>
         </div>
         
         <button 
           onClick={() => fetchAvailability(true)}
           disabled={loading}
           className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all active:scale-95 shadow-md"
         >
           <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           <span>Refresh Status</span>
         </button>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pt-6">
        
        {/* Title */}
        <div className="mb-6">
           <h1 className="text-2xl font-normal text-white">
             {leg.fromStation.name} to {leg.toStation.name} Trains
           </h1>
           <p className="text-gray-400 text-sm mt-1">
             Availability for {leg.trainNumber} {leg.trainName}
           </p>
        </div>

        {/* Date Tab */}
        <div className="bg-[var(--color-brand-navy-card)] rounded-t-lg border border-[#3A506B] flex overflow-hidden mb-4">
           <div className="flex-1 p-3 text-center border-b-4 border-blue-600 bg-blue-900/20">
              <div className="text-sm font-semibold text-white">{formattedDate}</div>
              <div className="text-[10px] text-blue-400 font-bold uppercase mt-1">Selected Date</div>
           </div>
        </div>

        {/* Train Card */}
        <div className="bg-[var(--color-brand-navy-card)] rounded-lg border border-[#3A506B] shadow-sm p-4">
           <div className="flex justify-between items-start mb-3">
              <div>
                 <h3 className="font-bold text-white flex items-center gap-2">
                    {leg.trainNumber} {leg.trainName}
                 </h3>
                 <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-bold">{leg.departureTime}</span> <span className="text-gray-500">{leg.fromStation.code}</span>
                    <span className="text-gray-300 mx-1">→</span>
                    <span className="text-gray-400 text-xs">{fmtDuration(leg.durationMinutes)}</span>
                    <span className="text-gray-300 mx-1">→</span>
                    <span className="font-bold">{leg.arrivalTime}</span> <span className="text-gray-500">{leg.toStation.code}</span>
                 </div>
              </div>
           </div>

           {loading ? (
              <div className="flex justify-center py-6">
                 <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
           ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                 {classesData.length > 0 ? classesData.map((item, idx) => {
                     const isAvailable = item.status && (item.status.toUpperCase().includes('AVAILABLE') || item.status.toUpperCase().includes('AVL'));
                    const isWl = item.status && item.status.toUpperCase().includes('WL');
                    const bgColor = isAvailable || isWl ? 'bg-green-900/20' : 'bg-[#15203b]';
                    const borderColor = isAvailable || isWl ? 'border-green-500/30' : 'border-[#3A506B]';
                    const textColor = isAvailable || isWl ? 'text-green-400' : 'text-gray-300';
                    
                    return (
                       <div key={idx} className={`border ${borderColor} ${bgColor} rounded-md p-3 flex flex-col justify-between hover:shadow-md transition-shadow`}>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                               <div className="font-bold text-white text-lg">{item.classType}</div>
                               <div className="text-gray-300 font-semibold text-sm">
                                  {item.fare ? `₹${item.fare}` : 'N/A'}
                               </div>
                            </div>
                            <div className={`font-bold ${textColor} text-base mt-1`}>
                               {item.status || 'N/A'}
                            </div>
                          </div>

                          <a
                            href="https://www.irctc.co.in/nget/train-search"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 w-full inline-flex items-center justify-center gap-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2 px-2 rounded-lg text-xs transition-all shadow-md active:scale-95"
                          >
                            <span>Book on IRCTC</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                       </div>
                    );
                 }) : (
                    <div className="col-span-full text-center py-6 text-gray-500">
                       No availability data fetched.
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
