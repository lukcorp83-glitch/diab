const fs = require('fs');
const pl = JSON.parse(fs.readFileSync('src/locales/pl/translation.json', 'utf8'));

const valToKey = {};
for (const k in pl) {
    if (k.startsWith('auto.')) {
        valToKey[pl[k]] = k;
    }
}

let content = fs.readFileSync('src/components/MLAnalysisWidget.tsx', 'utf8');

content = content.replace(/i18n\.t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: "([^]+)" \} \) \}\)/g, (match, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || 'auto.unknown_key';
    return "i18n.t('" + key + "', { glikoName, defaultValue: " + val + " })";
});
content = content.replace(/i18n\.t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: "([^"]+)" \} \) \}\)/g, (match, val) => {
    let key = valToKey[val] || 'auto.unknown_key';
    return "i18n.t('" + key + "', { glikoName, defaultValue: \"" + val + "\" })";
});
content = content.replace(/i18n\.t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: '([^']+)' \} \) \}\)/g, (match, val) => {
    let key = valToKey[val] || 'auto.unknown_key';
    return "i18n.t('" + key + "', { glikoName, defaultValue: '" + val + "' })";
});

content = content.replace(/t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: "([^]+)" \} \) \}\)/g, (match, val) => {
    let lookupVal = val.replace(/\$\{glikoName\}/g, 'GlikoSense {{glikoName}}');
    let key = valToKey[lookupVal] || 'auto.unknown_key';
    return "t('" + key + "', { glikoName, defaultValue: " + val + " })";
});
content = content.replace(/t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: "([^"]+)" \} \) \}\)/g, (match, val) => {
    let key = valToKey[val] || 'auto.unknown_key';
    return "t('" + key + "', { glikoName, defaultValue: \"" + val + "\" })";
});
content = content.replace(/t\('', \{ glikoName, defaultValue: i18n\.t\('', \{ glikoName, defaultValue: '([^']+)' \} \) \}\)/g, (match, val) => {
    let key = valToKey[val] || 'auto.unknown_key';
    return "t('" + key + "', { glikoName, defaultValue: '" + val + "' })";
});

fs.writeFileSync('src/components/MLAnalysisWidget.tsx', content, 'utf8');
console.log('Done restoring keys');
