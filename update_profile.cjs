const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

content = content.replace(/sub: "Bolusa",/g, "sub: i18n.t('auto.bolusa', { defaultValue: 'Bolusa' }),");

fs.writeFileSync('src/components/Profile.tsx', content);
