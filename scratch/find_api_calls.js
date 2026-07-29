const fs = require('fs');
const files = [
  'src/components/LiveTrainModal.tsx',
  'src/app/page.tsx',
  'src/components/ResultsSection.tsx',
  'src/components/SearchForm.tsx',
  'src/components/PNRSearchCard.tsx',
];

files.forEach(f => {
  try {
    const data = fs.readFileSync(f, 'utf8');
    const lines = data.split('\n');
    console.log(f + ':');
    lines.forEach((line, i) => {
      if (line.includes('/api/')) {
        console.log('  L' + (i+1) + ': ' + line.trim());
      }
    });
  } catch(e) {
    console.log('Not found: ' + f);
  }
});
