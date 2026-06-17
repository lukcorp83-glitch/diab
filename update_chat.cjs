const fs = require('fs');

const extraEN = {
  "auto.szybki_spadek_cukru": "Fast blood sugar drop",
  "auto.jazda_na_rowerze": "Cycling",
  "auto.umiarkowany_spadek": "Moderate drop",
  "auto.mieszany_spadek_wzrost": "Mixed (drop/rise)",
  "auto.tenis": "Tennis",
  "auto.cele_i_isf": "Goals & ISF",
  "auto.witaj_w_czym_moge_ci_pomoc_w_a": "Hello! How can I help you in the app? You can ask about anything!",
  "auto.czesc_jak_tam_twoje_cukry_p": "Hi! How are your blood sugars? Shall we play or do you want to ask something?",
  "auto.opowiedz_mi_zart": "Tell me a joke",
  "auto.jak_dbac_o_poziom_cukru": "How to manage blood sugar?",
  "auto.pobawmy_sie": "Let's play!",
  "auto.dlaczego_jestem_zmeczony": "Why am I tired?",
  "auto.wycisz_glos": "Mute voice",
  "auto.wyczysc_rozmowe": "Clear conversation",
  "auto.wyczyść_rozmowę": "Clear conversation",
  "auto.rozmowa_glosowa": "Voice chat",
  "auto.rozmowa_głosowa": "Voice chat",
  "auto.slucham_cie": "I'm listening...",
  "auto.zawsze_sluchaj_rodzicow": "Always listen to your parents!",
  "auto.zawsze_słuchaj_rodziców": "Always listen to your parents!",
  "auto.czy_na_pewno_chcesz_wyczyscic": "Are you sure you want to clear the conversation?",
  "auto.wyczyscilem_rozmowe_w_czym_mog": "I cleared the conversation. How can I help you?",
  "auto.wyczyściłem_rozmowę_w_czym_mog": "I cleared the conversation. How can I help you?"
};

const extraPL = {
  "auto.szybki_spadek_cukru": "Szybki spadek cukru",
  "auto.jazda_na_rowerze": "Jazda na Rowerze",
  "auto.umiarkowany_spadek": "Umiarkowany spadek",
  "auto.mieszany_spadek_wzrost": "Mieszany (spadek/wzrost)",
  "auto.tenis": "Tenis",
  "auto.cele_i_isf": "Cele i ISF",
  "auto.witaj_w_czym_moge_ci_pomoc_w_a": "Witaj! W czym mogę Ci pomóc w aplikacji? Możesz pytać o wszystko!",
  "auto.czesc_jak_tam_twoje_cukry_p": "Cześć! Jak tam Twoje cukry? Pobawimy się czy wolisz o coś zapytać?",
  "auto.opowiedz_mi_zart": "Opowiedz mi żart",
  "auto.jak_dbac_o_poziom_cukru": "Jak dbać o poziom cukru?",
  "auto.pobawmy_sie": "Pobawmy się!",
  "auto.dlaczego_jestem_zmeczony": "Dlaczego jestem zmęczony?",
  "auto.wycisz_glos": "Wycisz głos",
  "auto.wyczysc_rozmowe": "Wyczyść rozmowę",
  "auto.wyczyść_rozmowę": "Wyczyść rozmowę",
  "auto.rozmowa_glosowa": "Rozmowa głosowa",
  "auto.rozmowa_głosowa": "Rozmowa głosowa",
  "auto.slucham_cie": "Słucham Cię...",
  "auto.zawsze_sluchaj_rodzicow": "Zawsze słuchaj rodziców!",
  "auto.zawsze_słuchaj_rodziców": "Zawsze słuchaj rodziców!",
  "auto.czy_na_pewno_chcesz_wyczyscic": "Czy na pewno chcesz wyczyścić rozmowę?",
  "auto.wyczyscilem_rozmowe_w_czym_mog": "Wyczyściłem rozmowę. W czym mogę pomóc?",
  "auto.wyczyściłem_rozmowę_w_czym_mog": "Wyczyściłem rozmowę. W czym mogę pomóc?"
};

let en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));
Object.assign(en, extraEN);
fs.writeFileSync('src/locales/en/translation.json', JSON.stringify(en, null, 2));

let pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));
Object.assign(pl, extraPL);
fs.writeFileSync('src/locales/pl/translation.json', JSON.stringify(pl, null, 2));
