import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

console.log('--- STARTING GLOBAL REPAIR (MJS) ---');

const files = glob.sync('src/components/**/*.tsx');
let fixedFilesCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix all unterminated string literals in defaultValue (newlines inside ' ')
    const regex = /\{\s*defaultValue\s*:\s*'([\s\S]*?)'\s*\}/g;
    const newContent = content.replace(regex, (match, p1) => {
        const safeString = p1.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
        return `{ defaultValue: '${safeString}' }`;
    });
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent);
        fixedFilesCount++;
    }
}

console.log('Fixed files: ' + fixedFilesCount);
