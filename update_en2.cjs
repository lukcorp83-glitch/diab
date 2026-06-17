const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));

Object.assign(en, {
  "auto.taniec": "Dance",
  "auto.joga": "Yoga",
  "auto.marsz_spacer": "Walking",
  "auto.bieganie_kardio": "Running / Cardio",
  "auto.rower": "Cycling",
  "auto.plywanie": "Swimming",
  "auto.czesto_obniza_poziom_cukru": "Often lowers blood sugar",
  "auto.umiarkowany_dlugotrwaly_wysi": "Moderate, long-term exercise burns glucose steadily.",
  "auto.nieprzewidywalny_wplyw_za": "Unpredictable impact depending on intensity.",
  "auto.szybkie_wpisy": "Quick Entries",
  "auto.faq_pomoc": "FAQ & Help",
  "auto.faq_i_pomoc": "FAQ & Help",
  "auto.symulator_bolusa": "Bolus Simulator",
  "auto.symulator": "Simulator",
  "auto.marsz": "Walking",
  "auto.szybkie_wpisy_skroty": "Quick Entries",
  "auto.bardzo_szybko_obniza_poziom": "Very quickly lowers blood sugar",
  "auto.moze_powodowac_hipoglikemie": "Can cause delayed hypoglycemia. Prepare carbohydrates.",
  "auto.zwykle_lagodnie_obniza_poz": "Usually mildly lowers blood sugar",
  "auto.pomaga_zwiekszyc_wrazliwosc": "Helps increase insulin sensitivity over time.",
  "auto.intensywny_taniec_moze_z": "Intense dance can act like cardio.",
  "auto.opozniona_hipoglikemia_je": "Delayed hypoglycemia is very common up to 24h later.",
  "auto.czesto_zwieksza_wrazliwo": "Often increases sensitivity and lowers sugar steadily."
});

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
