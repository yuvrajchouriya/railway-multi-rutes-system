import { NextResponse } from 'next/server';

// Server-side NTES Govt Scraper Engine
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');

  if (!trainNo) {
    return NextResponse.json({ error: 'Train number is required' }, { status: 400 });
  }

  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Step 1: Initialize session with NTES to get Cookies & CSRF
    const initRes = await fetch(`https://enquiry.indianrail.gov.in/mntes/q?opt=TR&subOpt=running&trainNo=${trainNo}`, {
      headers: { 'User-Agent': userAgent },
      cache: 'no-store'
    });

    const rawCookies = initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [];
    const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ');

    // Step 2: Fetch CSRF Token from NTES
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

    // Step 3: POST to NTES FindRunningInstance
    const params = new URLSearchParams();
    params.append('trainNo', trainNo);
    params.append('lan', 'en');
    if (tokenName && tokenVal) {
      params.append(tokenName, tokenVal);
    }

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

    if (!html || html.length < 500) {
      // Fallback to RailRadar if NTES is temporarily down
      return await fetchFallbackRailRadar(trainNo);
    }

    // Step 4: Parse NTES HTML Output
    const parsedData = parseNTESData(html, trainNo);

    if (!parsedData || !parsedData.route || parsedData.route.length === 0) {
      return await fetchFallbackRailRadar(trainNo);
    }

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('NTES Scraper Error:', error);
    // Dynamic Fallback
    return await fetchFallbackRailRadar(trainNo);
  }
}

// Helper: Parse NTES HTML Structure
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
      const distance = text[i - 1] || '0';
      const platformRaw = text[i - 2] || '';
      const stationCode = text[i - 3] || '';
      const stationName = text[i - 4] || '';
      const status = text[i - 5] || 'On Time';
      const schTime = text[i - 6] || '';
      const actTime = text[i - 7] || '';

      const pfMatch = platformRaw.match(/\d+/);
      const platform = pfMatch ? pfMatch[0] : '--';

      if (stationCode && stationCode.length >= 2 && stationCode.length <= 5 && !stationCode.includes(' ')) {
        const seq = route.length + 1;
        
        let isDelay = status.toLowerCase().includes('late') || status.toLowerCase().includes('delay');
        if (isDelay) {
          const delayMatch = status.match(/\d+/);
          if (delayMatch) delayMinutes = parseInt(delayMatch[0]);
        }

        const isHalt = !status.toLowerCase().includes('pass') && !platformRaw.toLowerCase().includes('pass');

        route.push({
          sequence: seq,
          stationCode,
          stationName,
          platform,
          distance: parseInt(distance) || 0,
          isHalt,
          scheduledArrival: schTime,
          actualArrival: actTime,
          scheduledDeparture: schTime,
          actualDeparture: actTime,
          delayDeparture: isDelay ? delayMinutes : 0
        });

        if (status.toLowerCase().includes('arrived') || status.toLowerCase().includes('departed') || status.toLowerCase().includes('current')) {
          currentLocation = { stationName, sequence: seq };
        }
      }
    }
  }

  // De-duplicate stations by code
  const cleanRoute: any[] = [];
  const seen = new Set();
  for (const stn of route) {
    if (!seen.has(stn.stationCode)) {
      seen.add(stn.stationCode);
      cleanRoute.push(stn);
    }
  }

  if (cleanRoute.length === 0) return null;

  return {
    trainNumber: trainNo,
    trainName: `Train ${trainNo}`,
    startDate: new Date().toISOString().split('T')[0],
    lastUpdatedAt: new Date().toISOString(),
    status: 'running',
    delayMinutes,
    currentLocation: currentLocation.stationName ? currentLocation : { stationName: cleanRoute[0].stationName, sequence: 1 },
    route: cleanRoute,
    source: 'NTES Govt'
  };
}

// Fallback Helper in case NTES is under maintenance
async function fetchFallbackRailRadar(trainNo: string) {
  try {
    const res = await fetch(`https://railradar.in/api/v1/trains/${trainNo}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });
    if (!res.ok) return NextResponse.json({ error: 'Live status currently unavailable' }, { status: 404 });
    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch live status' }, { status: 500 });
  }
}
