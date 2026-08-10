import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

const getAudioCtx = (() => {
  let ctx: AudioContext | null = null;
  return () => {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctx;
  };
})();

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
  try {
    const audioCtx = getAudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error("Audio error", e);
  }
}

export const playPetSound = () => {
  playTone(600, 'sine', 0.1, 0.1);
  setTimeout(() => playTone(800, 'sine', 0.15, 0.1), 100);
};

export const playFeedSound = () => {
  playTone(300, 'triangle', 0.1, 0.1);
  setTimeout(() => playTone(350, 'triangle', 0.1, 0.1), 150);
  setTimeout(() => playTone(300, 'triangle', 0.1, 0.1), 300);
};

let cachedAlarmBuffer: AudioBuffer | null = null;

const playMp3Alert = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      if (!(window as any).__nativeAudioPreloaded) {
        await NativeAudio.preload({
          assetId: 'status_clear',
          assetPath: 'status_clear.mp3',
        });
        (window as any).__nativeAudioPreloaded = true;
      }
      await NativeAudio.play({ assetId: 'status_clear' });
      return; // Odtworzono pomyślnie przez NativeAudio, koniec.
    } catch (e) {
      console.warn("NativeAudio play failed, falling back to Web Audio", e);
    }
  }

  try {
    const audioCtx = getAudioCtx();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (!cachedAlarmBuffer) {
      const baseUrl = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/';
      const audioUrl = (baseUrl + '/status_clear.mp3').replace(/\/+/g, '/');
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      cachedAlarmBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = cachedAlarmBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {
    console.error("AudioContext play failed, fallback to Audio element", e);
    try {
      const baseUrl = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/';
      const audioUrl = (baseUrl + '/status_clear.mp3').replace(/\/+/g, '/');
      const audio = new Audio(audioUrl);
      audio.play().catch(err => console.error("Fallback audio play blocked", err));
    } catch(err) {}
  }
};

export const playLowGlucoseSound = () => {
  playMp3Alert();
};

export const playHighGlucoseSound = () => {
  playMp3Alert();
};

export const playNormalGlucoseSound = () => {
  playTone(523.25, 'sine', 0.1, 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2, 0.1), 200); // G5
};

export const playLevelUpSound = () => {
  playTone(440, 'square', 0.1, 0.1);
  setTimeout(() => playTone(554.37, 'square', 0.1, 0.1), 100);
  setTimeout(() => playTone(659.25, 'square', 0.1, 0.1), 200);
  setTimeout(() => playTone(880, 'square', 0.3, 0.1), 300);
};

export const playBuySound = () => {
  playTone(800, 'sine', 0.1, 0.1);
  setTimeout(() => playTone(1200, 'sine', 0.2, 0.1), 100);
};
