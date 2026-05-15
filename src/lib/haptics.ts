/**
 * Utility for haptic feedback using the Web Vibration API
 */

const isEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('gliko_haptics_enabled') !== 'false';
};

export const Haptics = {
  /**
   * Impact for subtle clicks and navigation
   * 8ms is a sharp "tick" on Pixel devices
   */
  light: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(8);
    }
  },

  /**
   * Medium impact for primary actions
   */
  medium: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(15);
    }
  },

  /**
   * Selection change feedback
   */
  selection: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(5);
    }
  },

  /**
   * Success notification pulse - double tap feel
   */
  success: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([15, 30, 15]);
    }
  },

  /**
   * Warning pattern - sudden pulse
   */
  warning: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Critical alert pattern (Hypo) - aggressive triple pulse
   */
  error: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate([80, 40, 80, 40, 150]);
    }
  },

  /**
   * Special pattern for "impact" or heavy deletion
   */
  impact: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(40);
    }
  },

  /**
   * "Gear wheel" tick for mechanical feedback during movement
   * Increased to 10ms for better visibility on more devices
   */
  tick: () => {
    if ('vibrate' in navigator && isEnabled()) {
      navigator.vibrate(10);
    }
  }
};
