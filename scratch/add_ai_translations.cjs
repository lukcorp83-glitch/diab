const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const newKeys = {
  "auto.glikosense_offline": {
    pl: "GlikoSense (Offline)",
    en: "GlikoSense (Offline)"
  },
  "auto.glikosense_offline_desc": {
    pl: "Sercem aplikacji jest sieć neuronowa LSTM. Algorytmy nieustannie analizują Twoje trendy cukrów i dawkowanie całkowicie lokalnie, gwarantując najwyższe bezpieczeństwo wrażliwych danych.",
    en: "The core of the app is the LSTM neural network. Algorithms continuously analyze your glucose trends and dosing entirely locally, guaranteeing the highest security for sensitive data."
  },
  "auto.sztuczna_inteligencja_ai": {
    pl: "Sztuczna Inteligencja (AI)",
    en: "Artificial Intelligence (AI)"
  },
  "auto.ai_desc": {
    pl: "Asystent GlikoChat i zautomatyzowane raporty medyczne odciążą Cię w trudach choroby. Błyskawicznie szacuj węglowodany robiąc zdjęcie posiłku lub skanując kody kreskowe z opakowań!",
    en: "The GlikoChat assistant and automated medical reports will relieve you of the burden of the disease. Instantly estimate carbs by taking a picture of your meal or scanning barcodes from packaging!"
  }
};

function updateTranslations(path, lang) {
  let content = fs.readFileSync(path, 'utf8');
  let obj = JSON.parse(content);
  
  for (const [key, transObj] of Object.entries(newKeys)) {
    obj[key] = transObj[lang];
  }
  
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

updateTranslations(plPath, 'pl');
updateTranslations(enPath, 'en');
console.log("AI and GlikoSense keys added to both PL and EN!");
