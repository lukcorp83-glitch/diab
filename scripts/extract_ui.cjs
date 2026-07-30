const fs = require('fs');

const content = fs.readFileSync('src/components/MealPlate.tsx', 'utf8');

const searchUiStart = content.indexOf('<div className="w-full relative mt-4">');
const composerUiStart = content.indexOf('<div className="mt-6 border-t border-white/10 pt-6">');

console.log('uiStart', searchUiStart, 'uiEnd', composerUiStart);

if (searchUiStart > -1 && composerUiStart > -1) {
  fs.writeFileSync('search_ui.tsx', content.substring(searchUiStart, composerUiStart));
}
