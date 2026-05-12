import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, EyeOff, ChevronRight, Info, CheckCircle2, CloudOff, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { CURRENT_VERSION } from '../constants/versions';

export default function PrivacyPopup({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = React.useState(false);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-indigo-500 to-accent-600 text-white relative">
          <div className="absolute top-4 right-4 opacity-10">
            <Shield size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Bezpieczeństwo danych</p>
            <h2 className="text-3xl font-black mb-1">Twoja Prywatność</h2>
            <p className="text-accent-100 text-xs font-bold opacity-90">GlikoControl respectuje RODO i Twoje prawa</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
          <div className="space-y-4">
            <section>
              <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Klauzula Informacyjna (RODO)
              </h4>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                <p>
                  <span className="font-bold">1. Dane Wrażliwe:</span> Korzystając z aplikacji, będziesz wprowadzać dane dotyczące Twojego zdrowia (glikemia, insulinoterapia). Są to dane szczególnej kategorii.
                </p>
                <p>
                  <span className="font-bold">2. Cel:</span> Twoje dane służą wyłącznie do automonitoringu cukrzycy. Nie są profilowane pod kątem reklam ani udostępniane firmom farmaceutycznym.
                </p>
                <p>
                  <span className="font-bold">3. Pełna Kontrola:</span> W dowolnej chwili możesz wyeksportować swoje dane lub usunąć je całkowicie jednym kliknięciem w ustawieniach profilu ("Prawo do bycia zapomnianym").
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 flex gap-3 items-start">
                <Lock size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Szyfrowanie certyfikowane kluczem TLS 1.3.</div>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/20 flex gap-3 items-start">
                <Database size={14} className="text-sky-600 mt-0.5 shrink-0" />
                <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Dane przechowywane na serwerach w UE (GCP).</div>
              </div>
            </div>

            {/* Checkbox Zgody */}
            <label className="flex items-start gap-3 p-4 bg-accent-500/5 border border-accent-500/20 rounded-2xl cursor-pointer group hover:bg-accent-500/10 transition-colors">
              <div className="relative flex items-center h-5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-2 border-accent-500 text-accent-600 focus:ring-accent-500 cursor-pointer"
                />
              </div>
              <div className="text-[10px] leading-tight text-slate-700 dark:text-slate-300">
                <span className="font-black text-accent-600 uppercase">Wyrażam wyraźną zgodę</span> na przetwarzanie moich danych dotyczących zdrowia w celu korzystania z funkcji dzienniczka glikemii GlikoControl (zgodnie z Art. 9 ust. 2 lit. a RODO).
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0">
          <button
            onClick={onAccept}
            disabled={!agreed}
            className={cn(
              "w-full font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 group",
              agreed 
                ? "bg-accent-500 hover:bg-accent-600 text-white shadow-accent-500/25 cursor-pointer" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
            )}
          >
            Akceptuję i Zaczynamy <CheckCircle2 size={16} className={cn("transition-transform", agreed && "group-hover:scale-110")} />
          </button>
          <p className="text-center text-[8px] text-slate-400 dark:text-slate-600 mt-4 px-4 uppercase tracking-[0.1em]">
            Możesz wycofać zgodę w dowolnym momencie, usuwając konto.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
