import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

let globalAudioCtx: AudioContext | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioSource: AudioBufferSourceNode | null = null;

export const getAudioCtx = (): AudioContext | null => {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        globalAudioCtx = new AudioCtxClass();
      } catch (e) {
        console.warn('[Audio] AudioContext creation postponed until user gesture:', e);
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

// Autounlock AudioContext on first user gesture
let isUnlocked = false;
export const initAudioUnlock = () => {
  if (isUnlocked || typeof window === 'undefined') return;
  const unlock = () => {
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      isUnlocked = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      console.log('[Audio] Web Audio unlocked successfully via user gesture');
    } catch (e) {
      console.warn('[Audio] Failed to unlock AudioContext:', e);
    }
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
};

// Initialize unlock immediately on module load
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

function playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.2) {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
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
  playTone(880, 'sawtooth', 0.2, 0.3);
  setTimeout(() => playTone(880, 'sawtooth', 0.2, 0.3), 250);
  setTimeout(() => playTone(1760, 'sawtooth', 0.4, 0.4), 500);
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
      if (!(window as any).__nativeAudioPreloaded) {
        await NativeAudio.preload({
          assetId: 'status_clear',
          assetPath: 'status_clear.mp3',
        }).catch(() => {});
        (window as any).__nativeAudioPreloaded = true;
      }
      await NativeAudio.play({ assetId: 'status_clear' });
      playedSuccessfully = true;
      console.log('[Audio] NativeAudio played status_clear.mp3 successfully');
      return;
    } catch (e) {
      console.warn('[Audio] NativeAudio play failed, fallback to HTML5 Audio', e);
    }
  }

  // Tier 2: HTML5 Audio Element (Works everywhere including PWA / WebViews)
  if (!playedSuccessfully) {
    try {
      const baseUrl = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/';
      const audioUrl = (baseUrl + '/status_clear.mp3').replace(/\/+/g, '/');
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      activeAudioElement = audio;
      audio.onended = () => { activeAudioElement = null; };
      await audio.play();
      playedSuccessfully = true;
      console.log('[Audio] HTML5 Audio played status_clear.mp3 successfully');
      return;
    } catch (err) {
      console.warn('[Audio] HTML5 Audio play failed, fallback to Web Audio API', err);
    }
  }

  // Tier 3: Web Audio API (AudioBuffer source)
  if (!playedSuccessfully) {
    try {
      const audioCtx = getAudioCtx();
      if (audioCtx && audioCtx.state !== 'suspended') {
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
        activeAudioSource = source;
        source.onended = () => { activeAudioSource = null; };
        source.start(0);
        playedSuccessfully = true;
        console.log('[Audio] Web Audio API played status_clear.mp3 successfully');
        return;
      }
    } catch (e) {
      console.warn('[Audio] Web Audio API play failed, fallback to Emergency Beep Alarm', e);
    }
  }

  // Tier 4: Fail-Safe Emergency Alarm Tone (GUARANTEED SOUND)
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
