import i18n from '../i18n';
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CloudRain, Sun, Cloud, Thermometer, Wind, Droplets, AlertTriangle, CloudDrizzle, Snowflake, CloudLightning, CloudFog, CloudSnow, MapPin, RefreshCw } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";

export default function WeatherWidget({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation();
  const [weather, setWeather] = useState<any>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadWeather = async () => {
      const data = await fetchCurrentWeather();
      if (mounted && data) {
        setWeather(data);
      }
    };
    loadWeather();
    return () => { mounted = false; };
  }, []);

  const handleRefreshLoc = () => {
    Haptics.light();
    setLoadingLoc(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const data = await fetchCurrentWeather(position.coords.latitude, position.coords.longitude, true);
          if (data) setWeather(data);
          setLoadingLoc(false);
        },
        async (err) => {
          console.warn("Geolocation API error:", err);
          const data = await fetchCurrentWeather(undefined, undefined, true);
          if (data) setWeather(data);
          setLoadingLoc(false);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
      );
    } else {
      fetchCurrentWeather(undefined, undefined, true).then(data => {
        if (data) setWeather(data);
        setLoadingLoc(false);
      });
    }
  };

  if (!weather) return null;

  const nowHour = new Date().getHours();
  const isMorning = nowHour >= 5 && nowHour < 15; // 5:00 do 14:59
  const isEvening = nowHour >= 17 || nowHour < 5; // 17:00 do 4:59 rano

  let alertColor = "text-slate-500 dark:text-slate-400";
  let alertBg = "bg-slate-100 dark:bg-slate-800/50";
  let alertText = "";
  let alertTitle = "Status pogody";
  let alertIcon = null;

  if (isMorning) {
    const todayMax = weather.todayMax !== undefined ? weather.todayMax : weather.temp;
    alertTitle = i18n.t('auto.prognoza_na_dzis_rano_mak', { defaultValue: "Prognoza na dziś (Rano) • maks. {{var0}}°C", var0: todayMax });
    
    if (todayMax >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = i18n.t('auto.dzis_zapowiadany_jest_upa', { defaultValue: "Dziś zapowiadany jest upał do {{var0}}°C! Uważaj rano i w południe – insulina może wchłaniać się znacznie szybciej, gwałtownie zwiększając ryzyko nagłej hipoglikemii i odwodnienia. Zabezpiecz peny/pompy przed słońcem!", var0: todayMax });
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (todayMax >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = i18n.t('auto.dzis_cieply_dzien_do_var0', { defaultValue: "Dziś ciepły dzień (do {{var0}}°C). Wyższa temperatura może przyspieszyć działanie bolusów posiłkowych. Pamiętaj o piciu wody i miej przy sobie szybkie węglowodany.", var0: todayMax });
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else if (todayMax <= 0) {
      alertColor = "text-sky-600 dark:text-sky-400";
      alertBg = "bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20";
      alertText = i18n.t('auto.dzis_prognozowany_jest_mr', { defaultValue: "Dziś prognozowany jest mróz (maks. {{var0}}°C). Kurczenie naczyń krwionośnych w zimnie może opóźnić wchłanianie insuliny, a nagłe wejście do ciepłego pokoju wywoła spadek. Chroń glukometr i insulinę!", var0: todayMax });
      alertIcon = <AlertTriangle size={14} className="text-sky-500 shrink-0" />;
    } else {
      alertText = i18n.t('auto.temperatura_umiarkowana_stabil', { defaultValue: i18n.t('auto.temperatura_umiarkowana_s', { defaultValue: "Temperatura umiarkowana, stabilne warunki zewnętrzne dla Twojej insuliny na resztę dnia." }) });
      alertIcon = <Sun size={14} className="text-indigo-400 shrink-0" />;
    }
  } else if (isEvening) {
    const tomorrowMax = weather.tomorrowMax !== undefined ? weather.tomorrowMax : weather.temp;
    const tomorrowCond = weather.tomorrowCondition ? ` (${weather.tomorrowCondition.toLowerCase()})` : '';
    alertTitle = i18n.t('auto.prognoza_na_jutro_wieczor', { defaultValue: "Prognoza na jutro (Wieczór) • maks. {{var0}}°C", var0: tomorrowMax });

    if (tomorrowMax >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = i18n.t('auto.jutro_szykuje_sie_bardzo', { defaultValue: "Jutro szykuje się bardzo upalny dzień, aż do {{var0}}°C{{var1}}. Zaplanuj schronienie dla zapasu insuliny i przygotuj się na ewentualną redukcję dawek na jutrzejszą aktywność w ciągu dnia.", var0: tomorrowMax, var1: tomorrowCond });
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (tomorrowMax >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = i18n.t('auto.jutro_cieplejszy_dzien_do', { defaultValue: "Jutro cieplejszy dzień (do {{var0}}°C){{var1}}. Rozważ przygotowanie dodatkowych zapasów lub delikatną korektę bazy w pompie podczas dłuższego przebywania na słońcu.", var0: tomorrowMax, var1: tomorrowCond });
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else if (tomorrowMax <= 0) {
      alertColor = "text-sky-600 dark:text-sky-400";
      alertBg = "bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20";
      alertText = i18n.t('auto.jutro_prognozowany_mroz_m', { defaultValue: "Jutro prognozowany mróz (maks. {{var0}}°C){{var1}}. Organizm może rano zużywać więcej energii na ogrzanie, co podnosi wrażliwość na insulinę rano, a stres termiczny może dać chwilowy skok cukru.", var0: tomorrowMax, var1: tomorrowCond });
      alertIcon = <AlertTriangle size={14} className="text-sky-500 shrink-0" />;
    } else {
      alertText = i18n.t('auto.stabilne_warunki_na_jutro', { defaultValue: "Stabilne warunki na jutro (maks. {{var0}}°C){{var1}}. Brak przewidywanych anomalii wywołanych aurą pogodową.", var0: tomorrowMax, var1: tomorrowCond });
      alertIcon = <Cloud size={14} className="text-slate-400 shrink-0" />;
    }
  } else {
    // Popołudnie (15:00 - 16:59)
    alertTitle = i18n.t('auto.status_popoludniowy_aktua', { defaultValue: "Status popołudniowy • aktualnie {{var0}}°C", var0: weather.temp });
    if (weather.temp >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = i18n.t('auto.upal_trwa_var0_c_chron_wk', { defaultValue: "Upał trwa ({{var0}}°C). Chroń wkłucie i pompę przed słońcem. Przegrzany analog insuliny powyżej 30°C traci swoje właściwości lecznicze!", var0: weather.temp });
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (weather.temp >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = i18n.t('auto.cieplo_var0_c_utrzymuj_na', { defaultValue: "Ciepło ({{var0}}°C). Utrzymuj nawodnienie organizmu. Gęstsza krew z odwodnienia sztucznie zawyża wyniki poziomu glukozy.", var0: weather.temp });
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else {
      alertText = i18n.t('auto.warunki_stabilne_temperat', { defaultValue: "Warunki stabilne, temperatura wynosi {{var0}}°C. Brak aktywnych alertów ze strony GlikoSense.", var0: weather.temp });
      alertIcon = <Sun size={14} className="text-amber-400 shrink-0" />;
    }
  }

  const renderWeatherIcon = () => {
    const condition = (weather.condition || "").toLowerCase();
    
    if (condition.includes('sleet') || condition.includes(i18n.t('auto.snieg_z_deszczem', { defaultValue: i18n.t('auto.snieg_z_deszczem', { defaultValue: "śnieg z deszczem" }) }))) return <CloudDrizzle size={24} className="text-sky-300" />;
    if (condition.includes('drizzle') || condition.includes(i18n.t('auto.mzawka', { defaultValue: i18n.t('auto.mzawka', { defaultValue: "mżawka" }) }))) return <CloudDrizzle size={24} className="text-sky-400" />;
    if (condition.includes('thunder') || condition.includes('burza')) return <CloudLightning size={24} className="text-amber-500" />;
    if (condition.includes('snow') || condition.includes(i18n.t('auto.snieg', { defaultValue: i18n.t('auto.snieg', { defaultValue: "śnieg" }) }))) return <CloudSnow size={24} className="text-sky-300" />;
    if (condition.includes('fog') || condition.includes(i18n.t('auto.mgla', { defaultValue: i18n.t('auto.mgla', { defaultValue: "mgła" }) })) || condition.includes('mist')) return <CloudFog size={24} className="text-slate-400" />;
    if (condition.includes('rain') || condition.includes('deszcz')) return <CloudRain size={24} className="text-blue-500" />;
    if (condition.includes('cloud') || condition.includes('chmur') || condition.includes('pochmurnie') || condition.includes('overcast')) return <Cloud size={24} className="text-slate-400" />;
    
    if (condition.includes('clear') || condition.includes(i18n.t('auto.slonce', { defaultValue: i18n.t('auto.slonce', { defaultValue: "słońce" }) })) || condition.includes('jasno') || condition.includes('bezchmurnie') || condition.includes(i18n.t('auto.slonecznie', { defaultValue: i18n.t('auto.slonecznie', { defaultValue: "słonecznie" }) }))) return <Sun size={24} className="text-amber-400" />;
    
    // Default to sun if it's hot, cloud if cold, etc or just Sun
    if (weather.temp < 5) return <Snowflake size={24} className="text-sky-300" />;
    return <Sun size={24} className="text-amber-500" />;
  };

  return (
    <div className="glass-card mb-0 overflow-hidden relative">
      {/* Dekoracyjne rozmycie w tle */}
      {weather.temp >= 25 && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>}
      {weather.temp <= 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>}

      <div className={compact ? "p-4" : "p-6"}>
         <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800 glass-target shrink-0">
                 {renderWeatherIcon()}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                  {weather.temp}{t('auto.c', { defaultValue: '°C' })}
                                              </p>
                <div className="flex items-center gap-1.5 mt-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                     {weather.city ? `${weather.city}` : weather.condition}
                   </p>
                   <button 
                     onClick={handleRefreshLoc}
                     disabled={loadingLoc}
                     className="text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
                     title={t('auto.odśwież_lokalizację_gps', { defaultValue: i18n.t('auto.odswiez_lokalizacje_gps', { defaultValue: "Odśwież lokalizację GPS" }) })}
                   >
                     {loadingLoc ? <RefreshCw size={10} className="animate-spin" /> : <MapPin size={10} />}
                   </button>
                </div>
              </div>
            </div>
            
            {!compact && (
              <div className="flex flex-col items-end gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                 <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 py-1 px-2.5 rounded-full border border-slate-100 dark:border-white/5">
                   <Wind size={10} />
                   <span>{weather.pressure}  {t('auto.hpa', { defaultValue: 'hPa' })}</span>
                 </div>
              </div>
            )}
         </div>

         <div className={`flex flex-col gap-1 p-3 rounded-[1.3rem] border border-black/[0.03] dark:border-white/[0.03] ${alertBg}`}>
            <div className="flex items-center gap-1.5 border-b border-black/[0.04] dark:border-white/[0.04] pb-1">
               {alertIcon}
               <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${alertColor}`}>
                 {compact ? i18n.t('auto.wskazowka', { defaultValue: i18n.t('auto.wskazowka', { defaultValue: "Wskazówka" }) }) : alertTitle}
               </span>
            </div>
            <p className={`text-[10px] font-bold leading-relaxed line-clamp-3 ${alertColor}`}>
               {compact 
                 ? (weather.temp >= 30 
                     ? i18n.t('auto.upal_insulina_szybciej_sie_wch', { defaultValue: i18n.t('auto.upal_insulina_szybciej_si', { defaultValue: "Upał: Insulina szybciej się wchłania. Nawodnij się!" }) }) 
                     : weather.temp <= 0 
                     ? i18n.t('auto.mroz_opoznienie_wchlaniania_in', { defaultValue: i18n.t('auto.mroz_opoznienie_wchlanian', { defaultValue: "Mróz: opóźnienie wchłaniania insuliny. Chroń sprzęt!" }) }) 
                     : "Stabilne temperatury, bezpieczne warunki dla insuliny.") 
                 : alertText}
            </p>
         </div>
      </div>
    </div>
  );
}
