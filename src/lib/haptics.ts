import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gliko_haptics_enabled') !== 'false';
};

export const Haptics = {
  light: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(8);
    }
  },
  medium: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.impact({ style: ImpactStyle.Medium });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },
  selection: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.selectionStart();
      await CapHaptics.selectionChanged();
    } else if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  },
  success: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Success });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([15, 30, 15]);
    }
  },
  warning: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Warning });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },
  error: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Error });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([80, 40, 80, 40, 150]);
    }
  },
  impact: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.impact({ style: ImpactStyle.Heavy });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  },
  tick: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
};
