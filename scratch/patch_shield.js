const fs = require('fs');

const routes = [
  {
    file: 'src/app/api/pnr-status/route.ts',
    importLine: "import { isValidPnr } from '@/lib/validators';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:pnr-status`, 10, 60_000)) {",
  },
  {
    file: 'src/app/api/live-status/route.ts',
    importLine: "import { isValidTrainNumber } from '@/lib/validators';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:live-status`, 30, 60_000)) {",
  },
  {
    file: 'src/app/api/fares/route.ts',
    importLine: "import { isValidTrainNumber, isValidStationCode, isValidDate } from '@/lib/validators';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:fares`, 20, 60_000)) {",
  },
  {
    file: 'src/app/api/availability/route.ts',
    importLine: "import { isValidTrainNumber, isValidStationCode, isValidDate, isValidClassType } from '@/lib/validators';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:availability`, 20, 60_000)) {",
  },
  {
    file: 'src/app/api/availabilityByDate/route.ts',
    importLine: "import { isValidTrainNumber, isValidStationCode, isValidDate } from '@/lib/validators';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:availability-by-date`, 10, 60_000)) {",
  },
  {
    file: 'src/app/api/stations/route.ts',
    importLine: "import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';",
    rateLimitLine: "  if (!checkRateLimit(`${ip}:stations`, 60, 60_000)) {",
  },
];

const shieldImport = "import { verifyApiKey } from '@/lib/shield';";
const verifyBlock = `
  // ── API Shield: Block all requests not from our app ─────────────────────
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
`;

routes.forEach(({ file, importLine, rateLimitLine }) => {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add shield import if not already present
  if (!content.includes(shieldImport)) {
    content = content.replace(importLine, importLine + '\n' + shieldImport);
  }

  // 2. Add verifyApiKey block before the rate limit check
  if (!content.includes('verifyApiKey(request)')) {
    content = content.replace(rateLimitLine, verifyBlock + '\n  ' + rateLimitLine.trim());
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Patched: ' + file);
});
