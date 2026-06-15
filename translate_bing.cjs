const fs = require('fs');
const { translate } = require('bing-translate-api');

async function run() {
  const ext = JSON.parse(fs.readFileSync('extracted.json', 'utf8'));
  const transPath = 'src/locales/en/translation.json';
  const trans = JSON.parse(fs.readFileSync(transPath, 'utf8'));
  
  if (!trans.auto) trans.auto = {};
  
  const missing = [];
  
  for (const key in ext) {
    const shortKey = key.replace(/^auto\./, '');
    if (!trans.auto[shortKey]) {
      missing.push({ key: shortKey, text: ext[key] });
    }
  }

  console.log(`Znaleziono ${missing.length} brakujących tekstów do przetłumaczenia...`);
  
  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    try {
      const res = await translate(item.text, null, 'en');
      trans.auto[item.key] = res.translation;
      console.log(`[${i+1}/${missing.length}] ${item.text} -> ${res.translation}`);
      
      if (i % 10 === 0) {
        fs.writeFileSync(transPath, JSON.stringify(trans, null, 2));
      }
      
      // Delay to avoid rate limit
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`Błąd przy: ${item.text}`, e.message);
    }
  }
  
  fs.writeFileSync(transPath, JSON.stringify(trans, null, 2));
  console.log("Wszystkie tłumaczenia zakończone sukcesem i zapisane!");
}

run();
