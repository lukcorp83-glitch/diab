import fs from 'fs';

const path = 'src/components/Profile.tsx';
let data = fs.readFileSync(path, 'utf8');

// Replace standard input fields to unify style to rounded-[1.5rem] + shadow-inner + hover state
data = data.replace(
  /className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 pr-20 rounded-2xl/g,
  'className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 p-4 pr-20 rounded-[1.5rem] shadow-inner'
);

data = data.replace(
  /className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl/g,
  'className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 p-4 rounded-[1.5rem] shadow-inner'
);

// Nightscout inputs
data = data.replace(
  /className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl/g,
  'className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-[1.5rem] shadow-inner'
);

// Many bg-white inputs in sections
data = data.replace(
  /className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 (p-3|py-3|p-4|py-4)( .*?)rounded-xl/g,
  'className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 $1$2rounded-[1.5rem] shadow-inner'
);

data = data.replace(
  /className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl/g,
  'className="flex-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-3 rounded-[1.5rem] shadow-inner'
);

// Active scale fix
data = data.replace(/active:scale-90/g, 'active:scale-95');

// Update labels text-slate-500 -> text-slate-500 dark:text-slate-400
data = data.replace(/text-slate-500(?! dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-400');
// Avoid double dark:text-slate-400
data = data.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');

fs.writeFileSync(path, data, 'utf8');

// Similarly for SettingsSync.tsx
const path2 = 'src/components/SettingsSync.tsx';
let data2 = fs.readFileSync(path2, 'utf8');
data2 = data2.replace(/text-slate-500(?! dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-400');
data2 = data2.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');
fs.writeFileSync(path2, data2, 'utf8');

// Similarly for SettingsTransfer.tsx
const path3 = 'src/components/SettingsTransfer.tsx';
let data3 = fs.readFileSync(path3, 'utf8');
data3 = data3.replace(/text-slate-500(?! dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-400');
data3 = data3.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');
fs.writeFileSync(path3, data3, 'utf8');

// Similarly for MealEditModal.tsx
if(fs.existsSync('src/components/MealEditModal.tsx')){
  let data4 = fs.readFileSync('src/components/MealEditModal.tsx', 'utf8');
  data4 = data4.replace(/text-slate-500(?! dark:text-slate-400)/g, 'text-slate-500 dark:text-slate-400');
  data4 = data4.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-400/g, 'text-slate-500 dark:text-slate-400');
  fs.writeFileSync('src/components/MealEditModal.tsx', data4, 'utf8');
}
