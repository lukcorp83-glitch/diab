import { LogEntry } from '../types';
import { calculateIOB, calculateCOB } from './utils';
import i18n from "../i18n";

export function getGlikoSenseInsights(logs: LogEntry[]): string[] {
  const iob = calculateIOB(logs);
  const cob = calculateCOB(logs);
  const recentGlucose = logs.filter(l => l.type === 'glucose').slice(0, 10);
  
  const insights: string[] = [];

  if (iob > 0.5) {
    insights.push(`Aktywna insulina: ok. ${iob.toFixed(1)} j.`);
  }

  if (cob > 5) {
    insights.push(`Aktywne węglowodany: ok. ${Math.round(cob)}g.`);
  }

  if (recentGlucose.length >= 3) {
    const vals = recentGlucose.slice(0, 3).map(l => l.value);
    if (vals[2] > vals[1] && vals[1] > vals[0]) { // Historical logs are newest first in some parts, but here we expect newest first?
      // Wait, let's check App.tsx logs sorting.
    }
  }

  // Monday-Sunday pattern detection
  const weekdayPatterns: Record<number, number[]> = {};
  logs.filter(l => l.type === 'glucose' && l.value < 80).forEach(l => {
    const d = new Date(l.timestamp || l.createdAt);
    const day = d.getDay();
    if (!weekdayPatterns[day]) weekdayPatterns[day] = [];
    weekdayPatterns[day].push(d.getHours());
  });

  Object.entries(weekdayPatterns).forEach(([day, hours]) => {
    if (hours.length >= 3) {
      const dayName = ['Niedziela', i18n.t('auto.poniedzialek', { defaultValue: i18n.t('auto.poniedzialek', { defaultValue: "Poniedziałek" }) }), 'Wtorek', i18n.t('auto.sroda', { defaultValue: i18n.t('auto.sroda', { defaultValue: "Środa" }) }), 'Czwartek', i18n.t('auto.piatek', { defaultValue: i18n.t('auto.piatek', { defaultValue: "Piątek" }) }), 'Sobota'][Number(day)];
      insights.push(`Wykryto powtarzające się niskie cukry w dni: ${dayName}.`);
    }
  });

  const nightLows = logs.filter(l => {
    const d = new Date(l.timestamp || l.createdAt);
    return l.type === 'glucose' && l.value < 70 && (d.getHours() < 6 || d.getHours() > 23);
  });

  if (nightLows.length >= 2) {
    insights.push(i18n.t('auto.wykryto_powtarzajace_sie_nocne', { defaultValue: i18n.t('auto.wykryto_powtarzajace_sie', { defaultValue: "Wykryto powtarzające się nocne hipoglikemie." }) }));
  }

  // Time In Range (TIR) Estimate
  const last24hLogs = logs.filter(l => {
    const ts = new Date(l.timestamp || l.createdAt).getTime();
    return l.type === 'glucose' && ts >= Date.now() - 24 * 60 * 60 * 1000;
  });

  if (last24hLogs.length > 5) {
    const inRange = last24hLogs.filter(l => l.value >= 70 && l.value <= 180).length;
    const tir = (inRange / last24hLogs.length) * 100;
    insights.push(`Szacowany czas w zakresie (TIR) z ostatnich 24h: ${tir.toFixed(0)}%.`);
  }

  // Dawn Phenomenon detection
  const morningHighs = logs.filter(l => {
    const d = new Date(l.timestamp || l.createdAt);
    return l.type === 'glucose' && l.value > 150 && (d.getHours() >= 4 && d.getHours() <= 8);
  });
  if (morningHighs.length >= 3) {
    insights.push(i18n.t('auto.wykryto_tendencje_do_wysokich', { defaultValue: i18n.t('auto.wykryto_tendencje_do_wyso', { defaultValue: "Wykryto tendencję do wysokich cukrów nad ranem (możliwe zjawisko brzasku)." }) }));
  }

  // Weather correlation detection (Offline Neural Network pattern simulation)
  const weatherLogs = logs.filter(l => l.weather && l.type === 'glucose');
  if (weatherLogs.length > 5) {
    // Check heat correlation
    const hotLogs = weatherLogs.filter(l => l.weather!.temp > 25);
    if (hotLogs.length >= 3) {
      const avgHotBg = hotLogs.reduce((sum, l) => sum + l.value, 0) / hotLogs.length;
      if (avgHotBg < 85) {
        insights.push(i18n.t('auto.glikosense_zauwazyl_podczas_up', { defaultValue: i18n.t('auto.glikosense_zauwazyl_podcz', { defaultValue: "GlikoSense zauważył: Podczas upalnych dni (powyżej 25°C) Twoje cukry bywają niższe." }) }));
      } else if (avgHotBg > 160) {
        insights.push(i18n.t('auto.glikosense_zauwazyl_przy_wysok', { defaultValue: i18n.t('auto.glikosense_zauwazyl_przy', { defaultValue: "GlikoSense zauważył: Przy wysokich temperaturach częściej dochodzi do wysokiej glikemii." }) }));
      }
    }

    // Check pressure correlation
    const pressureLogs = weatherLogs.filter(l => l.weather && l.weather.pressure);
    if (pressureLogs.length >= 3) {
      const lowPressureLogs = pressureLogs.filter(l => l.weather!.pressure! < 1005);
      if (lowPressureLogs.length >= 2) {
        const avgBgLowPres = lowPressureLogs.reduce((sum, l) => sum + l.value, 0) / lowPressureLogs.length;
        if (avgBgLowPres > 150) {
          insights.push(i18n.t('auto.glikosense_powiazal_niskie_cis', { defaultValue: i18n.t('auto.glikosense_powiazal_niski', { defaultValue: "GlikoSense powiązał niskie ciśnienie atmosferyczne ze skłonnością do hiperglikemii." }) }));
        }
      }
    }
  }

  // Post-prandial spike detection
  const meals = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs)).slice(0, 5);
  meals.forEach(meal => {
    const mealTime = new Date(meal.timestamp || meal.createdAt).getTime();
    const afterMealLogs = logs.filter(l => {
      const ts = new Date(l.timestamp || l.createdAt).getTime();
      return l.type === 'glucose' && ts > mealTime && ts < mealTime + 3 * 60 * 60 * 1000;
    });
    const maxBg = Math.max(...afterMealLogs.map(l => l.value));
    if (maxBg > 200) {
      insights.push(`Wysoki skok glikemii (${maxBg} mg/dL) po posiłku z dnia ${new Date(mealTime).toLocaleDateString('pl-PL')}.`);
    }
  });

  return Array.from(new Set(insights)); // Ensure unique insights
}
