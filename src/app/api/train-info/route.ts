import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { verifyApiKey } from '@/lib/shield';

// ── Server-side proxy for train info lookup ─────────────────────────────────
// This keeps the external API URL hidden from browser DevTools.
// Frontend calls /api/train-info?number=12642 → server fetches from RailRadar.
export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(`${ip}:train-info`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const trainNumber = request.nextUrl.searchParams.get('number');
  if (!trainNumber || !/^\d{4,5}$/.test(trainNumber.trim())) {
    return NextResponse.json({ error: 'Invalid train number' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://railradar.in/api/v1/trains/${trainNumber.trim()}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': 'https://railradar.in/',
          'Origin': 'https://railradar.in',
        },
        next: { revalidate: 3600 }, // cache 1 hour — train info rarely changes
      }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error('train-info proxy error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch train info' }, { status: 500 });
  }
}
