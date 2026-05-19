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

    // Try playing immediately
    if (audioRef.current) {
      audioRef.current.volume = 0.5; // low volume but not 0
      if (audioRef.current.paused) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = 'playing';
            }
          })
          .catch((err) => {
            console.log("Media session auto-play blocked, waiting for interaction", err);
            setIsPlaying(false);
          });
      }
    }

    if ("mediaSession" in navigator) {
      const glucoseLogs = [...logs].filter(l => l.type === 'glucose').sort((a, b) => b.timestamp - a.timestamp);
      let titleStr = "Oczekiwanie na dane...";
      if (glucoseLogs.length > 0) {
        const latestLog = glucoseLogs[0];
        titleStr = `${latestLog.value} mg/dL`;
      }

      const artworkPath = window.location.pathname.startsWith('/diab/') ? '/diab/pwa-icon.svg' : '/pwa-icon.svg';

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: titleStr,
        artist: `GlikoControl Monitoring`,
        album: 'Bieżący odczyt glukozy',
        artwork: [
          { src: artworkPath, sizes: '96x96', type: 'image/svg+xml' },
          { src: artworkPath, sizes: '128x128', type: 'image/svg+xml' },
          { src: artworkPath, sizes: '192x192', type: 'image/svg+xml' },
          { src: artworkPath, sizes: '512x512', type: 'image/svg+xml' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => {
          setIsPlaying(true);
          navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
        navigator.mediaSession.playbackState = 'paused';
      });
      
      // Dummy handlers to prevent the OS from thinking it's not a real player
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (details.seekOffset || 10), 0);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (details.seekOffset || 10), audioRef.current.duration);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {});
      navigator.mediaSession.setActionHandler('nexttrack', () => {});
    }
  }, [logs, enabled, isPlaying]);

  useEffect(() => {
    const handleInteraction = () => {
      if (enabled && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }).catch(() => {});
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
      // A longer silent MP3 (about 1s) is more reliable than a 44-byte WAV
      src="data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAHRoZW9yZXRpY2FsLm5ldAD/48BAAAAAbW9kZWwgMTI4AAAABmxhbWUzLjk5AFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/48BAAAAbm9uZS4uAAAABmxhbWUzLjk5AFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/48BAAAAbm9uZS4uAAAABmxhbWUzLjk5AFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX"
      loop 
      playsInline 
    />
  );
}
