const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const pl = JSON.parse(fs.readFileSync(plPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

Object.assign(pl, {
  "auto.zbiorniczek_na_insuline": "Zbiorniczek na insulinę",
  "auto.pojemnik_z_insulina": "Pojemnik z insuliną",
  "auto.zywotnosc_zbiorniczka_dni": "Żywotność Zbiorniczka (dni)",
  "auto.data_i_godzina_zalozenia_zbiorniczka": "Data i godzina założenia",
  "auto.wymiana_zbiorniczka": "Wymiana zbiorniczka",
  "auto.zapisano_wymiane_zbiorniczka": "Zapisano wymianę zbiorniczka!",
  "auto.zaktualizowano_date_dni_zbiorniczka": "Zaktualizowano datę/dni zbiorniczka!"
});

Object.assign(en, {
  "auto.zbiorniczek_na_insuline": "Insulin reservoir",
  "auto.pojemnik_z_insulina": "Insulin container",
  "auto.zywotnosc_zbiorniczka_dni": "Reservoir Lifespan (days)",
  "auto.data_i_godzina_zalozenia_zbiorniczka": "Date and time of insertion",
  "auto.wymiana_zbiorniczka": "Reservoir replacement",
  "auto.zapisano_wymiane_zbiorniczka": "Reservoir replacement saved!",
  "auto.zaktualizowano_date_dni_zbiorniczka": "Reservoir date/days updated!"
});

fs.writeFileSync(plPath, JSON.stringify(pl, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log('Translations added');
