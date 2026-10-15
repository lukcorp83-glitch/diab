import { Product } from '../types';
import { dbService } from '../services/databaseService';

const FAVORITES_STORAGE_KEY = 'glikocontrol_favorite_food_keys';
const RECENTS_STORAGE_KEY = 'glikocontrol_recent_food_items';

export const getFavoriteProductKeys = (): string[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getProductKey = (p: Product): string => {
  return p.id || p.name;
};

export const isFavoriteProduct = (p: Product, favoriteKeys?: Set<string>): boolean => {
  if (p.isFavorite) return true;
  const key = getProductKey(p);
  if (favoriteKeys) {
    return favoriteKeys.has(key);
  }
  const keys = getFavoriteProductKeys();
  return keys.includes(key);
};

export const toggleFavoriteProduct = (p: Product): boolean => {
  try {
    const keys = getFavoriteProductKeys();
    const key = getProductKey(p);
    const idx = keys.indexOf(key);
    let isFav = false;

    if (idx >= 0) {
      keys.splice(idx, 1);
      isFav = false;
    } else {
      keys.unshift(key);
      isFav = true;
    }

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(keys));

    // Zsynchronizuj z SQLite w tle
    if (p.id) {
      dbService.toggleFoodFavorite(p.id, isFav).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('gliko_food_favorites_changed', { detail: { key, isFav } }));
    return isFav;
  } catch {
    return false;
  }
};

export const getRecentProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addRecentProduct = (p: Product): void => {
  try {
    if (!p || (!p.name && !p.id)) return;
    const items = getRecentProducts();
    const key = getProductKey(p);
    const filtered = items.filter(item => getProductKey(item) !== key);

    filtered.unshift({
      id: p.id,
      name: p.name,
      namePl: p.namePl,
      nameEn: p.nameEn,
      carbs: Number(p.carbs || 0),
      protein: Number(p.protein || 0),
      fat: Number(p.fat || 0),
      fiber: Number(p.fiber || 0),
      kcal: Number(p.kcal || 0),
      gi: Number(p.gi !== undefined ? p.gi : 50),
      category: p.category,
      servingSize: Number(p.servingSize || 100),
      barcode: p.barcode,
      isCustom: p.isCustom,
      isCommunity: p.isCommunity
    });

    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 20)));
    window.dispatchEvent(new CustomEvent('gliko_food_recents_changed'));
  } catch {}
};
