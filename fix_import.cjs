const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the faulty import
content = content.replace("import { Cylinder, getEffectiveUid } from '../lib/utils';", "import { getEffectiveUid } from '../lib/utils';");
content = content.replace("import { getEffectiveUid, Cylinder,", "import { getEffectiveUid,");
// Also remove it if it got added to another utils import
content = content.replace("import { Cylinder,", "import {");

// Add Cylinder to lucide-react import
content = content.replace(/import \{([^}]*)\} from 'lucide-react';/, (match, p1) => {
    if (!p1.includes('Cylinder')) {
        return `import { ${p1.trim()}, Cylinder } from 'lucide-react';`;
    }
    return match;
});

// Check if Cylinder is actually in a lucide-react import now, if not add a new import line
if (!content.includes("Cylinder } from 'lucide-react'") && !content.includes("Cylinder,") && !content.includes(", Cylinder")) {
    content = "import { Cylinder } from 'lucide-react';\n" + content;
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Dashboard.tsx import');
