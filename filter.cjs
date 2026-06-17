const fs = require('fs');
const missing = JSON.parse(fs.readFileSync('missing.json', 'utf8'));
let filtered = {};
for(let k in missing) {
  let v = missing[k].toLowerCase();
  if(v.includes('trening') || v.includes('sport') || v.includes('nawyk') || v.includes('przypomni') || v.includes('siłow') || v.includes('ustawie') || v.includes('api')) {
    filtered[k] = missing[k];
  }
}
fs.writeFileSync('missing_filtered.json', JSON.stringify(filtered, null, 2));
