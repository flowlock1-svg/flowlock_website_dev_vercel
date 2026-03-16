const fetch = require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:3000/dashboard');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Size:", text.length);
  } catch (e) {
    console.error(e);
  }
})();
