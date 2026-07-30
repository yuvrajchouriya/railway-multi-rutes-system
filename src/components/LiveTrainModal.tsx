'use client';

import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Train, MapPin, AlertCircle, Calendar, Bell, Share2, ChevronDown, Check, MessageSquare, ChevronUp, Heart, Volume2, VolumeX, CheckCircle, Navigation, Gauge, Zap, Compass, ShieldAlert, WifiOff } from 'lucide-react';
import ProximityNotificationToast from './ProximityNotificationToast';
import { apiFetch } from '@/lib/shield';

interface LiveTrainModalProps {
  trainNumber: string;
  trainName: string;
  onClose: () => void;
}

export default function LiveTrainModal({ trainNumber, trainName, onClose }: LiveTrainModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showSpeedometerModal, setShowSpeedometerModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // ── Station Alarm State & Web Audio Synthesizer ─────────────────────────
  const [targetAlarmStation, setTargetAlarmStation] = useState<string>('');
  const [alarmDistanceKm, setAlarmDistanceKm] = useState<number>(10);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  // Selected Coach for Detailed Info
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  // ── ⚡ ROBUST HARDWARE GPS SPEEDOMETER SENSOR ─────────────────────────────
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number | null>(null);
  const [maxSpeedKmH, setMaxSpeedKmH] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'off' | 'connecting' | 'active' | 'denied' | 'error'>('off');

  const gpsWatchIdRef = useRef<number | null>(null);
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
  const activeStationRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [tickerTime, setTickerTime] = useState(0);

  // Real-time status countdown ticker (updates UI every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calcHaversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startGpsSpeedometer = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('connecting');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('active');
        lastPosRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp || Date.now()
        };
        if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed)) {
          const spd = Math.round(pos.coords.speed * 3.6);
          setCurrentSpeedKmH(spd);
          setMaxSpeedKmH(prev => Math.max(prev, spd));
        } else {
          setCurrentSpeedKmH(0);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        }
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsStatus('active');
        const now = position.timestamp || Date.now();
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let calculatedKmH = 0;

        if (position.coords.speed !== null && position.coords.speed !== undefined && !isNaN(position.coords.speed) && position.coords.speed >= 0) {
          calculatedKmH = Math.round(position.coords.speed * 3.6);
        } else if (lastPosRef.current) {
          const distMeters = calcHaversineMeters(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
          const timeSec = (now - lastPosRef.current.timestamp) / 1000;
          if (timeSec > 0.2 && distMeters > 0.5) {
            const mps = distMeters / timeSec;
            calculatedKmH = Math.round(mps * 3.6);
          }
        }

        const finalSpeed = Math.min(180, Math.max(0, calculatedKmH));
        setCurrentSpeedKmH(finalSpeed);
        setMaxSpeedKmH((prev) => Math.max(prev, finalSpeed));

        lastPosRef.current = { lat, lng, timestamp: now };
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000
      }
    );

    gpsWatchIdRef.current = watchId;
  };

  const stopGpsSpeedometer = () => {
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setGpsStatus('off');
  };

  useEffect(() => {
    if (showSpeedometerModal) {
      startGpsSpeedometer();
    } else {
      stopGpsSpeedometer();
    }
    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
    };
  }, [showSpeedometerModal]);




  // Auto-scroll to active station on load
  useEffect(() => {
    if (!loading && data) {
      setTimeout(() => {
        activeStationRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 500);
    }
  }, [loading, data]);

  // ── Mobile Single-Back History Handler ──────────────────────────────────
  useEffect(() => {
    window.history.pushState({ modalOpen: 'LiveTrainModal', view: 'results' }, '');
    const handlePopState = (e: PopStateEvent) => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState, { once: true });
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Wishlist Heart state load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_wishlist_trains');
      if (saved) {
        const list = JSON.parse(saved);
        const exists = list.some((item: any) => 
          typeof item === 'string' ? item === String(trainNumber) : item.trainNumber === String(trainNumber)
        );
        if (exists) setIsWishlisted(true);
      }
    } catch (e) {}
  }, [trainNumber]);

  const toggleWishlist = () => {
    try {
      const saved = localStorage.getItem('saved_wishlist_trains');
      let list: any[] = saved ? JSON.parse(saved) : [];
      const trainNoStr = String(trainNumber);
      const exists = list.some(item => (typeof item === 'string' ? item === trainNoStr : item.trainNumber === trainNoStr));
      
      if (exists) {
        list = list.filter(item => (typeof item === 'string' ? item !== trainNoStr : item.trainNumber !== trainNoStr));
        setIsWishlisted(false);
      } else {
        list.push({
          trainNumber: trainNoStr,
          trainName: data?.train?.name || trainName,
          fromCode: data?.route?.[0]?.stationCode || 'CWA',
          toCode: data?.route?.[data?.route?.length - 1]?.stationCode || 'BPL'
        });
        setIsWishlisted(true);
      }
      localStorage.setItem('saved_wishlist_trains', JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  };

  // ── 📱 OFFLINE TIMETABLE CACHING & LOAD ──────────────────────────────────
  const fetchLiveStatus = async () => {
    setLoading(true);
    setError(null);
    setIsOfflineMode(false);

    try {
      const res = await apiFetch(`/api/live-status?trainNo=${trainNumber}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Unable to fetch live train status');
      }

      setData(json.data);

      try {
        localStorage.setItem(`offline_cached_route_${trainNumber}`, JSON.stringify(json.data));
      } catch (e) {}

      if (json.data?.route?.length > 0 && !targetAlarmStation) {
        const lastStn = json.data.route[json.data.route.length - 1];
        setTargetAlarmStation(lastStn.stationCode || lastStn.stationName);
      }

      if (json.data && json.data.route) {
        let cSeq = json.data.currentLocation?.sequence;
        if (!cSeq && json.data.currentLocation?.stationCode) {
          const match = json.data.route.find((s: any) => s.stationCode === json.data.currentLocation.stationCode);
          if (match) cSeq = match.sequence;
        }
        if (!cSeq) cSeq = 1;

        // Keep all sub-station sections collapsed by default.
        setExpandedSections(new Set());
      }
    } catch (err: any) {
      try {
        const cached = localStorage.getItem(`offline_cached_route_${trainNumber}`);
        if (cached) {
          const cachedJson = JSON.parse(cached);
          setData(cachedJson);
          setIsOfflineMode(true);
          setLoading(false);
          return;
        }
      } catch (e) {}

      setError(err.message || 'Failed to load live status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
  }, [trainNumber]);

  // Audio Beep Alarm Generator
  const startRingingAlarm = () => {
    setIsAlarmRinging(true);
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      const playBeep = () => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };

      playBeep();
      alarmIntervalRef.current = setInterval(playBeep, 800);
    } catch (e) {}
  };

  const stopRingingAlarm = () => {
    setIsAlarmRinging(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isAlarmActive || !targetAlarmStation || !data?.route) return;

    const targetStnObj = data.route.find((s: any) => s.stationCode === targetAlarmStation || s.stationName === targetAlarmStation);
    if (!targetStnObj) return;

    let currentSeq = data?.currentLocation?.sequence;
    if (!currentSeq && data?.currentLocation?.stationCode) {
      const match = data.route.find((s: any) => s.stationCode === data.currentLocation.stationCode);
      if (match) currentSeq = match.sequence;
    }

    if (currentSeq && targetStnObj.sequence) {
      const currStnObj = data.route.find((s: any) => s.sequence === currentSeq) || data.route[0];
      const distRemaining = Math.max(0, (targetStnObj.distanceKm || targetStnObj.distance || 0) - (currStnObj?.distanceKm || currStnObj?.distance || 0));

      if (distRemaining <= alarmDistanceKm && !isAlarmRinging) {
        startRingingAlarm();
      }
    }
  }, [isAlarmActive, targetAlarmStation, alarmDistanceKm, data]);

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

  const toggleSection = (sectionIndex: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  };

  // ── ROUTE DEDUPLICATION FILTER ──────────────────────────────────────────
  const rawRoute = data?.route || [];
  const uniqueRoute = rawRoute.filter((stn: any, index: number, arr: any[]) => {
    if (index === 0) return true;
    const prev = arr[index - 1];
    const isSameCode = stn.stationCode && prev.stationCode && stn.stationCode === prev.stationCode;
    const isSameName = stn.stationName && prev.stationName && stn.stationName === prev.stationName;
    return !isSameCode && !isSameName;
  });

  let sectionCounter = 0;
  const sectionCounts: Record<number, number> = {};

  const processedRoute = uniqueRoute.map((stn: any) => {
    if (stn.isHalt) {
      sectionCounter++;
      sectionCounts[sectionCounter] = 0;
    } else if (sectionCounter > 0) {
      sectionCounts[sectionCounter] = (sectionCounts[sectionCounter] || 0) + 1;
    }
    const secId = sectionCounter === 0 ? 1 : sectionCounter;
    return { ...stn, sectionId: secId };
  });

  let currentSeq = data?.currentLocation?.sequence;
  if (!currentSeq && uniqueRoute.length > 0 && data?.currentLocation?.stationCode) {
    const match = uniqueRoute.find((s: any) => s.stationCode === data.currentLocation.stationCode);
    if (match) currentSeq = match.sequence;
  }
  if (!currentSeq) currentSeq = 1;

  const visibleRoute = processedRoute.filter((stn: any) => {
    if (stn.isHalt) return true;
    const isCurrentLoc = (stn.sequence === currentSeq) || 
                         (data?.currentLocation?.stationCode && stn.stationCode === data.currentLocation.stationCode);
    if (isCurrentLoc) return true;
    return expandedSections.has(stn.sectionId);
  });

  const activeSectionId = processedRoute.find((s: any) => {
    return (s.sequence === currentSeq) || 
           (data?.currentLocation?.stationCode && s.stationCode === data.currentLocation.stationCode);
  })?.sectionId;

  const getLiveStatusMsg = () => {
    const currentStn = uniqueRoute.find((s: any) => s.sequence === currentSeq);
    const nextStn = uniqueRoute.find((s: any) => s.sequence === currentSeq + 1);
    
    if (!nextStn) {
      return `Arrived at ${currentStn?.stationName || 'Station'}`;
    }
    
    // Calculate actual distance between these two stations from route details!
    const d1 = currentStn?.distanceKm || currentStn?.distance || 0;
    const d2 = nextStn?.distanceKm || nextStn?.distance || 0;
    const segmentDistance = Math.max(1, Math.round(d2 - d1)); // Total distance between A and B
    
    // Calculate actual segment progress using expected departure and arrival timestamps
    const depTimeStr = currentStn?.actualDeparture || currentStn?.scheduledDeparture;
    const arrTimeStr = nextStn?.actualArrival || nextStn?.scheduledArrival;
    
    if (depTimeStr && arrTimeStr) {
      const depTime = new Date(depTimeStr);
      const arrTime = new Date(arrTimeStr);
      const nowTime = new Date();
      
      if (!isNaN(depTime.getTime()) && !isNaN(arrTime.getTime())) {
        const totalDuration = arrTime.getTime() - depTime.getTime();
        const elapsed = nowTime.getTime() - depTime.getTime();
        
        if (totalDuration > 0 && elapsed > 0) {
          const progress = Math.min(0.95, elapsed / totalDuration); // max 95% until actually arrived
          const remainingKm = Math.max(1, Math.round(segmentDistance * (1 - progress)));
          const remainingMins = Math.max(1, Math.round((arrTime.getTime() - nowTime.getTime()) / 60_000));
          
          if (nowTime.getTime() >= arrTime.getTime()) {
            return `Arrived ${nextStn.stationName}`;
          }
          return `${remainingKm} km to ${nextStn.stationName} • ETA ${remainingMins} mins`;
        }
      }
    }
    
    // Fallback: If time calculation is out of range, show simple status
    return `Heading to ${nextStn.stationName}`;
  };

  const nextHalt = uniqueRoute.find((s: any) => s.sequence > currentSeq && s.isHalt) || uniqueRoute[uniqueRoute.length - 1];
  const lastHalt = uniqueRoute[uniqueRoute.length - 1];
  const firstHalt = uniqueRoute[0];

  const calcProgressPct = () => {
    if (!lastHalt || !firstHalt || uniqueRoute.length === 0) return 50;
    return Math.min(100, Math.max(5, (currentSeq / uniqueRoute.length) * 100));
  };

  const rawCoachStr = data?.train?.coachPosition || data?.coachPosition || 'ENG-SLRD-GS-GS-S1-S2-S3-S4-S5-PC-B1-B2-B3-B4-A1-GS-SLRD';
  const coachList = rawCoachStr.split('-').map((c: string) => c.trim()).filter(Boolean);

  const getCoachStyle = (code: string) => {
    const uppercase = code.toUpperCase();
    if (uppercase.includes('ENG') || uppercase.includes('LOCO')) return { bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50', label: 'Engine' };
    if (uppercase.includes('GS') || uppercase.includes('GEN') || uppercase.includes('UR')) return { bg: 'bg-[#282561] text-amber-300 border-indigo-500/50', label: 'General Unreserved' };
    if (uppercase.startsWith('S') && !uppercase.includes('SLR')) return { bg: 'bg-[#064E3B] text-emerald-300 border-emerald-500/50', label: 'Sleeper Class (SL)' };
    if (uppercase.startsWith('B') || uppercase.includes('3A')) return { bg: 'bg-[#1E3A8A] text-cyan-300 border-cyan-500/50', label: 'AC 3 Tier (3A)' };
    if (uppercase.startsWith('A') || uppercase.includes('2A')) return { bg: 'bg-[#4C1D95] text-purple-300 border-purple-500/50', label: 'AC 2 Tier (2A)' };
    if (uppercase.startsWith('H') || uppercase.includes('1A')) return { bg: 'bg-[#831843] text-pink-300 border-pink-500/50', label: 'AC 1st Class (1A)' };
    if (uppercase.includes('PC')) return { bg: 'bg-[#78350F] text-orange-300 border-orange-500/50', label: 'Pantry Car' };
    return { bg: 'bg-[#1E293B] text-slate-300 border-slate-600', label: 'Guard / Luggage' };
  };

  const getSpeedCategory = (spd: number | null) => {
    if (spd === null) return { label: 'Connecting GPS...', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (spd === 0) return { label: 'Stationary / Stopped', color: 'text-gray-300', bg: 'bg-gray-700/50' };
    if (spd <= 30) return { label: 'Crawling Speed 🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (spd <= 80) return { label: 'Cruising Speed 🔵', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    return { label: 'High Speed Express! 🟢', color: 'text-emerald-400 animate-pulse', bg: 'bg-emerald-500/20' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <ProximityNotificationToast activeRoute={uniqueRoute} currentSeq={currentSeq} />
      <div className="bg-[#0B0F17] border border-[#233148] rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white font-sans relative">
        
        {/* ── Top Header ─────────────────────────────────────────── */}
        <div className="bg-[#182232] px-4 py-3 border-b border-[#2B3B56] flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-300">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{trainNumber}</span>
                <span className="text-gray-400 font-normal">-</span>
                <span className="truncate max-w-[140px] sm:max-w-[240px]">{data?.train?.name || trainName}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleWishlist}
              className="p-2 rounded-xl bg-[#25344D] hover:bg-[#324567] transition-all active:scale-95"
              title="Save to Wishlist"
            >
              <Heart className={`w-5 h-5 transition-colors ${
                isWishlisted
                  ? 'text-pink-500 fill-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                  : 'text-gray-400 hover:text-pink-400'
              }`} />
            </button>

            <button
              onClick={fetchLiveStatus}
              disabled={loading}
              className="p-2 rounded-xl bg-[#25344D] hover:bg-[#324567] text-gray-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 📱 OFFLINE SAVED MODE BANNER ────────────────────────────── */}
        {isOfflineMode && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-white font-extrabold text-xs flex items-center justify-between z-30 shadow-lg">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>📶 Offline Mode Active: Showing Saved Timetable & GPS (Zero Data Required)</span>
            </div>
            <button onClick={fetchLiveStatus} className="px-2.5 py-1 bg-white text-black rounded-md text-[10px] font-black hover:bg-gray-100">
              Retry Online
            </button>
          </div>
        )}

        {/* ── Top Feature Action Pills Bar (Today, Speedometer, Alarm, Coach, Share) ── */}
        <div className="bg-[#121927] px-4 py-2 border-b border-[#24334B] flex items-center gap-2 overflow-x-auto scrollbar-hide relative z-20">
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

          {/* ⚡ SPEEDOMETER BUTTON */}
          <button
            onClick={() => setShowSpeedometerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/50 text-xs font-black transition-all flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Speedometer ⚡</span>
          </button>

          {/* ⏰ GPS ALARM BUTTON */}
          <button
            onClick={() => setShowAlarmModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 border ${
              isAlarmActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-[#24344D] hover:bg-[#2F4262] text-gray-200 border-[#34486A]'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${isAlarmActive ? 'text-amber-400 animate-bounce' : 'text-amber-400'}`} />
            <span>{isAlarmActive ? 'Alarm Set ⏰' : 'Alarm'}</span>
          </button>

          {/* 🚃 COACH POSITION BUTTON */}
          <button
            onClick={() => setShowCoachModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24344D] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
          >
            <Train className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coach Position</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#24344D] hover:bg-[#2F4262] text-xs font-bold text-gray-200 border border-[#34486A] transition-all flex-shrink-0"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* ── Active Ringing Alarm Alert Banner ────────────────────── */}
        {isAlarmRinging && (
          <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 px-4 py-2.5 text-white font-extrabold text-xs flex items-center justify-between animate-pulse z-30 shadow-lg">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-white animate-bounce" />
              <span>⏰ WAKE UP! Train is approaching {targetAlarmStation} ({alarmDistanceKm} km remaining)!</span>
            </div>
            <button
              onClick={stopRingingAlarm}
              className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-black hover:bg-gray-100 transition-all shadow"
            >
              Stop Alarm
            </button>
          </div>
        )}

        {/* ── Arrival / Date Header / Departure ───────────────────── */}
        <div className="bg-[#0B0F17] px-4 py-2 border-b border-[#25344D] flex items-center justify-between text-xs font-bold text-gray-300 z-20">
          <div className="w-[100px] text-left uppercase text-gray-400 tracking-wider">Arrival</div>
          <div className="text-center font-extrabold text-white text-xs sm:text-sm">
            {data?.startDate ? `Day 1 - ${new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}` : 'Live Running Track'}
          </div>
          <div className="w-20 text-right uppercase text-gray-400 tracking-wider">Departure</div>
        </div>

        {/* ── Main Scrollable Timeline ───────────────────────────── */}
        <div ref={timelineScrollContainerRef} className="flex-1 overflow-y-auto bg-[#0B0F17] px-0 py-0 relative z-10">
          <style>{`
            @keyframes tooltipGlow {
              0%, 100% { opacity: 0; transform: scale(0.9) translateY(4px); }
              15%, 55% { opacity: 1; transform: scale(1) translateY(0); }
              70% { opacity: 0; transform: scale(0.9) translateY(-4px); }
            }
            .animate-tooltip-glow {
              animation: tooltipGlow 10s infinite ease-in-out;
            }
          `}</style>

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
            <div className="relative min-h-full">
              
              {/* Station Rows */}
              <div className="flex flex-col relative z-10 overflow-hidden">
                {visibleRoute.map((stn: any, idx: number) => {
                  const isCurrentLoc = (stn.sequence === currentSeq) || 
                                       (data?.currentLocation?.stationCode && stn.stationCode === data.currentLocation.stationCode);
                  const isHalt = stn.isHalt !== false;
                  const isExpanded = expandedSections.has(stn.sectionId);
                  const subCount = sectionCounts[stn.sectionId] || 0;

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

                  const isTargetScrollStn = isCurrentLoc;

                  return (
                    <div
                      key={`${stn.stationCode || 'stn'}-${stn.sequence || idx}`}
                      ref={isTargetScrollStn ? activeStationRef : null}
                      onClick={() => toggleSection(stn.sectionId)}
                      className={`relative flex items-center justify-between py-3.5 px-3 transition-colors cursor-pointer ${
                        isHalt
                          ? 'bg-[#0B0F17] hover:bg-[#121927]'
                          : 'bg-[#2B384B] hover:bg-[#34445A]'
                      }`}
                    >
                      {/* Left: Scheduled & Actual Arrival */}
                      <div className="w-[100px] flex-shrink-0 text-left flex flex-col justify-center z-10">
                        <span className={`text-xs sm:text-sm font-bold ${isHalt ? 'text-gray-200' : 'text-slate-100'}`}>
                          {schArr !== '--' ? schArr : schDep}
                        </span>
                        {actArr !== '--' && actArr !== schArr && (
                          <span className={`text-[11px] font-extrabold ${isDelayedArr ? 'text-red-400' : 'text-emerald-400'}`}>
                            {actArr}
                          </span>
                        )}
                      </div>

                       {/* 100% UNBROKEN CONTINUOUS OVERLAPPING STEEL RAILS TRACK LADDER COLUMN */}
                      <div className="relative w-12 flex-shrink-0 flex items-center justify-center min-h-[64px] z-20">
                        <div className="absolute top-0 bottom-0 w-5 flex justify-center pointer-events-none z-0 h-[100%] overflow-visible">
                          {/* Left Rail */}
                          <div className="absolute left-0 -top-[100%] -bottom-[100%] w-[4px] bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                          {/* Right Rail */}
                          <div className="absolute right-0 -top-[100%] -bottom-[100%] w-[4px] bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                          {/* Metal Sleepers (Ties) */}
                          <div
                            className="absolute left-0 right-0 -top-[100%] -bottom-[100%] opacity-80"
                            style={{
                              backgroundImage: 'linear-gradient(to bottom, #475569 2px, transparent 2px)',
                              backgroundSize: '100% 12px'
                            }}
                          ></div>
                        </div>

                        {/* Station Dot / Live Train Badge */}
                        {isCurrentLoc ? (
                          <div className="relative flex items-center justify-center z-30">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 border-2 border-white shadow-[0_0_18px_rgba(6,182,212,1)] flex items-center justify-center animate-bounce">
                              <Train className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-cyan-400/60 animate-ping z-20"></div>
                          </div>
                        ) : isHalt ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] z-30"></div>
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-white bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)] z-30"></div>
                        )}
                      </div>

                      {/* Middle: Station Name & Sub-station Toggle */}
                      <div className="flex-1 min-w-0 px-3 z-10">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm sm:text-base truncate ${isHalt ? 'font-extrabold text-white' : 'font-bold text-slate-100'}`}>
                            {stn.stationName}
                          </span>
                          
                          {isHalt && subCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 flex-shrink-0 shadow">
                              <span>{subCount} sub-stns</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-cyan-300" /> : <ChevronDown className="w-3 h-3 text-cyan-300" />}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                          <span className={isHalt ? 'text-gray-300' : 'text-slate-300'}>{stn.distanceKm || stn.distance || 0} km</span>
                          {stn.platform && stn.platform !== '--' && (
                            <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${
                              isHalt ? 'text-gray-200 bg-[#1E2B40] border-[#374F75]' : 'text-slate-200 bg-[#212E40] border-[#3A4E6C]'
                            }`}>
                              Platform {stn.platform}
                            </span>
                          )}
                        </div>

                        {isCurrentLoc && (
                          <div className="mt-2 inline-flex flex-col bg-[#1B8A5A] text-white rounded-lg px-3 py-1 text-xs font-black shadow-md border border-emerald-500/20 max-w-[220px] animate-tooltip-glow">
                            <div>{getLiveStatusMsg()}</div>
                            <div className="text-[9px] text-emerald-100/90 font-medium mt-0.5">(Updated few seconds ago)</div>
                          </div>
                        )}
                      </div>

                      {/* Right: Scheduled & Actual Departure */}
                      <div className="w-20 text-right flex flex-col justify-center flex-shrink-0 z-10">
                        <span className={`text-xs sm:text-sm font-bold ${isHalt ? 'text-gray-200' : 'text-slate-100'}`}>
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

            </div>
          )}

        </div>

        {/* ── ⚡ ROBUST GPS SPEEDOMETER MODAL WITH FIX ─────────────────── */}
        {showSpeedometerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#121927] border border-[#2B3E5C] rounded-2xl p-5 max-w-md w-full shadow-2xl text-white relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#24334B] mb-4">
                <h3 className="text-base font-black flex items-center gap-2 text-cyan-400">
                  <Gauge className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span>Real Hardware GPS Speedometer</span>
                </h3>
                <button onClick={() => setShowSpeedometerModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* GPS Status & Re-Fix Button */}
              <div className="mb-4 flex items-center justify-between text-xs font-bold">
                <span className="text-gray-400">GPS Connection:</span>
                <div className="flex items-center gap-2">
                  {gpsStatus === 'active' && (
                    <span className="text-emerald-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Live GPS Satellite Active ✅</span>
                    </span>
                  )}
                  {gpsStatus === 'connecting' && (
                    <span className="text-amber-300 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Connecting Satellite Fix...</span>
                    </span>
                  )}
                  {gpsStatus === 'denied' && (
                    <span className="text-red-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/50">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Location Access Denied</span>
                    </span>
                  )}

                  <button
                    onClick={startGpsSpeedometer}
                    className="p-1 rounded bg-[#24334B] hover:bg-[#2F4262] text-cyan-400 border border-[#34486A]"
                    title="Refresh Satellite Fix"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Neon Speed Gauge Dial */}
              <div className="flex flex-col items-center justify-center my-6 relative">
                <div className="w-48 h-48 rounded-full border-4 border-[#24334B] bg-gradient-to-tr from-[#0B0F17] via-[#162134] to-[#0D1421] shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 border-r-cyan-400 pointer-events-none"></div>

                  <Zap className="w-6 h-6 text-cyan-400 mb-1 animate-pulse" />
                  
                  <div className="text-5xl font-black tracking-tighter text-white font-mono">
                    {currentSpeedKmH !== null ? currentSpeedKmH : '0'}
                  </div>
                  
                  <div className="text-xs font-black text-cyan-400 uppercase tracking-widest mt-1">
                    km / h
                  </div>
                </div>

                <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-black border ${getSpeedCategory(currentSpeedKmH).bg} ${getSpeedCategory(currentSpeedKmH).color}`}>
                  {getSpeedCategory(currentSpeedKmH).label}
                </div>
              </div>



              <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#24334B]">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Max Speed Recorded</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">{maxSpeedKmH} km/h</div>
                </div>

                <div className="bg-[#0B0F17] p-3 rounded-xl border border-[#24334B]">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Data Source</div>
                  <div className="text-xs font-extrabold text-blue-300 mt-1">Hardware GPS Satellite</div>
                </div>
              </div>

              <button
                onClick={() => setShowSpeedometerModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-colors shadow"
              >
                Close Speedometer
              </button>
            </div>
          </div>
        )}

        {/* ── ⏰ GPS STATION PROXIMITY ALARM MODAL ───────────────────── */}
        {showAlarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#162132] border border-[#2B3E5C] rounded-2xl p-5 max-w-md w-full shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#263750] mb-4">
                <h3 className="text-base font-black flex items-center gap-2 text-amber-400">
                  <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>GPS Station Wake-Up Alarm</span>
                </h3>
                <button onClick={() => setShowAlarmModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block mb-1">
                  Destination / Target Station:
                </label>
                <select
                  value={targetAlarmStation}
                  onChange={(e) => setTargetAlarmStation(e.target.value)}
                  className="w-full bg-[#0D1420] border border-[#2A3C58] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  {uniqueRoute.map((s: any) => (
                    <option key={s.stationCode || s.sequence} value={s.stationCode || s.stationName}>
                      {s.stationName} ({s.stationCode}) - {s.distanceKm || s.distance || 0} km
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block mb-1">
                  Ring Alarm When Distance Is:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((dist) => (
                    <button
                      key={dist}
                      onClick={() => setAlarmDistanceKm(dist)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        alarmDistanceKm === dist
                          ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                          : 'bg-[#0D1420] text-gray-300 border-[#25364F] hover:bg-[#1A263B]'
                      }`}
                    >
                      {dist} km
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {isAlarmActive ? (
                  <button
                    onClick={() => {
                      setIsAlarmActive(false);
                      stopRingingAlarm();
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>Turn Off Alarm</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsAlarmActive(true);
                      setShowAlarmModal(false);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4 text-black" />
                    <span>Enable Station Alarm ⏰</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 🚃 REAL LIVE COACH POSITION MODAL ───────────────────────── */}
        {showCoachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#162132] border border-[#2B3E5C] rounded-2xl p-5 max-w-lg w-full shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#263750] mb-4">
                <h3 className="text-base font-black flex items-center gap-2 text-emerald-400">
                  <Train className="w-5 h-5 text-emerald-400" />
                  <span>Real Coach Composition ({trainNumber})</span>
                </h3>
                <button onClick={() => setShowCoachModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#23354E] mb-4">
                <div className="text-[10px] text-gray-400 mb-2 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>🚂 Engine (Front)</span>
                  <span>Guard / SLR (Back) 🏁</span>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1">
                  {coachList.map((c: string, idx: number) => {
                    const style = getCoachStyle(c);
                    const isSelected = selectedCoach === c;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedCoach(c)}
                        className={`flex-shrink-0 border px-3 py-2 rounded-xl text-center transition-all flex flex-col items-center min-w-[54px] ${style.bg} ${
                          isSelected ? 'ring-2 ring-white scale-105 shadow-lg' : 'hover:scale-105'
                        }`}
                      >
                        <div className="text-[9px] opacity-75 font-bold">#{idx + 1}</div>
                        <div className="text-sm font-black tracking-tight">{c}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedCoach && (
                <div className="bg-[#0F172A] p-3 rounded-xl border border-[#24354E] mb-4 text-xs font-bold text-gray-200 animate-in fade-in">
                  <div className="text-emerald-400 font-extrabold text-sm mb-1">
                    Coach {selectedCoach} - {getCoachStyle(selectedCoach).label}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Platform Position: Standard Broad Gauge Passenger Arrangement.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-gray-300 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span>Sleeper (SL)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                  <span>AC 3 Tier (3A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span>AC 2 Tier (2A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span>General (GS)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-600"></span>
                  <span>Pantry Car (PC)</span>
                </div>
              </div>

              <button
                onClick={() => setShowCoachModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs transition-all shadow"
              >
                Close Coach Guide
              </button>
            </div>
          </div>
        )}

        {/* ── Detailed Status Bottom Drawer / Card ─────────────────── */}
        {data && (
          <div className="bg-[#162030] border-t border-[#263752] p-3 flex flex-col shadow-2xl relative z-30">
            <div
              onClick={() => setShowBottomSheet(!showBottomSheet)}
              className="flex items-center justify-between cursor-pointer group py-1"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(data.currentLocation?.stationName || data.train?.name || 'Railway Station');
                  }}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
                  title="View Station Map Directions"
                >
                  <MapPin className="w-5 h-5 text-white" />
                </button>

                <div>
                  <div className="text-xs sm:text-sm font-black text-[#FF6B6B]">
                    {getLiveStatusMsg()}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Updated few seconds ago
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchLiveStatus();
                  }}
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0"
                  title="Refresh Live Status"
                >
                  <RefreshCw className="w-5 h-5 animate-spin-hover" />
                </button>

                <div className="p-1 rounded-full bg-[#24344D] text-gray-300 group-hover:text-white ml-2">
                  {showBottomSheet ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {showBottomSheet && (
              <div className="mt-3 pt-3 border-t border-[#263752] bg-[#121926] rounded-2xl p-4 border border-[#2B3E5C] shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-gray-200 mb-2">
                  <span>{firstHalt?.stationName || 'Origin'}</span>
                  <span>{lastHalt?.stationName || 'Destination'}</span>
                </div>

                <div className="relative w-full h-2 bg-[#253650] rounded-full overflow-hidden mb-4">
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${calcProgressPct()}%` }}
                  ></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md transition-all duration-300"
                    style={{ left: `calc(${calcProgressPct()}% - 8px)` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                  <div className="bg-[#1A2538] p-3 rounded-xl border border-[#2A3B58]">
                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-1">Next Stop</div>
                    <div className="text-sm font-black text-white truncate">{nextHalt?.stationName || 'N/A'}</div>
                    <div className="text-xs font-extrabold text-blue-400 mt-0.5">
                      {nextHalt?.distanceKm || 0}km - {nextHalt?.scheduledArrival || nextHalt?.actualArrival || '--'}
                    </div>
                  </div>

                  <div className="bg-[#1A2538] p-3 rounded-xl border border-[#2A3B58]">
                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider mb-1">To Reach</div>
                    <div className="text-sm font-black text-white truncate">{lastHalt?.stationName || 'N/A'}</div>
                    <div className="text-xs font-extrabold text-cyan-400 mt-0.5">
                      {lastHalt?.distanceKm || 0}km - {lastHalt?.scheduledArrival || lastHalt?.actualArrival || '--'}
                    </div>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl text-center font-black text-xs mb-3 ${
                  data.delayMinutes > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {data.delayMinutes > 0
                    ? `Delayed by ${data.delayMinutes} minutes at ${data.currentLocation?.stationName || 'Current Station'}`
                    : `On Time at ${data.currentLocation?.stationName || 'Current Station'}`}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => alert('📝 Thank you for your feedback!')}
                    className="flex-1 py-2 bg-[#23334B] hover:bg-[#2C3E5A] text-gray-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#34496B]"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Feedback</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex-1 py-2 bg-[#23334B] hover:bg-[#2C3E5A] text-gray-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#34496B]"
                  >
                    <Share2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Share</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
