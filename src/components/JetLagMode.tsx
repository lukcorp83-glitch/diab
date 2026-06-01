import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plane, ArrowRight, Clock, ShieldCheck, MapPin, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn } from '../lib/utils';
import Logo from './Logo';

interface JetLagModeProps {
  onClose?: () => void;
}

export default function JetLagMode({ onClose }: JetLagModeProps) {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = fromLocation.trim() !== '' && toLocation.trim() !== '' && departureTime.trim() !== '';

  const handleGenerate = async () => {
    if (!isValid) return;
    
    setIsGenerating(true);
    setError(null);
    setPlan(null);

    const prompt = `Jesteś ekspertem diabetologiem (Jet-Lag Mode). Użytkownik to diabetyk. Podaje podróż: Lot z "${fromLocation}" do "${toLocation}", o godzinie ${departureTime}. 
Wygeneruj prostą, liniową oś czasu (timeline) na czas lotu i pierwsze 24 godziny na miejscu, pokazując krok po kroku, jak przesunąć godziny dawek insuliny długodziałającej (bazowej) i posiłkowej, żeby bezpiecznie "przestawić" organizm na nową strefę czasową.
Zasady:
- Żadnego "gadania" początkowego, tylko zwięzły, konkretny plan.
- Używaj struktury HTML: użyj div z klasami Tailwind CSS w razie potrzeby, albo po prostu znaczników <b>, <ul>, <li>, <br>, <h3> aby utworzyć przejrzystą oś czasu.
- Skup się na godzinach (np. "14:00 - Wylot", "02:00 czasu docelowego - Podanie 50% bazy").
- Bądź bezpośredni i bezpieczny w zaleceniach (sugeruj częstsze monitorowanie cukru).
- Odpowiadaj w języku polskim. Brak formatowania markdown, tylko HTML wewnątrz.`;

    try {
      const response = await geminiService.generateContent(prompt);
      // Oczyść ewentualne znaczniki markdownu z kodu HTML
      const cleaned = response.replace(/^```html/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      setPlan(cleaned);
    } catch (err) {
      console.error(err);
      setError("Wystąpił błąd podczas generowania planu podróży.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Jet-Lag Mode</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Asystent Podróży i Zmiany Stref Czasowych</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto w-full space-y-8">
        {/* Intro */}
        <div className="bg-white dark:bg-[#121212] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <ShieldCheck className="text-emerald-500" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Bezpieczna zmiana strefy czasowej</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                Dla diabetyka lot na inny kontynent to logistyczne wyzwanie. Funkcja Jet-Lag Mode wygeneruje 
                prostą, liniową oś czasu pokazującą, jak przesunąć godziny dawek insuliny długodziałającej, 
                żeby łagodnie przestawić organizm.
              </p>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-800 dark:text-amber-400 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>Narzędzie służy wyłącznie do celów planowania i nie zastępuje porady lekarskiej. Zawsze monitoruj poziom glikemii częściej podczas podróży.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-[#121212] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
          <h2 className="font-semibold text-lg flex items-center gap-2 mb-6">
            <MapPin size={18} className="text-indigo-500" />
            Szczegóły lotu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">Wylot z (Skąd)</label>
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                placeholder="np. Warszawa"
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">Przylot do (Dokąd)</label>
              <input
                type="text"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="np. Nowy Jork"
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 ml-2">Godzina wylotu (czasu lokalnego)</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isValid}
              className={cn(
                "flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold transition-all",
                isGenerating || !isValid
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Opracuj Plan Rozpiski
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-sm flex gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Result Plan */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#121212] p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
              <Clock className="text-indigo-500" /> Oś czasu adaptacji
            </h3>
            <div
              className="prose prose-slate dark:prose-invert prose-indigo max-w-none 
                         [&>h3]:text-lg [&>h3]:font-bold [&>ul]:space-y-2 [&>ul>li]:bg-slate-50 
                         dark:[&>ul>li]:bg-[#0f0f0f] [&>ul>li]:p-4 [&>ul>li]:rounded-2xl 
                         [&>ul>li]:border [&>ul>li]:border-slate-100 dark:[&>ul>li]:border-white/5"
              dangerouslySetInnerHTML={{ __html: plan }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
