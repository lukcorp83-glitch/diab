import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plane, ArrowRight, Clock, ShieldCheck, MapPin, 
  Loader2, Sparkles, AlertCircle, ChevronLeft, Compass, 
  Luggage, CheckCircle2 
} from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from '../i18n';

interface JetLagModeProps {
  onClose?: () => void;
}

export default function JetLagMode({ onClose }: JetLagModeProps) {
  const { t } = useTranslation();
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = fromLocation.trim() !== '' && toLocation.trim() !== '' && departureTime.trim() !== '';

  const presets = [
    { from: 'Warszawa (WAW)', to: 'Nowy Jork (JFK)', time: '12:00', label: '🇵🇱 Warszawa ➔ 🇺🇸 Nowy Jork (-6h)' },
    { from: 'Warszawa (WAW)', to: 'Tokio (NRT)', time: '14:30', label: '🇵🇱 Warszawa ➔ 🇯🇵 Tokio (+7h)' },
    { from: 'Warszawa (WAW)', to: 'Londyn (LHR)', time: '09:00', label: '🇵🇱 Warszawa ➔ 🇬🇧 Londyn (-1h)' },
  ];

  const handleGenerate = async () => {
    if (!isValid) return;
    
    setIsGenerating(true);
    setError(null);
    setPlan(null);

    const prompt = `Jesteś ekspertem diabetologiem klinicznym specjalizującym się w podróżach transatlantyckich i strefach czasowych (Jet-Lag & Travel Protocol dla diabetyków).
Użytkownik planuje podróż:
- Wylot z: "${fromLocation}"
- Cel podróży: "${toLocation}"
- Godzina wylotu (czas lokalny): "${departureTime}"

Przygotuj profesjonalny, konkretny i bezpieczny plan adaptacji diabetologicznej (oś czasu):
1. Określ kierunek lotu (Zachód = wydłużenie doby / Wschód = skrócenie doby) oraz szacowaną różnicę stref czasowych.
2. Przygotuj liniową oś czasu (timeline):
   - Co zrobić przed wejściem na pokład.
   - Postępowanie w trakcie lotu (posiłki samolotowe, nawadnianie, pomiary glikemii).
   - Dokładny schemat przestawienia insuliny bazowej (długodziałającej lub bazy w pompie) – czy podać dawkę uzupełniającą, czy przesunąć godzinę.
   - Pierwsze 24 godziny po przylocie na miejsce.
3. Praktyczne złote zasady podróżnika (insulina w bagażu podręcznym, ochrona przed zamarznięciem w luku, glukoza pod ręką).

Zasady formatowania:
- Brak ogólnych wstępów.
- Użyj estetycznego formatowania HTML (nagłówki <h3>, listy <ul><li>, pogrubienia <b>, pigułki statusu).
- Odpowiedź w języku polskim.`;

    try {
      const response = await geminiService.generateContent(prompt);
      const cleaned = response.replace(/^```html/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      setPlan(cleaned);
    } catch (err) {
      console.error(err);
      setError(t('auto.wystapil_blad_podczas_generowa', { defaultValue: 'Wystąpił błąd podczas generowania planu podróży. Sprawdź połączenie z internetem lub klucz API.' }));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto pb-20">
      {/* Sticky Header */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Wróć"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Plane size={22} />
            </div>
            <div className="text-left">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">{t('auto.jet_lag_mode', { defaultValue: 'Asystent Podróży (Jet-Lag)' })}</h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                {t('auto.asystent_podróży_i_zmiany_stref_cza', { defaultValue: 'Planowanie dawek insuliny i zmiany stref czasowych' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Intro Card */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-left">
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-base mb-1">{t('auto.bezpieczna_zmiana_strefy_czasowej', { defaultValue: 'Bezpieczna zmiana strefy czasowej' })}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-3 font-medium">
                {t('auto.dla_diabetyka_lot_na_inny_kontynent', { defaultValue: 'Lot na inny kontynent wiąże się ze skróceniem lub wydłużeniem doby. Asystent AI wygeneruje spersonalizowany harmonogram przesunięcia dawek insuliny bazowej i posiłkowej.' })}
              </p>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                <AlertCircle className="shrink-0 text-amber-600" size={15} />
                <p>{t('auto.narzędzie_służy_wyłącznie_do_celów_', { defaultValue: 'Narzędzie planistyczne wspomagające terapię. W podróży zawsze mierz cukier częściej!' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 ml-1">
            <Compass size={14} className="text-indigo-500" />
            Szybkie szablony tras:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFromLocation(p.from);
                  setToLocation(p.to);
                  setDepartureTime(p.time);
                }}
                className="p-3 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all text-left flex items-center justify-between active:scale-[0.98]"
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-left space-y-4">
          <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <MapPin size={16} />
            {t('auto.szczegóły_lotu', { defaultValue: 'Szczegóły Twojej podróży' })}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                {t('auto.wylot_z_skąd', { defaultValue: 'Miejsce wylotu (Skąd)' })}
              </label>
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                placeholder="np. Warszawa (WAW)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                {t('auto.przylot_do_dokąd', { defaultValue: 'Miejsce docelowe (Dokąd)' })}
              </label>
              <input
                type="text"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="np. Nowy Jork (JFK)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">
                {t('auto.godzina_wylotu_czasu_lokalnego', { defaultValue: 'Godzina wylotu (czasu lokalnego)' })}
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isValid}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all",
                isGenerating || !isValid
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 active:scale-95"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Opracowywanie planu...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{t('auto.opracuj_plan_rozpiski', { defaultValue: 'Opracuj Plan Podróży AI' })}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Plan */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl text-left space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                <Clock size={18} />
                <span>{t('auto.oś_czasu_adaptacji', { defaultValue: 'Harmonogram Adaptacji Dawek' })}</span>
              </h3>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={11} />
                Plan Gotowy
              </span>
            </div>

            <div
              className="prose prose-slate dark:prose-invert prose-indigo max-w-none text-xs font-medium leading-relaxed
              [&>h3]:text-sm [&>h3]:font-black [&>h3]:text-slate-800 dark:[&>h3]:text-slate-100 [&>h3]:mt-4 [&>h3]:mb-2
              [&>ul]:space-y-2 [&>ul>li]:bg-slate-50 dark:[&>ul>li]:bg-slate-950/80 [&>ul>li]:p-3 [&>ul>li]:rounded-xl 
              [&>ul>li]:border [&>ul>li]:border-slate-200 dark:[&>ul>li]:border-slate-800 [&>ul>li]:text-slate-700 dark:[&>ul>li]:text-slate-300"
              dangerouslySetInnerHTML={{ __html: plan }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
