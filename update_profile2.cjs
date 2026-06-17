const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

content = content.replace(/sub: "Cele i ISF",/g, "sub: i18n.t('auto.cele_i_isf', { defaultValue: 'Cele i ISF' }),");

fs.writeFileSync('src/components/Profile.tsx', content);
