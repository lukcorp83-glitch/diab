import { Capacitor, registerPlugin } from '@capacitor/core';

interface NotificationBridgePluginType {
  speakGlucose: (options?: { force?: boolean; glucose?: string; trend?: string; delta?: string; lang?: string }) => Promise<void>;
  isHeadphonesConnected: () => Promise<{ connected: boolean }>;
  setVoiceReadoutEnabled: (options: { enabled: boolean }) => Promise<void>;
  setVoiceReadoutTriggers: (options: { powerBtn?: boolean; earphoneBtn?: boolean }) => Promise<void>;
  getVoiceReadoutTriggers: () => Promise<{ powerBtn: boolean; earphoneBtn: boolean }>;
}

const NotificationBridge = registerPlugin<NotificationBridgePluginType>('NotificationBridge');

const getArrowSpeech = (arrow?: string, isEn = false): string => {
  if (!arrow) return isEn ? 'steady' : 'stabilnie';
  const a = arrow.trim();
  if (a.includes('↑↑') || a.toLowerCase() === 'doubleup') return isEn ? 'rapid rise' : 'bardzo szybki wzrost';
  if (a.includes('↑') || a.toLowerCase() === 'singleup') return isEn ? 'rising' : 'szybki wzrost';
  if (a.includes('↗') || a.toLowerCase() === 'fortyfiveup') return isEn ? 'slight rise' : 'lekki wzrost';
  if (a.includes('→') || a.toLowerCase() === 'flat') return isEn ? 'steady' : 'stabilnie';
  if (a.includes('↘') || a.toLowerCase() === 'fortyfivedown') return isEn ? 'slight fall' : 'lekki spadek';
  if (a.includes('↓') || a.toLowerCase() === 'singledown') return isEn ? 'falling' : 'szybki spadek';
  if (a.includes('↓↓') || a.toLowerCase() === 'doubledown') return isEn ? 'rapid fall' : 'bardzo szybki spadek';
  return isEn ? 'steady' : 'stabilnie';
};

export const voiceReadoutService = {
  isVoiceReadoutEnabled(): boolean {
    return localStorage.getItem('gliko_voice_readout_enabled') !== 'false';
  },

  async setVoiceReadoutEnabled(enabled: boolean): Promise<void> {
    localStorage.setItem('gliko_voice_readout_enabled', String(enabled));
    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationBridge.setVoiceReadoutEnabled({ enabled });
      } catch (err) {
        console.warn('Failed to set native voice readout enabled:', err);
      }
    }
  },

  isPowerBtnTriggerEnabled(): boolean {
    return localStorage.getItem('gliko_voice_power_btn') !== 'false';
  },

  async setPowerBtnTriggerEnabled(enabled: boolean): Promise<void> {
    localStorage.setItem('gliko_voice_power_btn', String(enabled));
    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationBridge.setVoiceReadoutTriggers({ powerBtn: enabled });
      } catch (err) {
        console.warn('Failed to set power button trigger on native:', err);
      }
    }
  },

  isEarphoneBtnTriggerEnabled(): boolean {
    return localStorage.getItem('gliko_voice_earphone_btn') !== 'false';
  },

  async setEarphoneBtnTriggerEnabled(enabled: boolean): Promise<void> {
    localStorage.setItem('gliko_voice_earphone_btn', String(enabled));
    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationBridge.setVoiceReadoutTriggers({ earphoneBtn: enabled });
      } catch (err) {
        console.warn('Failed to set earphone button trigger on native:', err);
      }
    }
  },

  async isHeadphonesConnected(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NotificationBridge.isHeadphonesConnected();
        return Boolean(res?.connected);
      } catch (err) {
        console.warn('Failed to check headphones status:', err);
        return false;
      }
    }
    return false;
  },

  async speakGlucose(glucose?: number | string, trend?: string, delta?: number | string, force = true, lang?: string): Promise<void> {
    const currentLang = (lang || (typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'pl') : 'pl')).toLowerCase();
    const isEn = currentLang.startsWith('en');

    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationBridge.speakGlucose({
          force,
          glucose: glucose !== undefined && glucose !== null ? String(glucose) : undefined,
          trend: trend ? String(trend) : undefined,
          delta: delta !== undefined && delta !== null ? String(delta) : undefined,
          lang: isEn ? 'en' : 'pl'
        });
        return;
      } catch (err) {
        console.warn('Native speakGlucose failed, trying web speech fallback:', err);
      }
    }

    // Web Speech API fallback for PWA / Desktop
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        
        let valStr = String(glucose || '');
        if (!valStr || valStr === '---' || valStr === '0') {
          valStr = isEn ? 'No current glucose reading.' : 'Brak bieżącego odczytu.';
        }

        const arrowSpeech = getArrowSpeech(trend, isEn);
        // Przecinek po liczbie zamiast kropki zapobiega czytaniu jako liczebnik porządkowy ("stoczterdziestego dziewiątego")
        let phrase = `${valStr}, ${arrowSpeech}`;

        if (delta && String(delta) !== '0' && String(delta) !== '---') {
          const numDelta = Number(String(delta).replace(',', '.'));
          if (!isNaN(numDelta)) {
            const rounded = Math.round(Math.abs(numDelta));
            if (rounded > 0) {
              if (isEn) {
                phrase += numDelta > 0 ? `, up ${rounded}` : `, down ${rounded}`;
              } else {
                phrase += numDelta > 0 ? `, wzrost o ${rounded}` : `, spadek o ${rounded}`;
              }
            }
          } else {
            const dStr = String(delta).replace('+', isEn ? 'plus ' : 'plus ').replace('-', isEn ? 'minus ' : 'minus ').trim();
            phrase += isEn ? `, change ${dStr}` : `, zmiana ${dStr}`;
          }
        }

        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = isEn ? 'en-US' : 'pl-PL';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        // Try to pick appropriate voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => isEn ? v.lang.startsWith('en') : v.lang.startsWith('pl'));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Web Speech API error:', e);
      }
    }
  }
};
