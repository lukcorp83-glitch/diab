export interface Product {
  id?: string;
  name: string;
  nameEn?: string;
  namePl?: string;
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
  barcode?: string;
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
  eatenAt?: number; // Rzeczywisty moment zjedzenia posiłku (może być np. 15 min po bolusie)
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

export interface DrugKnowledge {
  activeIngredient: string;
  sugarImpact: "lowers" | "raises" | "neutral" | "unknown";
  interactions: string;
  description: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  reminders: string[]; // "HH:mm"
  active: boolean;
  expiryDate?: string; // "YYYY-MM-DD"
  aiData?: DrugKnowledge; // Zapamiętana wiedza AI o danym przypisanym leku
  stockQuantity?: number; // Pozostała ilość tabletek/sztuk w apteczce
  stockThreshold?: number; // Próg ostrzegania o kończącym się leku
  pillsPerDose?: number; // Liczba tabletek przyjmowana na jedno przypomnienie (domyślnie 1)
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  category: "sensors" | "insulin" | "infusion_sets" | "reservoirs" | "pens" | "strips" | "other";
  expiryDate?: string;
  dailyDose?: number; // Added daily dose for estimation
  barcode?: string;
  penCapacity?: number; // Pojemność pojedynczego pena (dla category === 'pens')
  currentPenUnits?: number; // Jednostki w aktualnie rozpoczętym penie
  capacity?: number; // Pojemność zbiorniczka (dla category === 'reservoirs', w U lub ml)
  reservoirCapacity?: number; // Pojemność zbiorniczka w jednostkach (np. 160, 180, 200, 300 U)
}

export interface ChildPermissions {
  canAddMeals?: boolean;            // Dodawanie posiłków (Talerz, Aparat AI)
  canAddBolus?: boolean;            // Zapisywanie bolusów / dawek insuliny
  canAddGlucose?: boolean;          // Ręczne pomiary cukru (glukometr)
  canEditEquipment?: boolean;       // Ręczna zmiana dat osprzętu (sensor, wkłucie, zbiornik)
  canAutoDetectEquipment?: boolean; // Automatyczne wykrywanie wymiany osprzętu (Smart Equipment)
  canEditTherapySettings?: boolean; // Zmiana współczynników (ICR, ISF, cele cukru)
  canDeleteLogs?: boolean;          // Usuwanie logów z historii
}

export interface UserSettings {
  deviceId?: string;
  deviceName?: string;
  isf: number;
  wwRatio: number;
  wbtRatio: number;
  targetMin: number;
  targetMax: number;
  healthConnectSyncSteps?: boolean;
  healthConnectSyncGlucose?: boolean;
  betaProgram?: boolean; // Enable Beta OTA channel
  followerMode?: boolean;  // Add follower mode for read-only view
  linkedUid?: string;      // Zapamiętuje na twardo w chmurze klucz sparowanego Głównego konta
  isLinkedAdmin?: boolean; // Zapamiętuje na twardo w chmurze uprawnienia administratora
  childPermissions?: ChildPermissions; // Granularne uprawnienia dla urządzenia dziecka (Kontrola Rodzicielska)
  parentalPin?: string;    // Kod PIN rodzica (np. "1234") do autoryzacji zablokowanych akcji
  dia?: number; // Duration of Insulin Action in hours
  insulinType?: string; // e.g. 'novorapid', 'fiasp', 'humalog', 'lyumjev', 'apidra'
  hourlyProfiles?: HourlyProfile[];
  customDrugDictionary?: Record<string, DrugKnowledge>; // Globalny słownik wiedzy wygenerowany przez AI
  smartEquipmentDetection?: boolean; // Inteligentne wykrywanie zmiany osprzetu
  medications?: Medication[];
  inventory?: InventoryItem[];
  cgmCalibration?: number; // Calibration offset in mg/dL
  cgmTimestamp?: number; // When was the last calibration
  sensorChangeDate?: number;
  infusionSetChangeDate?: number;
  reservoirChangeDate?: number;
  infusionSetSite?: string;
  infusionSite?: string;
  sensorSite?: string;
  allowedInfusionSites?: string[];
  sensorDurationDays?: number;
  infusionSetDurationDays?: number;
  reservoirDurationDays?: number;
  reservoirCapacityUnits?: number; // Pojemność zbiorniczka w pompie w jednostkach (np. 180U / 300U)
  notificationsEnabled?: boolean;
  apkSystemNotificationsEnabled?: boolean;
  notificationPrefs?: {
    hypo: boolean;
    hyper: boolean;
    reminders: boolean;
    predictions: boolean;
    sensorCheck?: boolean;
    hypoProtection?: boolean;
    pumpBolusPreMeal?: boolean;
    mealDetected?: boolean;
  };
  childMode?: boolean;
  groupTherapyLock?: boolean;
  persistentWidgetEnabled?: boolean;
  accentColor?: string;
  theme?: "light" | "dark" | "system";
  bgOption?: "default" | "true-black";
  penCount?: number; // How many physical pens are available
  currentPenUnits?: number; // How many units are currently remaining in the active pen
  penCapacity?: number; // The max capacity of a pen (default 300)
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
  dailyStepGoal?: number; // Dzienny cel kroków (domyślnie np. 10000)
  allergies?: string;
  weatherWidgetEnabled?: boolean;
  weatherNeuralEnabled?: boolean;
  websocketUrl?: string;
  websocketRoomId?: string;
  mediaWidgetEnabled?: boolean;
  showMealWidget?: boolean;
  activeTraining?: {
    sportId: string;
    startTime: number;
    duration: number; // minutes
    intensity: "low" | "medium" | "high";
  } | null;
  treatmentMode?: 'diet_only' | 'insulin' | 'pump'; // Typ leczenia: dieta/tabletki, insulina, pompa
}

export interface AssistantMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  appAction?: any;
}

