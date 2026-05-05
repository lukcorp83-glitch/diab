const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');

async function run() {
const jar = new CookieJar();
const client = wrapper(axios.create({ jar: jar, withCredentials: true, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }));
let r1 = await client.get('https://carelink.minimed.eu/patient/sso/login?country=pl&lang=pl');
let content = r1.data.toString();
fs.writeFileSync('/tmp/auth0.html', content);
console.log("Written auth0 HTML with actual input fields");
}
run();
