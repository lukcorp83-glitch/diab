import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, Check, AlertTriangle, Sparkles, MapPin, Shield, Layers, HelpCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { UserSettings, LogEntry } from '../types';
import { 
  ANATOMICAL_ZONES, 
  AnatomicalZone, 
  ZoneRecoveryInfo,
  calculateTissueRecovery, 
  getNextRecommendedSite, 
  detectLipohypertrophyWarning, 
  normalizeSiteToZoneId, 
  getZoneById,
  DEFAULT_ALLOWED_SITES 
} from '../services/siteRotationService';
import { cn, getEffectiveUid } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface SiteRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  setSettings: (s: UserSettings) => void;
  logs: LogEntry[];
  user: any;
}

export default function SiteRotationModal({
  isOpen,
  onClose,
  settings,
  setSettings,
  logs,
  user
}: SiteRotationModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'map' | 'config'>('map');
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');

  const currentZoneId = useMemo(() => {
    return normalizeSiteToZoneId(settings.infusionSetSite);
  }, [settings.infusionSetSite]);

  const currentZone = useMemo(() => getZoneById(currentZoneId), [currentZoneId]);

  const allowedSiteIds = useMemo(() => {
    return settings.allowedInfusionSites && settings.allowedInfusionSites.length > 0
      ? settings.allowedInfusionSites
      : DEFAULT_ALLOWED_SITES;
  }, [settings.allowedInfusionSites]);

  const recoveryMap = useMemo(() => {
    return calculateTissueRecovery(logs, currentZoneId, settings.infusionSetChangeDate);
  }, [logs, currentZoneId, settings.infusionSetChangeDate]);

  const recommendation = useMemo(() => {
    return getNextRecommendedSite(currentZoneId, allowedSiteIds, settings.sensorSite, recoveryMap, logs);
  }, [currentZoneId, allowedSiteIds, settings.sensorSite, recoveryMap, logs]);

  // Domyślnie zaznaczona strefa w modalu
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => recommendation.zone.id);

  const selectedZone = useMemo(() => getZoneById(selectedZoneId), [selectedZoneId]);
  const selectedRecovery = useMemo(() => recoveryMap.get(selectedZoneId), [recoveryMap, selectedZoneId]);

  const lipoWarning = useMemo(() => detectLipohypertrophyWarning(logs), [logs]);

  // Automatycznie przełącz widok na przód/tył, jeśli wybrano strefę z innego widoku
  const handleSelectZone = (zone: AnatomicalZone) => {
    setSelectedZoneId(zone.id);
    if (zone.view !== bodyView) {
      setBodyView(zone.view);
    }
  };

  // 1-Click Wymiana wkłucia
  const handleConfirmSiteChange = async () => {
    const now = Date.now();
    const newSite = selectedZone.name;

    // 1. Zaktualizuj stan magazynowy apteczki (zdejmij 1 wkłucie)
    let updatedInventory = [...(settings.inventory || [])];
    const infusionSetIdx = updatedInventory.findIndex(i => i.category === 'infusion_sets' && i.quantity > 0);
    if (infusionSetIdx !== -1) {
      updatedInventory[infusionSetIdx] = {
        ...updatedInventory[infusionSetIdx],
        quantity: Math.max(0, updatedInventory[infusionSetIdx].quantity - 1)
      };
    }

    const newSettings: UserSettings = {
      ...settings,
      infusionSetSite: newSite,
      infusionSite: newSite,
      infusionSetChangeDate: now,
      inventory: updatedInventory
    };

    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    localStorage.setItem('glikocontrol_user_settings', JSON.stringify(newSettings));
    localStorage.setItem('infusionSetSite', newSite);
    localStorage.setItem('infusionSite', newSite);
    localStorage.setItem('infusionSetChangeDate', String(now));
    localStorage.setItem('last_smart_reservoir_prompt', String(now));

    // 2. Dodaj log site_change do Firestore i wyślij event lokalny
    const localId = `site_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const siteLog: any = {
      id: localId,
      type: 'site_change',
      value: 1,
      timestamp: now,
      createdAt: new Date(now).toISOString(),
      notes: `Wymiana wkłucia - ${newSite}`,
      site: newSite,
      source: 'system'
    };

    try {
      if (user) {
        const uid = getEffectiveUid(user);
        await setDoc(doc(db, 'users', uid, 'settings', 'profile'), newSettings, { merge: true });
        const docRef = await addDoc(collection(db, 'users', uid, 'logs'), siteLog);
        siteLog.id = docRef.id;
      }
      const { dbService } = await import('../services/databaseService');
      await dbService.saveLog(siteLog);
      window.dispatchEvent(new CustomEvent('localLogAdd', { detail: siteLog }));
      window.dispatchEvent(new CustomEvent('localLogAddBatch', { detail: [siteLog] }));
      window.dispatchEvent(new CustomEvent('siteChangeRecorded', { detail: { site: newSite, timestamp: now } }));
      window.dispatchEvent(new CustomEvent('userSettingsUpdate', { detail: newSettings }));

      toast.success(t('auto.wklucie_zmienione_sukces', { 
        defaultValue: `Wkłucie zmienione: ${newSite}!`,
        site: newSite 
      }));
      onClose();
    } catch (e) {
      console.error('Błąd zapisu wymiany wkłucia:', e);
      toast.error('Błąd zapisu wymiany.');
    }
  };

  // Przełączanie dozwolonych stref w konfiguratorze
  const handleToggleAllowedZone = async (zoneId: string) => {
    let nextAllowed: string[];
    if (allowedSiteIds.includes(zoneId)) {
      if (allowedSiteIds.length <= 2) {
        toast.error('Musisz pozostawić przynajmniej 2 dozwolone strefy do rotacji!');
        return;
      }
      nextAllowed = allowedSiteIds.filter(id => id !== zoneId);
    } else {
      nextAllowed = [...allowedSiteIds, zoneId];
    }

    const newSettings: UserSettings = {
      ...settings,
      allowedInfusionSites: nextAllowed
    };

    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));

    if (user) {
      try {
        const uid = getEffectiveUid(user);
        await setDoc(doc(db, 'users', uid, 'settings', 'profile'), { allowedInfusionSites: nextAllowed }, { merge: true });
      } catch (e) {}
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                {t('auto.rotacja_wkluc_tytul', { defaultValue: 'Inteligentna Rotacja Wkłuć' })}
              </h2>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {t('auto.ochrona_tkanek_opis', { defaultValue: 'Planowanie miejsc wkłuć i regeneracja tkanek' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 mx-5 mt-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === 'map'
                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <MapPin size={14} />
            {t('auto.mapa_i_wymiana', { defaultValue: 'Mapa & Wymiana' })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === 'config'
                ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Layers size={14} />
            {t('auto.moje_strefy', { defaultValue: 'Moje Strefy' })}
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full font-bold">
              {allowedSiteIds.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'map' ? (
            <>
              {/* Ostrzeżenie przed zrostami */}
              {lipoWarning.hasWarning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-amber-700 dark:text-amber-300 text-xs">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  <p className="leading-snug font-medium">{lipoWarning.warningMsg}</p>
                </div>
              )}

              {/* Rekomendacja AI Badge */}
              <div 
                onClick={() => handleSelectZone(recommendation.zone)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                  selectedZoneId === recommendation.zone.id
                    ? "bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                      {t('auto.sugerowane_kolejne_wklucie', { defaultValue: 'Sugerowane kolejne wkłucie' })}
                    </span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {recommendation.zone.name}
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {recommendation.reason}
                    </p>
                  </div>
                </div>
                {selectedZoneId === recommendation.zone.id && (
                  <span className="text-[9px] font-black uppercase px-2 py-1 bg-indigo-600 text-white rounded-xl shrink-0">
                    {t('auto.wybrane', { defaultValue: 'Wybrane' })}
                  </span>
                )}
              </div>

              {/* Interaktywna Sylwetka Ciała 2D */}
              <div className="relative bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center overflow-hidden min-h-[260px]">
                
                {/* Przełącznik Przód / Tył */}
                <div className="absolute top-3 right-3 z-20">
                  <button
                    type="button"
                    onClick={() => setBodyView(prev => prev === 'front' ? 'back' : 'front')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw size={12} />
                    {bodyView === 'front' ? t('auto.pokaz_tyl', { defaultValue: 'Widok: Przód ↺' }) : t('auto.pokaz_przod', { defaultValue: 'Widok: Tył ↺' })}
                  </button>
                </div>

                {/* SVG Silhouette */}
                <div className="relative w-[130px] h-[240px] drop-shadow-md">
                  <svg viewBox="0 0 100 180" className="w-full h-full text-slate-300 dark:text-slate-700 drop-shadow-sm transition-colors duration-500">
                    <ellipse cx="50" cy="18" rx="9" ry="12" fill="currentColor" opacity="0.9" />
                    <path 
                      d="M45,30 C38,32 30,36 24,42 C19,47 16,56 14,66 C13,76 15,90 17,98 C18,101 22,100 23,96 C24,88 26,70 28,60 C30,55 33,54 34,58 C34,66 33,82 34,98 C35,112 37,126 39,144 C41,156 44,166 46,172 C48,176 50,175 50,166 C50,144 49,122 49,104 C51,104 50,144 50,166 C50,175 52,176 54,172 C56,166 59,156 61,144 C63,126 65,112 66,98 C67,82 66,66 66,58 C67,54 70,55 72,60 C74,70 76,88 77,96 C78,100 82,101 83,98 C85,90 87,76 86,66 C84,56 81,47 76,42 C70,36 62,32 55,30 Z" 
                      fill="currentColor" 
                      opacity="0.85"
                    />
                    <path d="M42,50 C46,54 54,54 58,50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
                    <path d="M40,82 C46,85 54,85 60,82" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.3" />
                    <line x1="50" y1="52" x2="50" y2="92" stroke="currentColor" strokeWidth="1" strokeDasharray="2,3" opacity="0.3" />
                  </svg>

                  {/* Punkty Stref na Sylwetce */}
                  {ANATOMICAL_ZONES.filter(z => z.view === bodyView).map(zone => {
                    const isCurrent = zone.id === currentZoneId;
                    const isNext = zone.id === recommendation.zone.id;
                    const isSelected = zone.id === selectedZoneId;
                    const isAllowed = allowedSiteIds.includes(zone.id);
                    const rec = recoveryMap.get(zone.id);

                    let dotBg = "bg-slate-400";
                    let ringColor = "border-white dark:border-slate-900";

                    if (isCurrent) {
                      dotBg = "bg-emerald-500";
                    } else if (isNext) {
                      dotBg = "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,1)]";
                    } else if (rec?.status === 'fresh') {
                      dotBg = "bg-teal-500";
                    } else if (rec?.status === 'recovering') {
                      dotBg = "bg-amber-500";
                    } else if (rec?.status === 'tired') {
                      dotBg = "bg-rose-500";
                    }

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => handleSelectZone(zone)}
                        style={{ top: zone.dotPos.top, left: zone.dotPos.left }}
                        className={cn(
                          "absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 z-10 flex items-center justify-center",
                          isSelected ? "w-6 h-6 ring-4 ring-indigo-400/50" : "w-4 h-4 hover:scale-125",
                          !isAllowed && "opacity-40"
                        )}
                      >
                        <div className={cn("w-3.5 h-3.5 rounded-full border-2", dotBg, ringColor)}>
                          {(isNext || isCurrent) && (
                            <div className={cn("absolute inset-0 rounded-full animate-ping opacity-75", isCurrent ? "bg-emerald-400" : "bg-indigo-400")} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legenda kolorów */}
                <div className="flex items-center gap-3 mt-3 text-[9px] font-bold text-slate-500 dark:text-slate-400 flex-wrap justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{t('auto.aktualne', { defaultValue: 'Aktualne' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{t('auto.polecane', { defaultValue: 'Polecane' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    <span>{t('auto.wypoczeta_tkanka', { defaultValue: 'Wypoczęta (>14 dni)' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{t('auto.regeneracja', { defaultValue: 'Regeneracja' })}</span>
                  </div>
                </div>
              </div>

              {/* Karta Szczegółów Wybranej Strefy */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">
                        {selectedZone.name}
                      </h4>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                        selectedZone.id === currentZoneId
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : selectedRecovery?.status === 'fresh'
                          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                          : selectedRecovery?.status === 'recovering'
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      )}>
                        {selectedZone.id === currentZoneId 
                          ? t('auto.obecne_miejsce', { defaultValue: 'Obecne miejsce' })
                          : selectedRecovery?.daysSinceLastUse !== null && selectedRecovery?.daysSinceLastUse! < 90
                          ? t('auto.odpoczynek_dni', { days: selectedRecovery?.daysSinceLastUse, defaultValue: `Odpoczynek: ${selectedRecovery?.daysSinceLastUse} dni` })
                          : t('auto.pelna_regeneracja', { defaultValue: 'W pełni zregenerowane' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                      {selectedZone.absorptionDesc}
                    </p>
                  </div>
                </div>

                {/* Przycisk 1-Click Wymiany Wkłucia */}
                <button
                  type="button"
                  onClick={handleConfirmSiteChange}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <Check size={16} />
                  {selectedZone.id === currentZoneId 
                    ? t('auto.potwierdz_ponowne_wklucie', { defaultValue: 'Odśwież kaniulę w tym miejscu' })
                    : t('auto.zaloz_wklucie_tutaj', { site: selectedZone.name, defaultValue: `Załóż wkłucie w: ${selectedZone.name}` })}
                </button>
              </div>
            </>
          ) : (
            /* Zakładka Konfiguratora Stref */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                💡 {t('auto.konfigurator_stref_pomoc', { defaultValue: 'Zaznacz strefy, z których rzeczywiście korzystasz do wkłuć pompy. Algorytm inteligentnej rotacji będzie proponował kolejne miejsca wyłącznie spośród Twoich aktywnych stref.' })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ANATOMICAL_ZONES.map(zone => {
                  const isAllowed = allowedSiteIds.includes(zone.id);
                  const isCurrent = zone.id === currentZoneId;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleToggleAllowedZone(zone.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex items-center justify-between transition-all",
                        isAllowed
                          ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm"
                          : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold",
                          isAllowed ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}>
                          {zone.view === 'front' ? 'Przód' : 'Tył'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                            {zone.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {zone.absorptionSpeed === 'fast' ? '⚡ Szybkie' : zone.absorptionSpeed === 'medium' ? '⏱️ Średnie' : '🌙 Wolne'}
                          </p>
                        </div>
                      </div>

                      <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center border transition-colors",
                        isAllowed 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-slate-300 dark:border-slate-600"
                      )}>
                        {isAllowed && <Check size={12} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
