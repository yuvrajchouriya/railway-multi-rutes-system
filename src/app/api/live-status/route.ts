import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');

  if (!trainNo) {
    return NextResponse.json({ error: 'Train number is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://railradar.in/api/v1/trains/${trainNo}/live`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://railradar.in/'
      },
      next: { revalidate: 30 } // cache for 30s
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch live status from upstream' }, { status: res.status });
    }

    const data = await res.json();

    if (!data.success || !data.data) {
      return NextResponse.json({ error: 'Live status not available for this train' }, { status: 444 });
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error: any) {
    console.error('Error fetching live status:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
