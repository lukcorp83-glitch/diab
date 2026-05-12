import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, EyeOff, ChevronRight, Info, CheckCircle2, CloudOff, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { CURRENT_VERSION } from '../constants/versions';

export default function PrivacyPopup({ onAccept }: { onAccept: () => void }) {
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Ważna informacja</p>
            <h2 className="text-3xl font-black mb-1">Twoje Dane, Twoja Kontrola</h2>
            <p className="text-accent-100 text-xs font-bold opacity-90">Prywatność i aktualizacja GlikoControl v{CURRENT_VERSION}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
          {/* Update Info Block */}
          <div className="bg-accent-50 dark:bg-accent-500/5 rounded-3xl p-5 border border-accent-100 dark:border-accent-500/20">
            <h4 className="text-[10px] font-black text-accent-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info size={14} /> Giga-Aktualizacja Bento 2.0
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Wprowadziliśmy całkowicie nowy interfejs użytkownika, który jest jeszcze szybszy i bardziej przejrzysty. Twoje dane zostały bezpiecznie zmigrowane do nowego formatu.
            </p>
          </div>

          {/* Privacy Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3">
                <Lock size={18} />
              </div>
              <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Pełne Szyfrowanie</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Wszystkie dane są przesyłane bezpiecznym kanałem TLS i przechowywane w Firebase.</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3">
                <EyeOff size={18} />
              </div>
              <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Zero Przetwarzania</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Dane NIE są przetwarzane do reklam ani profilowania. Służą tylko do Twojej samokontroli.</p>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/20">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 mb-3">
                <CloudOff size={18} />
              </div>
              <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Prawo do Zapomnienia</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">W każdej chwili możesz usunąć 100% swoich danych w ustawieniach Profilu.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-3">
                <Database size={18} />
              </div>
              <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Lokalność Danych</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Aplikacja wykorzystuje IndexedDB do szybkiego dostępu offline bez transferu danych.</p>
            </div>
          </div>

          {/* Legal Small Text */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed italic">
            Klikając przycisk poniżej, oświadczasz, że zapoznałeś się z zasadami przetwarzania danych osobowych (RODO) zawartymi wewnątrz aplikacji. Twoje dane medyczne są chronione zgodnie z RODO, a Ty pozostajesz ich jedynym administratorem.
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 pt-0">
          <button
            onClick={onAccept}
            className="w-full bg-accent-500 hover:bg-accent-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-accent-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            Akceptuję i Zaczynamy <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
