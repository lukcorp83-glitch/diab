const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const newKeys = {
  "auto.pogoda_i_srodowisko": {
    pl: "Pogoda i Środowisko",
    en: "Weather and Environment"
  },
  "auto.wplyw_pogody_na_glikemie": {
    pl: "Często zapominamy, że temperatura, wiatr i ciśnienie potężnie wpływają na naszą wrażliwość. GlikoControl posiada wbudowane moduły pogodowe, które pobierają dane z Twojej okolicy i ostrzegają Cię przed nagłymi spadkami lub skokami cukru.",
    en: "We often forget that temperature, wind, and atmospheric pressure deeply affect our insulin sensitivity. GlikoControl features built-in weather modules that fetch data for your area and warn you against sudden glucose drops or spikes."
  }
};

function updateTranslations(path, lang) {
  let content = fs.readFileSync(path, 'utf8');
  let obj = JSON.parse(content);
  
  for (const [key, transObj] of Object.entries(newKeys)) {
    obj[key] = transObj[lang];
  }
  
  // Format with 2 spaces
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

updateTranslations(plPath, 'pl');
updateTranslations(enPath, 'en');
console.log("Weather keys added to both PL and EN!");
