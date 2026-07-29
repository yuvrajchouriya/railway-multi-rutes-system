// In-Memory Fast Cache Layer
const inMemoryCache = new Map<string, { data: any; timestamp: number }>();
const TRAIN_SEARCH_TTL_MS = 6 * 60 * 60 * 1000;
const AVAILABILITY_TTL_MS = 30 * 60 * 1000;

export async function getCachedTrainSearch(from: string, to: string, date?: string) {
  const cacheKey = date ? `${from}-${to}-${date}` : `weekly-${from}-${to}`;
  const entry = inMemoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TRAIN_SEARCH_TTL_MS) {
    inMemoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export async function setCachedTrainSearch(from: string, to: string, date: string | undefined, responseData: unknown) {
  const cacheKey = date ? `${from}-${to}-${date}` : `weekly-${from}-${to}`;
  inMemoryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
}

export async function getCachedAvailability(trainNo: string, from: string, to: string, quota: string, date: string) {
  const cacheKey = `avail-${trainNo}-${from}-${to}-${quota}-${date}`;
  const entry = inMemoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > AVAILABILITY_TTL_MS) {
    inMemoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export async function setCachedAvailability(trainNo: string, from: string, to: string, quota: string, date: string, responseData: unknown) {
  const cacheKey = `avail-${trainNo}-${from}-${to}-${quota}-${date}`;
  inMemoryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
}
