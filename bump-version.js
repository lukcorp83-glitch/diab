import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Zabezpieczenie przed brakiem argumentu
const newVersion = process.argv[2];
if (!newVersion) {
  console.error("BŁĄD: Musisz podać nowy numer wersji! Użycie: node bump-version.js 5.7.13");
  process.exit(1);
}

const currentDate = new Date().toISOString().split('T')[0];
console.log(`\n🚀 Rozpoczynam automatyczną aktualizację wersji na: ${newVersion}\n`);

try {
  // 1. Aktualizacja package.json
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log(`   - Poprzednia wersja w package.json: ${pkgData.version}`);
  pkgData.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n');
  console.log(`✅ Zaktualizowano package.json`);

  // 2. Aktualizacja version.json
  const versionJsonPath = path.join(process.cwd(), 'version.json');
  const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  versionData.version = newVersion;
  
  // Zwiększenie otaRevision jeśli istnieje
  if (versionData.otaRevision !== undefined) {
    versionData.otaRevision += 1;
  }
  
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log(`✅ Zaktualizowano version.json`);

  // 3. Aktualizacja src/constants.ts
  const constantsPath = path.join(process.cwd(), 'src/constants.ts');
  let constantsData = fs.readFileSync(constantsPath, 'utf8');
  constantsData = constantsData.replace(/export const APP_VERSION = '.*';/, `export const APP_VERSION = '${newVersion}';`);
  constantsData = constantsData.replace(/export const CURRENT_VERSION = '.*';/, `export const CURRENT_VERSION = '${newVersion}';`);
  fs.writeFileSync(constantsPath, constantsData);
  console.log(`✅ Zaktualizowano src/constants.ts`);

  // 4. Aktualizacja src/constants/versions.ts
  const versionsTsPath = path.join(process.cwd(), 'src/constants/versions.ts');
  let versionsTsData = fs.readFileSync(versionsTsPath, 'utf8');
  
  // Aktualizacja stałej
  versionsTsData = versionsTsData.replace(/export const CURRENT_VERSION = '.*';/, `export const CURRENT_VERSION = '${newVersion}';`);

  // Szablon nowego wpisu
  const newEntry = `{
    version: "${newVersion}",
    date: "${currentDate}",
    title: "Nowa Aktualizacja (Zmień ten tytuł)",
    changes: [
      "Zmień ten opis",
      "Kolejna zmiana"
    ]
  },`;

  // Wstawienie do PWA_VERSIONS
  versionsTsData = versionsTsData.replace(
    /export const PWA_VERSIONS: VersionEntry\[\] = \[/,
    `export const PWA_VERSIONS: VersionEntry[] = [\n  ${newEntry}`
  );

  // Wstawienie do APK_VERSIONS
  versionsTsData = versionsTsData.replace(
    /export const APK_VERSIONS: VersionEntry\[\] = \[/,
    `export const APK_VERSIONS: VersionEntry[] = [\n  ${newEntry}`
  );

  fs.writeFileSync(versionsTsPath, versionsTsData);
  console.log(`✅ Zaktualizowano src/constants/versions.ts`);

  // 5. Aktualizacja package-lock.json za pomocą npm
  console.log(`⏳ Generowanie nowego package-lock.json (to może chwilę potrwać)...`);
  execSync('npm install --package-lock-only', { stdio: 'inherit' });
  console.log(`✅ Zaktualizowano package-lock.json`);

  console.log(`\n🎉 SUKCES! Wersja zmieniona pomyślnie we wszystkich 5 miejscach.`);
  console.log(`💡 Pamiętaj, aby przed zrobieniem commita:`);
  console.log(`   1. Uzupełnić opisy zmian ('whatsNew' i 'whatsNewEn') w version.json`);
  console.log(`   2. Wypełnić prawdziwe informacje o aktualizacji w src/constants/versions.ts\n`);

} catch (error) {
  console.error(`\n❌ WYSTĄPIŁ BŁĄD:`, error.message);
  process.exit(1);
}
