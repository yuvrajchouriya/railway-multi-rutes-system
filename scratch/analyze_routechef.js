const https = require('https');

https.get('https://www.routechef.com/static/js/main.166a25ce.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Search for fetch requests to execute-api or headers used during fetch
    const fetchMatches = [];
    let idx = 0;
    while (true) {
      idx = data.indexOf('execute-api', idx);
      if (idx === -1) break;
      
      // Get 400 chars context before and after
      fetchMatches.push(data.slice(Math.max(0, idx - 200), Math.min(data.length, idx + 400)));
      idx += 12; // Length of execute-api
      if (fetchMatches.length > 5) break;
    }
    
    console.log('--- Fetch API Context Matches ---');
    fetchMatches.forEach((m, i) => {
      console.log(`Match ${i+1}:\n`, m, '\n');
    });
  });
});
