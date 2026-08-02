const fs = require('fs');
const path = require('path');

const NEW_VERSION = '5.9.94';
const projectRoot = 'C:/Users/luk/Downloads/diab';

// 1. package.json
const pkgPath = path.join(projectRoot, 'package.json');
let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = NEW_VERSION;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// 3. version.json
const verJsonPath = path.join(projectRoot, 'version.json');
let verJson = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
verJson.version = NEW_VERSION;
verJson.whatsNew = ["Naprawiono awarię asystenta głosowego (Invalid hook call)", "Przywrócono wskaźnik ŁG i tłumaczenia zakładek w wyszukiwarce posiłków", "Poprawiono działanie mikrofonu na urządzeniach mobilnych"];
verJson.whatsNewEn = ["Fixed voice assistant crash (Invalid hook call)", "Restored GL indicator and category translations in food search", "Improved microphone behavior on mobile devices"];
fs.writeFileSync(verJsonPath, JSON.stringify(verJson, null, 2));

// 4. src/constants.ts
const constPath = path.join(projectRoot, 'src', 'constants.ts');
let constContent = fs.readFileSync(constPath, 'utf8');
constContent = constContent.replace(/export const APP_VERSION = ['"].*?['"];/, `export const APP_VERSION = '${NEW_VERSION}';`);
fs.writeFileSync(constPath, constContent);

// 5. src/constants/versions.ts
const versionsPath = path.join(projectRoot, 'src', 'constants', 'versions.ts');
let versionsContent = fs.readFileSync(versionsPath, 'utf8');
versionsContent = versionsContent.replace(/export const CURRENT_VERSION = ['"].*?['"];/, `export const CURRENT_VERSION = '${NEW_VERSION}';`);

// Add to PWA_VERSIONS if not exists
if (!versionsContent.includes(`version: '${NEW_VERSION}'`)) {
  const pwaVersionEntry = `
  {
    version: '${NEW_VERSION}',
    releaseDate: new Date().toISOString(),
    changes: [
      'Naprawiono awarię asystenta głosowego (Invalid hook call)',
      'Przywrócono wskaźnik ŁG i tłumaczenia zakładek',
      'Poprawiono obsługę mikrofonu'
    ],
    type: 'patch'
  },`;
  versionsContent = versionsContent.replace(/export const PWA_VERSIONS: AppVersion\[\] = \[/, `export const PWA_VERSIONS: AppVersion[] = [${pwaVersionEntry}`);
  versionsContent = versionsContent.replace(/export const APK_VERSIONS: AppVersion\[\] = \[/, `export const APK_VERSIONS: AppVersion[] = [${pwaVersionEntry}`);
}
fs.writeFileSync(versionsPath, versionsContent);

console.log('Bumped version to ' + NEW_VERSION);
