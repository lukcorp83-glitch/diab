import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// replace bg-white/40 with bg-white/10 and backdrop-blur-xl with backdrop-blur-2xl
content = content.replace(/backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40/g, 'backdrop-blur-2xl bg-white/10 dark:bg-slate-900/10');
// also adjust border to be more subtle if needed
content = content.replace(/border-white\/50/g, 'border-white/20');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Profile updated');
