import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor, registerPlugin } from '@capacitor/core';

const AndroidHaptic: any = Capacitor.Plugins?.AndroidHaptic || registerPlugin<any>('AndroidHaptic');

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gliko_haptics_enabled') !== 'false';
};

let hasUserInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    hasUserInteracted = true;
    window.removeEventListener('pointerdown', markInteracted);
    window.removeEventListener('touchstart', markInteracted);
    window.removeEventListener('keydown', markInteracted);
    window.removeEventListener('click', markInteracted);
  };
  window.addEventListener('pointerdown', markInteracted, { passive: true, capture: true });
  window.addEventListener('touchstart', markInteracted, { passive: true, capture: true });
  window.addEventListener('keydown', markInteracted, { passive: true, capture: true });
  window.addEventListener('click', markInteracted, { passive: true, capture: true });
}

export const safeVibrate = (pattern: number | number[]) => {
  if (!hasUserInteracted) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Suppress Chrome user-gesture intervention exception cleanly
    }
  }
};

const triggerAndroidHaptic = async (type: 'tick' | 'click' | 'heavy') => {
  try {
    if (type === 'tick') {
      await AndroidHaptic.tick();
    } else if (type === 'click') {
      await AndroidHaptic.click();
    } else if (type === 'heavy') {
      await AndroidHaptic.heavyClick();
    }
  } catch (err) {
    console.warn("Failed to trigger native Android haptics, falling back:", err);
    throw err;
  }
};

export const Haptics = {
  light: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('tick');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.impact({ style: ImpactStyle.Light });
    } else {
      safeVibrate(8);
    }
  },
  medium: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('click');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.impact({ style: ImpactStyle.Medium });
    } else {
      safeVibrate(15);
    }
  },
  heavy: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('heavy');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.impact({ style: ImpactStyle.Heavy });
    } else {
      safeVibrate(40);
    }
  },
  selection: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('tick');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.selectionStart();
      await CapHaptics.selectionChanged();
      await CapHaptics.selectionEnd();
    } else {
      safeVibrate(5);
    }
  },
  selectionStart: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        return;
      }
      await CapHaptics.selectionStart();
    }
  },
  selectionChanged: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('tick');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.selectionChanged();
    } else {
      safeVibrate(5);
    }
  },
  selectionEnd: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        return;
      }
      await CapHaptics.selectionEnd();
    }
  },
  notification: async (type: NotificationType = NotificationType.Success) => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type });
    } else {
      safeVibrate([20, 40, 20]);
    }
  },
  success: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Success });
    } else {
      safeVibrate([15, 30, 15]);
    }
  },
  warning: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Warning });
    } else {
      safeVibrate([30, 50, 30]);
    }
  },
  error: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      await CapHaptics.notification({ type: NotificationType.Error });
    } else {
      safeVibrate([80, 40, 80, 40, 150]);
    }
  },
  impact: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('heavy');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.impact({ style: ImpactStyle.Heavy });
    } else {
      safeVibrate(40);
    }
  },
  tick: async () => {
    if (!isEnabled()) return;
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('tick');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.selectionChanged();
    } else {
      safeVibrate(4);
    }
  }
};
