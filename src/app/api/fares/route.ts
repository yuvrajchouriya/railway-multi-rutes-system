import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize a service role client to bypass RLS for server-side insertions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainNo = searchParams.get('trainNo');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  let date = searchParams.get('date');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!trainNo || !from || !to || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }
  
  // Format YYYY-MM-DD to DD-MM-YYYY for backend
  let formattedDateForDB = date;
  if (date.includes('-') && date.split('-')[0].length === 4) {
      const [year, month, day] = date.split('-');
      date = `${day}-${month}-${year}`; // For API
      formattedDateForDB = `${year}-${month}-${day}`;
  } else if (date.includes('-') && date.split('-')[2].length === 4) {
      const [day, month, year] = date.split('-');
      formattedDateForDB = `${year}-${month}-${day}`;
  }

  try {
    // 0. Check Cache First (if not force refresh)
    if (!forceRefresh) {
        const { data: cachedData, error: cacheErr } = await supabase
            .from('route_availability_cache')
            .select('*')
            .eq('train_no', trainNo)
            .eq('from_station', from)
            .eq('to_station', to)
            .eq('journey_date', formattedDateForDB);
            
        if (!cacheErr && cachedData && cachedData.length > 0) {
            // Check if cache is fresh (e.g., < 4 hours old)
            const lastUpdated = new Date(cachedData[0].updated_at).getTime();
            const now = new Date().getTime();
            const diffHours = (now - lastUpdated) / (1000 * 60 * 60);

            if (diffHours < 4) {
                // Reconstruct classes array from cache
                const classes = cachedData.map(c => {
                    let classType = c.class_type;
                    let quota = 'GN';
                    if (classType.startsWith('TQ-')) {
                        quota = 'TQ';
                        classType = classType.substring(3);
                    }
                    return {
                        classType,
                        quota,
                        fare: c.fare,
                        status: c.status,
                        updatedAt: c.updated_at
                    };
                });
                return NextResponse.json({ success: true, data: classes, source: 'cache', updatedAt: classes[0].updatedAt });
            }
        }
    }

    // 1. Fetch live from ConfirmTkt directly
    const apiUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${date}&querysource=ct-web`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
       throw new Error(`External API returned ${response.status}`);
    }
    
    const json = await response.json();
    const trains = json?.data?.trainList || json?.data?.trains || [];
    
    let requestedClasses: any[] = [];
    let requestedTrainData: any = null;
    
    const nowIso = new Date().toISOString();
    const allCacheInserts: any[] = [];
    const allFareInserts: any[] = [];
    const bulkDataMap: Record<string, any> = {};

    // Bulk process ALL trains for caching
    for (const t of trains) {
      let tClasses: any[] = [];
      
      const generalCache = t.avaiblityCache || t.availabilityCache || {};
      for (const cls of Object.keys(generalCache)) {
        const info = generalCache[cls];
        const infoDate = info?.date ? info.date.split('T')[0] : null;
        if (infoDate && infoDate !== formattedDateForDB) continue; // Skip if cache is for wrong date
        
        if (info && info.fare) {
          tClasses.push({
            classType: cls,
            quota: 'GN',
            fare: parseInt(info.fare || "0", 10),
            status: info.availabilityDisplayName || info.availability || 'UNKNOWN'
          });
        }
      }

      const tatkalCache = t.availabilityCacheTatkal || {};
      for (const cls of Object.keys(tatkalCache)) {
        const info = tatkalCache[cls];
        const infoDate = info?.date ? info.date.split('T')[0] : null;
        if (infoDate && infoDate !== formattedDateForDB) continue; // Skip if cache is for wrong date

        if (info && info.fare) {
          tClasses.push({
            classType: cls,
            quota: 'TQ',
            fare: parseInt(info.fare || "0", 10),
            status: info.availabilityDisplayName || info.availability || 'UNKNOWN'
          });
        }
      }

      // Add to bulk insert arrays
      tClasses.filter(c => c.status !== null).forEach(c => {
         allCacheInserts.push({
            train_no: t.trainNumber,
            from_station: from,
            to_station: to,
            journey_date: formattedDateForDB,
            class_type: c.quota === 'TQ' ? `TQ-${c.classType}` : c.classType,
            fare: c.fare || 0,
            status: c.status || 'UNKNOWN',
            updated_at: nowIso
         });
      });

      tClasses.filter(c => c.fare && c.fare > 0 && c.status !== null).forEach(c => {
         allFareInserts.push({
            train_no: t.trainNumber,
            from_station: from,
            to_station: to,
            class_type: c.quota === 'TQ' ? `TQ-${c.classType}` : c.classType,
            fare: c.fare,
            updated_at: nowIso
         });
      });

      // Only return this train's data to the frontend if it's the requested train
      if (t.trainNumber === trainNo) {
          console.log("tClasses for train", trainNo, ":", JSON.stringify(tClasses));
          requestedTrainData = t;
          requestedClasses = tClasses;
      }

      bulkDataMap[t.trainNumber] = {
         data: tClasses,
         originCode: t.trainOriginStationCode || null,
         originName: t.trainOriginStationName || null
      };
    }

    // Perform Bulk Upsert in background so it doesn't block the current request
    if (allCacheInserts.length > 0) {
       supabase.from('route_availability_cache').upsert(allCacheInserts, { onConflict: 'train_no,from_station,to_station,journey_date,class_type' }).then();
    }
    if (allFareInserts.length > 0) {
       supabase.from('train_fares').upsert(allFareInserts, { onConflict: 'train_no,from_station,to_station,class_type' }).then();
    }

    let classes = requestedClasses;
    const trainData = requestedTrainData;

    // Fallback: ConfirmTkt Search API sometimes hides trains or ignores short routes, or returns empty cache.
    // Also, it only returns classes that were recently searched. We will fetch missing classes in parallel.
    let fallbackFares: any = {};
    if (classes.length === 0) {
      try {
        const todayDateStr = new Date().toLocaleDateString('en-GB', {timeZone: 'Asia/Kolkata'}).replace(/\//g, '-');
        const altApiUrl = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${todayDateStr}&querysource=ct-web`;
        const altRes = await fetch(altApiUrl);
        const altJson = await altRes.json();
        const altTrains = altJson?.data?.trainList || altJson?.data?.trains || [];
        const altTrainData = altTrains.find((t: any) => t.trainNumber === trainNo);
        if (altTrainData) {
           const cacheGN = altTrainData.availabilityCache || altTrainData.avaiblityCache || {};
           const cacheTQ = altTrainData.availabilityCacheTatkal || {};
           for (const c of Object.keys(cacheGN)) {
              if (cacheGN[c]?.fare) fallbackFares[`GN-${c}`] = parseInt(cacheGN[c].fare, 10);
           }
           for (const c of Object.keys(cacheTQ)) {
              if (cacheTQ[c]?.fare) fallbackFares[`TQ-${c}`] = parseInt(cacheTQ[c].fare, 10);
           }
        }
      } catch (e) {
        console.error("Fallback fare fetch failed", e);
      }
    }

    const targetClasses = trainData?.avlClasses || trainData?.availableClasses || trainData?.classes || ['1A', '2A', '3A', 'SL', '2S', '3E'];
    const fetchPromises: Promise<void>[] = [];
    
    for (const cls of targetClasses) {
      for (const quota of ['GN', 'TQ']) {
         // Skip 1A Tatkal
         if (cls === '1A' && quota === 'TQ') continue;
         
         const exists = classes.some((c: any) => c.classType === cls && c.quota === quota);
         if (!exists) {
             fetchPromises.push((async () => {
                 try {
                   const calUrl = `https://cttrainsapi.confirmtkt.com/api/v1/availability/2monthcalendar?trainNumber=${trainNo}&sourceStationCode=${from}&destinationStationCode=${to}&trainClass=${cls}&quota=${quota}&startDate=${date}&querysource=ct-web`;
                   const calRes = await fetch(calUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                   const calJson = await calRes.json();
                   const calData = calJson?.data;
                   if (calData && calData[date]) {
                      const info = calData[date];
                      const fallbackFare = fallbackFares[`${quota}-${cls}`];
                      const fare = parseInt(info.fare || calJson.fare || calData.fare || fallbackFare || "0", 10);
                     if (fare > 0 || info.availabilityDisplayName) {
                       classes.push({
                         classType: cls,
                         quota: quota,
                         fare: fare,
                         status: info.availabilityDisplayName || info.predictionDisplayName || 'UNKNOWN'
                       });
                     }
                   }
                 } catch (e) {
                   console.error(`Fallback fetch failed for ${cls} ${quota}:`, e);
                 }
             })());
         }
      }
    }

    if (fetchPromises.length > 0) {
        // Run all missing class fetches in parallel, timeout after 3.5 seconds to prevent hanging
        await Promise.race([
            Promise.allSettled(fetchPromises),
            new Promise(r => setTimeout(r, 3500))
        ]);
    }

    if (classes.length === 0) {
       // Deep Fallback if even calendar fails
       if (!trainData) {
           // ConfirmTkt doesn't have this train (likely an unreserved passenger train)
           classes = [{ classType: 'UR', quota: 'GN', fare: 0, status: 'Unreserved / Counter Ticket' }];
       } else {
           const fallbackClasses = trainData?.avlClasses || ['1A', '2A', '3A', 'SL', '2S'];
           classes = fallbackClasses.map((cls: string) => ({
               classType: cls,
               quota: 'GN',
               fare: 0,
               status: 'N/A'
           }));
       }
    }

    // Fill in missing fares from train_fares history if fare is 0
    const classesMissingFares = classes.filter(c => c.fare === 0);
    if (classesMissingFares.length > 0) {
       const { data: fareData, error: fareErr } = await supabase
           .from('train_fares')
           .select('class_type, fare')
           .eq('train_no', trainNo)
           .eq('from_station', from)
           .eq('to_station', to);
           
       if (!fareErr && fareData && fareData.length > 0) {
           const fareMap = new Map();
           fareData.forEach((row: any) => fareMap.set(row.class_type, row.fare));
           classes = classes.map(c => {
               const dbClassType = c.quota === 'TQ' ? `TQ-${c.classType}` : c.classType;
               if (c.fare === 0 && fareMap.has(dbClassType)) {
                   return { ...c, fare: fareMap.get(dbClassType) };
               }
               return c;
           });
       }
    }

    // Fare display is hidden in UI, so no need for fake fares.


    // 2. We already did Bulk Insert above for all trains.
    // If we fetched fallbacks for this specific train, we should upsert them too.
    const fallbackCacheInserts = classes
      .filter((c: any) => c.status !== null)
      .map((c: any) => ({
         train_no: trainNo,
         from_station: from,
         to_station: to,
         journey_date: formattedDateForDB,
         class_type: c.quota === 'TQ' ? `TQ-${c.classType}` : c.classType,
         fare: c.fare || 0,
         status: c.status || 'UNKNOWN',
         updated_at: nowIso
      }));

    if (fallbackCacheInserts.length > 0) {
       await supabase.from('route_availability_cache').upsert(fallbackCacheInserts, { onConflict: 'train_no,from_station,to_station,journey_date,class_type' });
    }

    const fallbackFareInserts = classes
      .filter((c: any) => c.fare && c.fare > 0 && c.status !== null)
      .map((c: any) => ({
         train_no: trainNo,
         from_station: from,
         to_station: to,
         class_type: c.quota === 'TQ' ? `TQ-${c.classType}` : c.classType,
         fare: c.fare,
         updated_at: nowIso
      }));

    if (fallbackFareInserts.length > 0) {
       await supabase.from('train_fares').upsert(fallbackFareInserts, { onConflict: 'train_no,from_station,to_station,class_type' });
    }

    // 4. Parse and Insert ML Tracking Data into `wl_tracking_history` table
    const trackingInserts = classes
      .filter((c: any) => c.status !== null) 
      .map((c: any) => {
         const rawStatus = c.status || '';
         let wlType = null;
         let initialNo = null;
         let currentNo = null;
         let statusType = 'UNKNOWN';
         let quota = c.quota || 'GN'; 

         if (rawStatus.includes('WL') && rawStatus.includes('/')) {
            statusType = 'WL';
            const parts = rawStatus.split('/');
            if (parts.length === 2) {
               const firstMatch = parts[0].trim().match(/^([A-Z]+WL)\s*(\d+)$/i);
               if (firstMatch) {
                  wlType = firstMatch[1].toUpperCase();
                  initialNo = parseInt(firstMatch[2]);
               } else if (parts[0].includes('WL')) {
                  wlType = 'GNWL'; 
                  const num = parts[0].replace(/[^0-9]/g, '');
                  if (num) initialNo = parseInt(num);
               }

               const secondMatch = parts[1].trim().match(/^WL\s*(\d+)$/i);
               if (secondMatch) {
                  currentNo = parseInt(secondMatch[1]);
               } else {
                  const num = parts[1].replace(/[^0-9]/g, '');
                  if (num) currentNo = parseInt(num);
               }
            }
         } else if (rawStatus.toUpperCase().includes('AVL') || rawStatus.toUpperCase().includes('AVAILABLE')) {
            statusType = 'AVAILABLE';
            const num = rawStatus.replace(/[^0-9]/g, '');
            if (num) currentNo = parseInt(num);
         } else if (rawStatus.toUpperCase().includes('RAC')) {
            statusType = 'RAC';
            const num = rawStatus.replace(/[^0-9]/g, '');
            if (num) currentNo = parseInt(num);
         } else if (rawStatus.toUpperCase().includes('REGRET')) {
            statusType = 'REGRET';
         }

         const journeyDateObj = new Date(formattedDateForDB);
         const trackingDateObj = new Date();
         const diffTime = Math.abs(journeyDateObj.getTime() - trackingDateObj.getTime());
         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

         return {
            train_no: trainNo,
            from_station: from,
            to_station: to,
            journey_date: formattedDateForDB,
            class_type: c.classType,
            quota: quota,
            wl_type: wlType,
            raw_status: rawStatus,
            status_type: statusType,
            initial_number: initialNo,
            current_number: currentNo,
            days_to_journey: diffDays
         };
      });

    if (trackingInserts.length > 0) {
       await supabase.from('wl_tracking_history').insert(trackingInserts);
    }

    // Attach updated_at to classes so frontend knows it's fresh
    const finalClasses = classes.map((c: any) => ({...c, updatedAt: nowIso}));

    return NextResponse.json({ 
        success: true, 
        data: finalClasses, 
        originCode: trainData?.trainOriginStationCode || null,
        originName: trainData?.trainOriginStationName || null,
        updatedAt: nowIso,
        bulkData: bulkDataMap
    });

  } catch (error) {
    console.error('Fares fetch/save error:', error);
    return NextResponse.json({ error: 'Failed to fetch and track availability' }, { status: 500 });
  }
}
