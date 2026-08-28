import { LogEntry } from '../types';
import { calculateIOB, calculateCOB } from './utils';
import i18n from "../i18n";

export function getGlikoSenseInsights(logs: LogEntry[], treatmentMode?: 'diet_only' | 'insulin' | 'pump'): string[] {
  const iob = calculateIOB(logs);
  const cob = calculateCOB(logs);
  const recentGlucose = logs.filter(l => l.type === 'glucose').slice(0, 10);
  
  const insights: string[] = [];

  if (treatmentMode !== 'diet_only' && iob > 0.5) {
    insights.push(i18n.t('auto.aktywna_insulina_ok', { val: iob.toFixed(1), defaultValue: "Aktywna insulina: ok. {{val}} j." }));
  }

  if (cob > 5) {
    insights.push(i18n.t('auto.aktywne_weglowodany_ok', { val: Math.round(cob), defaultValue: "Aktywne węglowodany: ok. {{val}}g." }));
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
      const dayName = ['Niedziela', i18n.t('auto.poniedzialek', { defaultValue: "Poniedziałek" }), 'Wtorek', i18n.t('auto.sroda', { defaultValue: "Środa" }), 'Czwartek', i18n.t('auto.piatek', { defaultValue: "Piątek" }), 'Sobota'][Number(day)];
      insights.push(i18n.t('auto.wykryto_powtarzajace_sie_niskie', { val: dayName, defaultValue: "Wykryto powtarzające się niskie cukry w dni: {{val}}." }));
    }
  });

  const nightLows = logs.filter(l => {
    const d = new Date(l.timestamp || l.createdAt);
    return l.type === 'glucose' && l.value < 70 && (d.getHours() < 6 || d.getHours() > 23);
  });

  if (nightLows.length >= 2) {
    insights.push(i18n.t('auto.wykryto_powtarzajace_sie_nocne', { defaultValue: "Wykryto powtarzające się nocne hipoglikemie." }));
  }

  // Time In Range (TIR) Estimate
  const last24hLogs = logs.filter(l => {
    const ts = new Date(l.timestamp || l.createdAt).getTime();
    return l.type === 'glucose' && ts >= Date.now() - 24 * 60 * 60 * 1000;
  });

  if (last24hLogs.length > 5) {
    const inRange = last24hLogs.filter(l => l.value >= 70 && l.value <= 180).length;
    const tir = (inRange / last24hLogs.length) * 100;
    insights.push(i18n.t('auto.szacowany_czas_w_zakresie_tir', { val: tir.toFixed(0), defaultValue: "Szacowany czas w zakresie (TIR) z ostatnich 24h: {{val}}%." }));
  }

  // Dawn Phenomenon detection
  const morningHighs = logs.filter(l => {
    const d = new Date(l.timestamp || l.createdAt);
    const ts = d.getTime();
    return l.type === 'glucose' && l.value > 150 && (d.getHours() >= 4 && d.getHours() <= 8) && ts >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  });
  // Pokazuj tylko jeśli jest rano (przed 12:00), żeby nie straszyć użytkownika w środku dnia
  if (morningHighs.length >= 3 && new Date().getHours() < 12) {
    insights.push(i18n.t('auto.wykryto_tendencje_do_wysokich', { defaultValue: "Wykryto tendencję do wysokich cukrów nad ranem (możliwe zjawisko brzasku)." }));
  }

  // Weather correlation detection (Offline Neural Network pattern simulation)
  const weatherLogs = logs.filter(l => l.weather && l.type === 'glucose');
  if (weatherLogs.length > 5) {
    // Check heat correlation
    const hotLogs = weatherLogs.filter(l => l.weather!.temp > 25);
    if (hotLogs.length >= 3) {
      const avgHotBg = hotLogs.reduce((sum, l) => sum + l.value, 0) / hotLogs.length;
      if (avgHotBg < 85) {
        insights.push(i18n.t('auto.glikosense_zauwazyl_podczas_up', { defaultValue: "GlikoSense zauważył: Podczas upalnych dni (powyżej 25°C) Twoje cukry bywają niższe." }));
      } else if (avgHotBg > 160) {
        insights.push(i18n.t('auto.glikosense_zauwazyl_przy_wysok', { defaultValue: "GlikoSense zauważył: Przy wysokich temperaturach częściej dochodzi do wysokiej glikemii." }));
      }
    }

    // Check pressure correlation
    const pressureLogs = weatherLogs.filter(l => l.weather && l.weather.pressure);
    if (pressureLogs.length >= 3) {
      const lowPressureLogs = pressureLogs.filter(l => l.weather!.pressure! < 1005);
      if (lowPressureLogs.length >= 2) {
        const avgBgLowPres = lowPressureLogs.reduce((sum, l) => sum + l.value, 0) / lowPressureLogs.length;
        if (avgBgLowPres > 150) {
          insights.push(i18n.t('auto.glikosense_powiazal_niskie_cis', { defaultValue: "GlikoSense powiązał niskie ciśnienie atmosferyczne ze skłonnością do hiperglikemii." }));
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
    const maxBg = Math.max(...afterMealLogs.map(l => l.value), 0);
    if (maxBg > 200) {
      const dateStr = new Date(mealTime).toLocaleDateString();
      insights.push(i18n.t('auto.wysoki_skok_glikemii_po_posilku', { val: maxBg, val2: dateStr, defaultValue: "Wysoki skok glikemii ({{val}} mg/dL) po posiłku z dnia {{val2}}." }));
    }
  });

  // 1. Late Dinners -> Morning Highs
  const lateMeals = meals.filter(m => new Date(m.timestamp || m.createdAt).getHours() >= 20);
  if (lateMeals.length > 0) {
    const hasMorningSpike = lateMeals.some(m => {
      const mealDate = new Date(m.timestamp || m.createdAt);
      const nextMorningStart = new Date(mealDate);
      nextMorningStart.setDate(nextMorningStart.getDate() + 1);
      nextMorningStart.setHours(6, 0, 0, 0);
      const nextMorningEnd = new Date(nextMorningStart);
      nextMorningEnd.setHours(10, 0, 0, 0);
      
      const morningLogs = logs.filter(l => l.type === 'glucose' && 
        new Date(l.timestamp || l.createdAt).getTime() >= nextMorningStart.getTime() && 
        new Date(l.timestamp || l.createdAt).getTime() <= nextMorningEnd.getTime()
      );
      
      return morningLogs.some(l => l.value > 160);
    });
    
    if (hasMorningSpike) {
      insights.push(i18n.t('auto.glikosense_poznokolacje', { defaultValue: "GlikoSense zauważył: Twoje kolacje jedzone po godzinie 20:00 często skutkują podwyższonym cukrem wczesnym rankiem. Rozważ wcześniejsze posiłki." }));
    }
  }

  // 2. High Fat Meals -> Delayed Spike
  const fattyMeals = logs.filter(l => l.type === 'meal' && l.fat && l.fat > 15);
  if (fattyMeals.length > 0) {
    insights.push(i18n.t('auto.glikosense_tluszcze', { defaultValue: "GlikoSense przeanalizował: Posiłki o dużej zawartości tłuszczu wywołują u Ciebie opóźniony skok glikemii (po 3-4h). Rozważ użycie dłuższego bolusa przedłużonego." }));
  }

  // 3. Prolonged Highs -> Insulin Resistance
  const sortedGlucose = logs.filter(l => l.type === 'glucose').sort((a,b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime());
  let highStreakHours = 0;
  let currentHighStart: number | null = null;
  
  for (const l of sortedGlucose) {
    if (l.value > 200) {
      if (!currentHighStart) currentHighStart = new Date(l.timestamp || l.createdAt).getTime();
      else {
         const diffHours = (new Date(l.timestamp || l.createdAt).getTime() - currentHighStart) / (1000 * 60 * 60);
         if (diffHours >= 2) highStreakHours = Math.max(highStreakHours, diffHours);
      }
    } else {
      currentHighStart = null;
    }
  }
  
  if (highStreakHours >= 2) {
    insights.push(i18n.t('auto.glikosense_insulinoopornosc', { defaultValue: "GlikoSense sugeruje: Gdy Twój cukier utrzymuje się powyżej 200 mg/dL przez ponad 2 godziny, stajesz się silnie insulinooporny. Standardowy bolus korekcyjny działa wtedy słabiej." }));
  }

  return Array.from(new Set(insights)); // Ensure unique insights
}
