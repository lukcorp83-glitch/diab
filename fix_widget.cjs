const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/GlikoWidget.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure Cylinder is imported
if (!content.includes('Cylinder')) {
    content = content.replace(/import \{ Radio, Droplet, Clock, ChevronRight, Utensils \} from 'lucide-react';/, "import { Radio, Droplet, Cylinder, Clock, ChevronRight, Utensils } from 'lucide-react';");
}

// Replace Droplet with Cylinder for Dziś Jednostek
content = content.replace(/<Droplet size=\{12\} className="text-accent-500" \/>/g, '<Cylinder size={12} className="text-accent-500" />');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed GlikoWidget Dziś Jednostek icon');
