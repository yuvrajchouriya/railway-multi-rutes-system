import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  if (!trainNo || !from || !to || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const res = await fetch(`http://127.0.0.1:3001/availability/getAvailability?trainNo=${trainNo}&from=${from}&to=${to}&date=${date}&classType=ALL`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Availability by date fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
