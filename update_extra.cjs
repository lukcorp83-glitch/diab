const fs = require('fs');

const extra = {
  "auto.stabilizacja_spadek": "Stabilization / Slight drop",
  "auto.idealny_sport_przy_wahaniach": "Ideal sport for mild glycemic fluctuations.",
  "auto.delikatny_spadek": "Gentle drop",
  "auto.spalanie_cardio": "Cardio burn",
  "auto.bolusa": "Bolus",
  "auto.samouczek": "Tutorial",
  "auto.skroty": "Shortcuts",
  "auto.skróty": "Shortcuts"
};

const extra_pl = {
  "auto.stabilizacja_spadek": "Stabilizacja / Lekki spadek",
  "auto.idealny_sport_przy_wahaniach": "Idealny sport przy lekkich wahaniach glikemii.",
  "auto.delikatny_spadek": "Delikatny spadek",
  "auto.spalanie_cardio": "Spalanie cardio",
  "auto.bolusa": "Bolusa",
  "auto.samouczek": "Samouczek",
  "auto.skroty": "Skróty",
  "auto.skróty": "Skróty"
};

const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
Object.assign(en, extra);
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));

const pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));
Object.assign(pl, extra_pl);
fs.writeFileSync('src/locales/pl/translation.json', JSON.stringify(pl, null, 2));
