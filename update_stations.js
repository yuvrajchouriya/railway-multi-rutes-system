const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/datameet/railways/master/stations.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const geojson = JSON.parse(data);
            const stations = geojson.features.map(f => {
                let name = f.properties.name || '';
                // Capitalize first letter of each word
                name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                
                return {
                    code: f.properties.code,
                    name: name,
                    state: f.properties.state || 'India',
                    zone: f.properties.zone
                };
            }).filter(s => s.code && s.name && s.code !== 'JBPN'); // explicitly remove bad aliases

            // Keep unique codes (first occurrence wins)
            const unique = [];
            const seen = new Set();
            for (const s of stations) {
                if (!seen.has(s.code)) {
                    seen.add(s.code);
                    unique.push(s);
                }
            }

            // Create src/data directory if it doesn't exist
            const dir = './src/data';
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync('./src/data/stations.json', JSON.stringify(unique, null, 2));
            console.log(`Saved ${unique.length} unique stations to src/data/stations.json`);
        } catch (e) {
            console.error('Error parsing JSON', e);
        }
    });
}).on('error', (e) => {
    console.error('Error fetching data', e);
});
