const fs = require('fs');
const glob = require('glob');
const path = require('path');

console.log('--- STARTING GLOBAL REPAIR ---');

const files = glob.sync('src/components/**/*.tsx');
let fixedFilesCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix all unterminated string literals in defaultValue (newlines inside ' ')
    const regex = /\{\s*defaultValue\s*:\s*'([\s\S]*?)'\s*\}/g;
    const newContent = content.replace(regex, (match, p1) => {
        const safeString = p1.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
        return `{ defaultValue: '${safeString}' }`;
    });
    
    // Dodatkowo, the broken motion.div in Profile.tsx
    let finalContent = newContent;
    if (file.endsWith('Profile.tsx')) {
        // Fix the broken div tags
        const brokenString = `              <motion.div
                whileHover={{ y: -1 }}
                className="flex flex-col gap-2 p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-white/20 dark:border-slate-800/50 mt-6 text-left shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                      <Brain size={12} />
                    </div>
                    {t('auto.program_badawczy_glikosense', { defaultValue: 'Program Badawczy GlikoSense' })}
                  </h4>
                  <button
                    onClick={() => {
                      const val = !telemetryEnabled;
                      setTelemetryEnabled(val);
                      localStorage.setItem(
                        "glikosense_telemetry",
                        val ? "true" : "false"
                      );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      telemetryEnabled && "bg-purple-500 pl-5"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug font-bold">
                  {t('auto.pomoz_spolecznosci', { defaultValue: 'Pomóż społeczności. Włącz anonimowe udostępnianie wiedzy wyuczonej przez Twój model AI (GlikoSense).' })}
                </p>
              </motion.div>
            </div>
          </div>

          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-2xl shadow-lg">
                <Trash size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.1em]">
                  {t('auto.strefa_niebezpieczenstwa', { defaultValue: 'Strefa Niebezpieczeństwa' })}
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                  {t('auto.nieodwracalne_usuniecie', { defaultValue: 'Nieodwracalne usunięcie konta i wszystkich pomiarów' })}
                </p>
              </div>
            </div>
            <button
              onClick={nukeAllData}
              disabled={nukeLoading}
              className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              {nukeLoading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <LogOut size={16} />
              )}
              {t('auto.usun_konto_i_dane', { defaultValue: 'Usuń Konto i Dane' })}
            </button>
          </div>
        </motion.div>
      )}

      `;
      
      // Let's just find exactly where activeCategory === "pairing" starts
      // and where telemetry button starts, and replace everything in between.
      const searchStart = '{t(\'auto.program_badawczy_glikosense\', { defaultValue: \'Program Badawczy GlikoSense\' })}';
      const searchEnd = '{activeCategory === "pairing" && (';
      
      const s1 = finalContent.indexOf(searchStart);
      const s2 = finalContent.indexOf(searchEnd);
      
      if (s1 !== -1 && s2 !== -1) {
          // We go a bit backwards to include the whole motion.div
          const realStart = finalContent.lastIndexOf('<motion.div', s1);
          if (realStart !== -1) {
              const before = finalContent.substring(0, realStart);
              const after = finalContent.substring(s2);
              finalContent = before + brokenString + after;
              console.log('-> Patched Profile.tsx structure!');
          }
      }
    }
    
    if (finalContent !== content) {
        fs.writeFileSync(file, finalContent);
        fixedFilesCount++;
    }
}

console.log('Fixed files: ' + fixedFilesCount);
