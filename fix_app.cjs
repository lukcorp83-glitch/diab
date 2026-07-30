const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/nsSettings\?\.nsUrl/g, 'nsSettings?.url');
content = content.replace(/nsSettings\?\.apiSecret/g, 'nsSettings?.secret');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated App.tsx!');
