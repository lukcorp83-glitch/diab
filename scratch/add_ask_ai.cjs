const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const updates = {
  "auto.zapytaj_ai": {
    pl: "Zapytaj AI",
    en: "Ask AI"
  }
};

function updateTranslations(path, lang) {
  let content = fs.readFileSync(path, 'utf8');
  let obj = JSON.parse(content);
  
  for (const [key, transObj] of Object.entries(updates)) {
    obj[key] = transObj[lang];
  }
  
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

updateTranslations(plPath, 'pl');
updateTranslations(enPath, 'en');
console.log("Ask AI translation added!");
