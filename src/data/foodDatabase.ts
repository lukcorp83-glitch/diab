import { Product } from '../types';
import { BAKERY_PRODUCTS } from './food/bakery';
import { DAIRY_PRODUCTS } from './food/dairy';
import { MEAT_FISH_PRODUCTS } from './food/meatFish';
import { PRODUCE_PRODUCTS } from './food/produce';
import { DISHES_PRODUCTS } from './food/dishes';
import { SNACKS_DRINKS_PRODUCTS } from './food/snacksDrinks';

/**
 * Główna biblioteka bazowych produktów spożywczych (offline-first).
 * Podzielona na modularne pliki kategoryczne w ./food/, wolna od narzutu i18n przy ładowaniu.
 */
export const LIB_BASE: Product[] = [
  ...BAKERY_PRODUCTS,
  ...DAIRY_PRODUCTS,
  ...MEAT_FISH_PRODUCTS,
  ...PRODUCE_PRODUCTS,
  ...DISHES_PRODUCTS,
  ...SNACKS_DRINKS_PRODUCTS
];
