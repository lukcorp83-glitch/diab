import { useEffect, useRef } from 'react';
import { LogEntry, UserSettings } from '../types';
import { playLowGlucoseSound, playHighGlucoseSound } from '../lib/audioUtils';
import { notificationService } from '../services/notificationService';
import { Haptics } from '../lib/haptics';
import { Capacitor } from '@capacitor/core';

export function useGlucoseAlerts(logs: LogEntry[] = [], settings?: UserSettings | null) {
  useEffect(() => {
    if (!logs || logs.length === 0) return;

    // Get all glucose logs sorted by timestamp descending
    const glucoseLogs = logs
      .filter(l => {
        const hasBg = l.type === 'glucose' || (l.type as any) === 'sgv' || (l as any).bg !== undefined;
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
    const latestId = latest.id || (latest as any).nsId || (latest as any)._id || `bg_${latest.timestamp}`;
    
    // Parse timestamp strictly
    let latestTime = latest.timestamp;
    if (!latestTime && latest.createdAt) {
      latestTime = typeof latest.createdAt === 'number' ? latest.createdAt : new Date(latest.createdAt).getTime();
    }
    if (!latestTime || isNaN(latestTime)) return;

    const val = latest.value || (latest as any).bg;

    // Ignore logs older than 30 minutes (zabezpieczenie przed archiwalnymi wpisami)
    if (Date.now() - latestTime > 30 * 60 * 1000) return;

    // Check if user disabled notifications in settings
    if (settings?.notificationsEnabled === false) return;

    const targetMin = settings?.targetMin || 70;
    const targetMax = settings?.targetMax || 180;

    const isLow = val < targetMin;
    const isHigh = val > targetMax;

    // If sugar returned to normal range, reset alert memory and clear snooze flag
    if (!isLow && !isHigh) {
      if (localStorage.getItem('last_glucose_alert_type') || localStorage.getItem('glucose_alarm_snooze_until')) {
        console.log(`[GlucoseAlerts] Cukier w normie (${val} mg/dL). Resetowanie pamięci alarmu i drzemki.`);
        localStorage.removeItem('last_glucose_alert_type');
        localStorage.removeItem('last_glucose_alert_time');
        localStorage.removeItem('last_glucose_alert_id');
        localStorage.removeItem('last_glucose_alert_val');
        localStorage.removeItem('glucose_alarm_snooze_until');
        localStorage.removeItem('glucose_alarm_snooze_type');
      }
      return;
    }

    // Check user explicit snooze flag (drzemka po wyciszeniu alarmu)
    const snoozeUntilStr = localStorage.getItem('glucose_alarm_snooze_until');
    if (snoozeUntilStr) {
      const snoozeUntil = parseInt(snoozeUntilStr, 10);
      if (Date.now() < snoozeUntil) {
        console.log(`[GlucoseAlerts] Alarm wyciszony (drzemka do ${new Date(snoozeUntil).toLocaleTimeString()}). Aktualny cukier: ${val} mg/dL`);
        return;
      } else {
        localStorage.removeItem('glucose_alarm_snooze_until');
        localStorage.removeItem('glucose_alarm_snooze_type');
      }
    }

    const lastAlertTime = parseInt(localStorage.getItem('last_glucose_alert_time') || '0', 10);
    const lastAlertId = localStorage.getItem('last_glucose_alert_id') || '';
    const lastAlertType = localStorage.getItem('last_glucose_alert_type') as ('low' | 'high' | null);
    const lastAlertVal = parseFloat(localStorage.getItem('last_glucose_alert_val') || '0');

    // Strict deduplication: if this exact measurement was already alerted, skip
    if (lastAlertId === latestId && lastAlertTime > 0 && Date.now() - lastAlertTime < 5 * 60 * 1000) {
      return;
    }

    const now = Date.now();
    const timeSinceLastAlert = now - lastAlertTime;
    const alertType: 'low' | 'high' = isLow ? 'low' : 'high';

    let shouldAlert = false;

    if (lastAlertType !== alertType) {
      // First time entering low or high state -> IMMEDIATE ALERT
      shouldAlert = true;
    } else {
      // PERSISTENT / UNCORRECTED ALERT REPEAT RULES
      if (isLow) {
        // Low sugar repeat rule: Repeat alarm every 15 minutes if sugar stays low (< targetMin)
        const lowRepeatIntervalMs = 15 * 60 * 1000;
        if (timeSinceLastAlert >= lowRepeatIntervalMs) {
          shouldAlert = true;
          console.log(`[GlucoseAlerts] 🔄 POWTÓRZENIE ALARMU: Niski cukier (${val} mg/dL) utrzymuje się od 15 min!`);
        }
      } else if (isHigh) {
        // High sugar repeat rule: Repeat alarm every 30 minutes if sugar stays high (> targetMax) and hasn't dropped by >= 15 mg/dL
        const highRepeatIntervalMs = 30 * 60 * 1000;
        const hasDroppedSignificantly = (lastAlertVal - val) >= 15;
        if (timeSinceLastAlert >= highRepeatIntervalMs && !hasDroppedSignificantly) {
          shouldAlert = true;
          console.log(`[GlucoseAlerts] 🔄 POWTÓRZENIE ALARMU: Wysoki cukier (${val} mg/dL) utrzymuje się od 30 min!`);
        }
      }
    }

    if (!shouldAlert) return;

    // Persist alert state in localStorage so app restarts don't trigger duplicate alarms
    localStorage.setItem('last_glucose_alert_time', now.toString());
    localStorage.setItem('last_glucose_alert_id', latestId);
    localStorage.setItem('last_glucose_alert_type', alertType);
    localStorage.setItem('last_glucose_alert_val', val.toString());

    if (isLow) {
      console.log(`[GlucoseAlerts] 🚨 ALARM NISKIEJ GLIKEMII: ${val} mg/dL!`);
      // Trigger system notification
      notificationService.triggerGlucoseAlarm(false, Math.round(val));
      playLowGlucoseSound();
      Haptics.heavy();

      // Emit event for persistent in-app UI Alarm Modal with STOP SOUND button
      window.dispatchEvent(new CustomEvent('active_glucose_alarm', {
        detail: { type: 'low', value: Math.round(val), timestamp: latestTime }
      }));
    } else if (isHigh) {
      console.log(`[GlucoseAlerts] 📈 ALARM WYSOKIEJ GLIKEMII: ${val} mg/dL!`);
      // Trigger system notification
      notificationService.triggerGlucoseAlarm(true, Math.round(val));
      playHighGlucoseSound();
      Haptics.medium();

      // Emit event for persistent in-app UI Alarm Modal with STOP SOUND button
      window.dispatchEvent(new CustomEvent('active_glucose_alarm', {
        detail: { type: 'high', value: Math.round(val), timestamp: latestTime }
      }));
    }
  }, [logs, settings]);
}
