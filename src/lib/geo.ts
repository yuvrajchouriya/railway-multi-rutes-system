import stationsGeo from '@/data/stations_geo.json';

// stations_geo.json is a FeatureCollection of Points
// Feature looks like: { "geometry": { "coordinates": [lng, lat] }, "properties": { "code": "NDLS" } }

const stationMap = new Map<string, { lat: number, lng: number }>();

if (stationsGeo && Array.isArray((stationsGeo as any).features)) {
  for (const feature of (stationsGeo as any).features) {
    if (feature.properties?.code && feature.geometry?.coordinates) {
      stationMap.set(feature.properties.code, {
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1]
      });
    }
  }
}

export function getStationCoords(code: string) {
  return stationMap.get(code);
}

// Haversine formula to calculate distance in km
export function calculateDistanceKm(code1: string, code2: string): number {
  const coord1 = stationMap.get(code1);
  const coord2 = stationMap.get(code2);

  if (!coord1 || !coord2) {
    return Infinity; // unknown distance
  }

  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  
  return Math.round(R * c);
}
