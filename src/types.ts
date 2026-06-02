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
  isCustom?: boolean;
}

export interface LogEntry {
  id?: string;
  type:
    | "glucose"
    | "meal"
    | "bolus"
    | "site_change"
    | "sensor_change"
    | "activity"
    | "water"
    | "medication";
  value: number;
  timestamp: number;
  createdAt?: any;
  bg?: number;
  description?: string;
  notes?: string;
  source?: string;
  nsId?: string;
  userModified?: boolean;
  direction?: string;
  delta?: number;
  medicationData?: {
    name: string;
    dose: string;
    route?: string;
  };
  protein?: number;
  polyols?: number;
  fat?: number;
  linkedMeal?: {
    carbs: number;
    polyols?: number;
    protein?: number;
    fat?: number;
    name?: string;
    items?: any[];
  };
  weather?: {
    temp: number;
    condition: string;
    pressure?: number;
  };
  isExtended?: boolean;
  extendedTime?: number;
  items?: any[];
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

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: "sensors" | "insulin" | "infusion_sets" | "strips" | "other";
  expiryDate?: string;
  dailyDose?: number; // Added daily dose for estimation
}

export interface UserSettings {
  isf: number;
  wwRatio: number;
  wbtRatio: number;
  targetMin: number;
  targetMax: number;
  healthConnectSyncSteps?: boolean;
  healthConnectSyncGlucose?: boolean;
  followerMode?: boolean;  // Add follower mode for read-only view
  dia?: number; // Duration of Insulin Action in hours
  hourlyProfiles?: HourlyProfile[];
  medications?: Medication[];
  inventory?: InventoryItem[];
  cgmCalibration?: number; // Calibration offset in mg/dL
  cgmTimestamp?: number; // When was the last calibration
  sensorChangeDate?: number;
  infusionSetChangeDate?: number;
  infusionSetSite?: string;
  sensorDurationDays?: number;
  infusionSetDurationDays?: number;
  notificationsEnabled?: boolean;
  apkSystemNotificationsEnabled?: boolean;
  notificationPrefs?: {
    hypo: boolean;
    hyper: boolean;
    reminders: boolean;
    predictions: boolean;
  };
  childMode?: boolean;
  groupTherapyLock?: boolean;
  persistentWidgetEnabled?: boolean;
  accentColor?: string;
  theme?: "light" | "dark" | "system";
  bgOption?: "default" | "true-black";
  glassmorphismEnabled?: boolean;
  material3Enabled?: boolean;
  dynamicColorsEnabled?: boolean;
  ecoMode?: boolean;
  showPumpWidget?: boolean;
  showPrediction?: boolean;
  autoGIEnabled?: boolean;
  activeDiet?: string | null;
  dietStartDate?: number;
  tdee?: number;
  allergies?: string;
  weatherWidgetEnabled?: boolean;
  weatherNeuralEnabled?: boolean;
  mediaWidgetEnabled?: boolean;
  showMealWidget?: boolean;
  activeTraining?: {
    sportId: string;
    startTime: number;
    duration: number; // minutes
    intensity: "low" | "medium" | "high";
  } | null;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}
