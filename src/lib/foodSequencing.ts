import { Product } from '../types';

export type FoodSequenceStep = 1 | 2 | 3 | 4;

export interface SequenceStepInfo {
  step: FoodSequenceStep;
  key: string;
  nameKey: string;
  defaultName: string;
  descKey: string;
  defaultDesc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badge: string;
  iconName: 'Leaf' | 'Utensils' | 'Zap' | 'Sparkles';
}

export const SEQUENCE_STEPS: Record<FoodSequenceStep, SequenceStepInfo> = {
  1: {
    step: 1,
    key: 'fiber',
    nameKey: 'meal.sequence_step1_name',
    defaultName: '1. Błonnik & Warzywa',
    descKey: 'meal.sequence_step1_desc',
    defaultDesc: 'Zjedz jako pierwsze. Tworzą w żołądku naturalny bufor spowalniający trawienie.',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    badge: 'START',
    iconName: 'Leaf'
  },
  2: {
    step: 2,
    key: 'protein_fat',
    nameKey: 'meal.sequence_step2_name',
    defaultName: '2. Białka & Tłuszcze',
    descKey: 'meal.sequence_step2_desc',
    defaultDesc: 'Fundament sytości. Dalsze opóźnienie opróżniania żołądka i nasycenie.',
    color: 'blue',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    textColor: 'text-sky-400',
    badge: 'BAZA',
    iconName: 'Utensils'
  },
  3: {
    step: 3,
    key: 'carbs',
    nameKey: 'meal.sequence_step3_name',
    defaultName: '3. Węglowodany złożone',
    descKey: 'meal.sequence_step3_desc',
    defaultDesc: 'Główna energia. Trafiają na przygotowany bufor i uwalniają się stopniowo.',
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    badge: 'ENERGIA',
    iconName: 'Zap'
  },
  4: {
    step: 4,
    key: 'dessert',
    nameKey: 'meal.sequence_step4_name',
    defaultName: '4. Owoce / Deser',
    descKey: 'meal.sequence_step4_desc',
    defaultDesc: 'Słodki akcent na koniec. Zjedzone na pełny żołądek wchłaniają się znacznie łagodniej.',
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    badge: 'FINAŁ',
    iconName: 'Sparkles'
  }
};

export const COMPOSITE_STEP_INFO: SequenceStepInfo = {
  step: 2,
  key: 'composite',
  nameKey: 'meal.sequence_composite_name',
  defaultName: 'Danie złożone (np. Hot-dog / Kanapka / Burger)',
  descKey: 'meal.sequence_composite_desc',
  defaultDesc: 'Spożywaj jako całość – nie rozdzielaj składników. Białko i tłuszcz naturalnie spowalniają tempo wchłaniania węglowodanów z pieczywa.',
  color: 'indigo',
  bgColor: 'bg-indigo-500/10',
  borderColor: 'border-indigo-500/30',
  textColor: 'text-indigo-400',
  badge: 'CAŁOŚĆ',
  iconName: 'Utensils'
};

export const UNIFIED_DISH_KEYWORDS = [
  'hot dog', 'hot-dog', 'hotdog', 'parówk', 'parowk', 
  'burger', 'hamburger', 'cheeseburger',
  'kanapk', 'sandwich', 'tost', 'zapiekank', 'grzank',
  'pizza', 'kebab', 'kebap', 'shawarma', 'szawarma', 'gyros',
  'tortilla', 'wrap', 'burrito', 'taco', 'quesadilla',
  'pierog', 'dumpling', 'uszka', 'ravioli', 'knedl',
  'naleśnik', 'pancake', 'lasagn', 'lazani', 'casserole',
  'sushi', 'roll', 'krokiet'
];

export const VEG_KEYWORDS = [
  'sałat', 'ogór', 'pomidor', 'brokuł', 'kapust', 'kalafior', 'marchew', 'szpinak', 
  'cukinia', 'papryk', 'seler', 'por', 'rzodkiew', 'szparag', 'kiszon', 'rukola', 
  'roszponka', 'pieczark', 'grzyb', 'cukini', 'bakłażan', 'dyni', 'brukselk', 
  'vegetable', 'salad', 'tomato', 'cucumber', 'broccoli', 'cabbage', 'carrot', 'spinach', 
  'zucchini', 'pepper', 'celery', 'mushroom', 'lettuce'
];

