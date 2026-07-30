const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Profile/ProfileMedications.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace { medications: cleanMeds } with { medications: JSON.parse(JSON.stringify(updatedMeds)) } globally (to be safe)
content = content.replace(/\{ medications: cleanMeds \}/g, '{ medications: JSON.parse(JSON.stringify(updatedMeds)) }');
content = content.replace(/\{ inventory: cleanInventory \}/g, '{ inventory: JSON.parse(JSON.stringify(updatedInventory)) }');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed inline handlers!');
