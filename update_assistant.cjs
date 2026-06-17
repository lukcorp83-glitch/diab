const fs = require('fs');
let content = fs.readFileSync('src/components/GlikoAssistant.tsx', 'utf8');

content = content.replaceAll('text: Witam, jestem Twoim asystentem.', "text: i18n.t('auto.witam_jestem_twoim_asystentem', { defaultValue: 'Witam, jestem Twoim asystentem.' })");
content = content.replaceAll('"Analiza TIR",', "i18n.t('auto.analiza_tir', { defaultValue: 'Analiza TIR' }),");
content = content.replaceAll('"Trendy Glikemii",', "i18n.t('auto.trendy_glikemii', { defaultValue: 'Trendy Glikemii' }),");
content = content.replaceAll('"Odczyty Nocne",', "i18n.t('auto.odczyty_nocne', { defaultValue: 'Odczyty Nocne' }),");
content = content.replaceAll('"Model Bazalny"', "i18n.t('auto.model_bazalny', { defaultValue: 'Model Bazalny' })");

fs.writeFileSync('src/components/GlikoAssistant.tsx', content);
