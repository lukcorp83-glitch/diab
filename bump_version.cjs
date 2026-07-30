const fs = require('fs');

const NEW_VERSION = '5.9.93';

// 1. package.json
const pkgPath = 'C:/Users/luk/Downloads/diab/package.json';
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = NEW_VERSION;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

// 2. package-lock.json
// Let npm handle this
require('child_process').execSync('npm install --package-lock-only', { cwd: 'C:/Users/luk/Downloads/diab' });

// 3. version.json
const verJsonPath = 'C:/Users/luk/Downloads/diab/version.json';
let verJson = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
verJson.version = NEW_VERSION;
verJson.whatsNew = 'Poprawki wizualne (nowa ikona zbiorniczka) oraz zaawansowane poprawki mechanizmu zapisu leków, sensorów i AI w bazie danych Firestore.';
verJson.whatsNewEn = 'Visual tweaks (new reservoir icon) and advanced fixes for saving medications, sensors, and AI data in the Firestore database.';
fs.writeFileSync(verJsonPath, JSON.stringify(verJson, null, 2), 'utf8');

// 4. src/constants.ts
const constPath = 'C:/Users/luk/Downloads/diab/src/constants.ts';
let constContent = fs.readFileSync(constPath, 'utf8');
constContent = constContent.replace(/export const APP_VERSION = ".*?";/, `export const APP_VERSION = "${NEW_VERSION}";`);
fs.writeFileSync(constPath, constContent, 'utf8');

// 5. src/constants/versions.ts
const versPath = 'C:/Users/luk/Downloads/diab/src/constants/versions.ts';
let versContent = fs.readFileSync(versPath, 'utf8');
versContent = versContent.replace(/export const CURRENT_VERSION = ".*?";/, `export const CURRENT_VERSION = "${NEW_VERSION}";`);

if (!versContent.includes(NEW_VERSION)) {
    const pwaRegex = /(export const PWA_VERSIONS: AppVersion\[\] = \[)/;
    const pwaEntry = `\n  {\n    version: "${NEW_VERSION}",\n    releaseDate: new Date().toISOString().split('T')[0],\n    features: [\n      "Nowa ikona zbiorniczka",\n      "Zabezpieczenie przed undefined Firestore dla leków i sprzętu"\n    ],\n  },`;
    versContent = versContent.replace(pwaRegex, `$1${pwaEntry}`);
    
    const apkRegex = /(export const APK_VERSIONS: AppVersion\[\] = \[)/;
    versContent = versContent.replace(apkRegex, `$1${pwaEntry}`);
}

fs.writeFileSync(versPath, versContent, 'utf8');
console.log('Version bumped to ' + NEW_VERSION);
