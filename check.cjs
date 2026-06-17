const fs = require('fs');
const path = require('path');
const en = JSON.parse(fs.readFileSync('src/locales/en/translation.json', 'utf8'));

function scanDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        let full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) files = files.concat(scanDir(full));
        else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full);
    });
    return files;
}

const files = scanDir('src');
let missing = {};
const regex = /i?1?8?n?\.?t\(['"](auto\.[a-z0-9_]+)['"],\s*\{\s*defaultValue:\s*(['"])(.*?)\2/g;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const def = match[3];
        if (!en[key]) {
            missing[key] = def;
        }
    }
});

fs.writeFileSync('missing.json', JSON.stringify(missing, null, 2));
console.log('Found missing keys: ' + Object.keys(missing).length);
