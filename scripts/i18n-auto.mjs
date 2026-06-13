import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżki
const srcPath = path.join(__dirname, '../src/**/*.{ts,tsx}').replace(/\\/g, '/');
const plPath = path.join(__dirname, '../src/locales/pl/translation.json');

// Helper odczytujący JSON lub zwracający pusty obiekt jeśli nie istnieje
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return {};
  }
};

const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 4));

const setNestedValue = (obj, pathString, value) => {
  const parts = pathString.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
};

const getNestedValue = (obj, pathString) => {
  const parts = pathString.split('.');
  let current = obj;
  for (let part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
};

async function main() {
  console.log("🔍 Skanowanie plików TypeScript pod kątem i18n...");
  const files = globSync(srcPath);

  // Złapie wszystko wewnątrz t('sciezka', { defaultValue: '...' }) ignorując formatowanie i podziały wierszy
  const regex = /t\(\s*(['"`])(.*?)\1\s*,\s*\{[\s\S]*?defaultValue\s*:\s*(['"`])([\s\S]*?)\3[\s\S]*?\}\s*\)/g;

  // Upewnijmy się, że folder docelowy istnieje
  fs.mkdirSync(path.dirname(plPath), { recursive: true });

  let plData = readJson(plPath);
  let extractedKeys = 0;

  // Wyciągnij z kodu
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const keyPath = match[2];
      const defaultValue = match[4];

      extractedKeys++;

      // Jeśli nie ma go w polskim JSON, wstaw oryginalny tekst polski jako defaultValue
      if (!getNestedValue(plData, keyPath)) {
        setNestedValue(plData, keyPath, defaultValue);
      }
    }
  }

  console.log(`✅ Znaleziono ${extractedKeys} deklaracji t() z defaultValue.`);

  // Zapis na sam koniec - TYLKO polski plik
  writeJson(plPath, plData);
  console.log("🎉 Automatyzacja I18N zakończona pomyślnie! Wygenerowano plik PL.");
}

main().catch(console.error);
