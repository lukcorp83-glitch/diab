/**
 * Culinary Matrix Engine (Matryca Kulinarna i Fizykochemia Żywności)
 * 
 * Moduł czysto kulinarny i technologiczny analizujący fizykochemię posiłku:
 * - Bufor kwasowy (kiszonki, cytryna, octy, sosy winegret),
 * - Błonnik żelujący / rozpuszczalny (chia, siemię, owies, pektyny, beta-glukany),
 * - Tekstura i forma (stała / do gryzienia vs rozdrobniona vs płynna / smoothie),
 * - Wolumetryka posiłku (gęstość energetyczna kcal/100g),
 * - Estymowany czas pasażu żołądkowego (fizyka trawienia),
 * - Czasowe okno trawienne (odstęp od ostatniego posiłku - MMC).
 * 
 * 100% ZGODNE Z MDR / SaMD:
 * Wyłącznie parametry technologiczne, kulinarne i organizacyjne. Brak zaleceń terapeutycznych i medycznych.
 */

import { PlateItem } from '../types';

export interface CulinaryItemAttributes {
  hasAcidicBuffer: boolean;
  hasGelFiber: boolean;
  textureForm: 'solid' | 'mashed_puree' | 'liquid_smoothie';
  fatType: 'light_plant' | 'heavy_fried' | 'neutral';
  isStarchCandidate: boolean;
  tags: string[];
}

export interface CulinaryMatrixSummary {
  hasAcidicBuffer: boolean;
  acidicSources: string[];
  hasGelFiber: boolean;
  gelFiberSources: string[];
  textureForm: 'solid' | 'mashed_puree' | 'liquid_smoothie';
  volumetricsRatio: number; // kcal / 100g
  volumetricsCategory: 'high_volume' | 'balanced' | 'dense_energy';
  estimatedGastricTransitMinutes: number; // minuty pasażu
  timeSinceLastMealMinutes: number | null;
  digestiveRestState: 'fasting_cleared' | 'digestive_window' | 'recently_eaten' | 'unknown';
}

// Słowa kluczowe bufora kwasowego (kwasy organiczne spowalniające opróżnianie żołądka)
const ACIDIC_KEYWORDS = [
  'kisz', 'kwas', 'ogórek kiszon', 'kapusta kiszon', 'kimchi', 'kefir', 'maślank',
  'ocet', 'balsamiczn', 'cytryn', 'limonk', 'winegret', 'vinaigrette', 'zakwas',
  'pomidor suszon', 'pikle', 'oliwk', 'kombuch'
];

// Słowa kluczowe błonnika rozpuszczalnego / żelującego (tworzenie lepkiej matrycy)
const GEL_FIBER_KEYWORDS = [
  'chia', 'siemi', 'lnian', 'babk', 'płesznik', 'jajowat', 'owsian', 'owies', 'płatki owsian',
  'otręby owsian', 'awokado', 'jagod', 'borówk', 'malin', 'jabłko', 'gruszk',
  'soczewic', 'ciecierzyc', 'fasol', 'bób', 'pektyn'
];

// Słowa kluczowe formy płynnej lub zblendowanej (szybki pasaż)
const LIQUID_SMOOTHIE_KEYWORDS = [
  'smoothie', 'koktajl', 'sok', 'shake', 'napój', 'nektar', 'kompot', 'syrop'
];

// Słowa kluczowe formy puree / zupy krem
const MASHED_PUREE_KEYWORDS = [
  'puree', 'purée', 'mus', 'krem', 'zupa krem', 'pasta', 'pasztet', 'pulp', 'papka'
];

// Słowa kluczowe tłuszczu ciężkiego / smażonego
const HEAVY_FRIED_KEYWORDS = [
  'panier', 'smażon', 'frytk', 'głębok', 'boczek', 'golonk', 'schabow', 'nuggets',
  'kebab', 'fast food', 'chips', 'majonez'
];

// Słowa kluczowe tłuszczu lekkiego / roślinnego
const LIGHT_PLANT_KEYWORDS = [
  'oliw', 'olej lnian', 'olej rzepakow', 'orzech', 'migdał', 'pestk', 'słonecznik', 'dyni'
];

// Skrobie podatne na al dente vs rozgotowanie
const STARCH_CANDIDATE_KEYWORDS = [
  'makaron', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'świderki',
  'ryż', 'kasza', 'bulgur', 'quinoa', 'pęczak', 'jaglan'
];

/**
 * Automatycznie analizuje dowolny produkt i przypisuje mu cechy kulinarne
 */
