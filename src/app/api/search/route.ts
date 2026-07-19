import { NextRequest, NextResponse } from 'next/server';
import { findRoutes, findDirectRoutes, findConnectingRoutes } from '@/lib/route-finder';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  const type = searchParams.get('type');

  if (!from || !to || !date) {
    return NextResponse.json({ error: 'Missing from, to, or date parameters' }, { status: 400 });
  }

  try {
    let results = { directRoutes: [], connectingRoutes: [] };
    if (type === 'direct') {
      const directRoutes = await findDirectRoutes(from, to, date);
      results.directRoutes = directRoutes as any;
    } else if (type === 'connecting') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // 1. Check DB Cache First
      const { data: cacheData, error: cacheErr } = await supabase
        .from('saved_routes')
        .select('routes_json')
        .eq('from_station', from)
        .eq('to_station', to)
        .eq('journey_date', date)
        .eq('type', 'connecting')
        .single();
        
      if (!cacheErr && cacheData && cacheData.routes_json) {
         // Cache HIT: Stream instantly from DB
         const routesArray = cacheData.routes_json as any[];
         const stream = new ReadableStream({
           start(controller) {
             routesArray.forEach((route) => {
               controller.enqueue(new TextEncoder().encode(JSON.stringify(route) + '\n'));
             });
             controller.close();
           }
         });
         return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
      }

      // 2. Cache MISS: Calculate, Stream, and Save
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const allConnectingRoutes: any[] = [];
            const directRoutes = await findDirectRoutes(from, to, date);
            
            let fastestDirectMins = null;
            if (directRoutes.length > 0) {
               fastestDirectMins = Math.min(...directRoutes.map(r => r.totalDurationMinutes));
            }
            
            await findConnectingRoutes(from, to, date, fastestDirectMins, (route) => {
              allConnectingRoutes.push(route);
              controller.enqueue(new TextEncoder().encode(JSON.stringify(route) + '\n'));
            });
            
            // Save computed routes to DB in background
            supabase.from('saved_routes').upsert({
              from_station: from,
              to_station: to,
              journey_date: date,
              type: 'connecting',
              routes_json: allConnectingRoutes
            }, { onConflict: 'from_station,to_station,journey_date,type' }).then(() => {});
            
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
    } else {
      results = await findRoutes(from, to, date) as any;
    }

    // Save search history — uses service_role to bypass RLS (fire and forget)
    if (type !== 'direct' && type !== 'connecting') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      supabase.from('search_history').insert({
        from_station: from,
        to_station: to,
        journey_date: date,
        results_summary: {
          direct_count: results.directRoutes.length,
          connecting_count: results.connectingRoutes.length
        }
      }).then(({ error }) => {
        if (error) console.error('Failed to log search history', error);
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Failed to find routes' }, { status: 500 });
  }
}
