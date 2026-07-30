const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/index.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<link rel="apple-touch-icon" href="pwa-icon.svg" />',
  '<link rel="icon" type="image/svg+xml" href="/pwa-icon.svg" />\n    <link rel="apple-touch-icon" href="/pwa-icon.svg" />'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Favicon linked successfully in index.html');
