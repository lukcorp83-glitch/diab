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
          {/* Informacja RODO - Oficjalna Sekcja */}
          <div className="space-y-4">
            <section>
              <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> Klauzula Informacyjna (RODO)
              </h4>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                <p>
                  <span className="font-bold">1. Administrator Danych:</span> Administratorem danych osobowych i medycznych wprowadzanych do aplikacji jest Użytkownik. Infrastrukturę techniczną (przechowywanie) zapewnia GlikoControl w oparciu o usługi Google Firebase.
                </p>
                <p>
                  <span className="font-bold">2. Cel Przetwarzania:</span> Twoje dane są przetwarzane wyłącznie w celu prowadzenia cyfrowego dzienniczka samokontroli cukrzycy, analizy trendów oraz (opcjonalnie) synchronizacji między Twoimi urządzeniami.
                </p>
                <p>
                  <span className="font-bold">3. Brak Profilowania Reklamowego:</span> Twoje dane <span className="text-rose-500 font-bold uppercase">nie są</span> sprzedawane, udostępniane podmiotom trzecim ani wykorzystywane do profilowania marketingowego.
                </p>
                <p>
                  <span className="font-bold">4. Twoje Prawa:</span> Przysługuje Ci prawo do dostępu do swoich danych, ich sprostowania, przenoszenia oraz <span className="font-bold italic">całkowitego usunięcia</span>. Możesz to zrobić w dowolnym momencie w sekcji Profil.
                </p>
                <p>
                  <span className="font-bold">5. Okres Przechowywania:</span> Dane są przechowywane tak długo, jak posiadasz aktywne konto lub do momentu skorzystania przez Ciebie z funkcji "Usuń Wszystkie Dane".
                </p>
              </div>
            </section>

            {/* Inne korzyści */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3">
                  <Lock size={18} />
                </div>
                <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Szyfrowanie TLS</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Dane przesyłane są bezpiecznym kanałem, identycznym jak w bankowości.</p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/20">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 mb-3">
                  <EyeOff size={18} />
                </div>
                <h5 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Prywatność AI</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Analiza GlikoSense odbywa się lokalnie lub w zaufanej chmurze bez dostępu osób postronnych.</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
            Potwierdzając, wyrażasz zgodę na powyższe zasady. Masz również prawo do wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uznasz, że Twoje dane są przetwarzane niezgodnie z prawem.
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
