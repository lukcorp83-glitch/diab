import { create } from 'zustand';

interface SyncStatus {
  lastSync: number | null;
  status: "idle" | "syncing" | "error" | "success";
  message?: string;
  isFirebaseSyncing?: boolean;
}

export interface AiScanState {
  isScanning: boolean;
  title?: string;
  subtitle?: string;
  mode?: 'plate' | 'menu' | 'label' | 'product' | 'bolus' | 'general';
  imagePreview?: string | null;
  statusMessages?: string[];
  onCancel?: () => void;
}

interface AppState {
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  assistantMessages: any[];
  setAssistantMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
  isAssistantTyping: boolean;
  setIsAssistantTyping: (t: boolean) => void;
  wsDevices: any[];
  setWsDevices: (d: any[]) => void;
  mealProgress: any;
  setMealProgress: (p: any) => void;

  showSplash: boolean;
  setShowSplash: (show: boolean) => void;

  isShortcutMode: boolean;
  setIsShortcutMode: (isShortcut: boolean) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;
  setTab?: (tab: string) => void;

  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;

  authError: string;
  setAuthError: (error: string) => void;

  initialAction: string | null;
  setInitialAction: (action: string | null) => void;

  profileCategory: string | null;
  setProfileCategory: (cat: string | null) => void;

  isOffline: boolean;
  setIsOffline: (isOffline: boolean) => void;

  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus | ((prev: SyncStatus) => SyncStatus)) => void;

  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;

  showChangelog: boolean;
  setShowChangelog: (show: boolean) => void;

  showPrivacyPopup: boolean;
  setShowPrivacyPopup: (show: boolean) => void;

  showStatusPopup: boolean;
  setShowStatusPopup: (show: boolean) => void;

  privacyLoading: boolean;
  setPrivacyLoading: (loading: boolean) => void;

  direction: number;
  setDirection: (direction: number) => void;

  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;

  isKeyboardOpen: boolean;
  setIsKeyboardOpen: (isOpen: boolean) => void;

  aiScanState: AiScanState;
  startAiScan: (options?: Partial<Omit<AiScanState, 'isScanning'>>) => void;
  updateAiScanMessage: (subtitle: string) => void;
  stopAiScan: () => void;
}

const getInitialTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "dark";
  try {
    const directTheme = localStorage.getItem("theme");
    if (directTheme === "dark" || directTheme === "light") {
      return directTheme;
    }
    const userSettingsRaw = localStorage.getItem("glikocontrol_user_settings");
    if (userSettingsRaw) {
      const parsed = JSON.parse(userSettingsRaw);
      if (parsed?.theme === "dark" || parsed?.theme === "light") {
        return parsed.theme;
      }
      if (parsed?.theme === "system") {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? "dark" : "light";
      }
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return "dark";
    }
  } catch (e) {}
  return "dark";
};

export const useAppStore = create<AppState>((set) => ({
  email: '',
  setEmail: (e) => set({ email: e }),
  password: '',
  setPassword: (p) => set({ password: p }),
  assistantMessages: [],
  setAssistantMessages: (msgs) => set((state) => ({ 
    assistantMessages: typeof msgs === 'function' ? msgs(state.assistantMessages) : msgs 
  })),
  isAssistantTyping: false,
  setIsAssistantTyping: (t) => set({ isAssistantTyping: t }),
  wsDevices: [],
  setWsDevices: (d) => set({ wsDevices: d }),
  mealProgress: null,
  setMealProgress: (p) => set({ mealProgress: p }),

  showSplash: true,
  setShowSplash: (show) => set({ showSplash: show }),

  isShortcutMode: false,
  setIsShortcutMode: (isShortcut) => set({ isShortcutMode: isShortcut }),

  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTab: (tab: string) => set({ activeTab: tab }),

  theme: getInitialTheme(),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

  authError: "",
  setAuthError: (error) => set({ authError: error }),

  initialAction: null,
  setInitialAction: (action) => set({ initialAction: action }),

  profileCategory: null,
  setProfileCategory: (cat) => set({ profileCategory: cat }),

  isOffline: !navigator.onLine,
  setIsOffline: (isOffline) => set({ isOffline }),

  syncStatus: { lastSync: null, status: "idle" },
  setSyncStatus: (updater) => set((state) => ({
    syncStatus: typeof updater === 'function' ? updater(state.syncStatus) : updater
  })),

  showTutorial: false,
  setShowTutorial: (show) => set({ showTutorial: show }),

  showChangelog: false,
  setShowChangelog: (show) => set({ showChangelog: show }),

  showPrivacyPopup: false,
  setShowPrivacyPopup: (show) => set({ showPrivacyPopup: show }),

  showStatusPopup: false,
  setShowStatusPopup: (show) => set({ showStatusPopup: show }),

  privacyLoading: true,
  setPrivacyLoading: (loading) => set({ privacyLoading: loading }),

  direction: 0,
  setDirection: (direction) => set({ direction }),

  isSidebarOpen: false,
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  isKeyboardOpen: false,
  setIsKeyboardOpen: (isOpen) => set({ isKeyboardOpen: isOpen }),

  aiScanState: { isScanning: false },
  startAiScan: (options) => set({
    aiScanState: {
      isScanning: true,
      title: options?.title,
      subtitle: options?.subtitle,
      mode: options?.mode || 'general',
      imagePreview: options?.imagePreview || null,
      statusMessages: options?.statusMessages,
      onCancel: options?.onCancel,
    }
  }),
  updateAiScanMessage: (subtitle) => set((state) => ({
    aiScanState: { ...state.aiScanState, subtitle }
  })),
  stopAiScan: () => set({
    aiScanState: { isScanning: false, imagePreview: null }
  }),
}));
