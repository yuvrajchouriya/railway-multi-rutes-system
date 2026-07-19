import { NextResponse } from 'next/server';
import { getClassAvailability } from '@/lib/railway-client';
import { ClassType } from '@/types/railway';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');
  const classType = searchParams.get('classType') as ClassType;

  if (!trainNo || !from || !to || !date || !classType) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const availability = await getClassAvailability(trainNo, from, to, classType, date);
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
