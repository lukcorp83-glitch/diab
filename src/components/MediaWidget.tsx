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

    // Try playing immediately if we just enabled it
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    if (logs.length > 0 && "mediaSession" in navigator) {
      const glucoseLogs = logs.filter(l => l.type === 'glucose').sort((a, b) => b.timestamp - a.timestamp);
      let titleStr = "Oczekiwanie...";
      if (glucoseLogs.length > 0) {
        const latestLog = glucoseLogs[0];
        titleStr = `${latestLog.value} mg/dL`;
      }

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: titleStr,
        artist: `GlikoControl`,
        album: 'Bieżący odczyt',
      });
      
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
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

  return (
    <audio 
      id="pwa-media-player"
      ref={audioRef} 
      src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" 
      loop 
      playsInline 
    />
  );
}
