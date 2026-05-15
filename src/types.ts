export interface Product {
  id?: string;
  name: string;
  carbs: number;
  polyols?: number;
  protein?: number;
  fat?: number;
  gi: number;
  category?: string;
  isOnline?: boolean;
  author?: string;
  isCommunity?: boolean;
}

export interface LogEntry {
  id?: string;
  type: 'glucose' | 'meal' | 'bolus';
  value: number;
  timestamp: number;
  createdAt?: any;
  bg?: number;
  description?: string;
  notes?: string;
  source?: string;
  protein?: number;
  polyols?: number;
  fat?: number;
  linkedMeal?: {
    carbs: number;
    polyols?: number;
    protein?: number;
    fat?: number;
  };
  isExtended?: boolean;
  extendedTime?: number;
}

export interface PlateItem extends Product {
  weight: number;
  plateItemId?: string;
}

export interface HourlyProfile {
  time: string; // "HH:mm"
  isf: number;
  wwRatio: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  reminders: string[]; // "HH:mm"
  active: boolean;
  expiryDate?: string; // "YYYY-MM-DD"
}

export interface UserSettings {
  isf: number;
  wwRatio: number;
  wbtRatio: number;
  targetMin: number;
  targetMax: number;
  dia?: number; // Duration of Insulin Action in hours
  hourlyProfiles?: HourlyProfile[];
  medications?: Medication[];
  cgmCalibration?: number; // Calibration offset in mg/dL
  cgmTimestamp?: number; // When was the last calibration 
  sensorChangeDate?: number;
  infusionSetChangeDate?: number;
  sensorDurationDays?: number;
  infusionSetDurationDays?: number;
  notificationsEnabled?: boolean;
  notificationPrefs?: {
    hypo: boolean;
    hyper: boolean;
    reminders: boolean;
    predictions: boolean;
  };
  childMode?: boolean;
  accentColor?: string;
  theme?: 'light' | 'dark' | 'system';
  bgOption?: 'default' | 'true-black';
  showPumpWidget?: boolean;
  showPrediction?: boolean;
  autoGIEnabled?: boolean;
}
