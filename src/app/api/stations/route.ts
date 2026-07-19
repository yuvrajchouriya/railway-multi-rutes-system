import { NextRequest, NextResponse } from 'next/server';
import stations from '../../../data/stations.json';
import Fuse from 'fuse.js';

const STATION_ALIASES: Record<string, string[]> = {
  'kashmir': ['SVDK', 'JAT', 'SINA'],
  'shree naagr': ['SINA'],
  'srinagar': ['SINA'],
  'banaras': ['BSB', 'BSBS'],
  'kashi': ['BSB'],
  'kanyakumari': ['CAPE'],
  'tirupati balaji': ['TPTY'],
  'pondicherry': ['PDY'],
  'bangloor': ['SBC', 'YPR'],
  'bengulru': ['SBC', 'YPR'],
  'bombay': ['CSMT', 'BCT']
};

// Helper function to capitalize names like 'CHHINDWARA JN' -> 'Chhindwara Jn'
function capitalize(str: string) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Normalize string (removes spaces, special characters, converts to lowercase)
function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Ensure unique codes and well-formatted names
const ALL_STATIONS = stations.filter(s => s.code !== 'JBPN').map(s => {
  // some station names have weird prefixes like "1 NEFS "
  let cleanName = s.name.replace(/^\d+[\s]+/, ''); // remove leading numbers if any
  // Clean up redundant tags from names
  cleanName = cleanName.replace(/\(cr\)|\(se\)|\(nr\)|\(wr\)|\(sr\)|\(er\)|\(ncr\)|\(nwr\)|\(secr\)|\(swr\)|\(wcr\)|\(ecr\)|\(nfr\)|\(scr\)|\(ecor\)/gi, '').trim();
  return {
    code: s.code,
    name: capitalize(cleanName),
    state: 'India',
    is_junction: cleanName.includes('JN') || cleanName.includes('JUNCTION') || cleanName.includes('Jn') || cleanName.includes('Junction')
  };
});

// Virtual city groups to cluster metropolitan stations
const VIRTUAL_CITY_GROUPS = [
  { code: 'DELHI_ALL', name: 'Delhi (All Stations)', state: 'Delhi', is_junction: true, searchTerms: ['delhi', 'new delhi', 'ndls', 'dli'] },
  { code: 'MUMBAI_ALL', name: 'Mumbai (All Stations)', state: 'Maharashtra', is_junction: true, searchTerms: ['mumbai', 'bombay'] },
  { code: 'KOLKATA_ALL', name: 'Kolkata (All Stations)', state: 'West Bengal', is_junction: true, searchTerms: ['kolkata', 'calcutta'] },
  { code: 'CHENNAI_ALL', name: 'Chennai (All Stations)', state: 'Tamil Nadu', is_junction: true, searchTerms: ['chennai', 'madras'] },
  { code: 'BANGALORE_ALL', name: 'Bangalore (All Stations)', state: 'Karnataka', is_junction: true, searchTerms: ['bangalore', 'bengaluru'] },
  { code: 'HYDERABAD_ALL', name: 'Hyderabad (All Stations)', state: 'Telangana', is_junction: true, searchTerms: ['hyderabad', 'secunderabad'] }
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // Exact match by code
  const exactCodeMatches = ALL_STATIONS.filter(s => s.code.toLowerCase() === q);
  
  // Prefix match by code (e.g. 'CW' -> 'CWA')
  const codeMatches = ALL_STATIONS.filter(
    s => s.code.toLowerCase().startsWith(q) && s.code.toLowerCase() !== q
  );

  // Name match (Strict)
  const nameMatches = ALL_STATIONS.filter(
    s => s.name.toLowerCase().includes(q) && s.code.toLowerCase() !== q
  );

  // Normalized Match & Fuzzy Match & Aliases
  const normQ = normalize(q);
  let fuzzyMatches: any[] = [];
  
  // 1. Check Semantic Aliases
  for (const [alias, codes] of Object.entries(STATION_ALIASES)) {
    if (normalize(alias) === normQ || normalize(alias).includes(normQ)) {
       codes.forEach(c => {
          const stn = ALL_STATIONS.find(s => s.code === c);
          if (stn) fuzzyMatches.push(stn);
       });
    }
  }

  // 2. Fuse.js Fuzzy Search for typos
  const fuse = new Fuse(ALL_STATIONS, {
    keys: ['name', 'code'],
    threshold: 0.3, // Typo tolerance
    distance: 100,
  });
  
  const fuseResults = fuse.search(q);
  fuseResults.slice(0, 15).forEach(res => {
     fuzzyMatches.push(res.item);
  });

  // Combine, deduplicate, and score
  const uniqueStations = Array.from(new Set([...exactCodeMatches, ...codeMatches, ...nameMatches, ...fuzzyMatches]));

  // Filter out non-passenger stations and then score
  const passengerStations = uniqueStations.filter(station => {
    const nameLower = station.name.toLowerCase();
    // Exclude sidings, yards, goods sheds, cabins, etc. entirely
    if (nameLower.includes('sdg') || nameLower.includes('siding') || 
        nameLower.includes('cabin') || nameLower.includes('yard') || 
        nameLower.includes('goods') || nameLower.includes('fci') ||
        nameLower.includes('warehousing') || nameLower.includes('plant') ||
        nameLower.includes('factory') || nameLower.includes('colliery') ||
        nameLower.includes('ordinance') || nameLower.includes('silo') ||
        nameLower.includes('bg') || nameLower.includes('ph') || nameLower.includes('halt') ||
        nameLower.includes('port')) {
      return false;
    }
    return true;
  });

  const scoredStations = passengerStations.map(station => {
    let score = 0;
    const nameLower = station.name.toLowerCase();
    
    // Reward junctions
    if (station.is_junction || nameLower.includes('jn') || nameLower.includes('central')) {
      score += 150; // Massively boost junctions so they always appear on top
    }

    // Reward exact matches
    if (normalize(nameLower).replace('jn', '') === normQ || normalize(nameLower).replace('central', '') === normQ) {
      score += 200;
    } else if (nameLower.startsWith(q)) {
      score += 50;
    }

    return { station, score };
  });

  // Deduplicate by exact name (keep the highest scored one)
  const uniqueByName = new Map();
  for (const s of scoredStations.sort((a, b) => b.score - a.score || a.station.name.localeCompare(b.station.name))) {
    if (!uniqueByName.has(s.station.name)) {
      uniqueByName.set(s.station.name, s.station);
    }
  }

  const results = Array.from(uniqueByName.values()).slice(0, 10);

  // Inject virtual city groups if the query matches
  const matchedVirtuals = VIRTUAL_CITY_GROUPS.filter(vcg => 
    vcg.searchTerms.some(term => term.includes(q) || term.includes(normQ)) ||
    vcg.code.toLowerCase().includes(q)
  );

  // Prepend virtuals to the results (limit 2 to avoid filling the list)
  const finalResults = [...matchedVirtuals.slice(0, 2), ...results].slice(0, 10);

  return NextResponse.json(finalResults);
}
