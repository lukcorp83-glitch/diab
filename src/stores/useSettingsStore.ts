import { create } from 'zustand';
import { UserSettings } from '../types';

interface SettingsState {
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  isf: 40,
  wwRatio: 10,
  wbtRatio: 10,
  targetMin: 70,
  targetMax: 140,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  setSettings: (settings) => set({ settings }),
  updateSettings: (newSettings) => set((state) => ({ 
    settings: { ...state.settings, ...newSettings } 
  }))
}));
