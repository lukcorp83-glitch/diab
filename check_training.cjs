const fs = require('fs');
let content = fs.readFileSync('src/components/GlikoTraining.tsx', 'utf8');

// List out all hardcoded names/effects/descriptions still remaining
const matches = content.match(/name:\s*'(.*?)'|effect:\s*'(.*?)'|sub:\s*"(.*?)"/g);
console.log(matches);
