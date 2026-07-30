const fs = require('fs');
const NEW_VERSION = '5.9.93';

// Fix versions.ts
const versPath = 'C:/Users/luk/Downloads/diab/src/constants/versions.ts';
let versContent = fs.readFileSync(versPath, 'utf8');
versContent = versContent.replace(/export const CURRENT_VERSION = '.*?';/, `export const CURRENT_VERSION = '${NEW_VERSION}';`);

if (!versContent.includes(`version: "${NEW_VERSION}"`)) {
    const pwaRegex = /(export const PWA_VERSIONS: VersionEntry\[\] = \[)/;
    const pwaEntry = `\n  {\n    version: "${NEW_VERSION}",\n    date: new Date().toISOString().split('T')[0],\n    title: "Poprawki i stabilność bazy",\n    changes: [\n      "Nowa ikona zbiorniczka",\n      "Zabezpieczenie przed undefined Firestore dla leków i sprzętu"\n    ]\n  },`;
    versContent = versContent.replace(pwaRegex, `$1${pwaEntry}`);
    
    const apkRegex = /(export const APK_VERSIONS: VersionEntry\[\] = \[)/;
    if (versContent.match(apkRegex)) {
        versContent = versContent.replace(apkRegex, `$1${pwaEntry}`);
    }
}
fs.writeFileSync(versPath, versContent, 'utf8');

// Also update constants.ts correctly since my previous regex might have missed if it used single quotes
const constPath = 'C:/Users/luk/Downloads/diab/src/constants.ts';
let constContent = fs.readFileSync(constPath, 'utf8');
constContent = constContent.replace(/export const APP_VERSION = ["'].*?["'];/, `export const APP_VERSION = "${NEW_VERSION}";`);
fs.writeFileSync(constPath, constContent, 'utf8');

// Re-check version.json to ensure it has correct structure
const verJsonPath = 'C:/Users/luk/Downloads/diab/version.json';
let verJson = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
verJson.version = NEW_VERSION;
fs.writeFileSync(verJsonPath, JSON.stringify(verJson, null, 2), 'utf8');

console.log("Fixed versions");
