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
      setPlate: (updater) => set((state) => ({
        plate: typeof updater === 'function' ? updater(state.plate) : updater
      })),
      addToPlate: (item) => set((state) => ({ plate: [...state.plate, item] })),
      removeFromPlate: (id) => set((state) => ({ plate: state.plate.filter(i => i.plateItemId !== id) })),
      clearPlate: () => set({ plate: [] }),
      
      searchTerm: "",
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      
      onlineResults: [],
      setOnlineResults: (onlineResults) => set({ onlineResults }),
      
      isSearching: false,
      customProducts: [],
      setCustomProducts: (customProducts) => set({ customProducts }),
      communityProducts: [],
      setCommunityProducts: (communityProducts) => set({ communityProducts }),
      setIsSearching: (isSearching) => set({ isSearching }),
    }),
    {
      name: 'diacontrol_shared_plate',
      partialize: (state) => ({ plate: state.plate }),
    }
  )
);
