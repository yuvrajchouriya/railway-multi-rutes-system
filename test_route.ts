import { searchTrainsBetweenStations } from './src/lib/railway-client';
searchTrainsBetweenStations('NGP', 'CAPE', '2026-09-07').then(res => console.log(JSON.stringify(res, null, 2)));
