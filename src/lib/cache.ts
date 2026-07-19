// ============================================================
// CACHE LAYER — API calls को Supabase में cache करो
// Free plan = 10 requests/month, इसलिए caching critical है
// Cache TTL: Train search = 6 hours, Availability = 30 mins
// ============================================================

import { createClient } from '@/lib/supabase/server';

const TRAIN_SEARCH_TTL_HOURS = 6;
const AVAILABILITY_TTL_MINS = 30;

// ── Cache train search results ────────────────────────────────
export async function getCachedTrainSearch(from: string, to: string, date?: string) {
  const supabase = await createClient();
  const cacheKey = date ? `${from}-${to}-${date}` : `weekly-${from}-${to}`;
  const expiresAt = new Date(Date.now() - TRAIN_SEARCH_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('api_cache')
    .select('response_data, cached_at')
    .eq('cache_key', cacheKey)
    .eq('cache_type', 'train_search')
    .gte('cached_at', expiresAt)
    .single();

  return data?.response_data ?? null;
}

export async function setCachedTrainSearch(from: string, to: string, date: string | undefined, responseData: unknown) {
  const supabase = await createClient();
  const cacheKey = date ? `${from}-${to}-${date}` : `weekly-${from}-${to}`;

  await supabase.from('api_cache').upsert({
    cache_key: cacheKey,
    cache_type: 'train_search',
    response_data: responseData,
    cached_at: new Date().toISOString(),
  }, { onConflict: 'cache_key,cache_type' });
}

// ── Cache availability results ────────────────────────────────
export async function getCachedAvailability(trainNo: string, from: string, to: string, cls: string, date: string) {
  const supabase = await createClient();
  const cacheKey = `${trainNo}-${from}-${to}-${cls}-${date}`;
  const expiresAt = new Date(Date.now() - AVAILABILITY_TTL_MINS * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('api_cache')
    .select('response_data, cached_at')
    .eq('cache_key', cacheKey)
    .eq('cache_type', 'availability')
    .gte('cached_at', expiresAt)
    .single();

  return data?.response_data ?? null;
}

export async function setCachedAvailability(trainNo: string, from: string, to: string, cls: string, date: string, responseData: unknown) {
  const supabase = await createClient();
  const cacheKey = `${trainNo}-${from}-${to}-${cls}-${date}`;

  await supabase.from('api_cache').upsert({
    cache_key: cacheKey,
    cache_type: 'availability',
    response_data: responseData,
    cached_at: new Date().toISOString(),
  }, { onConflict: 'cache_key,cache_type' });
}
