import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The ultimate glassmorphism class to simulate elevated cut glass
const glassClass = "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset";

content = content.replace(/backdrop-blur-(?:xl|2xl) bg-white\/[0-9]+ dark:bg-slate-[0-9]+\/[0-9]+ border(?:-white\/[0-9]+)? border-white\/[0-9]+ dark:border-white\/[0-9]+(?: shadow-\[[^\]]+\]| shadow-[a-z]+)?/g, glassClass);

// Handle cases with just backdrop-blur-xl bg-white/x dark:bg-x/x border-white/x dark:border-white/x without existing 'border ' word before
content = content.replace(/backdrop-blur-(?:xl|2xl) bg-white\/[0-9]+ dark:bg-slate-[0-9]+\/[0-9]+ border-white\/[0-9]+ dark:border-white\/[0-9]+(?: shadow-\[[^\]]+\]| shadow-[a-z]+)?/g, glassClass);

// specific fixes just in case
content = content.replace(/backdrop-blur-xl bg-white\/5 dark:bg-slate-900\/5 border-white\/10 dark:border-white\/5(?: shadow-\[[^\]]+\]| shadow-sm)?/g, glassClass);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied 7');