export function getProductCulinaryAttributes(item: {
  name: string;
  category?: string;
  carbs?: number;
  fiber?: number;
  fat?: number;
  protein?: number;
  cookingMethod?: string;
}): CulinaryItemAttributes {
  const nameLower = (item.name || '').toLowerCase().trim();
  const categoryLower = (item.category || '').toLowerCase().trim();
  const tags: string[] = [];

  // 1. Bufor kwasowy
  const hasAcidicBuffer = ACIDIC_KEYWORDS.some(k => nameLower.includes(k) || categoryLower.includes(k));
  if (hasAcidicBuffer) tags.push('acidic_buffer');

  // 2. Błonnik żelujący
  const hasGelFiber = GEL_FIBER_KEYWORDS.some(k => nameLower.includes(k) || categoryLower.includes(k)) || 
                      ((item.fiber || 0) >= 4 && (nameLower.includes('płatk') || nameLower.includes('nasion') || nameLower.includes('ziarn')));
  if (hasGelFiber) tags.push('gel_fiber');

  // 3. Tekstura / Forma
  let textureForm: 'solid' | 'mashed_puree' | 'liquid_smoothie' = 'solid';
  if (item.cookingMethod === 'blended' || LIQUID_SMOOTHIE_KEYWORDS.some(k => nameLower.includes(k))) {
    textureForm = 'liquid_smoothie';
    tags.push('liquid');
  } else if (MASHED_PUREE_KEYWORDS.some(k => nameLower.includes(k))) {
    textureForm = 'mashed_puree';
    tags.push('puree');
  } else {
    tags.push('solid');
  }

  // 4. Profil tłuszczu
  let fatType: 'light_plant' | 'heavy_fried' | 'neutral' = 'neutral';
  if (item.cookingMethod === 'fried' || HEAVY_FRIED_KEYWORDS.some(k => nameLower.includes(k))) {
    fatType = 'heavy_fried';
    tags.push('heavy_fat');
  } else if (LIGHT_PLANT_KEYWORDS.some(k => nameLower.includes(k)) || (categoryLower.includes('oliw') || categoryLower.includes('orzech'))) {
    fatType = 'light_plant';
    tags.push('light_fat');
  }

  // 5. Kandydat na Al Dente
  const isStarchCandidate = STARCH_CANDIDATE_KEYWORDS.some(k => nameLower.includes(k));
  if (isStarchCandidate) tags.push('starch_candidate');

  return {
    hasAcidicBuffer,
    hasGelFiber,
    textureForm,
    fatType,
    isStarchCandidate,
    tags
  };
}

/**
 * Analizuje całą zawartość Talerza pod kątem matrycy kulinarnej
 */
