const fs = require('fs');
const content = fs.readFileSync('src/constants/versions.ts', 'utf8');

const fileLines = content.split('\n');
const result = [];
let inVersionsArray = false;
let currentItem = '';
const pwaVersions = [];
const apkVersions = [];

for (const line of fileLines) {
    if (line.includes('export const VERSIONS: VersionEntry[] = [')) {
        inVersionsArray = true;
        continue;
    }
    if (inVersionsArray) {
        if (line.trim() === '];') {
            inVersionsArray = false;
            break;
        }
        currentItem += line + '\n';
        if (line.trim() === '},' || line.trim() === '}') {
            if (currentItem.includes('version: "1.')) {
                apkVersions.push(currentItem);
            } else {
                pwaVersions.push(currentItem);
            }
            currentItem = '';
        }
    } else {
        result.push(line);
    }
}

const finalFile = result.join('\n') + '\n' +
'export const PWA_VERSIONS: VersionEntry[] = [\n' +
pwaVersions.join('') +
'];\n\n' +
'export const APK_VERSIONS: VersionEntry[] = [\n' +
apkVersions.join('') +
'];\n';

fs.writeFileSync('src/constants/versions.ts', finalFile);
console.log('Success');
