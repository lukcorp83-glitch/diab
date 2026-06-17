const fs = require('fs');
let content = fs.readFileSync('src/components/GlikoTraining.tsx', 'utf8');

content = content.replace(/name: 'Joga \/ Pilates',/g, "name: i18n.t('auto.joga', { defaultValue: 'Joga / Pilates' }),");
content = content.replace(/effect: 'Stabilizacja \/ Lekki spadek',/g, "effect: i18n.t('auto.stabilizacja_spadek', { defaultValue: 'Stabilizacja / Lekki spadek' }),");
content = content.replace(/'Idealny sport przy lekkich wahaniach glikemii.',/g, "i18n.t('auto.idealny_sport_przy_wahaniach', { defaultValue: 'Idealny sport przy lekkich wahaniach glikemii.' }),");

content = content.replace(/name: 'Spacer \/ Marsz',/g, "name: i18n.t('auto.marsz_spacer', { defaultValue: 'Spacer / Marsz' }),");
content = content.replace(/effect: 'Delikatny spadek',/g, "effect: i18n.t('auto.delikatny_spadek', { defaultValue: 'Delikatny spadek' }),");

content = content.replace(/name: 'Taniec',/g, "name: i18n.t('auto.taniec', { defaultValue: 'Taniec' }),");
content = content.replace(/effect: 'Spalanie cardio',/g, "effect: i18n.t('auto.spalanie_cardio', { defaultValue: 'Spalanie cardio' }),");

fs.writeFileSync('src/components/GlikoTraining.tsx', content);
