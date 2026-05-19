import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';

export default function MediaWidget({ enabled, logs }: { enabled: boolean, logs: LogEntry[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!enabled) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (logs.length > 0 && "mediaSession" in navigator) {
      const glucoseLogs = logs.filter(l => l.type === 'glucose').sort((a, b) => b.timestamp - a.timestamp);
      if (glucoseLogs.length > 0) {
        const latestLog = glucoseLogs[0];
        const mgdl = latestLog.value;

        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: `${mgdl} mg/dL`,
          artist: `GlikoControl`,
          album: 'Bieżący odczyt',
        });
      }
      
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
    }
  }, [logs, enabled]);

  useEffect(() => {
    const handleInteraction = () => {
      if (enabled && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    if (enabled) {
      document.addEventListener('click', handleInteraction, { once: true });
      document.addEventListener('touchstart', handleInteraction, { once: true });
    }

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <audio 
      ref={audioRef} 
      src="data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq" 
      loop 
      playsInline 
    />
  );
}
