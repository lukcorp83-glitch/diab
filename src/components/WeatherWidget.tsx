import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CloudRain, Sun, Cloud, Thermometer, Wind, Droplets, AlertTriangle, CloudDrizzle, Snowflake, CloudLightning, CloudFog, CloudSnow } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);

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

  if (!weather) return null;

  // Generuj komunikaty (alerty pogodowe) w zależności od temperatury
  let alertColor = "text-slate-400";
  let alertBg = "bg-slate-100 dark:bg-slate-800/50";
  let alertText = "Zwykły dzień, brak wpływu na insulinę.";
  let alertIcon = null;

  if (weather.temp >= 30) {
    alertColor = "text-rose-500";
    alertBg = "bg-rose-50 dark:bg-rose-500/10";
    alertText = "Ekstremalny upał! Uważaj, insulina może szybciej się wchłaniać, a ryzyko hipoglikemii i odwodnienia gwałtownie rośnie. Trzymaj insulinę z daleka od słońca.";
    alertIcon = <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" />;
  } else if (weather.temp >= 25) {
    alertColor = "text-orange-500";
    alertBg = "bg-orange-50 dark:bg-orange-500/10";
    alertText = "Upał: Możliwe szybsze wchłanianie insuliny. Monitoruj cukry i pij dużo wody.";
    alertIcon = <Thermometer size={14} className="text-orange-500 mt-0.5 shrink-0" />;
  } else if (weather.temp <= 0) {
    alertColor = "text-sky-500";
    alertBg = "bg-sky-50 dark:bg-sky-500/10";
    alertText = "Mróz: Twoje zapotrzebowanie na insulinę może się zmienić. Chroń sprzęt przed zamarznięciem!";
    alertIcon = <AlertTriangle size={14} className="text-sky-500 mt-0.5 shrink-0" />;
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
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800">
                 {renderWeatherIcon()}
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                  {weather.temp}°C
                </p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{weather.condition}</p>
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

         <div className={`flex items-start gap-2 p-3 rounded-2xl ${alertBg}`}>
            {alertIcon}
            <p className={`text-xs font-medium leading-relaxed ${alertColor}`}>
              {alertText}
            </p>
         </div>
      </div>
    </div>
  );
}
