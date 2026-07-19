const https = require('https');

function fetchCT(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.confirmtkt.com',
        'Referer': 'https://www.confirmtkt.com/',
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ error: e.message, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log("1. Testing main search endpoint...");
  const searchUrl = "https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=NGP&destinationStationCode=MAS&journeyDate=23-07-2026&querysource=ct-web";
  const searchRes = await fetchCT(searchUrl);
  
  if (searchRes.data && searchRes.data.trainList) {
    console.log("Keys of first train:", Object.keys(searchRes.data.trainList[0]));
    const train = searchRes.data.trainList.find(t => t.trainNumber === '12511');
    if (train) {
      console.log("Train 12511 found. Availability Cache:", train.avaiblityCache);
    } else {
      console.log("Train 12511 not found in search results.");
    }
  } else {
    console.log("Search API Failed:", searchRes);
  }

  console.log("\n2. Testing 2monthcalendar fallback...");
  const calUrl = "https://cttrainsapi.confirmtkt.com/api/v1/availability/2monthcalendar?trainNumber=12511&sourceStationCode=NGP&destinationStationCode=MAS&trainClass=SL&quota=GN&startDate=23-07-2026&querysource=ct-web";
  const calRes = await fetchCT(calUrl);
  console.log("Calendar Response keys:", Object.keys(calRes));
  if (calRes.data) {
     console.log("Calendar Data Keys:", Object.keys(calRes.data));
     if (calRes.data['23-07-2026']) {
         console.log("Calendar Data for 23-07-2026:", calRes.data['23-07-2026']);
     } else {
         console.log("No data for 23-07-2026 in calendar.");
     }
  } else {
     console.log("Calendar API Failed:", calRes);
  }
}

test();
