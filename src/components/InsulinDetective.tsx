import i18n from '../i18n';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Loader2, Sparkles, Thermometer, Clock, Syringe, Bug, Activity } from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn } from '../lib/utils';
import { LogEntry } from '../types';
import { useTranslation } from "react-i18next";

interface InsulinDetectiveProps {
  logs?: LogEntry[];
  onClose?: () => void;
}

export default function InsulinDetective({ logs, onClose }: InsulinDetectiveProps) {
    const { t } = useTranslation();
  const [openDate, setOpenDate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [correctionDoses, setCorrectionDoses] = useState('');
  const [currentBg, setCurrentBg] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = openDate.trim() !== '' && temperature.trim() !== '' && correctionDoses.trim() !== '' && currentBg.trim() !== '';

  const handleAnalyze = async () => {
    if (!isValid) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const prompt = `Jesteś systemem inteligentnej analizy skuteczności insuliny (Detektyw Insuliny). Użytkownik to diabetyk, u którego cukier nie spada mimo korekt.
Podaje fakty:
- Kiedy otwarto fiolkę / pen / założono wkłucie: ${openDate}
- Czy insulina (pen/zbiorniczek) była w temperaturze powyżej 30°C: ${temperature}
- Ile dawek korekcyjnych już podano: ${correctionDoses}
- Aktualny poziom cukru: ${currentBg} mg/dl

Dokonaj oceny sytuacji (czy matematyka wskazuje, że przy tej ilości insuliny i tym czasie od otwarcia/warunków cukier powinien już spaść?). Jeśli tak, postaw ostrzeżenie, np. "Stop. Istnieje duże prawdopodobieństwo, że Twoja insulina straciła aktywność..."
Zasady:
- Krótki, ale stanowczy, duży komunikat ujęty w HTML (użyj np. <h2> z klasami tailwind, <p>, <strong>, etc.)
- Bez lania wody, konkretna kalkulacja i diagnoza ryzyk.
- Zwróć uwagę na użytkowników pomp: problemem może być niedziałające wkłucie lub zapowietrzony dren, a nie tylko zepsuta insulina.
- Zalecając nową dawkę dodaj informację o mniejszej (bezpiecznej) dawce korekcyjnej z nowego pena lub po zmianie wkłucia.
- Zwracaj sam kod HTML. Odpowiadaj po polsku.`;

    try {
      const response = await geminiService.generateContent(prompt);
      const cleaned = response.replace(/^```html/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      setResult(cleaned);
    } catch (err) {
      console.error(err);
      setError(i18n.t('auto.wystapil_blad_podczas_komunika', { defaultValue: "Wystąpił błąd podczas komunikacji z modelem AI." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-white/10 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Bug size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('auto.insulina_nie_działa', { defaultValue: 'Insulina Nie Działa?' })}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('auto.detektyw_skuteczności_insuliny', { defaultValue: 'Detektyw skuteczności insuliny' })}</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all shadow-sm"
          >
            <AlertTriangle size={18} className="hidden" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      <div className="p-6 max-w-3xl mx-auto w-full space-y-8 pb-32">
        {/* Intro */}
        <div className="bg-white dark:bg-[#121212] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="mt-1">
              <AlertTriangle className="text-amber-500" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">{t('auto.podejrzewasz_zepsutą_insulinę_lub_p', { defaultValue: 'Podejrzewasz zepsutą insulinę lub problem z wkłuciem?' })}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                
                                              {t('auto.insulina_to_białko_w_słońcu_czy_w_u', { defaultValue: 'Insulina to białko - w słońcu czy w upale szybko traci właściwości. Z kolei przy pompie insulinowej problemem może być niedrożne lub zagięte wkłucie. Jeśli podajesz kolejne dawki, a cukier stoi w miejscu - pozwól asystentowi przeanalizować ryzyko leku / wkłucia.' })}
                                            </p>
            </div>
          </div>
          <AlertTriangle size={150} className="absolute right-0 bottom-0 text-slate-100 dark:text-white/5 opacity-50 transform translate-x-1/4 translate-y-1/4" />
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-[#121212] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-6">
            <Activity size={18} className="text-rose-500" />
            
                                  {t('auto.podaj_szczegóły_sytuacji', { defaultValue: 'Podaj szczegóły sytuacji' })}
                                </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Clock size={12} />  {t('auto.fiolka_pen_wkłucie_od_kiedy', { defaultValue: 'Fiolka / pen / wkłucie od kiedy?' })}
                                            </label>
              <input
                type="text"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                placeholder={t('auto.np_3_dni_temu_wkłucie_wczoraj_pen', { defaultValue: 'np. 3 dni temu wkłucie, wczoraj pen' })}
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Thermometer size={12} />  {t('auto.przegrzana_insulina_30_c', { defaultValue: 'Przegrzana insulina (≥30°C)?' })}
                                            </label>
              <input
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder={t('auto.np_auto_w_słońcu_basen_w_kieszeni', { defaultValue: 'np. auto w słońcu, basen, w kieszeni' })}
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Syringe size={12} />  {t('auto.ile_dawek_korekcyjnych_podano', { defaultValue: 'Ile dawek korekcyjnych podano?' })}
                                            </label>
              <input
                type="text"
                value={correctionDoses}
                onChange={(e) => setCorrectionDoses(e.target.value)}
                placeholder={t('auto.np_2_dawki_po_4j_co_2h', { defaultValue: 'np. 2 dawki po 4j co 2h' })}
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Activity size={12} />  {t('auto.aktualny_poziom_cukru_mg_dl', { defaultValue: 'Aktualny poziom cukru (mg/dl)' })}
                                            </label>
              <input
                type="number"
                value={currentBg}
                onChange={(e) => setCurrentBg(e.target.value)}
                placeholder={t('auto.np_280', { defaultValue: 'np. 280' })}
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !isValid}
              className={cn(
                "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                isAnalyzing || !isValid
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/20 active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  
                                                    {t('auto.analizuję', { defaultValue: 'Analizuję...' })}
                                                  </>
              ) : (
                <>
                  <Sparkles size={16} />
                  
                                                        {t('auto.diagnozuj_problem', { defaultValue: 'Diagnozuj Problem' })}
                                                      </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-4 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-sm flex gap-2">
              <AlertTriangle size={18} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Plan */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-3xl border border-rose-200 dark:border-rose-900/30 shadow-xl"
            >
              <div
                className="prose prose-slate dark:prose-invert prose-rose max-w-none 
                           [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-rose-600 dark:[&>h2]:text-rose-400 [&>h2]:mb-4
                           [&>p]:text-slate-700 dark:[&>p]:text-slate-300 [&>p]:leading-relaxed [&>strong]:text-slate-900 dark:[&>strong]:text-white
                           [&>ul]:space-y-2 [&>ul>li]:bg-white/50 dark:[&>ul>li]:bg-[#0f0f0f]/50 [&>ul>li]:p-4 [&>ul>li]:rounded-2xl 
                           [&>ul>li]:border [&>ul>li]:border-rose-100 dark:[&>ul>li]:border-rose-900/30"
                dangerouslySetInnerHTML={{ __html: result }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
