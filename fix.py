import re

with open('C:/Users/luk/Downloads/diab/src/components/MealPlate/ProductSearch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace {p.gi > 0 && (...)} with a version that always renders
pattern = r"\{p\.gi > 0 && \(\s*<div className="flex gap-1">\s*<span className=\{cn\(\s*"text-\[9px\] font-black uppercase tracking-widest px-1\.5 py-0\.5 rounded-md",\s*p\.gi <= 55 \? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :\s*p\.gi <= 69 \? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :\s*"bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"\s*\)\}>IG: \{p\.gi\}</span>\s*<span className=\{cn\(\s*"text-\[9px\] font-black uppercase tracking-widest px-1\.5 py-0\.5 rounded-md",\s*\(\(p\.gi \* \(p\.carbs \|\| 0\)\) / 100\) <= 10 \? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :\s*\(\(p\.gi \* \(p\.carbs \|\| 0\)\) / 100\) <= 19 \? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :\s*"bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"\s*\)\}>ŁG: \{\(\(p\.gi \* \(p\.carbs \|\| 0\)\) / 100\)\.toFixed\(1\)\}</span>\s*</div>\s*\)\}"

replacement = '''<div className="flex gap-1">
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         !p.gi ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         p.gi <= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         p.gi <= 69 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>IG: {p.gi || '?'}</span>
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         !p.gi ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 10 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 19 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>ŁG: {p.gi ? ((p.gi * (p.carbs || 0)) / 100).toFixed(1) : '?'}</span>
     </div>'''

new_content = re.sub(pattern, replacement, content)

with open('C:/Users/luk/Downloads/diab/src/components/MealPlate/ProductSearch.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Replaced {len(content) - len(new_content)} characters. Found matches: {len(re.findall(pattern, content))}")
