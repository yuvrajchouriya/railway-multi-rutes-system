import { NextResponse } from 'next/server';
import { getClassAvailability } from '@/lib/railway-client';
import { ClassType } from '@/types/railway';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isValidTrainNumber, isValidStationCode, isValidDate, isValidClassType } from '@/lib/validators';

export async function GET(request: Request) {
  // ── Rate Limit: 20 requests per minute per IP ─────────────────────
  const ip = getClientIp(request);
  if (!checkRateLimit(`${ip}:availability`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();
  const date = searchParams.get('date');
  const classType = searchParams.get('classType') as ClassType;

  // ── Input Validation ─────────────────────────────────────────────
  if (!trainNo || !from || !to || !date || !classType) {
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
  if (!isValidClassType(classType)) {
    return NextResponse.json({ error: 'Invalid class type' }, { status: 400 });
  }

  try {
    const availability = await getClassAvailability(trainNo, from, to, classType, date);
    return NextResponse.json(availability);
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
