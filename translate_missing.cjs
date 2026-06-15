const fs = require('fs');
const translate = require('translate-google');

async function run() {
  const ext = JSON.parse(fs.readFileSync('extracted.json', 'utf8'));
  const transPath = 'src/locales/en/translation.json';
  const trans = JSON.parse(fs.readFileSync(transPath, 'utf8'));
  
  if (!trans.auto) trans.auto = {};
  
  const missing = {};
  let count = 0;
  
  // Znajdź brakujące klucze (klucz np. "auto.zapisz" -> "zapisz" w slowniku)
  for (const key in ext) {
    const shortKey = key.replace(/^auto\./, '');
    if (!trans.auto[shortKey]) {
      missing[shortKey] = ext[key];
      count++;
    }
  }

  console.log(`Znaleziono ${count} brakujących tekstów do przetłumaczenia...`);
  
  if (count === 0) {
    console.log("Wszystko przetłumaczone!");
    return;
  }

  // Podział na tablicę żeby przetłumaczyć za jednym razem (Google API ma limity na duże teksty, dzielimy na grupy po 50)
  const entries = Object.entries(missing);
  const chunkSize = 50;
  
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    console.log(`Tłumaczenie paczki ${i} - ${i + chunk.length}...`);
    
    // Zbudujmy obiekt klucz -> tekst
    const toTranslate = {};
    for (const [k, v] of chunk) {
      toTranslate[k] = v;
    }
    
    try {
      const translated = await translate(toTranslate, {to: 'en'});
      // Dodajmy do oryginału
      for (const k in translated) {
        trans.auto[k] = translated[k];
      }
      
      // Zapis co paczkę, żeby nie stracić w razie błędu
      fs.writeFileSync(transPath, JSON.stringify(trans, null, 2));
      
      // Czekamy chwilę by nie dostać bana na darmowym API
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error("Błąd tłumaczenia API!", e.message);
    }
  }
  
  console.log("Gotowe! Plik translation.json zaktualizowany.");
}

run();
