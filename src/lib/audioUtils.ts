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

let currentAlertAudio: HTMLAudioElement | null = null;

export const stopGlucoseSound = () => {
  if (currentAlertAudio) {
    try {
      currentAlertAudio.pause();
      currentAlertAudio.currentTime = 0;
    } catch (e) {
      console.error("Error stopping audio", e);
    }
    currentAlertAudio = null;
  }
  // Anuluj dźwięk natywny jeśli odtwarzany przez LocalNotifications
  import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
        LocalNotifications.cancel({ notifications: [{ id: 888 }, { id: 889 }, { id: 2 }, { id: 777 }] }).catch(() => {});
      });
    }
  });
};

const playMp3Alert = () => {
  try {
    // Jeśli dzwonek już gra, nie przerywaj go ani nie nakładaj kolejnego, aby dzwonek przeszedł cały
    if (currentAlertAudio && !currentAlertAudio.paused && !currentAlertAudio.ended) {
      return;
    }
    const audio = new Audio('/status_clear.mp3');
    currentAlertAudio = audio;
    audio.play().catch(e => console.error("Audio play blocked", e));
    audio.onended = () => {
      if (currentAlertAudio === audio) {
        currentAlertAudio = null;
      }
    };
  } catch (e) {
    console.error("Audio error", e);
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
