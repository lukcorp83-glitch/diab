const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Profile.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix missing user prop
content = content.replace(
    '<ProfileMedications settings={settings} setSettings={setSettings} />',
    '<ProfileMedications user={user} settings={settings} setSettings={setSettings} />'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed missing user prop in Profile.tsx');
