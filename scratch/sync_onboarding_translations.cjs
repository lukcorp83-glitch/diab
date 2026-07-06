const fs = require('fs');
const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const newTranslations = {
  "auto.witaj_w_ekipie_glikocontro": {
    pl: "Witaj w ekipie GlikoControl!",
    en: "Welcome to the GlikoControl team!"
  },
  "auto.to_projekt_fanowski_tworzony_z": {
    pl: "To projekt fanowski, tworzony z myślą o nas – diabetykach. Bez zbędnego patosu, po prostu potężne narzędzie, które ma ułatwić nam życie z cukrzycą.",
    en: "This is a fan project created with us diabetics in mind. No unnecessary pathos, just a powerful tool designed to make living with diabetes easier."
  },
  "auto.talerz_i_kalkulacje": {
    pl: "Talerz i Kalkulacje",
    en: "Meal Plate and Calculations"
  },
  "auto.zarzadzaj_posilkami_latwiej_ni": {
    pl: "Zarządzaj posiłkami łatwiej niż kiedykolwiek. Użyj Talerza Posiłków, by automatycznie zsumować węglowodany, a algorytmy wyliczą Twoją Aktywną Insulinę (IOB).",
    en: "Manage meals easier than ever. Use the Meal Plate to automatically sum up carbs, and the algorithms will calculate your Insulin on Board (IOB)."
  },
  "auto.glikosense_i_sztuczna_inte": {
    pl: "GlikoSense i AI",
    en: "GlikoSense and AI"
  },
  "auto.sercem_aplikacji_jest_siec_neu": {
    pl: "Sercem aplikacji jest sieć neuronowa LSTM, asystent GlikoChat oraz zautomatyzowane rozpoznawanie posiłków. Algorytmy uczą się Twoich trendów i dawkowania całkowicie offline!",
    en: "The heart of the app is the LSTM neural network, GlikoChat assistant, and automated meal recognition. Algorithms learn your trends and dosing completely offline!"
  },
  "auto.kalibracje_i_pogoda": {
    pl: "Kalibracje i Pogoda",
    en: "Calibrations and Weather"
  },
  "auto.jezeli_roznica_miedzy_sensorem": {
    pl: "Wpisz wynik z palca, a GlikoControl skoryguje kolejne odczyty. Dodatkowo wbudowane moduły pogody i ciśnienia ostrzegą Cię przed nagłymi spadkami cukru.",
    en: "Enter your finger-prick result, and GlikoControl will adjust subsequent readings. Built-in weather and pressure modules will also warn you of sudden glucose drops."
  },
  "auto.gliko_przyjaciel_dla_dzieciako": {
    pl: "Gliko – Wirtualny Pupil",
    en: "Gliko - Virtual Pet"
  },
  "auto.dla_najmlodszych_i_tych_starsz": {
    pl: "Dbaj o swoje cukry, a Twój wirtualny zwierzak będzie rósł, zdobywał poziomy i odblokowywał nowe, epickie przebrania w zakładce Osiągnięć.",
    en: "Take care of your sugars, and your virtual pet will grow, level up, and unlock new, epic outfits in the Achievements tab."
  },
  "auto.bezpieczenstwo_i_prywatnos": {
    pl: "Bezpieczeństwo i RODO",
    en: "Security and GDPR"
  },
  "auto.glikocontrol_nie_jest_wyrobem": {
    pl: "Twoje dane medyczne są święte i nigdy nie opuszczają Twojego urządzenia bez Twojej zgody. Pamiętaj jednak: GlikoControl NIE JEST certyfikowanym wyrobem medycznym. Aplikacja ma charakter wyłącznie informacyjny. Zawsze konsultuj zmiany terapii z lekarzem.",
    en: "Your medical data is sacred and never leaves your device without permission. Remember: GlikoControl IS NOT a certified medical device. Always consult therapy changes with your doctor."
  },
  "auto.akceptuje_polityke_prywatn": {
    pl: "Akceptuję politykę prywatności RODO oraz oświadczam, że zapoznałem się z klauzulą medyczną wykluczającą odpowiedzialność twórców aplikacji.",
    en: "I accept the GDPR privacy policy and declare that I have read the medical disclaimer excluding the liability of the app creators."
  },
  "auto.wstecz": {
    pl: "Wstecz",
    en: "Back"
  },
  "auto.zgadzam_sie": {
    pl: "Zgadzam się",
    en: "I agree"
  },
  "auto.dalej": {
    pl: "Dalej",
    en: "Next"
  }
};

const updateJson = (path, lang) => {
  let content = fs.readFileSync(path, 'utf8');
  let obj = JSON.parse(content);
  
  for (const [key, transObj] of Object.entries(newTranslations)) {
    obj[key] = transObj[lang];
  }
  
  // Format with 2 spaces to match existing style
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\\n');
};

updateJson(plPath, 'pl');
updateJson(enPath, 'en');
console.log("Translations synced!");