export const SWEET_KEYWORDS = [
  'jabłk', 'banan', 'pomarańcz', 'truskawk', 'malin', 'borówk', 'czekolad', 'ciast', 
  'lody', 'deser', 'słodycz', 'miód', 'dżem', 'cukier', 'baton', 'arbuz', 'winogron', 
  'gruszk', 'brzoskwini', 'śliwk', 'mandarynk', 'apple', 'banana', 'orange', 'strawberry', 
  'chocolate', 'cake', 'ice cream', 'dessert', 'sweet', 'honey', 'jam', 'grape', 'watermelon'
];

export const PROTEIN_KEYWORDS = [
  'kurczak', 'indyk', 'wołowin', 'wieprzowin', 'mięs', 'ryb', 'łosoś', 'dorsz', 'tuńczyk', 
  'jaj', 'jajk', 'twaróg', 'ser', 'tofu', 'orzech', 'migdał', 'oliwa', 'olej', 'masło', 
  'boczek', 'szynk', 'krewetk', 'schab', 'polędwic', 'kiełbas', 'kabanos', 'parówk',
  'chicken', 'turkey', 'beef', 'pork', 'meat', 'fish', 'salmon', 'tuna', 'egg', 'cheese', 
  'cottage cheese', 'nuts', 'almonds', 'olive oil', 'oil', 'butter', 'bacon', 'ham', 'shrimp'
];

export function isBreadOrBun(item: any): boolean {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  return category.includes('pieczyw') || 
    category.includes('bread') || 
    name.includes('bułk') || 
    name.includes('buleczk') || 
    name.includes('chleb') || 
    name.includes('bagietk') || 
    name.includes('tost') || 
    name.includes('pita') || 
    name.includes('tortilla') || 
    name.includes('croissant') || 
    name.includes('chałk');
}

export function isFillingOrProtein(item: any): boolean {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  return category.includes('mięs') || 
    category.includes('wędlin') || 
    category.includes('nabiał') || 
    name.includes('parówk') || 
    name.includes('parowk') ||
    name.includes('kiełbas') || 
    name.includes('kabanos') || 
    name.includes('szynk') || 
    name.includes('ser') || 
    name.includes('pasztet') || 
    name.includes('kotlet') || 
    name.includes('burger') || 
    name.includes('tofu');
}

/**
 * Sprawdza, czy produkt jest częścią dania złożonego (np. bułka lub parówka w hot-dogu).
 */
