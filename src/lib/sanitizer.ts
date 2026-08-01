export function sanitizeResponse(data: any): any {
  if (typeof data === 'string') {
    return data
      .replace(/confirmtkt/gi, 'railsathi')
      .replace(/\bct\b/gi, 'rs')
      .replace(/avaiblityCache/gi, 'availabilityData');
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }

  if (data !== null && typeof data === 'object') {
    const sanitizedObj: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Sanitize keys (e.g. if key is "confirmTktId")
        const sanitizedKey = key.replace(/confirmtkt/gi, 'railsathi');
        sanitizedObj[sanitizedKey] = sanitizeResponse(data[key]);
      }
    }
    return sanitizedObj;
  }

  return data;
}
