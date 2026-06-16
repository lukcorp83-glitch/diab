import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MediaWidget({ enabled, logs }: { enabled: boolean, logs: LogEntry[] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioTrackRef = useRef<HTMLAudioElement | null>(null);

  // Sync audio element reference
  useEffect(() => {
    if (typeof document !== 'undefined') {
      audioTrackRef.current = document.getElementById('pwa-media-player') as HTMLAudioElement;
    }
  }, []);

  // Handle Playback State
  useEffect(() => {
    const audio = audioTrackRef.current;
    if (!audio) return;

    if (!enabled) {
      if (!audio.paused) {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }

    const startPlayback = () => {
      audio.volume = 0.5;
      if (audio.paused) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = 'playing';
            }
          })
          .catch((err) => {
            console.log("Media session playback blocked, waiting for interaction", err);
            setIsPlaying(false);
          });
      }
    };

    startPlayback();

    // Setup MediaSession handlers
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        audio.play().then(() => {
          setIsPlaying(true);
          navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
        setIsPlaying(false);
        navigator.mediaSession.playbackState = 'paused';
      });
      
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        audio.currentTime = Math.max(audio.currentTime - (details.seekOffset || 10), 0);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        audio.currentTime = Math.min(audio.currentTime + (details.seekOffset || 10), audio.duration);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {});
      navigator.mediaSession.setActionHandler('nexttrack', () => {});
    }

    return () => {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [enabled]);

  // Update MediaSession Metadata independently
  useEffect(() => {
    if (!enabled || !("mediaSession" in navigator)) return;

    const glucoseLogs = [...logs].filter(l => l.type === 'glucose').sort((a, b) => b.timestamp - a.timestamp);
    let titleStr = "GlikoControl Monitoring";
    if (glucoseLogs.length > 0) {
      const latestLog = glucoseLogs[0];
      titleStr = `${latestLog.value} mg/dL`;
    }

    const baseUrl = window.location.origin + (window.location.pathname.startsWith('/diab') ? '/diab' : '');
    const artworkPath = `${baseUrl}/pwa-icon.svg`;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: titleStr,
      artist: `GlikoControl`,
      album: 'Aktywne Monitorowanie',
      artwork: [
        { src: artworkPath, sizes: '96x96', type: 'image/svg+xml' },
        { src: artworkPath, sizes: '128x128', type: 'image/svg+xml' },
        { src: artworkPath, sizes: '192x192', type: 'image/svg+xml' },
        { src: artworkPath, sizes: '512x512', type: 'image/svg+xml' },
      ]
    });
  }, [logs, enabled]);

  // User Interaction requirement handler
  useEffect(() => {
    if (!enabled) return;

    const handleInteraction = () => {
      const audio = audioTrackRef.current;
      if (enabled && audio && audio.paused) {
        console.log("[MediaWidget] Resuming playback from user interaction");
        audio.play().then(() => {
          setIsPlaying(true);
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }).catch((e) => console.warn("[MediaWidget] Interaction playback failed:", e));
      }
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div 
      title={isPlaying ? "Odtwarzacz glukozy w tle aktywny" : "Odtwarzacz oczekuje na start"}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-xl transition-all",
        isPlaying ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
      )}
    >
      <Activity size={16} className={cn(isPlaying && "animate-pulse")} />
    </div>
  );
}


