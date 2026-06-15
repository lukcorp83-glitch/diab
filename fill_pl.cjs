const fs = require('fs');

const ext = JSON.parse(fs.readFileSync('extracted.json', 'utf8'));
const transPath = 'src/locales/pl/translation.json';
const trans = JSON.parse(fs.readFileSync(transPath, 'utf8'));

if (!trans.auto) trans.auto = {};

let count = 0;

for (const key in ext) {
  const shortKey = key.replace(/^auto\./, '');
  if (!trans.auto[shortKey]) {
    // W polskim pliku klucz jest taki sam jak polski tekst (lub po prostu zostawiamy wartość w j. polskim, którą wyciągnęliśmy z defaultValue)
    trans.auto[shortKey] = ext[key];
    count++;
  }
}

fs.writeFileSync(transPath, JSON.stringify(trans, null, 2));
console.log(`Dodano ${count} kluczy do pliku polskiego.`);