export function analyzePlateCulinaryMatrix(
  plate: PlateItem[],
  logs?: any[],
  manualOverrides?: {
    acidicBuffer?: boolean;
    isAlDente?: boolean;
  }
): CulinaryMatrixSummary {
  if (!Array.isArray(plate) || plate.length === 0) {
    return {
      hasAcidicBuffer: false,
      acidicSources: [],
      hasGelFiber: false,
      gelFiberSources: [],
      textureForm: 'solid',
      volumetricsRatio: 0,
      volumetricsCategory: 'balanced',
      estimatedGastricTransitMinutes: 120,
      timeSinceLastMealMinutes: null,
      digestiveRestState: 'unknown'
    };
  }

  const acidicSources: string[] = [];
  const gelFiberSources: string[] = [];
  let liquidCount = 0;
  let pureeCount = 0;
  let solidCount = 0;
  let hasHeavyFat = false;
  let totalWeight = 0;
  let totalKcal = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalProtein = 0;

  plate.forEach(item => {
    const attrs = getProductCulinaryAttributes(item);
    const weight = Number(item.weight) || 100;
    const itemKcal = Number(item.kcal) || Math.round((item.carbs || 0) * 4 + (item.protein || 0) * 4 + (item.fat || 0) * 9);

    totalWeight += weight;
    totalKcal += (itemKcal * weight) / 100;
    totalCarbs += ((item.carbs || 0) * weight) / 100;
    totalFat += ((item.fat || 0) * weight) / 100;
    totalProtein += ((item.protein || 0) * weight) / 100;

    if (attrs.hasAcidicBuffer) {
      acidicSources.push(item.name);
    }
    if (attrs.hasGelFiber) {
      gelFiberSources.push(item.name);
    }

    if (attrs.textureForm === 'liquid_smoothie') liquidCount++;
    else if (attrs.textureForm === 'mashed_puree') pureeCount++;
    else solidCount++;

    if (attrs.fatType === 'heavy_fried') hasHeavyFat = true;
  });

  // Dominująca forma potrawy
  let dominantTexture: 'solid' | 'mashed_puree' | 'liquid_smoothie' = 'solid';
  if (liquidCount > 0 && solidCount === 0 && pureeCount === 0) {
    dominantTexture = 'liquid_smoothie';
  } else if (pureeCount > solidCount && liquidCount === 0) {
    dominantTexture = 'mashed_puree';
  }

  // Bufor kwasowy (wykryty automatycznie lub wymuszony ręcznie przełącznikiem)
  const finalAcidicBuffer = Boolean(manualOverrides?.acidicBuffer || acidicSources.length > 0);

  // Wolumetryka: kcal na 100g posiłku
  const volumetricsRatio = totalWeight > 0 ? Math.round((totalKcal / totalWeight) * 100) : 100;
  let volumetricsCategory: 'high_volume' | 'balanced' | 'dense_energy' = 'balanced';
  if (volumetricsRatio < 110) {
    volumetricsCategory = 'high_volume'; // Lekka, wysoka objętość (warzywa, zupy)
  } else if (volumetricsRatio > 240) {
    volumetricsCategory = 'dense_energy'; // Dużo kalorii w małej masie (orzechy, fast food, słodycze)
  }

  // Estymowany czas pasażu żołądkowego w minutach (Fizjologia żołądka)
  // Baza: 120 minut (2h)
  let transitMinutes = 120;

  // Forma płynna opróżnia się znacznie szybciej
  if (dominantTexture === 'liquid_smoothie') {
    transitMinutes -= 45;
  } else if (dominantTexture === 'mashed_puree') {
    transitMinutes -= 20;
  } else {
    transitMinutes += 15; // Gryzienie i struktura stała spowalniają pasaż
  }

  // Błonnik żelujący tworzy lepki żel w żołądku (+25 min)
  if (gelFiberSources.length > 0) {
    transitMinutes += 25;
  }

  // Bufor kwasowy stymuluje receptory dwunastnicy hamujące perystaltykę żołądka (+20 min)
  if (finalAcidicBuffer) {
    transitMinutes += 20;
  }

  // Tłuszcz i białko (WBT) wydłużają opróżnianie żołądka
  if (totalFat > 25 || hasHeavyFat) {
    transitMinutes += 60; // Tłusty posiłek zalega dłużej
  } else if (totalFat > 10) {
    transitMinutes += 25;
  }

  // Al dente vs rozgotowane
  if (manualOverrides?.isAlDente) {
    transitMinutes += 15;
  }

  // Zaokrąglenie do 15 minut
  transitMinutes = Math.max(45, Math.round(transitMinutes / 15) * 15);

  // Analiza okna trawiennego (czas od ostatniego posiłku w logach)
  let timeSinceLastMealMinutes: number | null = null;
  let digestiveRestState: 'fasting_cleared' | 'digestive_window' | 'recently_eaten' | 'unknown' = 'unknown';

  if (Array.isArray(logs) && logs.length > 0) {
    const mealLogs = logs.filter(l => l.type === 'meal' && (l.carbs > 0 || l.kcal > 0 || l.name));
    if (mealLogs.length > 0) {
      const sorted = [...mealLogs].sort((a, b) => {
        const tA = new Date(a.timestamp || a.date).getTime();
        const tB = new Date(b.timestamp || b.date).getTime();
        return tB - tA;
      });
      const lastMealTime = new Date(sorted[0].timestamp || sorted[0].date).getTime();
      const diffMs = Date.now() - lastMealTime;
      if (diffMs >= 0) {
        timeSinceLastMealMinutes = Math.round(diffMs / 60000);
        if (timeSinceLastMealMinutes < 90) {
          digestiveRestState = 'recently_eaten'; // Żołądek jeszcze trawi poprzedni posiłek
        } else if (timeSinceLastMealMinutes < 240) {
          digestiveRestState = 'digestive_window'; // Optymalne okno
        } else {
          digestiveRestState = 'fasting_cleared'; // Wędrujący kompleks mioelektryczny (MMC) zakończył cykl
        }
      }
    }
  }

  return {
    hasAcidicBuffer: finalAcidicBuffer,
    acidicSources,
    hasGelFiber: gelFiberSources.length > 0,
    gelFiberSources,
    textureForm: dominantTexture,
    volumetricsRatio,
    volumetricsCategory,
    estimatedGastricTransitMinutes: transitMinutes,
    timeSinceLastMealMinutes,
    digestiveRestState
  };
}
