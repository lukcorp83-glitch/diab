import fs from 'fs';

const filePath = 'src/components/Profile.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regexes = [
  {
    find: /className="bg-white dark:bg-slate-900 rounded-\[2.5rem\] p-6 border border-slate-100 dark:border-slate-800/g,
    replace: 'className="backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-white/50 dark:border-white/10'
  },
  {
    find: /className="bg-slate-100 dark:bg-slate-900 rounded-\[2.5rem\] p-6 border border-slate-200 dark:border-slate-800"/g,
    replace: 'className="backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-white/50 dark:border-white/10"'
  },
  {
    find: /className="bg-white dark:bg-slate-900 p-6 rounded-\[2.5rem\] border border-slate-100 dark:border-slate-800/g,
    replace: 'className="backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/50 dark:border-white/10'
  },
  {
    find: /className="group relative bg-white dark:bg-slate-900 p-6 rounded-\[2.5rem\] border border-slate-100 dark:border-slate-800/g,
    replace: 'className="group relative backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/50 dark:border-white/10'
  },
  {
    find: /className="bg-slate-50 dark:bg-slate-900 rounded-\[2.5rem\] p-8 border border-slate-100 dark:border-slate-800/g,
    replace: 'className="backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/50 dark:border-white/10'
  }
];

regexes.forEach(({find, replace}) => {
  content = content.replace(find, replace);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied');
