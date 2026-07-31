import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isValidTrainNumber, isValidStationCode, isValidDate } from '@/lib/validators';
import { verifyApiKey } from '@/lib/shield';

export async function GET(request: Request) {
  // ── Rate Limit: 10 requests per minute per IP ─────────────────────
  const ip = getClientIp(request);

  // ── API Shield: Block all requests not from our app ─────────────────────
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 8_000);

  try {
    // ConfirmTkt search API with requested date
    const ctUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${date}&querysource=ct-web`;
    const res = await fetch(ctUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'External API error' }, { status: res.status });
    }

    const json = await res.json();
    const trainList = json?.data?.trainList || json?.data?.trains || [];
    const targetTrain = trainList.find((t: any) => t.trainNumber === trainNo || t.trainNo === trainNo);

    if (!targetTrain) {
      return NextResponse.json({ success: false, error: 'Train not found' }, { status: 404 });
    }

    const cache = targetTrain.avaiblityCache || targetTrain.availabilityCache || {};
    const classes = Object.keys(cache).map(clsKey => {
      const item = cache[clsKey];
      return {
        classType: clsKey,
        quota: item?.quota || 'GN',
        fare: parseInt(item?.fare || '0', 10),
        status: item?.availabilityDisplayName || item?.availability || 'UNKNOWN',
        updatedAt: item?.cacheTime || new Date().toISOString()
      };
    });

    return NextResponse.json({ success: true, data: classes, trainName: targetTrain.trainName });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch availability' }, { status: 500 });
  } finally {
    clearTimeout(fetchTimeout);
  }
}
