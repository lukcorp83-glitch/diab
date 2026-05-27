import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CloudRain, Sun, Cloud, Thermometer, Wind, Droplets, AlertTriangle, CloudDrizzle, Snowflake, CloudLightning, CloudFog, CloudSnow, MapPin, RefreshCw } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';
import { Haptics } from '../lib/haptics';

export default function WeatherWidget() {
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
    alertTitle = `Prognoza na dziś (Rano) • maks. ${todayMax}°C`;
    
    if (todayMax >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = `Dziś zapowiadany jest upał do ${todayMax}°C! Uważaj rano i w południe – insulina może wchłaniać się znacznie szybciej, gwałtownie zwiększając ryzyko nagłej hipoglikemii i odwodnienia. Zabezpiecz peny/pompy przed słońcem!`;
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (todayMax >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = `Dziś ciepły dzień (do ${todayMax}°C). Wyższa temperatura może przyspieszyć działanie bolusów posiłkowych. Pamiętaj o piciu wody i miej przy sobie szybkie węglowodany.`;
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else if (todayMax <= 0) {
      alertColor = "text-sky-600 dark:text-sky-400";
      alertBg = "bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20";
      alertText = `Dziś prognozowany jest mróz (maks. ${todayMax}°C). Kurczenie naczyń krwionośnych w zimnie może opóźnić wchłanianie insuliny, a nagłe wejście do ciepłego pokoju wywoła spadek. Chroń glukometr i insulinę!`;
      alertIcon = <AlertTriangle size={14} className="text-sky-500 shrink-0" />;
    } else {
      alertText = "Temperatura umiarkowana, stabilne warunki zewnętrzne dla Twojej insuliny na resztę dnia.";
      alertIcon = <Sun size={14} className="text-indigo-400 shrink-0" />;
    }
  } else if (isEvening) {
    const tomorrowMax = weather.tomorrowMax !== undefined ? weather.tomorrowMax : weather.temp;
    const tomorrowCond = weather.tomorrowCondition ? ` (${weather.tomorrowCondition.toLowerCase()})` : '';
    alertTitle = `Prognoza na jutro (Wieczór) • maks. ${tomorrowMax}°C`;

    if (tomorrowMax >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = `Jutro szykuje się bardzo upalny dzień, aż do ${tomorrowMax}°C${tomorrowCond}. Zaplanuj schronienie dla zapasu insuliny i przygotuj się na ewentualną redukcję dawek na jutrzejszą aktywność w ciągu dnia.`;
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (tomorrowMax >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = `Jutro cieplejszy dzień (do ${tomorrowMax}°C)${tomorrowCond}. Rozważ przygotowanie dodatkowych zapasów lub delikatną korektę bazy w pompie podczas dłuższego przebywania na słońcu.`;
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else if (tomorrowMax <= 0) {
      alertColor = "text-sky-600 dark:text-sky-400";
      alertBg = "bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20";
      alertText = `Jutro prognozowany mróz (maks. ${tomorrowMax}°C)${tomorrowCond}. Organizm może rano zużywać więcej energii na ogrzanie, co podnosi wrażliwość na insulinę rano, a stres termiczny może dać chwilowy skok cukru.`;
      alertIcon = <AlertTriangle size={14} className="text-sky-500 shrink-0" />;
    } else {
      alertText = `Stabilne warunki na jutro (maks. ${tomorrowMax}°C)${tomorrowCond}. Brak przewidywanych anomalii wywołanych aurą pogodową.`;
      alertIcon = <Cloud size={14} className="text-slate-400 shrink-0" />;
    }
  } else {
    // Popołudnie (15:00 - 16:59)
    alertTitle = `Status popołudniowy • aktualnie ${weather.temp}°C`;
    if (weather.temp >= 30) {
      alertColor = "text-rose-600 dark:text-rose-400";
      alertBg = "bg-rose-50 dark:bg-rose-500/10 border border-rose-500/20";
      alertText = `Upał trwa (${weather.temp}°C). Chroń wkłucie i pompę przed słońcem. Przegrzany analog insuliny powyżej 30°C traci swoje właściwości lecznicze!`;
      alertIcon = <AlertTriangle size={14} className="text-rose-500 shrink-0" />;
    } else if (weather.temp >= 25) {
      alertColor = "text-orange-600 dark:text-orange-400";
      alertBg = "bg-orange-50 dark:bg-orange-500/10 border border-orange-500/20";
      alertText = `Ciepło (${weather.temp}°C). Utrzymuj nawodnienie organizmu. Gęstsza krew z odwodnienia sztucznie zawyża wyniki poziomu glukozy.`;
      alertIcon = <Thermometer size={14} className="text-orange-500 shrink-0" />;
    } else {
      alertText = `Warunki stabilne, temperatura wynosi ${weather.temp}°C. Brak aktywnych alertów ze strony GlikoSense.`;
      alertIcon = <Sun size={14} className="text-amber-400 shrink-0" />;
    }
  }

  const renderWeatherIcon = () => {
    const condition = (weather.condition || "").toLowerCase();
    
    if (condition.includes('sleet') || condition.includes('śnieg z deszczem')) return <CloudDrizzle size={24} className="text-sky-300" />;
    if (condition.includes('drizzle') || condition.includes('mżawka')) return <CloudDrizzle size={24} className="text-sky-400" />;
    if (condition.includes('thunder') || condition.includes('burza')) return <CloudLightning size={24} className="text-amber-500" />;
    if (condition.includes('snow') || condition.includes('śnieg')) return <CloudSnow size={24} className="text-sky-300" />;
    if (condition.includes('fog') || condition.includes('mgła') || condition.includes('mist')) return <CloudFog size={24} className="text-slate-400" />;
    if (condition.includes('rain') || condition.includes('deszcz')) return <CloudRain size={24} className="text-blue-500" />;
    if (condition.includes('cloud') || condition.includes('chmur') || condition.includes('pochmurnie') || condition.includes('overcast')) return <Cloud size={24} className="text-slate-400" />;
    
    if (condition.includes('clear') || condition.includes('słońce') || condition.includes('jasno') || condition.includes('bezchmurnie') || condition.includes('słonecznie')) return <Sun size={24} className="text-amber-400" />;
    
    // Default to sun if it's hot, cloud if cold, etc or just Sun
    if (weather.temp < 5) return <Snowflake size={24} className="text-sky-300" />;
    return <Sun size={24} className="text-amber-500" />;
  };

  return (
    <div className="glass-card mb-6 overflow-hidden relative">
      {/* Dekoracyjne rozmycie w tle */}
      {weather.temp >= 25 && <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>}
      {weather.temp <= 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>}

      <div className="p-6">
         <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800 glass-target">
                 {renderWeatherIcon()}
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                  {weather.temp}°C
                </p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {weather.city ? `${weather.city} • ${weather.condition}` : weather.condition}
                   </p>
                   <button 
                     onClick={handleRefreshLoc}
                     disabled={loadingLoc}
                     className="ml-2 text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
                     title="Odśwież lokalizację GPS"
                   >
                     {loadingLoc ? <RefreshCw size={12} className="animate-spin" /> : <MapPin size={12} />}
                   </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
               <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 py-1 px-2.5 rounded-full border border-slate-100 dark:border-white/5">
                 <Wind size={10} />
                 <span>{weather.pressure} hPa</span>
               </div>
            </div>
         </div>

         <div className={`flex flex-col gap-1.5 p-3.5 rounded-[1.6rem] border border-black/[0.03] dark:border-white/[0.03] ${alertBg}`}>
            <div className="flex items-center gap-1.5 border-b border-black/[0.04] dark:border-white/[0.04] pb-1.5">
               {alertIcon}
               <span className={`text-[10px] font-black uppercase tracking-widest ${alertColor}`}>
                 {alertTitle}
               </span>
            </div>
            <p className={`text-xs font-medium leading-relaxed ${alertColor}`}>
              {alertText}
            </p>
         </div>
      </div>
    </div>
  );
}
