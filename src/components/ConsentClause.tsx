import i18n from '../i18n';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

interface ConsentClauseProps {
  onAccept: () => void;
  user: any;
}

export default function ConsentClause({ onAccept, user }: ConsentClauseProps) {
    const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!agreed) {
      setError(i18n.t('auto.musisz_zaakceptowac_warunki_kl', { defaultValue: i18n.t('auto.musisz_zaakceptowac_warun', { defaultValue: "Musisz zaakceptować warunki klauzuli." }) }));
      return;
    }
    
    setLoading(true);
    try {
      await onAccept();
    } catch (err) {
      setError(i18n.t('auto.wystapil_blad_podczas_zapisywa', { defaultValue: i18n.t('auto.wystapil_blad_podczas_zap', { defaultValue: "Wystąpił błąd podczas zapisywania zgody." }) }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 pt-safe pb-safe z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass w-full max-w-lg rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden my-auto"
      >
        <div className="p-10 space-y-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner group transition-transform hover:rotate-3">
              <ShieldCheck size={36} className="group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h2 className="text-2xl font-black dark:text-white leading-tight font-display uppercase tracking-tighter italic">{t('auto.klauzula_zgody', { defaultValue: 'Klauzula Zgody' })}</h2>
              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mt-1">{t('auto.zgodność_z_rodo_gdpr_ue', { defaultValue: i18n.t('auto.zgodnosc_z_rodo_gdpr_ue', { defaultValue: "Zgodność z RODO / GDPR (UE)" }) })}</p>
            </div>
          </div>

          <div className="bg-white/5 dark:bg-white/5 rounded-[2rem] p-7 border border-black/5 dark:border-white/5 max-h-[40vh] overflow-y-auto no-scrollbar">
            <div className="prose prose-sm dark:prose-invert">
              <h4 className="text-[11px] font-black uppercase tracking-widest mb-5 text-indigo-500 font-display">{t('auto.zgoda_na_przetwarzanie_danych_zdrow', { defaultValue: 'Zgoda na przetwarzanie danych zdrowotnych' })}</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-bold opacity-80">
                
                                              {t('auto.niniejszym_wyrażam_dobrowolną_i_świ', { defaultValue: i18n.t('auto.niniejszym_wyrazam_dobrow', { defaultValue: "Niniejszym wyrażam dobrowolną i świadomą zgodę na przetwarzanie moich danych osobowych dotyczących stanu zdrowia (wyniki glikemii, insulinoterapia, dieta) w aplikacji GlikoControl." }) })}
                                            </p>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-4 mt-6 list-none pl-0 font-bold opacity-70">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{t('auto.dane_są_używane_wyłącznie_do_twojej', { defaultValue: i18n.t('auto.dane_sa_uzywane_wylacznie', { defaultValue: "Dane są używane wyłącznie do Twojej analizy przez moduł GlikoSense AI." }) })}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{t('auto.prawo_do_wycofania_zgody_w_dowolnym', { defaultValue: i18n.t('auto.prawo_do_wycofania_zgody', { defaultValue: "Prawo do wycofania zgody w dowolnym momencie (usunięcie konta)." }) })}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{t('auto.najwyższy_standard_szyfrowania_tls_', { defaultValue: i18n.t('auto.najwyzszy_standard_szyfro', { defaultValue: "Najwyższy standard szyfrowania TLS 1.3 i przechowywania danych w UE." }) })}</span>
                </li>
              </ul>
              <div className="mt-8 p-5 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 leading-tight uppercase tracking-widest text-center">
                  
                                                    {t('auto.aplikacja_nie_zastępuje_profesjonal', { defaultValue: i18n.t('auto.aplikacja_nie_zastepuje_p', { defaultValue: "Aplikacja nie zastępuje profesjonalnej porady lekarskiej." }) })}
                                                  </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-start gap-4 cursor-pointer group p-2 rounded-2xl transition-colors">
              <div 
                onClick={() => setAgreed(!agreed)}
                className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                  agreed ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "border-slate-300 dark:border-white/10 hover:border-indigo-500"
                )}
              >
                {agreed && <Check size={16} strokeWidth={4} />}
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                
                                              {t('auto.oświadczam_że_zapoznałem_się_z_treś', { defaultValue: i18n.t('auto.oswiadczam_ze_zapoznalem', { defaultValue: "Oświadczam, że zapoznałem się z treścią klauzuli i dobrowolnie wyrażam zgodę na przetwarzanie moich danych." }) })}
                                            </span>
            </label>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 bg-rose-500/10 text-rose-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-2 group transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 font-display"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} className="group-hover:rotate-6 transition-transform" />}
              
                                        {t('auto.zatwierdź_i_kontynuuj', { defaultValue: i18n.t('auto.zatwierdz_i_kontynuuj', { defaultValue: "Zatwierdź i Kontynuuj" }) })}
                                      </button>
            <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-widest opacity-50">
              
                                        {t('auto.glikocontrol_bull_privacy_first_app', { defaultValue: 'GlikoControl &bull; Privacy First App' })}
                                      </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

