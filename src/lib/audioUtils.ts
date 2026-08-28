import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

let globalAudioCtx: AudioContext | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioSource: AudioBufferSourceNode | null = null;
let nativeAudioPreloaded = false;

export const getAudioCtx = (): AudioContext | null => {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        globalAudioCtx = new AudioCtxClass();
      } catch (e) {
        console.warn('[Audio] AudioContext creation error:', e);
      }
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    try {
      globalAudioCtx.resume().catch(() => {});
    } catch (e) {}
  }
  return globalAudioCtx;
};

// Helper: Get robust absolute URL to sound files
export const getAbsoluteAudioUrl = (filename: string = 'status_clear.mp3'): string => {
  if (typeof window === 'undefined') return filename;
  try {
    const base = import.meta.env.BASE_URL || '/';
    // Ensure base ends with /
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return new URL(filename, new URL(normalizedBase, window.location.origin)).href;
  } catch (e) {
    return `/${filename}`.replace(/\/+/g, '/');
  }
};

// Preload native audio on Android / iOS
export const preloadNativeAudio = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  
  // Try public/ first (Capacitor Android standard assets location)
  try {
    await NativeAudio.preload({
      assetId: 'status_clear',
      assetPath: 'public/status_clear.mp3',
      volume: 1.0,
      audioChannelNum: 1,
      isUrl: false
    });
    nativeAudioPreloaded = true;
    console.log('[Audio] NativeAudio preloaded public/status_clear.mp3 successfully');
    return true;
  } catch (e1) {
    // Fallback try root assets status_clear.mp3
    try {
      await NativeAudio.preload({
        assetId: 'status_clear',
        assetPath: 'status_clear.mp3',
        volume: 1.0,
        audioChannelNum: 1,
        isUrl: false
      });
      nativeAudioPreloaded = true;
      console.log('[Audio] NativeAudio preloaded status_clear.mp3 successfully');
      return true;
    } catch (e2) {
      console.warn('[Audio] NativeAudio preload failed for all paths:', e1, e2);
      return false;
    }
  }
};

// Autounlock AudioContext and HTML5 Audio on first user gesture
let isUnlocked = false;
export const initAudioUnlock = () => {
  if (isUnlocked || typeof window === 'undefined') return;

  const unlock = async () => {
    try {
      // 1. Unlock Web Audio Context
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      // 2. Unlock HTML5 Audio via silent buffer
      try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        await silentAudio.play();
        silentAudio.pause();
      } catch(e) {}

      // 3. Preload Native Audio on device
      if (Capacitor.isNativePlatform()) {
        preloadNativeAudio().catch(() => {});
      }

      isUnlocked = true;
      ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock);
      });
      console.log('[Audio] Web & Native Audio unlocked successfully via user gesture');
    } catch (e) {
      console.warn('[Audio] Failed to unlock audio:', e);
    }
  };

  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlock, { passive: true, once: true });
  });
};

// Initialize unlock immediately on module load
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.2) {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Suppress audio context gesture intervention error
  }
}

export const playEmergencyBeepAlarm = () => {
  playTone(880, 'sawtooth', 0.25, 0.5);
  setTimeout(() => playTone(880, 'sawtooth', 0.25, 0.5), 250);
  setTimeout(() => playTone(1760, 'sawtooth', 0.4, 0.6), 500);
  setTimeout(() => playTone(1760, 'sawtooth', 0.4, 0.6), 950);
};

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

// IMMEDIATELY STOPS ALL PLAYING ALARM SOUNDS (MP3, HTML5 Audio, Web Audio, Native)
export const stopAllAudio = async () => {
  console.log('[Audio] Stopping all active alarm audio...');
  
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch(e) {}
    activeAudioElement = null;
  }

  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch(e) {}
    activeAudioSource = null;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await NativeAudio.stop({ assetId: 'status_clear' });
    } catch(e) {}
  }
};

export const playMp3Alert = async () => {
  // Stop previous playing sound first if any
  await stopAllAudio();
  let playedSuccessfully = false;

  // Tier 1: Capacitor Native Audio (for Android / iOS native apps)
  if (Capacitor.isNativePlatform()) {
    try {
      if (!nativeAudioPreloaded) {
        await preloadNativeAudio();
      }
      await NativeAudio.play({ assetId: 'status_clear' });
      playedSuccessfully = true;
      console.log('[Audio] Tier 1: NativeAudio played status_clear.mp3 successfully');
      return;
    } catch (e) {
      console.warn('[Audio] Tier 1: NativeAudio play failed, fallback to Tier 2 (HTML5 Audio)', e);
    }
  }

  // Tier 2: HTML5 Audio Element (Works in WebViews, PWA, Browser)
  if (!playedSuccessfully) {
    try {
      const audioUrl = getAbsoluteAudioUrl('status_clear.mp3');
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      activeAudioElement = audio;
      audio.onended = () => { activeAudioElement = null; };
      await audio.play();
      playedSuccessfully = true;
      console.log('[Audio] Tier 2: HTML5 Audio played status_clear.mp3 successfully from', audioUrl);
      return;
    } catch (err) {
      console.warn('[Audio] Tier 2: HTML5 Audio play failed, fallback to Tier 3 (Web Audio API)', err);
    }
  }

  // Tier 3: Web Audio API (AudioBuffer Source Node)
  if (!playedSuccessfully) {
    try {
      const audioCtx = getAudioCtx();
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        if (!cachedAlarmBuffer) {
          const audioUrl = getAbsoluteAudioUrl('status_clear.mp3');
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          cachedAlarmBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        }

        const source = audioCtx.createBufferSource();
        source.buffer = cachedAlarmBuffer;
        source.connect(audioCtx.destination);
        activeAudioSource = source;
        source.onended = () => { activeAudioSource = null; };
        source.start(0);
        playedSuccessfully = true;
        console.log('[Audio] Tier 3: Web Audio API played status_clear.mp3 successfully');
        return;
      }
    } catch (e) {
      console.warn('[Audio] Tier 3: Web Audio API play failed, fallback to Tier 4 (Emergency Tone)', e);
    }
  }

  // Tier 4: Fail-Safe Emergency Alarm Tone (GUARANTEED SOUND GENERATION)
  if (!playedSuccessfully) {
    console.warn('[Audio] MP3 play failed all tiers. Triggering emergency beep alarm tone.');
    playEmergencyBeepAlarm();
  }
};

export const playLowGlucoseSound = () => {
  console.log('[Audio] Triggering playLowGlucoseSound (status_clear.mp3)');
  playMp3Alert();
};

export const playHighGlucoseSound = () => {
  console.log('[Audio] Triggering playHighGlucoseSound (status_clear.mp3)');
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
