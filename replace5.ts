import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  // Shortcuts
  {
    find: /className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800\/50 rounded-\[1.8rem\] border border-slate-100 dark:border-slate-700\/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all"/g,
    replace: 'className={cn("group flex items-center justify-between p-4 rounded-[1.8rem] border hover:shadow-lg transition-all", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 hover:bg-white/10 dark:hover:bg-white/10" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800")}'
  },
  // System toggle widgets
  {
    find: /className="group flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800\/50 rounded-\[2rem\] border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md"/g,
    replace: 'className={cn("group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}'
  },
  // Media Player Widget Toggle
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/50 p-6 rounded-\[2.5rem\] border border-slate-100 dark:border-slate-700"/g,
    replace: 'className={cn("p-6 rounded-[2.5rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}'
  },
  // Visual Appearance Cards
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/50 p-6 rounded-\[2.5rem\] border border-slate-100 dark:border-slate-700 space-y-6"/g,
    replace: 'className={cn("p-6 rounded-[2.5rem] border space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}'
  },
  // Administracja list item
  {
    find: /className="p-4 bg-slate-50 dark:bg-slate-800\/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between"/g,
    replace: 'className={cn("p-4 rounded-2xl border flex items-center justify-between", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}'
  }
];

regexes.forEach(({find, replace}) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied');
