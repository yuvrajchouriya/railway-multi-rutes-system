'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Volume2, Sparkles, Navigation } from 'lucide-react';
import { checkLandmarkProximity } from '@/utils/landmarkTracker';

export default function ProximityNotificationToast({ activeRoute, currentSeq }: { activeRoute?: any[]; currentSeq?: number }) {
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeRoute || !currentSeq) return;

    const match = checkLandmarkProximity(activeRoute, currentSeq);

    if (match && match.landmark.id !== lastAlertIdRef.current) {
      setActiveAlert(match);
      lastAlertIdRef.current = match.landmark.id;

      // Play gentle chime sound
      try {
        if (!audioRef.current) {
          audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioRef.current;
        if (ctx) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 note
          osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5 note
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        }
      } catch (e) {}
    }
  }, [activeRoute, currentSeq]);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-gradient-to-r from-[#172338] via-[#1E2E4A] to-[#141C2B] border border-cyan-500/50 rounded-2xl p-3.5 shadow-[0_0_25px_rgba(6,182,212,0.4)] text-white animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-xl flex-shrink-0 shadow-lg animate-bounce">
            {activeAlert.landmark.icon}
          </div>

          <div>
            <div className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-1.5">
              <span>{activeAlert.landmark.name}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                {activeAlert.remainingKm} km ahead
              </span>
            </div>
            <div className="text-[11px] text-gray-300 font-medium mt-0.5">
              Near {activeAlert.stationName} • {activeAlert.landmark.description}
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveAlert(null)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
