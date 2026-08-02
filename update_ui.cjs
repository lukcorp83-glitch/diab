const fs = require('fs');
const path = 'C:/Users/luk/Downloads/diab/src/components/MealPlate/ProductSearch.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix categories
content = content.replace(
  /{key=\{cat\}\s*onClick=\{\(\) => \{ setActiveCategory\(cat\); Haptics.light\(\); \}\}\s*className=\{cn\(\s*"snap-start px-4 py-2\.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2",\s*activeCategory === cat \? "bg-slate-800 text-white" : "bg-white text-slate-500"\s*\)\}\s*>\s*\{cat\}\s*<\/button>/g,
  `key={cat}
 onClick={() => { setActiveCategory(cat); Haptics.light(); }}
 className={cn(
 "snap-start px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2",
 activeCategory === cat ? "bg-slate-800 text-white dark:bg-accent-500" : "bg-white text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/50"
 )}
 >
 {cat === 'all' ? t('meal.all', { defaultValue: 'Wszystkie' }) : cat === 'custom' ? t('meal.custom', { defaultValue: 'Własne' }) : cat === 'community' ? t('meal.community', { defaultValue: 'Społeczność' }) : cat}
 </button>`
);

// Fix IG and Buttons in Online Results
const onlineMatch = `<h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{getProductName(p, i18n.language)}</h4>
 {getDietBadge(p, settings?.activeDiet || null)}
 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <span>{p.carbs}g Węgle</span>
 <span>{p.protein}g Białko</span>
 <span>{p.fat}g Tłuszcz</span>
 </div>
 </div>
 </div>`;

const onlineReplacement = `<h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{getProductName(p, i18n.language)}</h4>
 {getDietBadge(p, settings?.activeDiet || null)}
 {p.gi > 0 && (
   <span className={cn(
     "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
     p.gi <= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
     p.gi <= 69 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
     "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
   )}>IG: {p.gi}</span>
 )}
 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <span>{p.carbs}g Węgle</span>
 <span>{p.protein}g Białko</span>
 <span>{p.fat}g Tłuszcz</span>
 </div>
 </div>
 <div className="flex flex-col gap-1 ml-2 shrink-0">
  <button onClick={(e) => { e.stopPropagation(); saveToCustomDb && saveToCustomDb(p); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-all" title="Zapisz do własnych">
    <BookMarked size={14} />
  </button>
  <button onClick={(e) => { e.stopPropagation(); openShortcutConfirmModal && openShortcutConfirmModal(p); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg hover:bg-amber-100 transition-all" title="Skrót posiłku">
    <Plus size={14} />
  </button>
 </div>
 </div>`;

content = content.replace(onlineMatch, onlineReplacement);

// Fix IG and Buttons in Browse Results
const browseMatch = `<SwipeableItem onSwipeLeft={() => {}} disabled={true}>
 <div
 onClick={() => openWeightModal(p)}
 className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:border-accent-500/30 transition-all cursor-pointer shadow-sm relative group"
 >
 <div className="flex-1 min-w-0 py-1">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
 {getProductName(p, i18n.language)}
 </h4>
 {getDietBadge(p, settings?.activeDiet || null)}

 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
 <span>
 {t('meal.carbs_long', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
 {Number(p.carbs || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.protein_long', { defaultValue: i18n.t('auto.bialko', { defaultValue: "Białko:" }) })}{" "}
 {Number(p.protein || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.fat_long', { defaultValue: i18n.t('auto.tluszcz', { defaultValue: "Tłuszcz:" }) })}{" "}
 {Number(p.fat || 0).toFixed(1)}g
 </span>
 </div>
 </div>
 {p.isCustom && (
 <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest">
 <BookMarked size={12} />
 </div>
 )}
 {p.isCommunity && (
 <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-500 text-[9px] font-black uppercase tracking-widest">
 <Globe size={12} />
 </div>
 )}
 </div>
 </SwipeableItem>`;

const browseReplacement = `<div
 onClick={() => openWeightModal(p)}
 className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:border-accent-500/30 transition-all cursor-pointer shadow-sm relative group"
 >
 <div className="flex-1 min-w-0 py-1">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
 {getProductName(p, i18n.language)}
 </h4>
 {getDietBadge(p, settings?.activeDiet || null)}
 {p.gi > 0 && (
   <span className={cn(
     "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
     p.gi <= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
     p.gi <= 69 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
     "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
   )}>IG: {p.gi}</span>
 )}
 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
 <span>
 {t('meal.carbs_long', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
 {Number(p.carbs || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.protein_long', { defaultValue: i18n.t('auto.bialko', { defaultValue: "Białko:" }) })}{" "}
 {Number(p.protein || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.fat_long', { defaultValue: i18n.t('auto.tluszcz', { defaultValue: "Tłuszcz:" }) })}{" "}
 {Number(p.fat || 0).toFixed(1)}g
 </span>
 </div>
 </div>
 <div className="flex flex-col gap-1 ml-2 shrink-0">
  {!p.isCustom && !p.isCommunity && (
    <button onClick={(e) => { e.stopPropagation(); saveToCustomDb && saveToCustomDb(p); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-all" title="Zapisz do własnych">
      <BookMarked size={14} />
    </button>
  )}
  {p.isCustom && !p.isCommunity && (
    <button onClick={(e) => { e.stopPropagation(); publishToCommunity && publishToCommunity(p); }} className="p-2 text-teal-500 bg-teal-50 dark:bg-teal-500/10 rounded-lg hover:bg-teal-100 transition-all" title="Opublikuj">
      <Globe size={14} />
    </button>
  )}
  <button onClick={(e) => { e.stopPropagation(); openShortcutConfirmModal && openShortcutConfirmModal(p); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg hover:bg-amber-100 transition-all" title="Skrót posiłku">
    <Plus size={14} />
  </button>
 </div>
 </div>`;

content = content.replace(browseMatch, browseReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
