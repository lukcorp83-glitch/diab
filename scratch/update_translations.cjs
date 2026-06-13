const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/locales/en/translation.json');
const plPath = path.join(__dirname, '../src/locales/pl/translation.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const plData = JSON.parse(fs.readFileSync(plPath, 'utf8'));

// New MEAL section
const mealEn = {
  alert_fried: "Warning: Frying adds ~10g fat/100g. Lowers GI, but spikes Kcal and FPU.",
  alert_boiled: "Boiling raises GI (faster absorption).",
  alert_baked: "Baking increases the meal's Glycemic Index.",
  alert_blended: "Blending makes digestion easier and raises GI.",
  diet_alert_keto_carbs: "Over 20g carbs, kicking out of ketosis!",
  diet_alert_keto_success: "Great macros for Keto diet!",
  diet_alert_plate_carbs: "Too many carbs compared to the rest of the plate.",
  diet_alert_plate_protein: "Not enough protein per serving.",
  glikosense_diet: "GlikoSense: Your Diet",
  meal_balance: "Meal Balance (Energy %)",
  calories_from_macros: "Calories from macros",
  exchanges_ww: "Carb Exchanges (CE)",
  exchanges_wbt: "Fat/Protein Exchanges (FPE)",
  carbohydrates: "Carbohydrates",
  protein: "Protein",
  fats: "Fats",
  glycemic_load_abbr: "GL",
  time_of_eating: "Time of eating:",
  add_to_diary: "Add to Diary",
  ai_analysis_title: "AI Analysis",
  save_as_template: "Save as template (favorite)",
  custom_meal: "Custom meal",
  go_to_calculator: "Go to Calculator",
  absorption_profile: "Meal absorption profile",
  absorption_profile_desc: "Expected energy release rate",
  absorption_end: "End of absorption",
  unit: "units",
  absorption_profile_tooltip: "Absorption Profile",
  chart_disclaimer: "*Chart shows dynamic metabolic curve based on GI and FPE.",
  camera_no_access: "No camera access",
  camera_loading: "Loading..."
};

const mealPl = {
  alert_fried: "Uwaga: Smażenie automatycznie dodaje ~10g tłuszczu na 100g. Obniża IG, ale podbija WBT i Kcal.",
  alert_boiled: "Gotowanie może mocno podnieść IG węglowodanów.",
  alert_baked: "Pieczenie podnosi Indeks Glikemiczny potrawy.",
  alert_blended: "Rozdrabnianie (blendowanie) ułatwia trawienie i podnosi IG.",
  diet_alert_keto_carbs: "Posiłek dostarczy ponad 20g węgl., co mocno utrudnia pobyt w ketozie (Keto)!",
  diet_alert_keto_success: "Świetny stosunek makro dla diety Keto!",
  diet_alert_plate_carbs: "Zbyt duża przewaga węglowodanów względem talerza.",
  diet_alert_plate_protein: "Odrobinę za mało białka w porcji.",
  glikosense_diet: "GlikoSense: Twoja Dieta",
  meal_balance: "Balans Posiłku (Energia %)",
  calories_from_macros: "Kalorie z makroskładników",
  exchanges_ww: "Wymienniki WW",
  exchanges_wbt: "Wymienniki WBT",
  carbohydrates: "Węglowodany",
  protein: "Białko",
  fats: "Tłuszcze",
  glycemic_load_abbr: "Ładunek Gl.",
  time_of_eating: "Czas zjedzenia:",
  add_to_diary: "Dodaj do Dziennika",
  ai_analysis_title: "Analiza AI",
  save_as_template: "Zapisz jako szablon (ulubiony)",
  custom_meal: "Własny posiłek",
  go_to_calculator: "Przejdź do Kalkulatora",
  absorption_profile: "Profil wchłaniania posiłku",
  absorption_profile_desc: "Planowane tempo uwalniania się energii ze składników",
  absorption_end: "Koniec wchłaniania",
  unit: "jedn.",
  absorption_profile_tooltip: "Profil wchłaniania",
  chart_disclaimer: "*Wykres przedstawia dynamiczną krzywą metaboliczną na podstawie IG oraz WBT.",
  camera_no_access: "Brak dostępu do aparatu",
  camera_loading: "Ładowanie..."
};

// New GEMINI section
const geminiEn = {
  proxy_limit_error_global: "AI modules (GlikoSense, Assistant) offline. Go to: Profile -> Advanced -> Own API Key. The free server reached Google's limits.",
  proxy_limit_error_chat: "Server down or free limit reached! ✨ Go to Profile -> Advanced and enter your API Key! ✨",
  belly_confused: "Oops, my tummy is confused! Try again! 🐾",
  fell_asleep: "Sorry, I fell asleep for a moment... Can you repeat? ✨",
  proxy_limit_error_assistant: "Server down or free limit reached. Enter your own API key in Profile.",
  response_generation_failed: "Failed to generate response.",
  ai_communication_error: "AI communication error. Check connection or API key."
};

const geminiPl = {
  proxy_limit_error_global: "Aby przywrócić działanie modułów Sztucznej Inteligencji (GlikoSense, Asystent), przejdź do: Mój Profil -> Opcje Zaawansowane -> Własny klucz API. Pobierz darmowy klucz Gemini ze strony aistudio.google.com i wprowadź go w aplikacji. Jest to konieczne, gdyż darmowy ogólnodostępny serwer osiągnął limity zapytań Google.",
  proxy_limit_error_chat: "Serwer padnął lub jego darmowy limit się wyczerpał! ✨ Przejdź do Mój Profil -> Ustawienia Cukrzycowe -> Opcje Zaawansowane i wprowadź swój własny (darmowy) Klucz Gemini API! ✨",
  belly_confused: "Ojej, coś mi się pomieszało w brzuszku! Spróbuj jeszcze raz! 🐾",
  fell_asleep: "Przepraszam, chyba na chwilę zasnąłem... Możesz powtórzyć? ✨",
  proxy_limit_error_assistant: "Serwer padnął lub jego limit się wyczerpał. Przejdź do: Mój Profil -> Ustawienia Cukrzycowe -> Opcje Zaawansowane i wprowadź swój własny Klucz Gemini API.",
  response_generation_failed: "Nie udało mi się wygenerować odpowiedzi.",
  ai_communication_error: "Wystąpił błąd podczas komunikacji z AI. Sprawdź swoje połączenie lub klucz API."
};

enData.meal = mealEn;
plData.meal = mealPl;
enData.gemini = geminiEn;
plData.gemini = geminiPl;

// Update PROFILE
const profileEnUpdate = {
  therapy_key_params: "Key Therapy Parameters",
  sensitivity_diet: "Sensitivity & Diet",
  target_ranges: "Target Ranges",
  dia_label: "Insulin Duration (DIA)",
  notif_enable_hint: "Enable notifications above to configure alert types.",
  smart_rules: "GlikoSense Smart Rules",
  language: "Language"
};

const profilePlUpdate = {
  therapy_key_params: "Kluczowe parametry terapii",
  sensitivity_diet: "Czułość & Dieta",
  target_ranges: "Zakresy Docelowe",
  dia_label: "Czas Insuliny (DIA)",
  notif_enable_hint: "Włącz powiadomienia powyżej, aby skonfigurować rodzaje alertów.",
  smart_rules: "Inteligentne reguły GlikoSense",
  language: "Język / Language"
};

enData.profile = { ...enData.profile, ...profileEnUpdate };
plData.profile = { ...plData.profile, ...profilePlUpdate };

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
fs.writeFileSync(plPath, JSON.stringify(plData, null, 2));
console.log("Translations JSON successfully updated!");
