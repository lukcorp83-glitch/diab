const fs = require('fs');

const oldVersion = "5.6.25";
const newVersion = "5.7.0";

// package.json
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// version.json
let ver = JSON.parse(fs.readFileSync('version.json', 'utf8'));
ver.version = newVersion;
ver.apkUrl = ver.apkUrl.replace(oldVersion, newVersion);
fs.writeFileSync('version.json', JSON.stringify(ver, null, 2) + '\n');

// src/constants.ts
let consts = fs.readFileSync('src/constants.ts', 'utf8');
consts = consts.replace(`APP_VERSION = '${oldVersion}'`, `APP_VERSION = '${newVersion}'`);
fs.writeFileSync('src/constants.ts', consts);

// src/constants/versions.ts
let versTs = fs.readFileSync('src/constants/versions.ts', 'utf8');
versTs = versTs.replace(`CURRENT_VERSION = '${oldVersion}'`, `CURRENT_VERSION = '${newVersion}'`);
versTs = versTs.replace(new RegExp(oldVersion, 'g'), newVersion); // This is safe because 5.6.25 is very specific
fs.writeFileSync('src/constants/versions.ts', versTs);

console.log("Version updated to 5.7.0");
