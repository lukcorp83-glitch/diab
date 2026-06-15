const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');
const results = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match t('auto.xxx', { defaultValue: "yyy" }) or 'yyy'
  const regex = /t\(\s*['"](auto\.[^'"]+)['"]\s*,\s*\{\s*defaultValue:\s*(['"])(.*?)\2\s*\}\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results[match[1]] = match[3];
  }
});

fs.writeFileSync('extracted.json', JSON.stringify(results, null, 2));
console.log('Extracted ' + Object.keys(results).length + ' keys');
