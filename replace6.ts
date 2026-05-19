import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  // Czas Insuliny
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700\/50 flex flex-col items-center justify-center text-center"/g,
    replace: 'className={cn("p-4 rounded-3xl border flex flex-col items-center justify-center text-center", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}'
  },
  // Sensors and Wkłucia
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700\/50"/g,
    replace: 'className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}'
  },
  // Meals container 1924, 2100 (diff string)
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/80 p-6 rounded-\[2rem\] border border-slate-200 dark:border-slate-700 space-y-4 shadow-inner"/g,
    replace: 'className={cn("p-6 rounded-[2rem] border space-y-4 shadow-inner", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5" : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700")}'
  },
  {
    find: /className="bg-slate-50 dark:bg-slate-800 p-6 rounded-\[2rem\] border border-slate-200 dark:border-slate-700 space-y-5"/g,
    replace: 'className={cn("p-6 rounded-[2rem] border space-y-5", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)]" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}'
  },
  {
    find: /className="bg-slate-50 dark:bg-slate-800\/80 p-5 rounded-\[1.5rem\] border border-slate-100 dark:border-slate-700\/50"/g,
    replace: 'className={cn("p-5 rounded-[1.5rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50")}'
  },
  {
    find: /className="flex flex-col gap-2 p-5 bg-slate-50 dark:bg-slate-800\/80 rounded-\[2rem\] border border-slate-100 dark:border-slate-700\/50"/g,
    replace: 'className={cn("flex flex-col gap-2 p-5 rounded-[2rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50")}'
  },
  {
    find: /(med\.active \n\s*\? )"bg-slate-50 dark:bg-slate-800\/50 border-slate-100 dark:border-slate-700"/g,
    replace: '$1(settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")'
  },
  {
    find: /className="p-4 bg-slate-50 dark:bg-slate-800\/50 rounded-2xl border border-slate-100 dark:border-slate-700"/g,
    replace: 'className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5 shadow-sm" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}'
  },
  {
    find: /className="p-6 bg-slate-50 dark:bg-slate-800\/80 rounded-\[2rem\] border border-slate-200 dark:border-slate-700 shadow-inner relative"/g,
    replace: 'className={cn("p-6 rounded-[2rem] border shadow-inner relative", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5" : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700")}'
  },
  {
    find: /className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-\[2rem\] border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all"/g,
    replace: 'className={cn("flex items-center gap-3 p-4 rounded-[2rem] border group hover:shadow-md transition-all", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/5 dark:bg-slate-900/5 border-white/10 dark:border-white/5" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700")}'
  },
  {
    find: /className={cn\("rounded-\[2.5rem\] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity", settings.glassmorphismEnabled \? "backdrop-blur-2xl bg-white\/10 dark:bg-slate-900\/10 border-white\/20 dark:border-white\/10 shadow-\[0_8px_32px_0_rgba\(31,38,135,0.07\)\]" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"\)}/g,
    replace: 'className={cn("rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity", settings.glassmorphismEnabled ? "backdrop-blur-2xl bg-white/10 dark:bg-slate-900/10 border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  }
];

regexes.forEach(({find, replace}) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied 6');
