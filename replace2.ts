import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-6 border border-white\/50 dark:border-white\/10"/g,
    replace: 'className={cn("rounded-[2.5rem] p-6 border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-6 border border-white\/50 dark:border-white\/10 shadow-xl space-y-6"/g,
    replace: 'className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 p-6 rounded-\[2.5rem\] border border-white\/50 dark:border-white\/10 shadow-xl space-y-4"/g,
    replace: 'className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-4", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="group relative backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 p-6 rounded-\[2.5rem\] border border-white\/50 dark:border-white\/10 shadow-xl overflow-hidden"/g,
    replace: 'className={cn("group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-8 border border-white\/50 dark:border-white\/10 shadow-xl space-y-6"/g,
    replace: 'className={cn("rounded-[2.5rem] p-8 border shadow-xl space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-6 border border-white\/50 dark:border-white\/10 shadow-xl"/g,
    replace: 'className={cn("rounded-[2.5rem] p-6 border shadow-xl", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-6 border border-white\/50 dark:border-white\/10 shadow-xl space-y-4"/g,
    replace: 'className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-4", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  },
  {
    find: /className="backdrop-blur-xl bg-white\/40 dark:bg-slate-900\/40 rounded-\[2.5rem\] p-8 border border-white\/50 dark:border-white\/10 shadow-sm opacity-60 hover:opacity-100 transition-opacity"/g,
    replace: 'className={cn("rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800")}'
  }
];

regexes.forEach(({find, replace}) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied');
