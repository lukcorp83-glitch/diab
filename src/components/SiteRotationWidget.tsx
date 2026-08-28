import React, { useMemo, useState } from 'react';
import { RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { UserSettings } from '../types';
import { 
  normalizeSiteToZoneId, 
  getZoneById, 
  calculateTissueRecovery, 
  getNextRecommendedSite, 
  DEFAULT_ALLOWED_SITES,
  ANATOMICAL_ZONES
} from '../services/siteRotationService';
import SiteRotationModal from './SiteRotationModal';
import { cn, extractInfusionSite } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useLogsStore } from '../stores/useLogsStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { motion } from 'motion/react';

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
  const [localSiteOverride, setLocalSiteOverride] = useState<string | null>(null);

  React.useEffect(() => {
    const handleSiteChange = (e: any) => {
      if (e.detail?.site) {
        setLocalSiteOverride(e.detail.site);
      } else if (e.detail?.infusionSetSite) {
        setLocalSiteOverride(e.detail.infusionSetSite);
      }
    };
    window.addEventListener('siteChangeRecorded', handleSiteChange);
    window.addEventListener('userSettingsUpdate', handleSiteChange);
    return () => {
      window.removeEventListener('siteChangeRecorded', handleSiteChange);
      window.removeEventListener('userSettingsUpdate', handleSiteChange);
    };
  }, []);

  const lastSiteChange = useMemo(() => {
    const sorted = [...(logs || [])].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.find(l => l.type === 'site_change' && !l.notes?.toLowerCase().includes('zbiorniczk'));
  }, [logs]);

  const siteChangeTimestamp = Math.max(settings.infusionSetChangeDate || 0, lastSiteChange?.timestamp || 0) || undefined;

  const locationText = useMemo(() => {
    if (localSiteOverride) return localSiteOverride;
    if (lastSiteChange) {
      const extracted = extractInfusionSite(lastSiteChange);
      if (extracted) return extracted;
    }
    return settings.infusionSetSite || (settings as any).infusionSite || localStorage.getItem('infusionSetSite') || 'Prawy brzuch';
  }, [lastSiteChange, localSiteOverride, settings.infusionSetSite, (settings as any).infusionSite]);
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

  const elapsedDays = siteChangeTimestamp ? Math.floor((Date.now() - siteChangeTimestamp) / (1000 * 60 * 60 * 24)) : 0;
  const maxDays = settings?.infusionSetDurationDays || 3;
  const currentDay = Math.min(maxDays + 1, elapsedDays + 1);
  const isOverdue = elapsedDays >= maxDays;
  const nextZone = nextRecommendation.zone;

  // Obliczenie punktów na pierścieniu rotacji dla aktywnych stref
  const allowedZonesList = useMemo(() => {
    return ANATOMICAL_ZONES.filter(z => allowedSiteIds.includes(z.id));
  }, [allowedSiteIds]);

  const currentZoneIndex = Math.max(0, allowedZonesList.findIndex(z => z.id === currentZoneId));
  const totalZones = allowedZonesList.length || 6;

  return (
    <>
      <div 
        onClick={() => {
          Haptics.light();
          setIsModalOpen(true);
        }}
        className={cn(
          "glass-card w-full h-full p-3.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer active:scale-[0.98] group rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl"
        )}
      >
        {/* Poświata w tle */}
        <div className={cn(
          "absolute -top-10 -right-10 w-28 h-28 blur-3xl rounded-full pointer-events-none transition-colors duration-500",
          isOverdue ? "bg-rose-500/20" : "bg-emerald-500/15"
        )} />

        {/* Header */}
        <div className="flex items-center justify-between w-full shrink-0 z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:rotate-90 duration-500",
              isOverdue 
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30" 
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            )}>
              <RefreshCw size={11} strokeWidth={2.5} />
            </div>
            <span className="font-black text-[9.5px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {t('auto.rotacja_wkluc', { defaultValue: 'Rotacja Wkłuć' })}
            </span>
          </div>

          {/* Doba lub status */}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight flex items-center gap-1 shrink-0 border shadow-xs",
            isOverdue
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isOverdue ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
            {isOverdue ? t('auto.wymien', { defaultValue: 'Wymień' }) : `Doba ${currentDay}/${maxDays}`}
          </span>
        </div>

        {/* Smart Rotation Dial / Pierścień Cyklu Rotacji */}
        <div className="relative w-full flex-1 flex items-center justify-center my-0.5 min-h-[90px] max-h-[115px] pointer-events-none">
          <div className="relative w-[105px] h-[105px] flex items-center justify-center">
            {/* Pierścień bazowy tarczy */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <defs>
                <filter id="site-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Tło toru obwodowego */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-100 dark:text-slate-800/90"
              />

              {/* Punkty/Segmenty stref na okręgu */}
              {allowedZonesList.map((z, idx) => {
                const angle = (idx / totalZones) * 2 * Math.PI;
                const cx = 50 + 40 * Math.cos(angle);
                const cy = 50 + 40 * Math.sin(angle);
                const isCurr = z.id === currentZoneId;
                const isNxt = z.id === nextZone.id;

                let fill = '#94a3b8'; // slate-400
                let radius = 2.5;

                if (isCurr) {
                  fill = isOverdue ? '#f43f5e' : '#10b981';
                  radius = 4.5;
                } else if (isNxt) {
                  fill = '#6366f1';
                  radius = 3.5;
                }

                return (
                  <circle
                    key={z.id}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={fill}
                    filter={isCurr ? 'url(#site-ring-glow)' : undefined}
                    className="transition-all duration-500"
                  />
                );
              })}

              {/* Łuk postępu cyklu rotacji */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={isOverdue ? '#f43f5e' : '#10b981'}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 * (1 - (currentZoneIndex + 1) / totalZones)}
                className="transition-all duration-1000 ease-out opacity-85"
              />
            </svg>

            {/* Centrum Tarczy - Czytelna nazwa i status strefy */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span className={cn(
                "font-black text-xs md:text-sm tracking-tight leading-tight max-w-[78px] truncate",
                isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white"
              )}>
                {currentZone.shortName || currentZone.name}
              </span>
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 font-mono">
                {currentZoneIndex + 1}/{totalZones} strefa
              </span>
            </div>
          </div>
        </div>

        {/* Dolny Panel - Nowoczesna Pigułka Następnego Wkłucia (Capsule Pill) */}
        <div className="w-full z-10 shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 dark:from-indigo-500/20 dark:via-purple-500/15 dark:to-indigo-500/20 border border-indigo-500/25 dark:border-indigo-500/35 shadow-sm shadow-indigo-500/5 transition-all group-hover:border-indigo-400/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[8px] font-black uppercase text-indigo-500/90 dark:text-indigo-400/90 tracking-wider shrink-0">
                {t('auto.nastepne_skrot', { defaultValue: 'Następne' })}:
              </span>
              <span className="text-[9.5px] font-black text-indigo-700 dark:text-indigo-300 truncate">
                {nextZone.name}
              </span>
            </div>
            <ArrowRight size={10} className="text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform ml-1" />
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
