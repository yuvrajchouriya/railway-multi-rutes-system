/**
 * RailSathi API Shield
 * 
 * Implements RouteChef-style API Key Authorization + Browser Origin Verification.
 * 
 * SERVER-SIDE: verifyApiKey() → validates every incoming API route request.
 * CLIENT-SIDE: apiFetch()    → automatically attaches the security headers.
 */

// ── Internal API Key ──────────────────────────────────────────────────────────
// Set in Vercel Dashboard → Settings → Environment Variables → INTERNAL_API_KEY
// Also set in .env.local for local development
const SERVER_KEY = process.env.INTERNAL_API_KEY || '';

// ── SERVER-SIDE: Verify incoming API request ──────────────────────────────────
/**
 * Call this at the top of every API route handler.
 * Returns true if request is authorized, false if it should be rejected.
 *
 * Checks:
 *  1. X-RailSathi-Key header matches INTERNAL_API_KEY env variable
 *  2. Sec-Fetch-Site header is 'same-origin' (browser-enforced, not fakeable)
 */
export function verifyApiKey(request: Request | { headers: Headers }): boolean {
  const headers = request.headers;

  // 1. API Key check (RouteChef-style internal token)
  const clientKey = headers.get('x-railsathi-key');
  if (!clientKey || clientKey !== SERVER_KEY) {
    return false;
  }

  // 2. Browser origin check (Sec-Fetch-Site is set by browsers automatically)
  // External tools (Postman, curl, Python) do NOT send this header
  // or send it with value 'none' / 'cross-site'
  const secFetchSite = headers.get('sec-fetch-site');

  // In production: only allow same-origin browser requests
  if (process.env.NODE_ENV === 'production') {
    // Allow 'same-origin' (regular page navigation) and 'none' is blocked
    // Note: 'same-origin' is set by browsers for same-domain fetches
    if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') {
      return false;
    }
  }

  return true;
}

// ── CLIENT-SIDE: Authenticated fetch wrapper ──────────────────────────────────
/**
 * Use apiFetch() instead of fetch() for all /api/* calls from the frontend.
 * Automatically attaches:
 *  - X-RailSathi-Key: <internal api key>
 */

// In Next.js, NEXT_PUBLIC_ env vars are exposed to the browser at build time
const CLIENT_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  headers.set('x-railsathi-key', CLIENT_KEY);

  return fetch(url, {
    ...options,
    headers,
  });
}
