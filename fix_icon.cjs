const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/PumpStatusCard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imported icon
content = content.replace(/Syringe/g, 'Cylinder');

fs.writeFileSync(file, content, 'utf8');
console.log('Icon replaced in PumpStatusCard');
