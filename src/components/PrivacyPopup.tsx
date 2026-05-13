import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock as LucideLock, EyeOff, ChevronRight, Info, CheckCircle2, CloudOff, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { CURRENT_VERSION } from '../constants/versions';

export default function PrivacyPopup({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = React.useState(false);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg glass rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-indigo-700/80 to-accent-600/80 text-white relative backdrop-blur-xl border-b border-white/10">
          <div className="absolute top-4 right-4 opacity-10">
            <Shield size={120} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 mb-3">
              <Shield size={10} className="fill-white" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Bezpieczeństwo danych</span>
            </div>
            <h2 className="text-3xl font-black mb-1 leading-tight tracking-tighter font-display uppercase italic">Twoja Prywatność</h2>
            <p className="text-accent-100 text-[10px] font-black tracking-widest uppercase opacity-90">GlikoControl respectuje RODO i Twoje prawa</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
          <div className="space-y-6">
            <section>
              <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2 font-display">
                <CheckCircle2 size={14} className="text-emerald-500" /> Klauzula Informacyjna (RODO)
              </h4>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed font-bold opacity-80">
                <p>
                  <span className="text-accent-500 uppercase tracking-tighter mr-1">01. Dane Wrażliwe:</span> Korzystając z aplikacji, będziesz wprowadzać dane dotyczące Twojego zdrowia (glikemia, insulinoterapia). Są to dane szczególnej kategorii.
                </p>
                <p>
                  <span className="text-accent-500 uppercase tracking-tighter mr-1">02. Cel:</span> Twoje dane służą wyłącznie do automonitoringu cukrzycy. Nie są profilowane pod kątem reklam ani udostępniane firmom farmaceutycznym.
                </p>
                <p>
                  <span className="text-accent-500 uppercase tracking-tighter mr-1">03. Pełna Kontrola:</span> W dowolnej chwili możesz wyeksportować swoje dane lub usunąć je całkowicie jednym kliknięciem w ustawieniach profilu.
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[1.5rem] bg-white/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex gap-3 items-start group hover:border-emerald-500/30 transition-all">
                <LucideLock size={16} className="text-emerald-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">Szyfrowanie certyfikowane kluczem TLS 1.3.</div>
              </div>
              <div className="p-4 rounded-[1.5rem] bg-white/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex gap-3 items-start group hover:border-sky-500/30 transition-all">
                <Database size={16} className="text-sky-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">Dane przechowywane na serwerach w UE (GCP).</div>
              </div>
            </div>

            {/* Checkbox Zgody */}
            <label className="flex items-start gap-4 p-5 bg-accent-500/5 dark:bg-accent-500/10 border border-accent-500/20 rounded-[2rem] cursor-pointer group hover:bg-accent-500/15 transition-all">
              <div className="relative flex items-center h-5 mt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-2 border-accent-500 text-accent-600 focus:ring-accent-500 cursor-pointer transition-transform hover:scale-110"
                />
              </div>
              <div className="text-[10px] font-bold leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-black text-accent-600 uppercase tracking-tighter">Wyrażam wyraźną zgodę</span> na przetwarzanie moich danych dotyczących zdrowia w celu korzystania z funkcji dzienniczka glikemii GlikoControl (zgodnie z Art. 9 ust. 2 lit. a RODO).
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
              "w-full font-black py-5 rounded-[1.8rem] uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group font-display",
              agreed 
                ? "bg-accent-600 hover:bg-accent-500 text-white shadow-accent-600/20 cursor-pointer" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
            )}
          >
            Akceptuję i Zaczynamy <CheckCircle2 size={16} className={cn("transition-transform", agreed && "group-hover:scale-110")} />
          </button>
          <p className="text-center text-[9px] font-black text-slate-400 dark:text-slate-500 mt-5 px-4 uppercase tracking-[0.1em] opacity-50">
            Możesz wycofać zgodę w dowolnym momencie.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
