import React from 'react';
import { Product } from '../types';
import { getProductName } from '../components/FoodDatabase';
import { Leaf, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import i18n from '../i18n';
import { cn } from './utils';

export interface DietBadgeInfo {
  type: 'success' | 'warning' | 'info';
  text: string;
  color: string;
  icon?: React.ReactNode;
}

export const getDietName = (activeDiet: string | null): string => {
  if (!activeDiet) return '';
  switch (activeDiet) {
    case 'keto': return 'Keto / Low-Carb';
    case 'low-carb': return 'Low-Carb';
    case 'low-gi': return 'Niski IG';
    case 'gluten': return 'Bezglutenowa';
    case 'plate': return 'Talerz Diabetologiczny';
    case 'dash': return 'DASH / Śródziemnomorska';
    case 'if': return 'Post Przerywany (IF)';
    default: return activeDiet;
  }
};

/**
 * Sprawdza, czy dany produkt jest zgodny z zasadami aktywnej diety użytkownika.
 */
export const isProductDietFriendly = (product: Product, activeDiet: string | null): boolean => {
  if (!activeDiet || activeDiet === 'all') return true;
  const carbs = product.carbs || 0;
  const protein = product.protein || 0;
  const gi = typeof product.gi === 'number' ? product.gi : 50;
  const pName = getProductName(product, i18n.language).toLowerCase();

  switch (activeDiet) {
    case 'keto':
      return carbs <= 10;
    case 'low-carb':
      return carbs <= 20;
    case 'low-gi':
      return gi <= 55;
    case 'gluten': {
      const glutenWords = ["chleb", "bułka", "bulka", "makaron", "pszenic", "mąka", "maka", "ciasto", "ciastk", "krakers", "paluszk", "płatki", "platki"];
      return !glutenWords.some((w) => pName.includes(w));
    }
    case 'plate':
      // Talerz diabetologiczny odrzuca same węgle bez białka/błonnika
      return !(carbs > 40 && protein < 5);
    case 'dash':
      return (product.fat || 0) <= 20 || (product.category || '').toLowerCase().includes('ryby') || (product.category || '').toLowerCase().includes('owoce');
    case 'if':
      return gi <= 65;
    default:
      return true;
  }
};

/**
 * Zwraca czytelny badge zgodności posiłku z aktywną dietą.
 */
export const getDietBadge = (product: Product, activeDiet: string | null): React.ReactNode => {
  if (!activeDiet) return null;
  const carbs = product.carbs || 0;
  const protein = product.protein || 0;
  const gi = typeof product.gi === 'number' ? product.gi : 50;
  const pName = getProductName(product, i18n.language).toLowerCase();

  let badge: DietBadgeInfo | null = null;

  if (activeDiet === 'keto') {
    if (carbs <= 5) {
      badge = {
        type: 'success',
        text: 'Keto Friendly',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <Leaf size={9} className="text-emerald-500" />
      };
    } else if (carbs > 10) {
      badge = {
        type: 'warning',
        text: i18n.t('auto.wysokie_wegle', { defaultValue: 'Wysokie Węgle' }),
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: <AlertTriangle size={9} className="text-rose-500" />
      };
    }
  } else if (activeDiet === 'low-carb') {
    if (carbs <= 15) {
      badge = {
        type: 'success',
        text: 'Low-Carb',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <Leaf size={9} className="text-emerald-500" />
      };
    } else if (carbs > 20) {
      badge = {
        type: 'warning',
        text: 'High Carbs',
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: <AlertTriangle size={9} className="text-rose-500" />
      };
    }
  } else if (activeDiet === 'low-gi') {
    if (gi <= 55) {
      badge = {
        type: 'success',
        text: 'Niski IG',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <ShieldCheck size={9} className="text-emerald-500" />
      };
    } else if (gi >= 70) {
      badge = {
        type: 'warning',
        text: 'Wysoki IG',
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: <AlertTriangle size={9} className="text-rose-500" />
      };
    }
  } else if (activeDiet === 'gluten') {
    const glutenWords = ["chleb", "bułka", "bulka", "makaron", "pszenic", "mąka", "maka", "ciasto", "ciastk", "krakers", "paluszk", "płatki", "platki"];
    if (glutenWords.some((w) => pName.includes(w))) {
      badge = {
        type: 'warning',
        text: 'Gluten?',
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: <AlertTriangle size={9} className="text-rose-500" />
      };
    } else {
      badge = {
        type: 'success',
        text: 'Bez glutenu',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <CheckCircle2 size={9} className="text-emerald-500" />
      };
    }
  } else if (activeDiet === 'plate') {
    if (carbs > 40 && protein < 5) {
      badge = {
        type: 'warning',
        text: i18n.t('auto.same_wegle', { defaultValue: 'Same węgle' }),
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: <AlertTriangle size={9} className="text-amber-500" />
      };
    } else if (protein >= 15 || ((product as any).fiber || 0) >= 4) {
      badge = {
        type: 'success',
        text: 'Zbilansowane',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <ShieldCheck size={9} className="text-emerald-500" />
      };
    }
  } else if (activeDiet === 'dash') {
    const cat = (product.category || '').toLowerCase();
    if (cat.includes('owoce') || cat.includes('warzywa') || cat.includes('ryby')) {
      badge = {
        type: 'success',
        text: 'DASH Friendly',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <Leaf size={9} className="text-emerald-500" />
      };
    }
  } else if (activeDiet === 'if') {
    if (gi <= 55) {
      badge = {
        type: 'success',
        text: 'Przyjazne IF',
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: <ShieldCheck size={9} className="text-emerald-500" />
      };
    } else if (gi > 70) {
      badge = {
        type: 'warning',
        text: 'Wysoki IG',
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: <AlertTriangle size={9} className="text-amber-500" />
      };
    }
  }

  if (!badge) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border",
        badge.color
      )}
    >
      {badge.icon}
      <span>{badge.text}</span>
    </span>
  );
};
