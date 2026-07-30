const fs = require('fs');
const { execSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Użycie: node scripts/release.cjs <nowa_wersja> <whatsNew_pl> <whatsNew_en>');
  console.error('Przykład: node scripts/release.cjs 5.7.15 "Dodano nową funkcję" "Added new feature"');
  process.exit(1);
}

const newVersion = args[0];
const whatsNewPl = args[1];
const whatsNewEn = args[2];
const newDate = new Date().toISOString().split('T')[0];

console.log(`🚀 Rozpoczynam proces wydania dla wersji: ${newVersion}...`);

// 1. package.json
console.log('📝 Aktualizacja package.json...');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. version.json
console.log('📝 Aktualizacja version.json...');
const verJsonPath = 'version.json';
const verJson = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
verJson.version = newVersion;
verJson.whatsNew = whatsNewPl;
verJson.whatsNewEn = whatsNewEn;
verJson.otaRevision = (verJson.otaRevision || 0) + 1; // Podbijamy rewizję OTA
fs.writeFileSync(verJsonPath, JSON.stringify(verJson, null, 2) + '\n');

// 3. src/constants.ts
console.log('📝 Aktualizacja src/constants.ts...');
const constantsPath = 'src/constants.ts';
let constantsStr = fs.readFileSync(constantsPath, 'utf8');
constantsStr = constantsStr.replace(/export const APP_VERSION = ['"].*?['"];/, `export const APP_VERSION = "${newVersion}";`);
fs.writeFileSync(constantsPath, constantsStr);

// 4. src/constants/versions.ts
console.log('📝 Aktualizacja src/constants/versions.ts...');
const versionsTsPath = 'src/constants/versions.ts';
let versionsTs = fs.readFileSync(versionsTsPath, 'utf8');

// Update CURRENT_VERSION
versionsTs = versionsTs.replace(/export const CURRENT_VERSION = ['"].*?['"];/, `export const CURRENT_VERSION = '${newVersion}';`);

const newEntry = `  {
    version: "${newVersion}",
    date: "${newDate}",
    title: "Aktualizacja ${newVersion}",
    changes: [
      "${whatsNewPl}"
    ]
  },
`;

// Insert into PWA_VERSIONS
versionsTs = versionsTs.replace(
  /export const PWA_VERSIONS: VersionEntry\[\] = \[\n/,
  `export const PWA_VERSIONS: VersionEntry[] = [\n${newEntry}`
);

// Insert into APK_VERSIONS
versionsTs = versionsTs.replace(
  /export const APK_VERSIONS: VersionEntry\[\] = \[\n/,
  `export const APK_VERSIONS: VersionEntry[] = [\n${newEntry}`
);

fs.writeFileSync(versionsTsPath, versionsTs);

// 5. package-lock.json
console.log('📦 Aktualizacja package-lock.json (npm install --package-lock-only)...');
try {
  execSync('npm install --package-lock-only', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Błąd podczas aktualizacji package-lock.json', error);
  process.exit(1);
}

console.log('✅ Zakończono! Wszystkie pliki zostały zaktualizowane.');
console.log('💡 Aby zbudować nową wersję, użyj teraz: npm run build');
