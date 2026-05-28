import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor, registerPlugin } from '@capacitor/core';

const AndroidHaptic = registerPlugin<any>('AndroidHaptic');

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gliko_haptics_enabled') !== 'false';
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
    } else if ('vibrate' in navigator) {
      navigator.vibrate(8);
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
    } else if ('vibrate' in navigator) {
      navigator.vibrate(15);
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
    } else if ('vibrate' in navigator) {
      navigator.vibrate(5);
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
    } else if ('vibrate' in navigator) {
      navigator.vibrate(5);
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
      if (Capacitor.getPlatform() === 'android') {
        try {
          await triggerAndroidHaptic('heavy');
          return;
        } catch (ignored) {}
      }
      await CapHaptics.impact({ style: ImpactStyle.Heavy });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(40);
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
    } else if ('vibrate' in navigator) {
      navigator.vibrate(4);
    }
  }
};
