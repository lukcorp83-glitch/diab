import { LogEntry, UserSettings } from "../types";

const RESERVOIR_INCREASE_THRESHOLD = 20; // Minimum 20 units increase to count as a change
const SENSOR_GAP_MS_THRESHOLD = 50 * 60 * 1000; // Minimum 50 minutes gap (covers Guardian 120m, Dexcom/Libre 60m warm-up)
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours cooldown to prevent spamming
const MANUAL_CHANGE_GRACE_PERIOD_MS = 6 * 60 * 60 * 1000; // 6 hours after manual change to ignore auto-prompts
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000; // Look back up to 24 hours for warm-up gaps

export function detectSmartEquipmentChanges(
  currentReservoir: number | undefined,
  previousReservoir: number | undefined,
  entries: LogEntry[],
  userSettings?: UserSettings,
  treatments?: LogEntry[] | any[]
) {
  // Jeśli funkcja automatycznego wykrywania została wyłączona w kontroli rodzicielskiej
  if (userSettings?.childPermissions?.canAutoDetectEquipment === false) {
    return { triggerReservoir: false, triggerSensor: false };
  }

  let triggerReservoir = false;
  let triggerSensor = false;

  const now = Date.now();

  // Sprawdzamy, kiedy użytkownik ręcznie zmienił wkłucie / zbiorniczek / sensor
  const lastInfusionSetChange = userSettings?.infusionSetChangeDate || parseInt(localStorage.getItem('infusionSetChangeDate') || '0', 10);
  const lastReservoirChange = userSettings?.reservoirChangeDate || parseInt(localStorage.getItem('reservoirChangeDate') || '0', 10);
  const lastSensorChange = userSettings?.sensorChangeDate || parseInt(localStorage.getItem('sensorChangeDate') || '0', 10);

  // 1. Detect Reservoir Change
  // Prawidłowy odczyt poziomu zbiorniczka pompy musi być dodatnią liczbą > 0.
  // Wartości <= 0 lub brak danych oznaczają brak komunikacji/telemetrii, a nie pusty zbiornik,
  // więc nie mogą być punktem odniesienia (zapobiega to fałszywym alertom po powrocie danych z zera).
  const isValidCurrent = typeof currentReservoir === 'number' && !isNaN(currentReservoir) && currentReservoir > 0;
  const isValidPrevious = typeof previousReservoir === 'number' && !isNaN(previousReservoir) && previousReservoir > 0;

  if (isValidCurrent && isValidPrevious) {
    const diff = currentReservoir - previousReservoir;
    if (diff >= RESERVOIR_INCREASE_THRESHOLD) {
      const lastResPrompt = parseInt(localStorage.getItem('last_smart_reservoir_prompt') || '0', 10);
      
      // Ignoruj, jeśli użytkownik w ciągu ostatnich 6 godzin sam zarejestrował wymianę wkłucia lub zbiorniczka w aplikacji
      const recentManualChange = (now - lastInfusionSetChange < MANUAL_CHANGE_GRACE_PERIOD_MS) || (now - lastReservoirChange < MANUAL_CHANGE_GRACE_PERIOD_MS);
      
      if (!recentManualChange && (now - lastResPrompt > COOLDOWN_MS)) {
        triggerReservoir = true;
      }
    }
  }

  // 2. Detect Sensor Change
  // Sprawdź najpierw warunki brzegowe (ręczna zmiana w ciągu 6h, ogólny cooldown promptu)
  const lastSensPrompt = parseInt(localStorage.getItem('last_smart_sensor_prompt') || '0', 10);
  const recentManualSensor = now - lastSensorChange < MANUAL_CHANGE_GRACE_PERIOD_MS;
  const isCooldownActive = now - lastSensPrompt <= COOLDOWN_MS;

  if (!recentManualSensor && !isCooldownActive) {
    // A) Sprawdź treatments z Nightscout (np. zdarzenia Sensor Change / Sensor Start z pomp Medtronic, Dexcom, itp.)
    if (treatments && treatments.length > 0) {
      const lastDetectedTreatmentTs = parseInt(localStorage.getItem('last_detected_sensor_treatment_ts') || '0', 10);
      for (const t of treatments) {
        const tType = (t.type || t.eventType || '').toString().toLowerCase();
        const tTime = typeof t.timestamp === 'number' ? t.timestamp : (t.date ? new Date(t.date).getTime() : 0);
        if (
          (tType === 'sensor_change' || tType.includes('sensor change') || tType.includes('sensor start')) &&
          tTime > 0 &&
          (now - tTime < MAX_LOOKBACK_MS) &&
          tTime > lastDetectedTreatmentTs
        ) {
          triggerSensor = true;
          localStorage.setItem('last_detected_sensor_treatment_ts', tTime.toString());
          break;
        }
      }
    }

    // B) Sprawdź lukę w odczytach CGM (np. 2-godzinny warm-up Guardiana lub 1-2h w innych CGM)
    // Skanujemy sąsiadujące wpisy z ostatnich 24 godzin w poszukiwaniu luki >= SENSOR_GAP_MS_THRESHOLD (50 min).
    if (!triggerSensor && entries && entries.length >= 2) {
      // Filtrujemy tylko wpisy z glikemią i sortujemy malejąco wg czasu (od najnowszego do najstarszego)
      const glucoseEntries = entries
        .filter(e => (e.type === 'glucose' || typeof (e as any).sgv === 'number' || typeof e.value === 'number') && typeof e.timestamp === 'number')
        .sort((a, b) => b.timestamp - a.timestamp);

      const lastHandledGapTs = parseInt(localStorage.getItem('last_detected_sensor_gap_ts') || '0', 10);

      for (let i = 0; i < glucoseEntries.length - 1; i++) {
        const newer = glucoseEntries[i];
        const older = glucoseEntries[i + 1];

        // Nie szukamy w odległej przeszłości powyżej 24 godzin
        if (now - newer.timestamp > MAX_LOOKBACK_MS) {
          break;
        }

        const gap = newer.timestamp - older.timestamp;
        if (gap >= SENSOR_GAP_MS_THRESHOLD) {
          // Jeśli ta konkretna luka (zidentyfikowana momentem jej zakończenia `newer.timestamp`) nie była jeszcze obsłużona
          if (newer.timestamp > lastHandledGapTs) {
            triggerSensor = true;
            localStorage.setItem('last_detected_sensor_gap_ts', newer.timestamp.toString());
            break;
          }
        }
      }
    }
  }

  return { triggerReservoir, triggerSensor };
}

export function markSmartPromptShown(type: 'reservoir' | 'sensor' | 'all') {
  const now = Date.now().toString();
  if (type === 'reservoir' || type === 'all') {
    localStorage.setItem('last_smart_reservoir_prompt', now);
  }
  if (type === 'sensor' || type === 'all') {
    localStorage.setItem('last_smart_sensor_prompt', now);
  }
}
