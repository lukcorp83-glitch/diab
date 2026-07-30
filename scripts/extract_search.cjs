const fs = require('fs');
const content = fs.readFileSync('src/components/MealPlate.tsx', 'utf8');

const fStart = content.indexOf('const runOFFSearch = async () => {');
const fEnd = content.indexOf('const openShortcutConfirmModal = (product: Product) => {');

const uiStart = content.indexOf('<div className="space-y-4">');
const uiEnd = content.indexOf('<div className="mt-6 border-t border-white/10 pt-6">');

console.log('fStart', fStart, 'fEnd', fEnd, 'uiStart', uiStart, 'uiEnd', uiEnd);

if (fStart > -1 && fEnd > -1 && uiStart > -1 && uiEnd > -1) {
  const funcs = content.substring(fStart, fEnd);
  const ui = content.substring(uiStart, uiEnd);
  fs.writeFileSync('extracted_search.tsx', funcs + '\n\n' + ui);
  console.log('Successfully extracted logic to extracted_search.tsx');
} else {
  console.log('Could not find all blocks');
}
