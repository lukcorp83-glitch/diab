import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  {
    find: /"w-full h-32 rounded-\[1.75rem\] flex flex-col p-4 transition-all duration-300 relative overflow-hidden group bg-slate-50 dark:bg-slate-800\/50 border border-slate-100 dark:border-slate-700\/50",\n\s*!isEditingTiles && "hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 cursor-pointer",/g,
    replace: `"w-full h-32 rounded-[1.75rem] flex flex-col p-4 transition-all duration-300 relative overflow-hidden group",\n                    settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50",\n                    !isEditingTiles && (settings.glassmorphismEnabled ? "hover:bg-white/20 dark:hover:bg-slate-800/30 hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 cursor-pointer"),`
  },
  {
    find: /className="flex bg-slate-50 dark:bg-slate-800\/50 rounded-\[1.5rem\] p-1 items-center"/g,
    replace: 'className={cn("flex rounded-[1.5rem] p-1 items-center", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/10 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50")}'
  },
  {
    find: /className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-\[1.5rem\] text-\[10px\] uppercase font-black tracking-widest shrink-0"/g,
    replace: 'className={cn("flex items-center gap-2 transition-colors duration-200 px-4 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest shrink-0", settings.glassmorphismEnabled ? "text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-800/30 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20" : "text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800")}'
  },
  {
    find: /activeCategory === cat\.id \? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"/g,
    replace: `activeCategory === cat.id \n                      ? (settings.glassmorphismEnabled ? "bg-white/30 dark:bg-slate-700/50 shadow-sm text-slate-900 dark:text-white border border-white/30 dark:border-white/10" : "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white") \n                      : (settings.glassmorphismEnabled ? "text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800/30" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")`
  }
];

regexes.forEach(({find, replace}) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied');
