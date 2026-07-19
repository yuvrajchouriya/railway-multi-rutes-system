const from = 'BPL';
const to = 'INDB';
const date = '20-07-2026';
const url = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&journeyDate=${date}&querysource=ct-web`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    const trains = data.data.trainList || data.data.trains;
    const train = trains && trains.find(t => t.trainNumber === '18234');
    if (train) {
      console.log(JSON.stringify(train.availabilityCache, null, 2));
    }
  })
  .catch(console.error);
