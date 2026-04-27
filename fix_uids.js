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
   let content = fs.readFileSync(file, 'utf8');
   
   // Normalize by replacing `localStorage.getItem('diacontrol_linked_uid') || user.uid` BACK to `user.uid` so I can have a clean state to do it properly.
   content = content.replace(/\(localStorage\.getItem\('diacontrol_linked_uid'\) \|\| user\.uid\)/g, 'user.uid');

   // Now replace `user.uid` with `getEffectiveUid(user)` everywhere
   let newContent = content.replace(/user\.uid/g, 'getEffectiveUid(user)');
   
   if (content !== newContent) {
       // if we don't have getEffectiveUid imported, add it
       if (!newContent.includes('getEffectiveUid')) {
           // We'll figure out path based on depth
           let depth = file.split(path.sep).length - 2;
           let prefix = depth === 0 ? './lib/utils' : '../lib/utils';
           if (depth > 1) prefix = '../../lib/utils';
           newContent = newContent.replace("import ", `import { getEffectiveUid } from '${prefix}';\nimport `);
       }
       fs.writeFileSync(file, newContent);
       console.log("Updated", file);
   }
});
