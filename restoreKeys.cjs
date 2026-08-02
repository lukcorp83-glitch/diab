const fs = require('fs');
let plRaw = fs.readFileSync('src/locales/pl/translation.json', 'utf8');
if (plRaw.charCodeAt(0) === 0xFEFF) {
    plRaw = plRaw.slice(1);
}
const pl = JSON.parse(plRaw);

const valToKey = {};
for (const k in pl) {
    if (k.startsWith('auto.')) {
        valToKey[pl[k]] = k;
    }
}

let content = fs.readFileSync('src/components/MLAnalysisWidget.tsx', 'utf8');

const regex1 = /i18n\.t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: (["'])([\s\S]*?)\1 \} \) \}\)/g;
content = content.replace(regex1, (match, quote, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || valToKey[val] || 'auto.unknown_key';
    return "i18n.t('" + key + "', { glikoName, defaultValue: i18n.t('" + key + "', { glikoName, defaultValue: " + quote + val + quote + " }) })";
});

const regex2 = /t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: (["'])([\s\S]*?)\1 \} \) \}\)/g;
content = content.replace(regex2, (match, quote, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || valToKey[val] || 'auto.unknown_key';
    return "t('" + key + "', { glikoName, defaultValue: i18n.t('" + key + "', { glikoName, defaultValue: " + quote + val + quote + " }) })";
});

const regex3 = /i18n\.t\('', \{ glikoName, defaultValue: (["'])([\s\S]*?)\1 \}\)/g;
content = content.replace(regex3, (match, quote, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || valToKey[val] || 'auto.unknown_key';
    return "i18n.t('" + key + "', { glikoName, defaultValue: " + quote + val + quote + " })";
});

const regex4 = /t\('', \{ glikoName, defaultValue: (["'])([\s\S]*?)\1 \}\)/g;
content = content.replace(regex4, (match, quote, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || valToKey[val] || 'auto.unknown_key';
    return "t('" + key + "', { glikoName, defaultValue: " + quote + val + quote + " })";
});

fs.writeFileSync('src/components/MLAnalysisWidget.tsx', content, 'utf8');
console.log('Done restoring keys');
