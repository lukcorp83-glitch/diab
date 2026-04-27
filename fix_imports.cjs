const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
   if (file.includes('utils.ts')) return;

   let content = fs.readFileSync(file, 'utf8');
   if (content.includes('getEffectiveUid') && !content.includes('import { getEffectiveUid }')) {
       let depth = file.split(path.sep).length - 2;
       let prefix = depth === 0 ? './lib/utils' : '../lib/utils';
       if (depth > 1) prefix = '../../lib/utils';
       // Find the first import and add it gracefully instead of prepending to file which might break ESLint if there are disable comments at the top but probably fine.
       let newContent = content.replace(/^import/m, `import { getEffectiveUid } from '${prefix}';\nimport`);
       fs.writeFileSync(file, newContent);
       console.log("Fixed import in", file);
   }
});
