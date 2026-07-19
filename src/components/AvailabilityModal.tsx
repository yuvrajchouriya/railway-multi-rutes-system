import React, { useState, useEffect } from 'react';
import { TrainLeg } from '../types/railway';
import { ArrowLeft, Clock, Info, Calendar } from 'lucide-react';

const fmtDuration = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

interface AvailabilityModalProps {
  leg: TrainLeg;
  onClose: () => void;
  liveClasses?: any[];
}

export default function AvailabilityModal({ leg, onClose, liveClasses }: AvailabilityModalProps) {
  const [classesData, setClassesData] = useState<any[]>(liveClasses || []);
  const [loading, setLoading] = useState(!liveClasses || liveClasses.length === 0);

  useEffect(() => {
    if (liveClasses && liveClasses.length > 0) {
       setClassesData(liveClasses.filter((c: any) => c.status !== null));
       setLoading(false);
       return;
    }
    
    setLoading(true);
    
    // leg.journeyDate is usually YYYY-MM-DD, API expects DD-MM-YYYY
    let apiDate = leg.journeyDate;
    if (apiDate.includes('-') && apiDate.split('-')[0].length === 4) {
       const [year, month, day] = apiDate.split('-');
       apiDate = `${day}-${month}-${year}`;
    }

    fetch(`/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Only show classes that actually have availability data (status is not null)
          const validClasses = data.data.filter((c: any) => c.status !== null);
          setClassesData(validClasses);
        }
      })
      .catch(err => console.error("Failed to fetch live availability", err))
      .finally(() => setLoading(false));
  }, [leg, liveClasses]);

  // Format date nicely e.g., "Thu, 16 Jul"
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

        {/* Date Tab (Just showing the selected date) */}
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
                       <div key={idx} className={`border ${borderColor} ${bgColor} rounded-md p-3 flex flex-col hover:shadow-md transition-shadow`}>
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
