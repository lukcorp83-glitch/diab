import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Camera, Utensils, BookOpen, Tag, X, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/useAppStore';
import { Haptics } from '../../lib/haptics';

const DEFAULT_STATUS_STEPS: Record<string, string[]> = {
  plate: [
    'camera.step_detecting',
    'camera.step_estimating',
    'camera.step_glycemic',
    'camera.step_finalizing'
  ],
  menu: [
    'camera.step_menu_reading',
    'camera.step_menu_analyzing',
    'camera.step_menu_matching',
    'camera.step_finalizing'
  ],
  label: [
    'camera.step_label_reading',
    'camera.step_label_extracting',
    'camera.step_label_calculating',
    'camera.step_finalizing'
  ],
  product: [
    'camera.step_product_identifying',
    'camera.step_product_matching',
    'camera.step_finalizing'
  ],
  bolus: [
    'camera.step_bolus_analyzing',
    'camera.step_estimating',
    'camera.step_finalizing'
  ],
  general: [
    'camera.step_detecting',
    'camera.step_estimating',
    'camera.step_finalizing'
  ]
};

const DEFAULT_FALLBACK_TEXTS: Record<string, string> = {
  'camera.step_detecting': 'Wykrywanie potraw i składników na talerzu...',
  'camera.step_estimating': 'Szacowanie gramatury i makroskładników (W / B / T)...',
  'camera.step_glycemic': 'Wyliczanie indeksu glikemicznego i wchłaniania...',
  'camera.step_finalizing': 'Przygotowywanie zaleceń i podsumowania...',
  'camera.step_menu_reading': 'Odczytywanie pozycji z karty menu...',
  'camera.step_menu_analyzing': 'Analiza składników i węglowodanów w daniach...',
  'camera.step_menu_matching': 'Dopasowywanie zaleceń do Twojej diety i profilu...',
  'camera.step_label_reading': 'Skanowanie tabeli wartości odżywczych...',
  'camera.step_label_extracting': 'Ekstrakcja węglowodanów, błonnika i polioli...',
  'camera.step_label_calculating': 'Przeliczanie wartości na 100g i porcję...',
  'camera.step_product_identifying': 'Identyfikacja produktu i składu...',
  'camera.step_product_matching': 'Przeszukiwanie bazy żywności AI...',
  'camera.step_bolus_analyzing': 'Analiza posiłku pod kątem dawki insuliny...'
};

export default function AiScanningOverlay() {
  const { t } = useTranslation();
  const aiScanState = useAppStore((state) => state.aiScanState);
  const stopAiScan = useAppStore((state) => state.stopAiScan);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const {
    isScanning,
    title,
    subtitle,
    mode = 'general',
    imagePreview,
    statusMessages,
    onCancel
  } = aiScanState;

  // Pobierz listę kroków dla bieżącego trybu
  const steps = statusMessages && statusMessages.length > 0 
    ? statusMessages 
    : (DEFAULT_STATUS_STEPS[mode] || DEFAULT_STATUS_STEPS.general);

  useEffect(() => {
    if (!isScanning) {
      setCurrentStepIndex(0);
      return;
    }

    Haptics.medium();

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [isScanning, steps.length]);

  if (!isScanning) return null;

  const handleCancel = () => {
    Haptics.light();
    if (onCancel) {
      onCancel();
    }
    stopAiScan();
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'plate':
        return <Utensils size={18} className="text-emerald-400" />;
      case 'menu':
        return <BookOpen size={18} className="text-indigo-400" />;
      case 'label':
        return <Tag size={18} className="text-amber-400" />;
      default:
        return <Sparkles size={18} className="text-cyan-400" />;
    }
  };

  const currentStepKey = steps[currentStepIndex];
  const stepText = currentStepKey.startsWith('camera.step')
    ? t(currentStepKey, { defaultValue: DEFAULT_FALLBACK_TEXTS[currentStepKey] || currentStepKey })
    : currentStepKey;

  const defaultTitle = mode === 'plate'
    ? t('camera.scanning_plate_title', { defaultValue: 'Analiza posiłku AI' })
    : mode === 'menu'
    ? t('camera.scanning_menu_title', { defaultValue: 'Analiza menu restauracji' })
    : mode === 'label'
    ? t('camera.scanning_label_title', { defaultValue: 'Odczyt etykiety odżywczej' })
    : mode === 'product'
    ? t('camera.scanning_food_title', { defaultValue: 'Identyfikacja produktu' })
    : t('camera.scanning_title', { defaultValue: 'Skanowanie wizyjne AI' });

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl select-none">
        {/* Tło z ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-slate-900/90 border border-cyan-500/30 rounded-[2.5rem] p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center text-center overflow-hidden"
        >
          {/* Górna belka / Odznaka AI */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wide">
              <Cpu size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
              <span>GLIKOSENSE VISION AI</span>
            </div>

            <button
              onClick={handleCancel}
              className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
              title={t('camera.btn_cancel', { defaultValue: 'Anuluj' })}
            >
              <X size={16} />
            </button>
          </div>

          {/* Ramka skanera wizyjnego (Viewfinder) */}
          <div className="relative w-full aspect-[4/3] max-h-[260px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center mb-5 shadow-inner">
            {/* Siatka technologiczna */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

            {/* Zdjęcie podglądu (jeśli przekazano) */}
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Scan preview"
                className="w-full h-full object-cover opacity-85 brightness-95"
              />
            ) : (
              /* Hologram / Animacja radaru gdy brak bezpośredniego preview */
              <div className="relative flex items-center justify-center w-36 h-36">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-full border border-emerald-400/40"
                />
                <div className="p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  <Camera size={36} className="animate-pulse" />
                </div>
              </div>
            )}

            {/* Efekt skanującego lasera (Laser Scan Line) */}
            <motion.div
              animate={{ y: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee,0_0_35px_#06b6d4] pointer-events-none z-10"
            />

            {/* Rogi celownika aparatu (Sci-Fi Brackets) */}
            <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400 rounded-br-lg shadow-[0_0_8px_#22d3ee]" />

            {/* Centralny celownik */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 border border-cyan-500/30 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
            </div>
          </div>

          {/* Nagłówek i status */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2">
              {getModeIcon()}
              <h3 className="text-lg font-black text-white tracking-tight">
                {title || defaultTitle}
              </h3>
            </div>

            {/* Płynnie zmieniający się tekst kroków analizy */}
            <div className="min-h-[44px] flex items-center justify-center px-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs font-semibold text-cyan-300 leading-relaxed drop-shadow-sm"
                >
                  {subtitle && currentStepIndex === 0 ? subtitle : stepText}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Pasek postępu */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3 relative">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-indigo-500 rounded-full"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  ease: 'easeInOut'
                }}
              />
            </div>
          </div>

          {/* Dolny przycisk anulowania */}
          <div className="mt-5 w-full">
            <button
              onClick={handleCancel}
              type="button"
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-[0.98] cursor-pointer shadow-sm"
            >
              {t('camera.btn_cancel', { defaultValue: 'Anuluj skanowanie' })}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
