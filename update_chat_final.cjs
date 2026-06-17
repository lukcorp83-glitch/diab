const fs = require('fs');

const extraEN = {
  "auto.witam_jestem_twoim_asystentem": "Hello, I am your assistant.",
  "auto.analiza_tir": "TIR Analysis",
  "auto.trendy_glikemii": "Glycemic Trends",
  "auto.odczyty_nocne": "Night Readings",
  "auto.model_bazalny": "Basal Model",
  "auto.cele_glikemiczne_ptd": "Glycemic Goals (PTD Recommendations)",
  "auto.hipoglikemia_niedocukrzenie": "Hypoglycemia (low blood sugar)",
  "auto.hiperglikemia_kwasica": "Hyperglycemia and Ketoacidosis",
  "auto.hba1c": "Glycated Hemoglobin (HbA1c)",
  "auto.zjawisko_brzasku": "Dawn Phenomenon (Morning Spikes)",
  "auto.glukagon_zastrzyk": "Glucagon (Rescue Injection)",
  "auto.alkohol_a_cukrzyca": "Alcohol and Diabetes",
  "auto.przechowywanie_insuliny": "Insulin Storage",
  "auto.czym_jest_gliko_czat": "What is Gliko Chat?",
  "auto.skad_wziac_klucz_gemini": "Where to get Gemini API key?",
  "auto.czy_dziala_bez_internetu": "Does the app work without internet?",
  "auto.jak_wejsc_w_ukryte_ustawienia": "How to access hidden profile settings?",
  "auto.skad_pobierane_dane_zywnosc": "Where is the food data from?"
};

const extraPL = {
  "auto.witam_jestem_twoim_asystentem": "Witam, jestem Twoim asystentem.",
  "auto.analiza_tir": "Analiza TIR",
  "auto.trendy_glikemii": "Trendy Glikemii",
  "auto.odczyty_nocne": "Odczyty Nocne",
  "auto.model_bazalny": "Model Bazalny",
  "auto.cele_glikemiczne_ptd": "Cele Glikemiczne (rekomendacje PTD)",
  "auto.hipoglikemia_niedocukrzenie": "Hipoglikemia (niedocukrzenie)",
  "auto.hiperglikemia_kwasica": "Hiperglikemia i Kwasica Ketonowa",
  "auto.hba1c": "Hemoglobina Glikowana (HbA1c)",
  "auto.zjawisko_brzasku": "Zjawisko Brzasku (Skoki rano)",
  "auto.glukagon_zastrzyk": "Glukagon (Zastrzyk ratunkowy)",
  "auto.alkohol_a_cukrzyca": "Alkohol a Cukrzyca",
  "auto.przechowywanie_insuliny": "Przechowywanie Insuliny",
  "auto.czym_jest_gliko_czat": "Czym jest Gliko Czat?",
  "auto.skad_wziac_klucz_gemini": "Skąd mam wziąć klucz Gemini API?",
  "auto.czy_dziala_bez_internetu": "Czy aplikacja działa bez internetu?",
  "auto.jak_wejsc_w_ukryte_ustawienia": "Jak wejść w ukryte ustawienia profilu?",
  "auto.skad_pobierane_dane_zywnosc": "Skąd pobierane są dane o żywności?"
};

let en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
Object.assign(en, extraEN);
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));

let pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));
Object.assign(pl, extraPL);
fs.writeFileSync('src/locales/pl/translation.json', JSON.stringify(pl, null, 2));
