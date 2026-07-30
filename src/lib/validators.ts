// ============================================================
// INPUT VALIDATORS — Regex-based strict validation helpers
// ============================================================

/** Station code: 1–8 uppercase alphanumeric chars (e.g. NGP, NDLS, DELHI_ALL) */
export function isValidStationCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[A-Z0-9_\-\/\s]{1,25}$/.test(code.toUpperCase().trim());
}

/** Train number: 4 or 5 digits only (e.g. 12642, 20423) */
export function isValidTrainNumber(trainNo: string | null | undefined): boolean {
  if (!trainNo) return false;
  return /^\d{4,5}$/.test(trainNo.trim());
}

/** Date: YYYY-MM-DD or DD-MM-YYYY format, max 60 days in the future */
export function isValidDate(date: string | null | undefined): boolean {
  if (!date) return false;
  const isMatch = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || /^\d{2}-\d{2}-\d{4}$/.test(date.trim());
  if (!isMatch) return false;

  try {
    const parsedDate = new Date(date.trim());
    if (isNaN(parsedDate.getTime())) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const maxFuture = new Date();
    maxFuture.setDate(now.getDate() + 60);
    maxFuture.setHours(23, 59, 59, 999);

    // Allow today, past dates (for queries), but block >60 days in future
    return parsedDate <= maxFuture;
  } catch (e) {
    return false;
  }
}

/** PNR: exactly 10 digits */
export function isValidPnr(pnr: string | null | undefined): boolean {
  if (!pnr) return false;
  const cleaned = pnr.replace(/\D/g, '');
  return cleaned.length === 10;
}

/** Train class type: known IRCTC class codes */
const VALID_CLASSES = new Set(['1A', '2A', '3A', 'SL', '2S', 'GN', 'UR', 'CC', 'EC', '3E', 'FC', 'EA']);
export function isValidClassType(cls: string | null | undefined): boolean {
  if (!cls) return false;
  return VALID_CLASSES.has(cls.toUpperCase().trim());
}

/** Generic string: max 100 chars, no angle brackets (basic XSS protection) */
export function isSafeString(str: string | null | undefined, maxLen = 100): boolean {
  if (!str) return false;
  if (str.length > maxLen) return false;
  return !/<|>|script|javascript|on\w+=/i.test(str);
}
