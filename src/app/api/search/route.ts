import { NextRequest, NextResponse } from 'next/server';
import { findRoutes, findDirectRoutes, findConnectingRoutes, findNearbyHubs } from '@/lib/route-finder';
import { calculateDistanceKm } from '@/lib/geo';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isValidStationCode, isValidDate } from '@/lib/validators';
import { verifyApiKey } from '@/lib/shield';
import { RouteTag } from '@/types/railway';

export async function GET(request: NextRequest) {
  // ── API Shield: Block all requests not from our app ─────────────────────
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Rate Limit: 15 searches per minute per IP ─────────────────────
  const ip = getClientIp(request);
  if (!checkRateLimit(`${ip}:search`, 15, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();
  const date = searchParams.get('date');
  const type = searchParams.get('type');

  // ── Input Validation ─────────────────────────────────────────────
  if (!from || !to || !date) {
    return NextResponse.json({ error: 'Missing from, to, or date parameters' }, { status: 400 });
  }
  if (!isValidStationCode(from) || !isValidStationCode(to)) {
    return NextResponse.json({ error: 'Invalid station code format' }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    let results = { directRoutes: [], connectingRoutes: [] };

    if (type === 'direct') {
      const { data: cacheData, error: cacheErr } = await supabase
        .from('saved_routes')
        .select('routes_json')
        .eq('from_station', from)
        .eq('to_station', to)
        .eq('journey_date', date)
        .eq('type', 'direct')
        .single();

      if (!cacheErr && cacheData && Array.isArray(cacheData.routes_json) && cacheData.routes_json.length > 0) {
        return NextResponse.json({ directRoutes: cacheData.routes_json, source: 'cache' });
      }

      let directRoutes = await findDirectRoutes(from, to, date);
      
      // Fallback: If no direct routes, check nearby hubs (Nagpur, Jabalpur, etc.)
      if (directRoutes.length === 0) {
        const nearbyHubs = findNearbyHubs(from);
        for (const hub of nearbyHubs) {
          if (hub.code === from || hub.code === to) continue;
          const hubDirect = await findDirectRoutes(hub.code, to, date);
          if (hubDirect.length > 0) {
            const tagged = hubDirect.map(r => ({
              ...r,
              tags: [...(r.tags || []), 'nearby-hub'] as RouteTag[],
              nearbyHubWarning: `No direct trains from ${from}. Showing direct trains from nearest major station ${hub.code} (~${hub.distance} km away).`
            }));
            directRoutes = directRoutes.concat(tagged as any);
          }
        }
      }
      
      if (directRoutes.length > 0) {
        supabase.from('saved_routes').upsert({
          from_station: from,
          to_station: to,
          journey_date: date,
          type: 'direct',
          routes_json: directRoutes
        }, { onConflict: 'from_station,to_station,journey_date,type' }).then(() => {});
      }

      return NextResponse.json({ directRoutes });

    } else if (type === 'connecting') {
      const { data: cacheData, error: cacheErr } = await supabase
        .from('saved_routes')
        .select('routes_json')
        .eq('from_station', from)
        .eq('to_station', to)
        .eq('journey_date', date)
        .eq('type', 'connecting')
        .single();
        
      if (!cacheErr && cacheData && Array.isArray(cacheData.routes_json) && cacheData.routes_json.length > 0) {
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

            // Nearby Hub Stream Fallback: If 0 connecting routes found, search from nearby hubs
            if (allConnectingRoutes.length === 0) {
              const nearbyHubs = findNearbyHubs(from);
              for (const hub of nearbyHubs) {
                if (hub.code === from || hub.code === to) continue;
                
                await findConnectingRoutes(hub.code, to, date, null, (route) => {
                  const taggedRoute = {
                    ...route,
                    tags: [...(route.tags || []), 'nearby-hub'] as RouteTag[],
                    nearbyHubWarning: `No trains found from ${from}. Showing connecting routes via nearest major station ${hub.code} (~${hub.distance} km away).`
                  };
                  allConnectingRoutes.push(taggedRoute);
                  controller.enqueue(new TextEncoder().encode(JSON.stringify(taggedRoute) + '\n'));
                });
              }
            }
            
            if (allConnectingRoutes.length > 0) {
              supabase.from('saved_routes').upsert({
                from_station: from,
                to_station: to,
                journey_date: date,
                type: 'connecting',
                routes_json: allConnectingRoutes
              }, { onConflict: 'from_station,to_station,journey_date,type' }).then(() => {});
            }
            
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

    // Save search history (fire and forget)
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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Failed to find routes' }, { status: 500 });
  }
}
