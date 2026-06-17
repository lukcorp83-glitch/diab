const fs = require('fs');
let content = fs.readFileSync('src/services/databaseService.ts', 'utf8');

content = content.replace('let sqlString = "BEGIN TRANSACTION;\\n";', 'let sqlString = "";');
content = content.replace('sqlString += "COMMIT;";', '');

fs.writeFileSync('src/services/databaseService.ts', content);
