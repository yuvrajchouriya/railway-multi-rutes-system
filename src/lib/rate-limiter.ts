// ============================================================
// RATE LIMITER — In-Memory Sliding Window per IP
// ============================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key (e.g. IP + route)
 * @param key     Unique identifier (e.g. `${ip}:pnr-status`)
 * @param limit   Max requests allowed per window
 * @param windowMs Window size in milliseconds (default 60s)
 * @returns true if allowed, false if rate limit exceeded
 */
export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Get client IP from Next.js request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
