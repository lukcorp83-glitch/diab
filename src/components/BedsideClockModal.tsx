import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Moon,
  Sun,
  Zap,
  Clock,
  Activity,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Palette
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LogEntry, UserSettings } from '../types';
import { cn, getTrendInfo, getEffectiveIOB } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { pushModal, popModal } from '../lib/modalStack';

interface BedsideClockModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  userSettings?: UserSettings;
  pumpStatus?: any;
}

type ColorTheme = 'amber' | 'red' | 'white' | 'emerald';

export const BedsideClockModal: React.FC<BedsideClockModalProps> = ({
  isOpen,
  onClose,
  logs,
  userSettings,
  pumpStatus
}) => {
  const { t, i18n } = useTranslation();

  // Preferencje motywu i jasności zapisywane w localStorage
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('gliko_bedside_color');
    return (saved as ColorTheme) || 'amber';
  });

  const [brightness, setBrightness] = useState<number>(() => {
    const saved = localStorage.getItem('gliko_bedside_dim');
    return saved ? Number(saved) : 0.35;
  });

  const [showSeconds, setShowSeconds] = useState<boolean>(() => {
    return localStorage.getItem('gliko_bedside_seconds') === 'true';
  });

  const [showControls, setShowControls] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  
  // Ochrona matrycy OLED przed wypaleniem (Pixel-Shift co 60 sekund)
  const [burnInOffset, setBurnInOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Rejestracja w stosie modali (dla systemowego przycisku Wstecz na Androidzie)
  useEffect(() => {
    if (!isOpen) return;

    pushModal('bedside_clock', onClose, 100);
    return () => {
      popModal('bedside_clock');
    };
  }, [isOpen, onClose]);

  // Zarządzanie Screen WakeLock API (zapobieganie wygaszaniu ekranu)
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && active) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          // Ciche zignorowanie błędu, np. gdy bateria telefonu jest krytycznie niska
        }
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (e) {}
        wakeLockRef.current = null;
      }
    };
  }, [isOpen]);

  // Tryb Fullscreen
  useEffect(() => {
    if (!isOpen) return;

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen]);

  // Aktualizacja zegara co sekundę
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Pixel Shift - przesunięcie co 60 sekund o losowe -4px..+4px
  useEffect(() => {
    if (!isOpen) return;

    const shiftTimer = setInterval(() => {
      const x = Math.floor(Math.random() * 9) - 4;
      const y = Math.floor(Math.random() * 9) - 4;
      setBurnInOffset({ x, y });
    }, 60000);

    return () => clearInterval(shiftTimer);
  }, [isOpen]);

  // Auto-chowanie pasków kontrolnych po 5 sekundach bezczynności
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    if (isOpen) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Zapisywanie zmian preferencji
  const handleColorChange = (color: ColorTheme) => {
    Haptics.tick();
    setColorTheme(color);
    localStorage.setItem('gliko_bedside_color', color);
    resetControlsTimeout();
  };

  const handleBrightnessChange = (val: number) => {
    Haptics.tick();
    setBrightness(val);
    localStorage.setItem('gliko_bedside_dim', String(val));
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    Haptics.light();
    if (!document.fullscreenElement) {
      const el = modalRef.current || document.documentElement;
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    resetControlsTimeout();
  };

  // Ostatni odczyt glikemii
  const lastGlucoseLog = useMemo(() => {
    return (logs || []).find((l) => l.type === 'glucose' || (l.type as any) === 'sgv') || null;
  }, [logs]);

  // Wiek odczytu
  const glucoseAgeMinutes = useMemo(() => {
    if (!lastGlucoseLog?.timestamp) return null;
    const ts = typeof lastGlucoseLog.timestamp === 'string'
      ? new Date(lastGlucoseLog.timestamp).getTime()
      : (lastGlucoseLog.timestamp as any)?.seconds
      ? (lastGlucoseLog.timestamp as any).seconds * 1000
      : Number(lastGlucoseLog.timestamp);
    if (isNaN(ts)) return null;
    return Math.max(0, Math.floor((Date.now() - ts) / 60000));
  }, [lastGlucoseLog]);

  // Aktywna insulina (IOB)
  const currentIOB = useMemo(() => {
    const dia = userSettings?.diaDurationHours || 4;
    return getEffectiveIOB(logs || [], pumpStatus, dia);
  }, [logs, pumpStatus, userSettings]);

  // Ostatnie 3 godziny glikemii do miniaturowego wykresu nocnego
  const recent3hGlucose = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    return (logs || [])
      .filter((l) => (l.type === 'glucose' || (l.type as any) === 'sgv') && l.value)
      .map((l) => {
        const ts = typeof l.timestamp === 'string'
          ? new Date(l.timestamp).getTime()
          : (l.timestamp as any)?.seconds
          ? (l.timestamp as any).seconds * 1000
          : Number(l.timestamp);
        return { value: Number(l.value), timestamp: ts };
      })
      .filter((l) => !isNaN(l.timestamp) && l.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [logs]);

  // Trend i delta
  const trendInfo = useMemo(() => {
    return getTrendInfo(lastGlucoseLog?.trend || (lastGlucoseLog as any)?.direction, t);
  }, [lastGlucoseLog, t]);

  const targetMin = userSettings?.targetMin || 70;
  const targetMax = userSettings?.targetMax || 180;
  const isHypo = Boolean(lastGlucoseLog?.value && lastGlucoseLog.value < targetMin);
  const isHyper = Boolean(lastGlucoseLog?.value && lastGlucoseLog.value > targetMax);

  // Klasy kolorystyczne motywu
  const themeClasses = useMemo(() => {
    switch (colorTheme) {
      case 'red':
        return {
          primary: 'text-rose-500',
          secondary: 'text-rose-400/80',
          dim: 'text-rose-500/40',
          glow: 'rgba(244, 63, 94, 0.12)',
          stroke: '#f43f5e',
          activeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
      case 'emerald':
        return {
          primary: 'text-emerald-400',
          secondary: 'text-emerald-300/80',
          dim: 'text-emerald-500/40',
          glow: 'rgba(52, 211, 153, 0.12)',
          stroke: '#34d399',
          activeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'white':
        return {
          primary: 'text-slate-200',
          secondary: 'text-slate-400',
          dim: 'text-slate-600',
          glow: 'rgba(255, 255, 255, 0.08)',
          stroke: '#cbd5e1',
          activeBg: 'bg-white/20 text-white border-white/40'
        };
      case 'amber':
      default:
        return {
          primary: 'text-amber-400',
          secondary: 'text-amber-300/80',
          dim: 'text-amber-500/40',
          glow: 'rgba(251, 191, 36, 0.12)',
          stroke: '#fbbf24',
          activeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
    }
  }, [colorTheme]);

  const hoursStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const secondsStr = currentTime.getSeconds().toString().padStart(2, '0');
  const isPl = i18n.language.startsWith('pl');
  const dateStr = currentTime.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={resetControlsTimeout}
          className="fixed inset-0 z-[99999] bg-black text-white select-none overflow-hidden touch-none flex flex-col justify-between"
          style={{
            // Całkowita czerń True Black OLED
            backgroundColor: '#000000'
          }}
        >
        {/* Delikatna czerwona pulsacja w przypadku hipoglikemii */}
        {isHypo && (
          <motion.div
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute inset-0 bg-radial from-rose-950/60 via-black to-black pointer-events-none z-0"
          />
        )}

        {/* Pasek kontrolny (Górny) - znika po 5 sekundach bezczynności */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-50 p-4 md:px-8 pt-safe flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  {(['amber', 'red', 'emerald', 'white'] as ColorTheme[]).map((theme) => {
                    const colors: Record<ColorTheme, string> = {
                      amber: 'bg-amber-400',
                      red: 'bg-rose-500',
                      emerald: 'bg-emerald-400',
                      white: 'bg-slate-200'
                    };
                    return (
                      <button
                        key={theme}
                        onClick={() => handleColorChange(theme)}
                        className={cn(
                          'w-6 h-6 rounded-xl transition-all flex items-center justify-center cursor-pointer',
                          colors[theme],
                          colorTheme === theme ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-80'
                        )}
                        title={t('nightstand.theme_title', { theme, defaultValue: `Motyw: ${theme}` })}
                      />
                    );
                  })}
                </div>

                {/* Szybkie poziomy jasności */}
                <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold">
                  {[0.15, 0.35, 0.7, 1.0].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleBrightnessChange(level)}
                      className={cn(
                        'px-2 py-0.5 rounded-lg transition-all cursor-pointer',
                        brightness === level ? 'bg-white/20 text-white font-black' : 'text-slate-400 hover:text-white'
                      )}
                    >
                      {Math.round(level * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Przełącznik sekund */}
                <button
                  onClick={() => {
                    Haptics.tick();
                    setShowSeconds(!showSeconds);
                    localStorage.setItem('gliko_bedside_seconds', String(!showSeconds));
                    resetControlsTimeout();
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer',
                    showSeconds
                      ? 'bg-white/15 text-white border-white/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  )}
                  title={t('nightstand.toggle_seconds', { defaultValue: 'Pokaż/ukryj sekundy' })}
                >
                  SEC
                </button>

                {/* Pełny ekran */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10 transition-all cursor-pointer"
                  title={isFullscreen ? t('nightstand.exit_fullscreen', { defaultValue: 'Opuść pełny ekran' }) : t('nightstand.fullscreen', { defaultValue: 'Pełny ekran' })}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                {/* Wyjście z trybu nocnego */}
                <button
                  onClick={() => {
                    Haptics.light();
                    onClose();
                  }}
                  className="p-2 text-white bg-rose-600/80 hover:bg-rose-500 rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-rose-600/30"
                  title={t('nightstand.close_title', { defaultValue: 'Wyjdź z trybu nocnego' })}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Główny obszar wyświetlania (zastosowanie przesunięcia przeciw wypaleniu matrycy OLED) */}
        <div
          className="flex-1 flex flex-col justify-center items-center px-4 md:px-12 relative z-10 transition-all duration-700 ease-out"
          style={{
            transform: `translate(${burnInOffset.x}px, ${burnInOffset.y}px)`,
            opacity: brightness
          }}
        >
          {/* Kontener adaptacyjny (pion lub poziom) */}
          <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-around gap-6 md:gap-12 my-auto">
            
            {/* Sekcja Zegara */}
            <div className="flex flex-col items-center md:items-start tracking-tighter">
              <div className="flex items-baseline">
                <span className={cn('text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight font-mono leading-none', themeClasses.primary)}>
                  {hoursStr}
                </span>
                {showSeconds && (
                  <span className={cn('text-2xl sm:text-3xl md:text-4xl font-mono font-light ml-2 opacity-60', themeClasses.secondary)}>
                    :{secondsStr}
                  </span>
                )}
              </div>
              <p className={cn('text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mt-2 capitalize', themeClasses.dim)}>
                {dateStr}
              </p>
            </div>

            {/* Pionowy separator na dużych / poziomych ekranach */}
            <div className="hidden md:block w-px h-36 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {/* Sekcja Glikemii */}
            <div className="flex flex-col items-center md:items-end">
              {lastGlucoseLog?.value ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-mono leading-none tracking-tight', themeClasses.primary)}>
                      {lastGlucoseLog.value}
                    </span>
                    <div className="flex flex-col items-center justify-center">
                      <span className={cn('text-4xl sm:text-5xl md:text-6xl font-bold leading-none', themeClasses.secondary)}>
                        {trendInfo.arrow}
                      </span>
                      {lastGlucoseLog.delta !== undefined && lastGlucoseLog.delta !== null && (
                        <span className={cn('text-xs sm:text-sm font-black font-mono mt-1', themeClasses.dim)}>
                          {Number(lastGlucoseLog.delta) > 0 ? `+${lastGlucoseLog.delta}` : lastGlucoseLog.delta}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {/* Wiek odczytu */}
                    {glucoseAgeMinutes !== null && (
                      <span className={cn('text-xs font-bold uppercase tracking-wider', themeClasses.dim)}>
                        {glucoseAgeMinutes === 0
                          ? t('nightstand.just_now', { defaultValue: 'Przed chwilą' })
                          : `${glucoseAgeMinutes} min ${t('nightstand.ago', { defaultValue: 'temu' })}`}
                      </span>
                    )}

                    {/* Aktywna Insulina IOB */}
                    {currentIOB > 0 && (
                      <span className={cn('text-xs font-black tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5', themeClasses.secondary)}>
                        <Zap size={11} className="fill-current" />
                        {currentIOB.toFixed(1)}j IOB
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center md:text-right py-4">
                  <p className={cn('text-2xl font-bold font-mono', themeClasses.dim)}>---</p>
                  <p className="text-xs text-slate-600 uppercase tracking-widest mt-1">
                    {t('nightstand.no_data', { defaultValue: 'Oczekiwanie na odczyt CGM' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dolna linia: Miniaturowy wykres nocny (ostatnie 3h) */}
        <div className="relative z-10 w-full px-6 pb-6 pt-2 pb-safe" style={{ opacity: Math.max(0.2, brightness * 0.8) }}>
          {recent3hGlucose.length > 2 ? (
            <div className="w-full max-w-4xl mx-auto h-16 relative">
              {/* Linie zakresu docelowego */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-15">
                <div className="w-full border-b border-dashed border-white" style={{ top: '20%' }} />
                <div className="w-full border-b border-dashed border-white" style={{ top: '80%' }} />
              </div>

              {/* Rysowanie SVG linii glikemii */}
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {(() => {
                  const minG = 40;
                  const maxG = 260;
                  const minT = recent3hGlucose[0].timestamp;
                  const maxT = recent3hGlucose[recent3hGlucose.length - 1].timestamp || minT + 1;
                  const tSpan = Math.max(1, maxT - minT);

                  const points = recent3hGlucose.map((p) => {
                    const x = ((p.timestamp - minT) / tSpan) * 100;
                    const clampedVal = Math.max(minG, Math.min(maxG, p.value));
                    const y = 100 - ((clampedVal - minG) / (maxG - minG)) * 100;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  const lastPoint = recent3hGlucose[recent3hGlucose.length - 1];
                  const lastX = 100;
                  const lastClamped = Math.max(minG, Math.min(maxG, lastPoint.value));
                  const lastY = 100 - ((lastClamped - minG) / (maxG - minG)) * 100;

                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke={themeClasses.stroke}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                      <circle
                        cx={lastX}
                        cy={lastY}
                        r="3.5"
                        fill={themeClasses.stroke}
                        className="animate-ping"
                        style={{ transformOrigin: `${lastX}% ${lastY}%` }}
                      />
                      <circle
                        cx={lastX}
                        cy={lastY}
                        r="3"
                        fill={themeClasses.stroke}
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          ) : (
            <div className="h-6" />
          )}

          {/* Dyskretna wskazówka dotknięcia */}
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/20 mt-1">
            {t('nightstand.tap_hint', { defaultValue: 'Dotknij ekranu, aby dostosować jasność lub wyjść' })}
          </p>
        </div>
      </motion.div>
    )}
    </AnimatePresence>,
    document.body
  );
};

export default BedsideClockModal;