export function isCompositeMealItem(item: any, plate?: any[]): boolean {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();

  // 1. Bezpośrednia nazwa dania złożonego (np. "Hot dog francuski", "Burger")
  if (UNIFIED_DISH_KEYWORDS.some(k => name.includes(k))) return true;

  // 2. Jeśli mamy listę składników talerza (np. bułka + parówka)
  if (Array.isArray(plate) && plate.length >= 2 && plate.length <= 5) {
    const hasBread = plate.some(p => isBreadOrBun(p));
    const hasFilling = plate.some(p => isFillingOrProtein(p));
    if (hasBread && hasFilling) {
      if (isBreadOrBun(item) || isFillingOrProtein(item)) return true;
      if (name.includes('ketchup') || name.includes('musztard') || name.includes('majonez') || name.includes('sos')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Klasyfikuje pojedynczy produkt/składnik do jednego z 4 etapów sekwencji posiłku.
 */
export function classifyIngredientStep(item: Partial<Product> & { name?: string; fiber?: number }): FoodSequenceStep {
  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const fiber = Number(item.fiber) || 0;
  const protein = Number(item.protein) || 0;
  const fat = Number(item.fat) || 0;
  const carbs = Number(item.carbs) || 0;

  // 1. Warzywa / Błonnik (Start)
  if (
    category.includes('warzyw') ||
    category.includes('vegetable') ||
    category.includes('salad') ||
    category.includes('surówk') ||
    VEG_KEYWORDS.some(k => name.includes(k)) ||
    (fiber >= 2.5 && (carbs - fiber) <= 12)
  ) {
    return 1;
  }

  // 4. Owoce / Słodycze / Deser (Finał)
  if (
    category.includes('słodycz') ||
    category.includes('owoc') ||
    category.includes('sweet') ||
    category.includes('fruit') ||
    SWEET_KEYWORDS.some(k => name.includes(k))
  ) {
    return 4;
  }

  // 2. Białko i Tłuszcze (Baza)
  if (
    category.includes('mięs') ||
    category.includes('meat') ||
    category.includes('ryb') ||
    category.includes('fish') ||
    category.includes('nabiał') ||
    category.includes('dairy') ||
    category.includes('jaj') ||
    category.includes('egg') ||
    category.includes('tłuszcz') ||
    category.includes('fat') ||
    PROTEIN_KEYWORDS.some(k => name.includes(k)) ||
    (protein >= 7 && protein > carbs * 0.4) ||
    (fat >= 10 && carbs < 15)
  ) {
    return 2;
  }

  // 3. Węglowodany złożone / Skrobie (Energia)
  return 3;
}

export interface GroupedPlateStep {
  stepInfo: SequenceStepInfo;
  items: Array<{
    item: any;
    originalIndex: number;
  }>;
}

/**
 * Grupuje składniki talerza w uporządkowaną sekwencję, uwzględniając dania złożone (np. hot dog, burger).
 */
export function getPlateGroupedSequence(plate: any[]): GroupedPlateStep[] {
  if (!Array.isArray(plate) || plate.length === 0) return [];

  // Wykryj czy na talerzu znajdują się składniki tworzące danie złożone
  const compositeIndices = new Set<number>();
  plate.forEach((item, index) => {
    if (isCompositeMealItem(item, plate)) {
      compositeIndices.add(index);
    }
  });

  const isCompositeActive = compositeIndices.size > 0;

  if (isCompositeActive) {
    const result: GroupedPlateStep[] = [];
    const fiberItems: Array<{ item: any; originalIndex: number }> = [];
    const compositeItems: Array<{ item: any; originalIndex: number }> = [];
    const dessertItems: Array<{ item: any; originalIndex: number }> = [];
    const otherItems: Array<{ item: any; originalIndex: number }> = [];

    plate.forEach((item, originalIndex) => {
      if (compositeIndices.has(originalIndex)) {
        compositeItems.push({ item, originalIndex });
      } else {
        const step = classifyIngredientStep(item);
        if (step === 1) fiberItems.push({ item, originalIndex });
        else if (step === 4) dessertItems.push({ item, originalIndex });
        else otherItems.push({ item, originalIndex });
      }
    });

    // 1. Warzywa / Surówka (jeśli dodane obok hot-doga)
    if (fiberItems.length > 0) {
      result.push({
        stepInfo: SEQUENCE_STEPS[1],
        items: fiberItems
      });
    }

    // 2. Danie złożone (Hot-dog / Kanapka / Burger – zjedz w całości)
    if (compositeItems.length > 0) {
      result.push({
        stepInfo: COMPOSITE_STEP_INFO,
        items: compositeItems
      });
    }

    // Inne ewentualne dodatki
    if (otherItems.length > 0) {
      result.push({
        stepInfo: SEQUENCE_STEPS[3],
        items: otherItems
      });
    }

    // 3. Deser / Owoc
    if (dessertItems.length > 0) {
      result.push({
        stepInfo: SEQUENCE_STEPS[4],
        items: dessertItems
      });
    }

    return result;
  }

  // Standardowa sekwencja dla posiłków rozdzielnych (np. obiad klasyczny)
  const groups: Record<FoodSequenceStep, Array<{ item: any; originalIndex: number }>> = {
    1: [],
    2: [],
    3: [],
    4: []
  };

  plate.forEach((item, originalIndex) => {
    const step = classifyIngredientStep(item);
    groups[step].push({ item, originalIndex });
  });

  const result: GroupedPlateStep[] = [];
  ([1, 2, 3, 4] as FoodSequenceStep[]).forEach(step => {
    if (groups[step].length > 0) {
      result.push({
        stepInfo: SEQUENCE_STEPS[step],
        items: groups[step]
      });
    }
  });

  return result;
}
