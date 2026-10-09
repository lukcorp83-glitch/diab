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

const VEG_KEYWORDS = [
  'sałat', 'ogór', 'pomidor', 'brokuł', 'kapust', 'kalafior', 'marchew', 'szpinak', 
  'cukinia', 'papryk', 'seler', 'por', 'rzodkiew', 'szparag', 'kiszon', 'rukola', 
  'roszponka', 'pieczark', 'grzyb', 'cukini', 'bakłażan', 'dyni', 'brukselk', 
  'vegetable', 'salad', 'tomato', 'cucumber', 'broccoli', 'cabbage', 'carrot', 'spinach', 
  'zucchini', 'pepper', 'celery', 'mushroom', 'lettuce'
];

const SWEET_KEYWORDS = [
  'jabłk', 'banan', 'pomarańcz', 'truskawk', 'malin', 'borówk', 'czekolad', 'ciast', 
  'lody', 'deser', 'słodycz', 'miód', 'dżem', 'cukier', 'baton', 'arbuz', 'winogron', 
  'gruszk', 'brzoskwini', 'śliwk', 'mandarynk', 'apple', 'banana', 'orange', 'strawberry', 
  'chocolate', 'cake', 'ice cream', 'dessert', 'sweet', 'honey', 'jam', 'grape', 'watermelon'
];

const PROTEIN_KEYWORDS = [
  'kurczak', 'indyk', 'wołowin', 'wieprzowin', 'mięs', 'ryb', 'łosoś', 'dorsz', 'tuńczyk', 
  'jaj', 'jajk', 'twaróg', 'ser', 'tofu', 'orzech', 'migdał', 'oliwa', 'olej', 'masło', 
  'boczek', 'szynk', 'krewetk', 'schab', 'polędwic', 'kiełbas', 'kabanos', 'parówk',
  'chicken', 'turkey', 'beef', 'pork', 'meat', 'fish', 'salmon', 'tuna', 'egg', 'cheese', 
  'cottage cheese', 'nuts', 'almonds', 'olive oil', 'oil', 'butter', 'bacon', 'ham', 'shrimp'
];

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
 * Grupuje składniki talerza w uporządkowaną sekwencję 1 -> 2 -> 3 -> 4.
 */
export function getPlateGroupedSequence(plate: any[]): GroupedPlateStep[] {
  if (!Array.isArray(plate) || plate.length === 0) return [];

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
