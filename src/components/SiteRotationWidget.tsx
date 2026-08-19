import React, { useMemo, useState } from 'react';
import { RefreshCw, Sparkles, AlertTriangle, ChevronRight, Layers, Edit3 } from 'lucide-react';
import { LogEntry, UserSettings } from '../types';
import { 
  normalizeSiteToZoneId, 
  getZoneById, 
  calculateTissueRecovery, 
  getNextRecommendedSite, 
  detectLipohypertrophyWarning,
  DEFAULT_ALLOWED_SITES
} from '../services/siteRotationService';
import SiteRotationModal from './SiteRotationModal';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useLogsStore } from '../stores/useLogsStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface SiteRotationWidgetProps {
  settings: UserSettings;
  setSettings?: (s: UserSettings) => void;
  size?: string;
  onAction?: (action: string) => void;
  setTab?: (t: string) => void;
}

export default function SiteRotationWidget({ 
  settings, 
  setSettings = () => {},
  size = '1x1'
}: SiteRotationWidgetProps) {
  const logs = useLogsStore((state) => state.logs);
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isCompact = size === '1x1' || size === '1x2';

  const lastSiteChange = useMemo(() => {
    const sorted = [...(logs || [])].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.find(l => l.type === 'site_change');
  }, [logs]);

  const siteChangeTimestamp = Math.max(settings.infusionSetChangeDate || 0, lastSiteChange?.timestamp || 0) || undefined;
  
  const rawNote = lastSiteChange?.notes || '';
  const parsedNoteLocation = rawNote.startsWith('Wymiana wkłucia -') ? rawNote.replace('Wymiana wkłucia -', '').trim() : rawNote;

  const locationText = settings.infusionSetSite || parsedNoteLocation || 'Prawy brzuch';
  const currentZoneId = useMemo(() => normalizeSiteToZoneId(locationText), [locationText]);
  const currentZone = useMemo(() => getZoneById(currentZoneId), [currentZoneId]);

  const allowedSiteIds = useMemo(() => {
    return settings.allowedInfusionSites && settings.allowedInfusionSites.length > 0
      ? settings.allowedInfusionSites
      : DEFAULT_ALLOWED_SITES;
  }, [settings.allowedInfusionSites]);

  const recoveryMap = useMemo(() => {
    return calculateTissueRecovery(logs, currentZoneId, siteChangeTimestamp);
  }, [logs, currentZoneId, siteChangeTimestamp]);

  const nextRecommendation = useMemo(() => {
    return getNextRecommendedSite(currentZoneId, allowedSiteIds, settings.sensorSite, recoveryMap, logs);
  }, [currentZoneId, allowedSiteIds, settings.sensorSite, recoveryMap, logs]);

  const lipoWarning = useMemo(() => detectLipohypertrophyWarning(logs), [logs]);

  const elapsedDays = siteChangeTimestamp ? Math.floor((Date.now() - siteChangeTimestamp) / (1000 * 60 * 60 * 24)) : 0;
  const maxDays = settings?.infusionSetDurationDays || 3;
  const isOverdue = elapsedDays >= maxDays;

  // Automatyczny wybór perspektywy (Przód lub Tył) w zależności od aktualnego wkłucia
  const view = currentZone.view;
  const nextZone = nextRecommendation.zone;

  const currentDotPos = currentZone.dotPos;
  const nextDotPos = (nextZone.view === view) ? nextZone.dotPos : null;

  return (
    <>
      <div 
        onClick={() => {
          Haptics.light();
          setIsModalOpen(true);
        }}
        className={cn(
          "glass-card w-full h-full p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer active:scale-[0.98] group border border-slate-200/60 dark:border-slate-800"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full z-10 relative">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
              isOverdue ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
              <RefreshCw size={14} />
            </div>
            <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
              {t('auto.rotacja_wkluc', { defaultValue: 'Rotacja Wkłuć' })}
            </span>
          </div>

          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center transition-colors">
            <Edit3 size={11} />
          </div>
        </div>

        {/* Sylwetka Ciała 2D w Tle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-35 dark:opacity-40">
          <div className="relative h-[85%] max-h-[160px] aspect-[1/2] mt-3">
            <svg fill="currentColor" viewBox="0 0 100 200" className="w-full h-full text-slate-400 dark:text-slate-600">
              <path d="M50 30 C58 30 65 24 65 15 C65 6 58 0 50 0 C42 0 35 6 35 15 C35 24 42 30 50 30 Z" />
              <path d="M68 35 C75 35 80 40 85 55 C90 70 95 95 90 95 C85 95 80 70 75 60 C75 60 70 50 68 50 C68 50 68 100 68 100 C68 120 75 180 75 190 C75 200 60 200 60 190 C60 150 55 110 50 110 C45 110 40 150 40 190 C40 200 25 200 25 190 C25 180 32 120 32 100 C32 100 32 50 32 50 C30 50 25 60 25 60 C20 70 15 95 10 95 C5 95 10 70 15 55 C20 40 25 35 32 35 C40 35 60 35 68 35 Z" opacity="0.85"/>
            </svg>

            {/* Aktualne wkłucie (Zielony / Czerwony punkt) */}
            <div 
              className={cn(
                "absolute w-3 h-3 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-white dark:border-slate-900",
                isOverdue ? "bg-rose-500 shadow-rose-500/50" : "bg-emerald-500 shadow-emerald-500/50"
              )}
              style={{ top: currentDotPos.top, left: currentDotPos.left }}
            >
              <div className={cn("absolute inset-0 rounded-full animate-ping opacity-75", isOverdue ? "bg-rose-400" : "bg-emerald-400")} />
            </div>

            {/* Rekomendowane następne miejsce (Niebieski pulsujący punkt) */}
            {nextDotPos && (
              <div 
                className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,1)] transform -translate-x-1/2 -translate-y-1/2 z-10 border border-white dark:border-slate-900"
                style={{ top: nextDotPos.top, left: nextDotPos.left }}
              >
                <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-60" />
              </div>
            )}
          </div>
        </div>

        {/* Dolne Informacje i Rekomendacja */}
        <div className="flex flex-col gap-1 z-10 relative">
          <div className="flex items-baseline justify-between">
            <span className={cn(
              "font-black text-xs md:text-sm tracking-tight leading-tight line-clamp-1",
              isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white"
            )}>
              {currentZone.name}
            </span>
          </div>

          {/* Sugerowane kolejne */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl w-full">
            <Sparkles size={11} className="text-indigo-500 shrink-0" />
            <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 truncate">
              {t('auto.nastepne_skrot', { defaultValue: 'Następne' })}: {nextZone.name}
            </span>
          </div>
        </div>
      </div>

      {/* Interaktywny Modal Rotacji */}
      <SiteRotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
        logs={logs}
        user={user}
      />
    </>
  );
}
