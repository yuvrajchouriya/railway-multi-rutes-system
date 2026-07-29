// Major Indian Railways River Bridges & Scenic Mountain Tunnels Database
export interface Landmark {
  id: string;
  name: string;
  type: 'bridge' | 'tunnel' | 'ghat';
  nearStationCode: string;
  nearStationName: string;
  offsetKm: number; // Offset from near station
  description: string;
  icon: string;
}

export const RAILWAY_LANDMARKS: Landmark[] = [
  {
    id: 'narmada-bridge',
    name: 'Narmada River Bridge',
    type: 'bridge',
    nearStationCode: 'NDPM',
    nearStationName: 'Narmadapuram (Hoshangabad)',
    offsetKm: 1.5,
    description: 'Iconic historic railway bridge over sacred Narmada River',
    icon: '🌉'
  },
  {
    id: 'satpura-ghat',
    name: 'Satpura Mountain Ghat & Tunnel',
    type: 'tunnel',
    nearStationCode: 'CWA',
    nearStationName: 'Chhindwara Junction',
    offsetKm: 4.0,
    description: 'Scenic Satpura mountain range curve and tunnel section',
    icon: '🏔️'
  },
  {
    id: 'yamuna-bridge',
    name: 'Yamuna River Bridge',
    type: 'bridge',
    nearStationCode: 'NZM',
    nearStationName: 'Hazrat Nizamuddin',
    offsetKm: 2.0,
    description: 'Historic railway bridge spanning Yamuna River into Delhi',
    icon: '🌉'
  },
  {
    id: 'ganga-bridge',
    name: 'Ganga River Rail Bridge',
    type: 'bridge',
    nearStationCode: 'CNB',
    nearStationName: 'Kanpur Central',
    offsetKm: 3.5,
    description: 'Massive multi-span railway bridge across holy Ganga River',
    icon: '🌉'
  },
  {
    id: 'godavari-arch',
    name: 'Godavari Arch Bridge',
    type: 'bridge',
    nearStationCode: 'RJY',
    nearStationName: 'Rajahmundry',
    offsetKm: 1.8,
    description: 'Third longest road-cum-rail arch bridge in Asia',
    icon: '🌉'
  },
  {
    id: 'krishna-bridge',
    name: 'Krishna River Bridge',
    type: 'bridge',
    nearStationCode: 'BZA',
    nearStationName: 'Vijayawada Junction',
    offsetKm: 2.2,
    description: 'Strategic South Central Railway bridge over Krishna River',
    icon: '🌉'
  },
  {
    id: 'tapti-bridge',
    name: 'Tapti River Bridge',
    type: 'bridge',
    nearStationCode: 'BSL',
    nearStationName: 'Bhusaval Junction',
    offsetKm: 2.5,
    description: 'Central Railway bridge over Tapti River',
    icon: '🌉'
  },
  {
    id: 'kaveri-bridge',
    name: 'Kaveri River Bridge',
    type: 'bridge',
    nearStationCode: 'TPJ',
    nearStationName: 'Tiruchirappalli Junction',
    offsetKm: 3.0,
    description: 'Southern Railway bridge over Kaveri River',
    icon: '🌉'
  },
  {
    id: 'pamban-bridge',
    name: 'Pamban Sea Bridge',
    type: 'bridge',
    nearStationCode: 'RMD',
    nearStationName: 'Ramanathapuram',
    offsetKm: 5.0,
    description: 'India\'s first sea bridge connecting mainland to Rameswaram',
    icon: '🌉'
  },
  {
    id: 'konkan-tunnel',
    name: 'Karbude Mountain Tunnel (6.5 km)',
    type: 'tunnel',
    nearStationCode: 'RN',
    nearStationName: 'Ratnagiri',
    offsetKm: 3.2,
    description: 'One of Asia\'s longest railway mountain tunnels on Konkan line',
    icon: '🏔️'
  }
];

export function checkLandmarkProximity(routeStations: any[], currentSeq: number) {
  if (!routeStations || routeStations.length === 0) return null;

  const currStn = routeStations.find(s => s.sequence === currentSeq) || routeStations[0];
  const currDist = currStn?.distanceKm || currStn?.distance || 0;

  for (const stn of routeStations) {
    if (stn.sequence < currentSeq) continue; // Only upcoming stations

    const landmark = RAILWAY_LANDMARKS.find(
      l => l.nearStationCode === stn.stationCode || 
           stn.stationName?.toUpperCase().includes(l.nearStationName.split(' ')[0].toUpperCase())
    );

    if (landmark) {
      const targetDist = (stn.distanceKm || stn.distance || 0) + landmark.offsetKm;
      const remainingKm = targetDist - currDist;

      if (remainingKm > 0 && remainingKm <= 5.0) {
        return {
          landmark,
          remainingKm: Math.round(remainingKm * 10) / 10,
          stationName: stn.stationName
        };
      }
    }
  }

  return null;
}
