const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Usunięcie deklaracji stanów
content = content.replace(/const \[inlineBolusDose, setInlineBolusDose\] = useState\(""\);\r?\n/, '');
content = content.replace(/const \[inlineBolusCarbs, setInlineBolusCarbs\] = useState\(""\);\r?\n/, '');
content = content.replace(/const \[inlineBolusNotes, setInlineBolusNotes\] = useState\(""\);\r?\n/, '');

// Usunięcie funkcji handleInlineBolusCarbsChange
const carbsChangeRegex = /const handleInlineBolusCarbsChange = \(val: string\) => \{[\s\S]*?^\s*};\r?\n/m;
content = content.replace(carbsChangeRegex, '');

// Usunięcie funkcji handleInlineBolusSubmit
const bolusSubmitRegex = /const handleInlineBolusSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?^\s*};\r?\n/m;
content = content.replace(bolusSubmitRegex, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Cleanup successful!');
