const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure Cylinder is imported
if (!content.includes('Cylinder')) {
    content = content.replace(/import \{/, "import { Cylinder,");
}

// Replace Cpu with Cylinder for the reservoir pill
content = content.replace(/<Cpu size=\{12\}/g, '<Cylinder size={12}');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed reservoir pill in Dashboard.tsx');
