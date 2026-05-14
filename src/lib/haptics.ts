/**
 * Utility for haptic feedback using the Web Vibration API
 */

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gliko_haptics_enabled') !== 'false';
};

export const Haptics = {
  /**
   * Light tap for standard button clicks
   */
  light: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium impact for important actions (saving, adding logs)
   */
  medium: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(30);
    }
  },

  /**
   * Success notification pulse
   */
  success: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([20, 30, 20]);
    }
  },

  /**
   * Warning/Error notification pattern
   */
  warning: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Critical alert pattern (Hypo)
   */
  error: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }
};
