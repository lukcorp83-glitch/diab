const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const updates = {
  "auto.glikosense_offline": {
    pl: "Sieć Neuronowa GlikoSense",
    en: "GlikoSense Neural Network"
  },
  "auto.glikosense_offline_desc": {
    pl: "Obliczenia i nauka sieci LSTM odbywają się bezpośrednio na procesorze Twojego telefonu. Wyuczone wzorce są następnie bezpiecznie synchronizowane z chmurą, dzięki czemu nigdy nie stracisz swojego osobistego asystenta.",
    en: "LSTM network calculations and learning occur directly on your phone's processor. The learned patterns are then securely synchronized with the cloud, so you never lose your personal assistant."
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
console.log("Translations updated for accurate GlikoSense representation!");
