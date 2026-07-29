import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isValidTrainNumber, isValidStationCode, isValidDate } from '@/lib/validators';

export async function GET(request: Request) {
  // ── Rate Limit: 10 requests per minute per IP ─────────────────────
  const ip = getClientIp(request);
  if (!checkRateLimit(`${ip}:availability-by-date`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();
  const date = searchParams.get('date');

  // ── Input Validation (SSRF prevention) ───────────────────────────
  if (!trainNo || !from || !to || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  if (!isValidTrainNumber(trainNo)) {
    return NextResponse.json({ error: 'Invalid train number' }, { status: 400 });
  }
  if (!isValidStationCode(from) || !isValidStationCode(to)) {
    return NextResponse.json({ error: 'Invalid station code' }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 5_000);

  try {
    // Build URL with validated, sanitized parameters only
    const url = new URL('http://127.0.0.1:3001/availability/getAvailability');
    url.searchParams.set('trainNo', trainNo);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('date', date);
    url.searchParams.set('classType', 'ALL');

    const res = await fetch(url.toString(), { signal: controller.signal });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  } finally {
    clearTimeout(fetchTimeout);
  }
}
