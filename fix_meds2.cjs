const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Profile/ProfileMedications.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const newSettings = \{ \.\.\.settings, medications: updatedMeds \};/g, `const cleanMeds = JSON.parse(JSON.stringify(updatedMeds));\n   const newSettings = { ...settings, medications: cleanMeds };`);
content = content.replace(/\{ medications: updatedMeds \}/g, '{ medications: cleanMeds }');

content = content.replace(/const newSettings = \{ \.\.\.settings, inventory: updatedInventory \};/g, `const cleanInventory = JSON.parse(JSON.stringify(updatedInventory));\n   const newSettings = { ...settings, inventory: cleanInventory };`);
content = content.replace(/\{ inventory: updatedInventory \}/g, '{ inventory: cleanInventory }');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully added JSON.stringify stripping for undefined values!');
