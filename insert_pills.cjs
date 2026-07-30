const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                       </div>
                     </div>
                   );
                 })()}
              </>
           )}
        </div>`;

const injectContent = `                       </div>
                     </div>
                   );
                 })()}
              </>
           )}
           {settings?.inventory && settings.inventory.filter((item) => ['cannulas', 'sensors', 'reservoirs'].includes(item.category)).map((item) => {
             let colorClass = "text-slate-600 dark:text-slate-300";
             let fillClass = "bg-slate-100/80 dark:bg-slate-800/80";
             let bgClass = "bg-slate-100/50 border-slate-200/50 dark:border-slate-700/50";
             
             const threshold = typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : 1;
             if (item.quantity <= threshold) {
                 colorClass = "text-rose-600 dark:text-rose-400";
                 fillClass = "bg-rose-500/20 dark:bg-rose-500/30";
                 bgClass = "bg-rose-500/10 border-rose-500/20 animate-pulse";
             }
             
             return (
               <div key={item.id} className={\`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[1rem] border text-[11px] font-black uppercase tracking-widest shadow-sm transition-colors \${bgClass} \${colorClass}\`}>
                 {item.category === 'cannulas' && <Activity size={12} className={item.quantity <= threshold ? "text-rose-500" : "text-emerald-500"} />}
                 {item.category === 'sensors' && <Zap size={12} className={item.quantity <= threshold ? "text-rose-500" : "text-amber-500"} />}
                 {item.category === 'reservoirs' && <Cylinder size={12} className={item.quantity <= threshold ? "text-rose-500" : "text-purple-500"} />}
                 {item.quantity} {item.unit || 'szt.'}
               </div>
             );
           })}
        </div>`;

// Use simple replacement, removing whitespace differences
let normalizedContent = content.replace(/\r\n/g, '\n');
let normalizedTarget = targetStr.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    content = normalizedContent.replace(normalizedTarget, injectContent);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully injected pills!');
} else {
    console.log('Failed to match target string.');
}
