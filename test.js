const classes=['1A','2A','3A','3E','SL'];
Promise.all(classes.map(c=>
  fetch(`https://cttrainsapi.confirmtkt.com/api/v1/availability/2monthcalendar?trainNumber=11755&sourceStationCode=CWA&destinationStationCode=JBP&trainClass=${c}&quota=GN&startDate=18-07-2026&querysource=ct-web`)
  .then(r=>r.json())
  .then(d=>({c, data: d.data['18-07-2026']}))
)).then(results => console.log(JSON.stringify(results, null, 2)));
