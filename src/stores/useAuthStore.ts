import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { maintenanceService } from '../services/maintenanceService';
import { getEffectiveUid } from '../lib/utils';
import { notificationService } from '../services/notificationService';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initAuthListener: (setShowTutorial: (v: boolean) => void) => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  initAuthListener: (setShowTutorial) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      set({ user: u, loading: false });

      if (u) {
        maintenanceService.cleanupOldData(getEffectiveUid(u), 30);
        const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }

        // Initialize FCM if enabled in userSettings (or just try to get token)
        notificationService.setupForegroundListener();
      }
    });

    return unsubscribe;
  },
}));
