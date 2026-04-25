export interface Product {
  id?: string;
  name: string;
  carbs: number;
  protein?: number;
  fat?: number;
  gi: number;
  category?: string;
  isOnline?: boolean;
}

export interface LogEntry {
  id?: string;
  type: 'glucose' | 'meal' | 'bolus';
  value: number;
  timestamp: number;
  description?: string;
  notes?: string;
  source?: string;
  protein?: number;
  fat?: number;
}

export interface PlateItem extends Product {
  weight: number;
}

export interface UserSettings {
  isf: number;
  wwRatio: number;
  wbtRatio: number;
  targetMin: number;
  targetMax: number;
  dia?: number; // Duration of Insulin Action in hours
  showPrediction?: boolean;
}
