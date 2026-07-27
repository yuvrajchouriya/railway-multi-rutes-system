import { NextResponse } from 'next/server';

// Server-side Speed Engine for Live Train Running Status (RailRadar Direct + 2-Min Speed Cache)
const liveStatusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!trainNo) {
    return NextResponse.json({ error: 'Train number is required' }, { status: 400 });
  }

  // 1. Check 2-minute Speed Cache
  const now = Date.now();
  if (!forceRefresh && liveStatusCache.has(trainNo)) {
    const cached = liveStatusCache.get(trainNo)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data, source: 'cache' });
    }
  }

  // 2. Primary Fast Engine: RailRadar Live API (Responds in ~150ms with full 200+ stations)
  try {
    const rrRes = await fetch(`https://railradar.in/api/v1/trains/${trainNo}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });

    if (rrRes.ok) {
      const json = await rrRes.json();
      if (json && json.success && json.data) {
        const d = json.data;
        const formattedRoute = (d.route || []).map((stn: any, idx: number) => ({
          sequence: stn.sequence || idx + 1,
          stationCode: stn.stationCode || 'STN',
          stationName: stn.stationName || 'Station',
          isHalt: stn.isHalt !== false,
          scheduledArrival: stn.scheduledArrival,
          scheduledDeparture: stn.scheduledDeparture,
          actualArrival: stn.actualArrival,
          actualDeparture: stn.actualDeparture,
          delayArrivalMinutes: stn.delayArrival || 0,
          delayDepartureMinutes: stn.delayDeparture || 0,
          platform: stn.platform || '--',
          distanceKm: stn.distance !== undefined ? stn.distance : 0,
          status: stn.status || 'upcoming'
        }));

        const resultData = {
          train: {
            number: d.trainNumber || trainNo,
            name: d.trainName || d.train?.name || `Train ${trainNo}`,
            coachPosition: d.train?.coachPosition || d.route?.[0]?.coachPosition || ''
          },
          currentLocation: d.currentLocation || {
            stationCode: formattedRoute[0]?.stationCode || '',
            stationName: formattedRoute[0]?.stationName || '',
            sequence: 1
          },
          delayMinutes: d.delayMinutes || 0,
          startDate: d.startDate || new Date().toISOString().split('T')[0],
          lastUpdated: d.lastUpdatedAt ? new Date(d.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          route: formattedRoute
        };

        // Cache result for 2 minutes
        liveStatusCache.set(trainNo, { data: resultData, timestamp: now });
        return NextResponse.json({ success: true, data: resultData, source: 'railradar' });
      }
    }
  } catch (err) {
    console.error("RailRadar Fast Engine Error:", err);
  }

  // 3. Secondary Engine: Govt NTES Scraper Engine Fallback
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const initRes = await fetch(`https://enquiry.indianrail.gov.in/mntes/q?opt=TR&subOpt=running&trainNo=${trainNo}`, {
      headers: { 'User-Agent': userAgent },
      cache: 'no-store'
    });

    const rawCookies = initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [];
    const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');

    const t = Date.now();
    const csrfRes = await fetch(`https://enquiry.indianrail.gov.in/mntes/GetCSRFToken?t=${t}`, {
      headers: {
        'User-Agent': userAgent,
        'Cookie': cookieStr,
        'Referer': `https://enquiry.indianrail.gov.in/mntes/q?opt=TR&subOpt=running&trainNo=${trainNo}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      cache: 'no-store'
    });

    const csrfStr = await csrfRes.text();
    const nameMatch = csrfStr.match(/name=["']([^"']+)["']/);
    const valMatch = csrfStr.match(/value=["']([^"']+)["']/);

    const tokenName = nameMatch ? nameMatch[1] : 'csrfToken';
    const tokenVal = valMatch ? valMatch[1] : '';

    const params = new URLSearchParams();
    params.append('trainNo', trainNo);
    params.append('lan', 'en');
    if (tokenName && tokenVal) params.append(tokenName, tokenVal);

    const ntesPostRes = await fetch('https://enquiry.indianrail.gov.in/mntes/tr?opt=TrainRunning&subOpt=FindRunningInstance', {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieStr,
        'Referer': `https://enquiry.indianrail.gov.in/mntes/q?opt=TR&subOpt=running&trainNo=${trainNo}`
      },
      body: params.toString(),
      cache: 'no-store'
    });

    const html = await ntesPostRes.text();
    const parsedData = parseNTESData(html, trainNo);

    if (parsedData && parsedData.route && parsedData.route.length > 0) {
      liveStatusCache.set(trainNo, { data: parsedData, timestamp: now });
      return NextResponse.json({ success: true, data: parsedData, source: 'ntes' });
    }
  } catch (err) {
    console.error("NTES Fallback Engine Error:", err);
  }

  return NextResponse.json({ error: 'Unable to fetch live train running status' }, { status: 500 });
}

function parseNTESData(html: string, trainNo: string) {
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, '')
                   .replace(/<script[\s\S]*?<\/script>/gi, '')
                   .replace(/<[^>]+>/g, '\n')
                   .split('\n')
                   .map(l => l.trim().replace(/&nbsp;/g, ' '))
                   .filter(l => l.length > 0);

  const route: any[] = [];
  let currentLocation = { stationName: '', sequence: 1 };
  let delayMinutes = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === 'KMs') {
      for (let j = i + 1; j < text.length; j += 6) {
        if (!text[j] || isNaN(Number(text[j]))) break;
        const stnCode = text[j+1];
        const stnName = text[j+2];
        const arr = text[j+3];
        const dep = text[j+4];

        if (stnCode && stnName) {
          route.push({
            sequence: route.length + 1,
            stationCode: stnCode,
            stationName: stnName,
            scheduledArrival: arr,
            scheduledDeparture: dep,
            actualArrival: arr,
            actualDeparture: dep,
            delayArrivalMinutes: 0,
            delayDepartureMinutes: 0,
            isHalt: true,
            distanceKm: Number(text[j]) || 0
          });
        }
      }
    }

    if (text[i].includes('Last Reported Location') || text[i].includes('Current Location')) {
      currentLocation.stationName = text[i+1] || '';
    }

    if (text[i].includes('Late by') || text[i].includes('Delay')) {
      const match = text[i].match(/\d+/);
      if (match) delayMinutes = Number(match[0]);
    }
  }

  return {
    train: { number: trainNo, name: `Train ${trainNo}` },
    currentLocation,
    delayMinutes,
    lastUpdated: 'Just now',
    route
  };
}
