const fs = require('fs');

const patches = [
  // LiveTrainModal.tsx
  {
    file: 'src/components/LiveTrainModal.tsx',
    importAdd: "import { apiFetch } from '@/lib/shield';",
    importAfter: "import { Station } from '@/types/railway';",
    replacements: [
      { from: "const res = await fetch(`/api/live-status?trainNo=${trainNumber}`);", to: "const res = await apiFetch(`/api/live-status?trainNo=${trainNumber}`);" }
    ]
  },
  // page.tsx
  {
    file: 'src/app/page.tsx',
    importAdd: "import { apiFetch } from '@/lib/shield';",
    importAfter: "import PNRSearchCard from '@/components/PNRSearchCard';",
    replacements: [
      { from: "const directRes = await fetch(`/api/search?from=${from}&to=${to}&date=${date}&type=direct`);", to: "const directRes = await apiFetch(`/api/search?from=${from}&to=${to}&date=${date}&type=direct`);" },
      { from: "fetch(`/api/search?from=${from}&to=${to}&date=${date}&type=connecting`)", to: "apiFetch(`/api/search?from=${from}&to=${to}&date=${date}&type=connecting`)" }
    ]
  },
  // ResultsSection.tsx
  {
    file: 'src/components/ResultsSection.tsx',
    importAdd: "import { apiFetch } from '@/lib/shield';",
    importAfter: "import { Route, RouteTag } from '@/types/railway';",
    replacements: [
      { from: "const res = await fetch(`/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}`);", to: "const res = await apiFetch(`/api/fares?trainNo=${leg.trainNumber}&from=${leg.fromStation.code}&to=${leg.toStation.code}&date=${apiDate}`);" }
    ]
  },
  // PNRSearchCard.tsx
  {
    file: 'src/components/PNRSearchCard.tsx',
    importAdd: "import { apiFetch } from '@/lib/shield';",
    importAfter: "'use client';",
    replacements: [
      { from: "? `/api/pnr-status?pnr=${clean}&demo=true`", to: "? `/api/pnr-status?pnr=${clean}&demo=true` // shielded below" },
    ]
  },
  // StationInput.tsx
  {
    file: 'src/components/StationInput.tsx',
    importAdd: "import { apiFetch } from '@/lib/shield';",
    importAfter: "import { Station } from '@/types/railway';",
    replacements: [
      { from: "const res = await fetch(`/api/stations?q=${encodeURIComponent(query)}`);", to: "const res = await apiFetch(`/api/stations?q=${encodeURIComponent(query)}`);" }
    ]
  },
];

patches.forEach(({ file, importAdd, importAfter, replacements }) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not already present
  if (!content.includes(importAdd)) {
    content = content.replace(importAfter, importAfter + '\n' + importAdd);
  }
  
  // Apply fetch replacements
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      console.log('  replaced fetch in ' + file);
    } else {
      console.log('  ⚠️  not found in ' + file + ': ' + from.slice(0, 60));
    }
  });
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Patched: ' + file);
});
