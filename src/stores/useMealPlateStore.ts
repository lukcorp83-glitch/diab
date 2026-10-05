import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, PlateItem } from '../types';

interface MealPlateState {
  plate: PlateItem[];
  setPlate: (plate: PlateItem[] | ((prev: PlateItem[]) => PlateItem[])) => void;
  addToPlate: (item: PlateItem) => void;
  removeFromPlate: (plateItemId: string) => void;
  clearPlate: () => void;
  
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  onlineResults: Product[];
  setOnlineResults: (results: Product[]) => void;
  
  isSearching: boolean;
  customProducts: Product[];
  setCustomProducts: (products: Product[]) => void;
  communityProducts: Product[];
  setCommunityProducts: (products: Product[]) => void;
  setIsSearching: (isSearching: boolean) => void;
}

export const useMealPlateStore = create<MealPlateState>()(
  persist(
    (set) => ({
      plate: [],
      setPlate: (updater) => set((state) => {
        const currentPlate = Array.isArray(state.plate) ? state.plate : [];
        const next = typeof updater === 'function' ? updater(currentPlate) : updater;
        return { plate: Array.isArray(next) ? next : [] };
      }),
      addToPlate: (item) => set((state) => ({ plate: [...(Array.isArray(state.plate) ? state.plate : []), item] })),
      removeFromPlate: (id) => set((state) => ({ plate: (Array.isArray(state.plate) ? state.plate : []).filter(i => i.plateItemId !== id) })),
      clearPlate: () => set({ plate: [] }),
      
      searchTerm: "",
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      
      onlineResults: [],
      setOnlineResults: (onlineResults) => set({ onlineResults: Array.isArray(onlineResults) ? onlineResults : [] }),
      
      isSearching: false,
      customProducts: [],
      setCustomProducts: (customProducts) => set({ customProducts: Array.isArray(customProducts) ? customProducts : [] }),
      communityProducts: [],
      setCommunityProducts: (communityProducts) => set({ communityProducts: Array.isArray(communityProducts) ? communityProducts : [] }),
      setIsSearching: (isSearching) => set({ isSearching }),
    }),
    {
      name: 'diacontrol_shared_plate',
      partialize: (state) => ({ plate: Array.isArray(state.plate) ? state.plate : [] }),
      onRehydrateStorage: () => (state) => {
        if (state && (!state.plate || !Array.isArray(state.plate))) {
          state.plate = [];
        }
      }
    }
  )
);

export function addAiItemToPlate(actionData: any) {
  if (!actionData) return;
  const rawItem = actionData.item || actionData;
  if (!rawItem || !rawItem.name) return;

  const weight = Number(rawItem.weight) || 100;
  const carbs = Number(rawItem.carbs) || 0;
  const protein = Number(rawItem.protein) || 0;
  const fat = Number(rawItem.fat) || 0;
  const kcal = Number(rawItem.kcal) || Math.round(carbs * 4 + protein * 4 + fat * 9);

  const plateItem: PlateItem = {
    id: rawItem.id || `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    plateItemId: `plate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: String(rawItem.name),
    carbs,
    protein,
    fat,
    kcal,
    weight,
    fiber: Number(rawItem.fiber) || 0,
    gi: rawItem.gi ? Number(rawItem.gi) : undefined,
    gl: rawItem.gl ? Number(rawItem.gl) : undefined,
    servingSize: Number(rawItem.servingSize) || 100,
    category: rawItem.category || 'Inne',
  };

  useMealPlateStore.getState().addToPlate(plateItem);
  try {
    import('../lib/haptics').then(({ Haptics }) => Haptics.success()).catch(() => {});
    import('react-hot-toast').then(({ toast }) => {
      toast.success(`🍽️ Dodano do Talerza: ${plateItem.name} (${plateItem.weight}g)`, {
        icon: '🍽️',
        duration: 4000,
      });
    }).catch(() => {});
  } catch (e) {}
}

