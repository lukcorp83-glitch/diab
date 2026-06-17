const fs = require('fs');
let content = fs.readFileSync('src/components/GlikoTraining.tsx', 'utf8');

content = content.replace(/name: 'Bieganie \/ Cardio'/g, "name: i18n.t('auto.bieganie_kardio', { defaultValue: 'Bieganie / Cardio' })");
content = content.replace(/effect: 'Szybki spadek cukru'/g, "effect: i18n.t('auto.szybki_spadek_cukru', { defaultValue: 'Szybki spadek cukru' })");
content = content.replace(/name: 'Jazda na Rowerze'/g, "name: i18n.t('auto.jazda_na_rowerze', { defaultValue: 'Jazda na Rowerze' })");
content = content.replace(/effect: 'Umiarkowany spadek'/g, "effect: i18n.t('auto.umiarkowany_spadek', { defaultValue: 'Umiarkowany spadek' })");
content = content.replace(/effect: 'Mieszany \(spadek\/wzrost\)'/g, "effect: i18n.t('auto.mieszany_spadek_wzrost', { defaultValue: 'Mieszany (spadek/wzrost)' })");
content = content.replace(/name: 'Tenis'/g, "name: i18n.t('auto.tenis', { defaultValue: 'Tenis' })");

fs.writeFileSync('src/components/GlikoTraining.tsx', content);
