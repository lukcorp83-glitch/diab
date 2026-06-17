const fs = require('fs');

let missing = JSON.parse(fs.readFileSync('missing.json', 'utf8'));
let pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));

Object.assign(pl, missing);
fs.writeFileSync('src/locales/pl/translation.json', JSON.stringify(pl, null, 2));
