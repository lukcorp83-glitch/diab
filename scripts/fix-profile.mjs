import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pPath = path.join(__dirname, "../src/components/Profile.tsx");
let content = fs.readFileSync(pPath, "utf8");

// Uporządkujmy całą rozpadającą się strukturę w okolicach Programu Badawczego (który wyciął TS-Morph)
const blockStart = `<motion.div
                whileHover={{ y: -1 }}`;
const blockEnd = `{activeCategory === "pairing" && (`;

const splitIdx1 = content.indexOf(blockStart);
const splitIdx2 = content.indexOf(blockEnd, splitIdx1);

if (splitIdx1 !== -1 && splitIdx2 !== -1) {
    const fixedBlock = `<motion.div
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
    content = content.substring(0, splitIdx1) + fixedBlock + content.substring(splitIdx2);
    console.log("-> Naprawiono zniszczony blok Programu Badawczego.");
}

// Fix dla Linii 2519 z nie domkniętym enterem "Urządzenie główne zablokowało możliwość..."
const badString = "{t('auto.urządzenie_główne_zablokowało_możli', { defaultValue: 'Urządzenie główne zablokowało możliwość                 edycji tych ustawień.' })}";
const badRegex = /\{t\('auto\.urządzenie_główne_zablokowało_możli',\s*\{\s*defaultValue:\s*'Urządzenie główne zablokowało możliwość[\s\n]+edycji tych ustawień\.'\s*\}\)\}/g;

content = content.replace(badRegex, "{t('auto.urzadzenie_glowne_zablokowalo', { defaultValue: 'Urządzenie główne zablokowało możliwość edycji tych ustawień.' })}");
console.log("-> Naprawiono enter w bloku urządzeń głównych.");

fs.writeFileSync(pPath, content);
console.log("Zapisano!");
