const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));

// Add missing keys for Training and Settings
Object.assign(en, {
  "auto.trening": "Training",
  "auto.ustawienia": "Settings",
  "auto.ustawienia_aplikacji": "App Settings",
  "auto.nawyki": "Habits",
  "auto.przypomnienia": "Reminders",
  "auto.api_i_chmura": "API & Cloud",
  "auto.silownia_trening_silowy": "Gym (Strength Training)",
  "auto.wplyw_sportu": "Impact of sports",
  "auto.wiedza": "Knowledge",
  "auto.historia": "History",
  "auto.wybierz_dyscypline": "Choose a discipline",
  "auto.wybierz_dyscyplinę": "Choose a discipline",
  "auto.dodaj_trening": "Add Training",
  "auto.zapisz_trening": "Save Training",
  "auto.rozmaite_wysilki_fizyczne": "Various physical activities have different effects on glucose. Choose a discipline to learn what to watch out for.",
  "auto.rozmaite_wysiłki_fizyczne_mają_różn": "Various physical activities have different effects on glucose. Choose a discipline to learn what to watch out for.",
  "auto.silownia": "Gym",
  "auto.czesto_podnosi_poziom_cukru": "Often raises blood sugar",
  "auto.czesto_podnosi_poziom_cuk": "Often raises blood sugar",
  "auto.krotki_intensywny_wysilek_uwal": "Short, intense exercise releases adrenaline, which stimulates the liver to release glucose. It often causes unexpected spikes in glycemia during and after training.",
  "auto.krotki_intensywny_wysilek": "Short, intense exercise releases adrenaline, which stimulates the liver to release glucose. It often causes unexpected spikes in glycemia during and after training.",
  "auto.mozesz_potrzebowac_malego_bolu": "You might need a small bolus before the gym.",
  "auto.mozesz_potrzebowac_malego": "You might need a small bolus before the gym.",
  "auto.intensywnosc": "Intensity",
  "auto.niska": "Low",
  "auto.srednia": "Medium",
  "auto.wysoka": "High",
  "auto.czas_trwania_min": "Duration (min)",
  "auto.dodaj_do_dziennika": "Add to Log",
  "auto.trening_dodany": "Training added"
});

fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));
