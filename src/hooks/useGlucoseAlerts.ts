import { useEffect, useRef } from 'react';
import { LogEntry, UserSettings } from '../types';
import { playLowGlucoseSound, playHighGlucoseSound } from '../lib/audioUtils';
import { notificationService } from '../services/notificationService';
import { Haptics } from '../lib/haptics';
import { Capacitor } from '@capacitor/core';

export function useGlucoseAlerts(logs: LogEntry[] = [], settings?: UserSettings | null) {
  const lastProcessedIdRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  const lastAlertTimeRef = useRef<number>(0);
  const lastAlertValRef = useRef<number>(0);
  const lastAlertTypeRef = useRef<'low' | 'high' | null>(null);

  useEffect(() => {
    if (!logs || logs.length === 0) return;

    // Get all glucose logs sorted by timestamp descending
    const glucoseLogs = logs
      .filter(l => {
        const hasBg = l.type === 'glucose' || l.type === 'sgv' || (l as any).bg !== undefined;
        const val = l.value || (l as any).bg || 0;
        return hasBg && val > 0;
      })
      .sort((a, b) => {
        const ta = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return tb - ta;
      });

    if (glucoseLogs.length === 0) return;
    const latest = glucoseLogs[0];
    const latestId = latest.id || (latest as any).nsId || (latest as any)._id || '';
    
    // Parse timestamp strictly
    let latestTime = latest.timestamp;
    if (!latestTime && latest.createdAt) {
      latestTime = typeof latest.createdAt === 'number' ? latest.createdAt : new Date(latest.createdAt).getTime();
    }
    if (!latestTime || isNaN(latestTime)) return;

    const val = latest.value || (latest as any).bg;

    // Ignore logs older than 20 minutes
    if (Date.now() - latestTime > 20 * 60 * 1000) return;

    // Strict deduplication: skip if this exact log item & timestamp was already processed
    if (latestId && latestId === lastProcessedIdRef.current && latestTime === lastProcessedTimeRef.current) {
      return;
    }
    lastProcessedIdRef.current = latestId;
    lastProcessedTimeRef.current = latestTime;

    const targetMin = settings?.targetMin || 70;
    const targetMax = settings?.targetMax || 180;

    const isLow = val < targetMin;
    const isHigh = val > targetMax;

    // If sugar returned to normal range, reset alert memory and clear snooze flag
    if (!isLow && !isHigh) {
      if (lastAlertTypeRef.current !== null || localStorage.getItem('glucose_alarm_snooze_until')) {
        console.log(`[GlucoseAlerts] Sugar returned to target range (${val} mg/dL). Resetting alert memory & clearing snooze.`);
        lastAlertTypeRef.current = null;
        lastAlertTimeRef.current = 0;
        lastAlertValRef.current = 0;
        localStorage.removeItem('glucose_alarm_snooze_until');
        localStorage.removeItem('glucose_alarm_snooze_type');
      }
      return;
    }

    // Check user explicit snooze flag (flaga drzemki po wyciszeniu alarmu)
    const snoozeUntilStr = localStorage.getItem('glucose_alarm_snooze_until');
    if (snoozeUntilStr) {
      const snoozeUntil = parseInt(snoozeUntilStr, 10);
      if (Date.now() < snoozeUntil) {
        console.log(`[GlucoseAlerts] Alarm snoozed by user until ${new Date(snoozeUntil).toLocaleTimeString()}. Current: ${val} mg/dL`);
        return;
      } else {
        localStorage.removeItem('glucose_alarm_snooze_until');
        localStorage.removeItem('glucose_alarm_snooze_type');
      }
    }

    const now = Date.now();
    const timeSinceLastAlert = now - lastAlertTimeRef.current;

    let shouldAlert = false;
    const alertType: 'low' | 'high' = isLow ? 'low' : 'high';

    if (lastAlertTypeRef.current !== alertType) {
      // First time entering low or high state -> IMMEDIATE ALERT
      shouldAlert = true;
    } else {
      // PERSISTENT / UNCORRECTED ALERT REPEAT RULES
      if (isLow) {
        // Low sugar repeat rule: Repeat alarm every 15 minutes if sugar stays low (< targetMin)
        const lowRepeatIntervalMs = 15 * 60 * 1000;
        if (timeSinceLastAlert >= lowRepeatIntervalMs) {
          shouldAlert = true;
          console.log(`[GlucoseAlerts] 🔄 REPEAT ALARM: Low sugar hasn't risen above ${targetMin} mg/dL in 15 min!`);
        }
      } else if (isHigh) {
        // High sugar repeat rule: Repeat alarm every 30 minutes if sugar stays high (> targetMax) and hasn't dropped by >= 15 mg/dL
        const highRepeatIntervalMs = 30 * 60 * 1000;
        const hasDroppedSignificantly = (lastAlertValRef.current - val) >= 15;
        if (timeSinceLastAlert >= highRepeatIntervalMs && !hasDroppedSignificantly) {
          shouldAlert = true;
          console.log(`[GlucoseAlerts] 🔄 REPEAT ALARM: High sugar hasn't dropped below ${targetMax} mg/dL in 30 min!`);
        }
      }
    }

    if (!shouldAlert) return;

    lastAlertTimeRef.current = now;
    lastAlertValRef.current = val;
    lastAlertTypeRef.current = alertType;

    if (isLow) {
      console.log(`[GlucoseAlerts] 🚨 LOW GLUCOSE MP3 ALARM FIRED: ${val} mg/dL!`);
      // Trigger system notification
      notificationService.triggerGlucoseAlarm(false, Math.round(val));
      playLowGlucoseSound();
      Haptics.heavy();

      // Emit event for persistent UI Alarm Modal with STOP SOUND button
      window.dispatchEvent(new CustomEvent('active_glucose_alarm', {
        detail: { type: 'low', value: Math.round(val), timestamp: latestTime }
      }));
    } else if (isHigh) {
      console.log(`[GlucoseAlerts] 📈 HIGH GLUCOSE MP3 ALARM FIRED: ${val} mg/dL!`);
      // Trigger system notification
      notificationService.triggerGlucoseAlarm(true, Math.round(val));
      playHighGlucoseSound();
      Haptics.medium();

      // Emit event for persistent UI Alarm Modal with STOP SOUND button
      window.dispatchEvent(new CustomEvent('active_glucose_alarm', {
        detail: { type: 'high', value: Math.round(val), timestamp: latestTime }
      }));
    }
  }, [logs, settings]);
}
