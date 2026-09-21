import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Smartphone, 
  Brain, 
  Utensils, 
  Layout, 
  Wrench, 
  ArrowRight,
  X,
  Bell,
  CloudCog,
  Zap,
  CheckCircle2,
  Gauge
} from 'lucide-react';
import { PWA_VERSIONS } from '../constants/versions';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const current = PWA_VERSIONS[0] || { version: '6.0.45', changes: [] };
  const changesList = Array.isArray(current?.changes) ? current.changes : [];

  return (
    <div 
      className="fixed inset-0 pt-safe pb-safe z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md" 
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 16px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="relative w-full max-w-md bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 rounded-[2.2rem] overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-emerald-950/20 flex flex-col"
        id="changelog-popup-container"
      >
        {/* Glow & animated top accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/20 to-transparent blur-2xl pointer-events-none" />
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 origin-left" 
        />

        {/* Header Hero Section */}
        <div className="pt-7 px-6 pb-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/25">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[15px] flex items-center justify-center">
                <Zap size={20} className="text-emerald-500 fill-emerald-500/20 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {t('auto.aktualizacja', { defaultValue: 'Aktualizacja' })}
                </h3>
                <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  v{current.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('auto.co_nowego', { defaultValue: 'Co nowego w tej wersji?' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('auto.zamknij', { defaultValue: 'Zamknij' })}
            id="changelog-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of changes */}
        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-3 no-scrollbar relative z-10">
          {changesList.map((change: any, idx: number) => {
            let iconInfo: ChangeMeta;
            if (typeof change === 'string') {
              const translatedChange = t(change, { defaultValue: change });
              iconInfo = getChangeIconAndColor(translatedChange, t);
            } else {
              let IconComponent = Sparkles;
              if (change.icon === 'CloudCog') IconComponent = CloudCog;
              if (change.icon === 'Smartphone') IconComponent = Smartphone;
              if (change.icon === 'Brain') IconComponent = Brain;
              if (change.icon === 'Utensils') IconComponent = Utensils;
              if (change.icon === 'Layout') IconComponent = Layout;
              if (change.icon === 'Wrench') IconComponent = Wrench;
              if (change.icon === 'Bell') IconComponent = Bell;
              
              let extractedColor = 'text-slate-500';
              const colorParts = change.colorClass.split(' ');
              for (const part of colorParts) {
                if (part.startsWith('text-') && !part.startsWith('text-[')) {
                  extractedColor = part;
                  break;
                }
              }

              iconInfo = {
                icon: <IconComponent size={18} className={extractedColor} />,
                bgColor: change.colorClass,
                title: t(change.categoryKey, { defaultValue: change.categoryKey }),
                desc: t(change.descriptionKey, { defaultValue: change.descriptionKey })
              };
            }

            return (
              <motion.div
                key={`change-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + idx * 0.06 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 hover:border-emerald-500/20 transition-all shadow-sm group"
              >
                <div className={cn(
                  "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm",
                  iconInfo.bgColor
                )}>
                  {iconInfo.icon}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {iconInfo.title}
                    </h4>
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                    {iconInfo.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer with action button */}
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 relative z-10">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
            id="changelog-start-btn"
          >
            <span>{t('auto.przejdź_do_aplikacji', { defaultValue: i18n.t('auto.przejdz_do_aplikacji', { defaultValue: "Przejdź do aplikacji" }) })}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ChangeMeta {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  desc: string;
}

function getChangeIconAndColor(text: string, tFunc: any): ChangeMeta {
  const t = text.toLowerCase();
  
  if (t.includes('optymalizac') || t.includes('przyspiesz') || t.includes('szybko') || t.includes('wydajno')) {
    return {
      icon: <Gauge size={18} className="text-emerald-500 dark:text-emerald-400" />,
      bgColor: "bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/20",
      title: "Wydajność & Płynność",
      desc: text
    };
  }

  if (t.includes('pop-up') || t.includes('powiadomie')) {
    return {
      icon: <Bell size={18} className="text-rose-500 dark:text-rose-400" />,
      bgColor: "bg-rose-500/10 dark:bg-rose-950/50 border border-rose-500/20",
      title: "Powiadomienia",
      desc: text
    };
  }

  if (t.includes('chmurze') || t.includes('cloud') || t.includes('sync')) {
    return {
      icon: <CloudCog size={18} className="text-purple-500 dark:text-purple-400" />,
      bgColor: "bg-purple-500/10 dark:bg-purple-950/50 border border-purple-500/20",
      title: "Synchronizacja",
      desc: text
    };
  }
  
  if (t.includes('apk') || t.includes('android')) {
    return {
      icon: <Smartphone size={18} className="text-teal-500 dark:text-teal-400" />,
      bgColor: "bg-teal-500/10 dark:bg-teal-950/50 border border-teal-500/20",
      title: "Wersja mobilna",
      desc: text
    };
  }
  
  if (t.includes(i18n.t('auto.wchlaniania', { defaultValue: i18n.t('auto.wchlaniania', { defaultValue: "wchłaniania" }) })) || t.includes(i18n.t('auto.posilkow', { defaultValue: i18n.t('auto.posilkow', { defaultValue: "posiłków" }) })) || t.includes(i18n.t('auto.makroskladnikow', { defaultValue: i18n.t('auto.makroskladnikow', { defaultValue: "makroskładników" }) }))) {
    return {
      icon: <Utensils size={18} className="text-amber-500 dark:text-amber-400" />,
      bgColor: "bg-amber-500/10 dark:bg-amber-950/50 border border-amber-500/20",
      title: i18n.t('auto.wchlanianie_posilkow', { defaultValue: i18n.t('auto.wchlanianie_posilkow', { defaultValue: "Wchłanianie posiłków" }) }),
      desc: text
    };
  }
  
  if (t.includes(i18n.t('auto.interfejs', { defaultValue: i18n.t('auto.interfejs', { defaultValue: "interfejs" }) })) || t.includes('ui') || t.includes('design') || t.includes('layout')) {
    return {
      icon: <Layout size={18} className="text-blue-500 dark:text-blue-400" />,
      bgColor: "bg-blue-500/10 dark:bg-blue-950/50 border border-blue-500/20",
      title: "Interfejs & Design",
      desc: text
    };
  }

  if (t.includes(i18n.t('auto.poprawka', { defaultValue: i18n.t('auto.poprawka', { defaultValue: "poprawka" }) })) || t.includes('fix') || t.includes(i18n.t('auto.stabilnosc', { defaultValue: i18n.t('auto.stabilnosc', { defaultValue: "stabilność" }) }))) {
    return {
      icon: <Wrench size={18} className="text-indigo-500 dark:text-indigo-400" />,
      bgColor: "bg-indigo-500/10 dark:bg-indigo-950/50 border border-indigo-500/20",
      title: "Stabilność",
      desc: text
    };
  }

  return {
    icon: <Sparkles size={18} className="text-emerald-500 dark:text-emerald-400" />,
    bgColor: "bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/20",
    title: "Nowości",
    desc: text
  };
}
