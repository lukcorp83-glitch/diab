const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const pl = JSON.parse(fs.readFileSync(plPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

pl["auto.czy_wymieniasz_rowniez_zbiornicze"] = "Czy wymieniasz również zbiorniczek na insulinę?";
en["auto.czy_wymieniasz_rowniez_zbiornicze"] = "Are you also replacing the insulin reservoir?";

fs.writeFileSync(plPath, JSON.stringify(pl, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log('Translations added');
