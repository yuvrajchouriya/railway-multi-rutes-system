import { NextRequest, NextResponse } from 'next/server';
import stations from '../../../data/stations.json';
import Fuse from 'fuse.js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { verifyApiKey } from '@/lib/shield';

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

function capitalize(str: string) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ALL_STATIONS = stations.filter(s => s.code !== 'JBPN').map(s => {
  let cleanName = s.name.replace(/^\d+[\s]+/, '');
  cleanName = cleanName.replace(/\(cr\)|\(se\)|\(nr\)|\(wr\)|\(sr\)|\(er\)|\(ncr\)|\(nwr\)|\(secr\)|\(swr\)|\(wcr\)|\(ecr\)|\(nfr\)|\(scr\)|\(ecor\)/gi, '').trim();
  return {
    code: s.code,
    name: capitalize(cleanName),
    state: s.state || 'India',
    is_junction: cleanName.toUpperCase().includes('JN') || cleanName.toUpperCase().includes('JUNCTION') || cleanName.toUpperCase().includes('CENTRAL')
  };
});

const VIRTUAL_CITY_GROUPS = [
  { code: 'DELHI_ALL', name: 'Delhi (All Stations)', state: 'Delhi', is_junction: true, searchTerms: ['delhi', 'new delhi', 'ndls', 'dli'] },
  { code: 'MUMBAI_ALL', name: 'Mumbai (All Stations)', state: 'Maharashtra', is_junction: true, searchTerms: ['mumbai', 'bombay'] },
  { code: 'KOLKATA_ALL', name: 'Kolkata (All Stations)', state: 'West Bengal', is_junction: true, searchTerms: ['kolkata', 'calcutta'] },
  { code: 'CHENNAI_ALL', name: 'Chennai (All Stations)', state: 'Tamil Nadu', is_junction: true, searchTerms: ['chennai', 'madras'] },
  { code: 'BANGALORE_ALL', name: 'Bangalore (All Stations)', state: 'Karnataka', is_junction: true, searchTerms: ['bangalore', 'bengaluru'] },
  { code: 'HYDERABAD_ALL', name: 'Hyderabad (All Stations)', state: 'Telangana', is_junction: true, searchTerms: ['hyderabad', 'secunderabad'] }
];

export async function GET(request: NextRequest) {
  // ── Rate Limit: 60 autocomplete requests per minute per IP ────────
  const ip = getClientIp(request);

  // ── API Shield: Block all requests not from our app ─────────────────────
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(`${ip}:stations`, 60, 60_000)) {
    return NextResponse.json([], { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rawQ = searchParams.get('q') || '';

  // ── Input Validation ─────────────────────────────────────────────
  // Max 50 chars, strip any HTML/script tags
  const sanitizedQ = rawQ.trim().slice(0, 50).replace(/<[^>]*>/g, '');
  const q = sanitizedQ.toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const results: any[] = [];
  const seenCodes = new Set<string>();

  function add(stn: any) {
    if (!stn || seenCodes.has(stn.code)) return;
    seenCodes.add(stn.code);
    results.push(stn);
  }

  // 1. Virtual City Group match
  VIRTUAL_CITY_GROUPS.forEach(vcg => {
    if (vcg.searchTerms.some(term => term === q || term.startsWith(q)) || vcg.code.toLowerCase() === q) {
      add(vcg);
    }
  });

  // 2. Exact Code Match
  ALL_STATIONS.filter(s => s.code.toLowerCase() === q).forEach(add);

  // 3. Prefix Code Match
  ALL_STATIONS.filter(s => s.code.toLowerCase().startsWith(q)).forEach(add);

  // 4. Semantic Aliases
  const normQ = normalize(q);
  for (const [alias, codes] of Object.entries(STATION_ALIASES)) {
    if (normalize(alias) === normQ || normalize(alias).includes(normQ)) {
      codes.forEach(c => {
        const stn = ALL_STATIONS.find(s => s.code === c);
        if (stn) add(stn);
      });
    }
  }

  // 5. Name Starts With Query (Prioritize Junctions)
  const nameStarts = ALL_STATIONS.filter(s => s.name.toLowerCase().startsWith(q));
  nameStarts.filter(s => s.is_junction).forEach(add);
  nameStarts.forEach(add);

  // 6. Name Contains Query (Prioritize Junctions)
  const nameContains = ALL_STATIONS.filter(s => s.name.toLowerCase().includes(q));
  nameContains.filter(s => s.is_junction).forEach(add);
  nameContains.forEach(add);

  // 7. Fuse.js Fuzzy Search for typos
  if (results.length < 10) {
    const fuse = new Fuse(ALL_STATIONS, {
      keys: ['name', 'code'],
      threshold: 0.3,
    });
    const fuseResults = fuse.search(q);
    fuseResults.slice(0, 10).forEach(res => add(res.item));
  }

  return NextResponse.json(results.slice(0, 10));
}
