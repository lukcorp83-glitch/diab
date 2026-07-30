const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Profile/ProfileMedications.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/dailyDose: e.target.value \? Number\(e.target.value\) : undefined/g, 'dailyDose: e.target.value ? Number(e.target.value) : null');
content = content.replace(/penCapacity: e.target.value \? Number\(e.target.value\) : undefined/g, 'penCapacity: e.target.value ? Number(e.target.value) : null');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully fixed undefined in ProfileMedications!');
