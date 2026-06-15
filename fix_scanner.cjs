const fs = require('fs');

let constantsStr = fs.readFileSync('src/constants.ts', 'utf8');

const oldExtract = `export function extractGTIN(barcode: string): string {
    if (barcode.startsWith("01") && barcode.length >= 16) {
      return barcode.substring(2, 16);
    }
    return barcode;
  }`;

const newExtract = `export function extractGTIN(barcode: string): string {
    if (!barcode) return barcode;
    
    // Remove GS1 symbology identifiers (e.g., ]d2)
    let cleaned = barcode.replace(/^[\\]\\[][a-zA-Z0-9]{2}/, '');
    
    // Handle brackets or parentheses around the 01 Application Identifier
    cleaned = cleaned.replace(/^[[(]01[\])]/, '01');

    // Look for (01) AI followed by 14 digits
    const gtinMatch = cleaned.match(/(?:^|\D)01(\\d{14})/);
    if (gtinMatch) {
        return gtinMatch[1];
    }
    
    // Simple 01 prefix with at least 14 digits
    if (cleaned.startsWith("01") && cleaned.length >= 16) {
        return cleaned.substring(2, 16);
    }

    // Fallback: extract the first 13 or 14 consecutive digits
    const digitsMatch = cleaned.match(/(\\d{13,14})/);
    if (digitsMatch) {
        return digitsMatch[1];
    }

    return barcode;
}

export function lookupMedicalDictionary(gtin: string) {
    if (MEDICAL_DICTIONARY[gtin]) return MEDICAL_DICTIONARY[gtin];
    if (gtin.length === 14 && gtin.startsWith('0') && MEDICAL_DICTIONARY[gtin.substring(1)]) {
        return MEDICAL_DICTIONARY[gtin.substring(1)];
    }
    if (gtin.length === 13 && MEDICAL_DICTIONARY['0' + gtin]) {
        return MEDICAL_DICTIONARY['0' + gtin];
    }
    return null;
}`;

constantsStr = constantsStr.replace(oldExtract, newExtract);
fs.writeFileSync('src/constants.ts', constantsStr);

// Profile.tsx
let profileStr = fs.readFileSync('src/components/Profile.tsx', 'utf8');
profileStr = profileStr.replace(/import \{([\s\S]*?)extractGTIN,([\s\S]*?)\} from "\.\.\/constants";/g, 'import {$1extractGTIN,\n  lookupMedicalDictionary,$2} from "../constants";');

profileStr = profileStr.replace(
  /const known = MEDICAL_DICTIONARY\[scannedBarcode\];/g,
  'const known = lookupMedicalDictionary(scannedBarcode);'
);

fs.writeFileSync('src/components/Profile.tsx', profileStr);

console.log('Fixed GTIN extraction logic.');
