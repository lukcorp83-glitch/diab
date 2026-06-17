const fs = require('fs');
let en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
en['auto.efekt_brzasku_somogyi'] = 'Dawn Phenomenon and Somogyi Effect';
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));

let pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));
pl['auto.efekt_brzasku_somogyi'] = 'Efekt Brzasku i Zjawisko Somogyi';
fs.writeFileSync('src/locales/pl/translation.json', JSON.stringify(pl, null, 2));
