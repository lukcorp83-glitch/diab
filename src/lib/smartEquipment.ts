import { LogEntry, UserSettings } from "../types";

const RESERVOIR_INCREASE_THRESHOLD = 20; // Minimum 20 units increase to count as a change
const SENSOR_GAP_MS_THRESHOLD = 60 * 60 * 1000; // 60 minutes gap
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours cooldown to prevent spamming
const MANUAL_CHANGE_GRACE_PERIOD_MS = 6 * 60 * 60 * 1000; // 6 hours after manual change to ignore auto-prompts

export function detectSmartEquipmentChanges(
  currentReservoir: number | undefined,
  previousReservoir: number | undefined,
  entries: LogEntry[],
  userSettings?: UserSettings
) {
  let triggerReservoir = false;
  let triggerSensor = false;

  const now = Date.now();

  // Sprawdzamy, kiedy użytkownik ręcznie zmienił wkłucie / zbiorniczek / sensor
  const lastInfusionSetChange = userSettings?.infusionSetChangeDate || parseInt(localStorage.getItem('infusionSetChangeDate') || '0', 10);
  const lastReservoirChange = userSettings?.reservoirChangeDate || parseInt(localStorage.getItem('reservoirChangeDate') || '0', 10);
  const lastSensorChange = userSettings?.sensorChangeDate || parseInt(localStorage.getItem('sensorChangeDate') || '0', 10);

  // 1. Detect Reservoir Change
  if (currentReservoir !== undefined && previousReservoir !== undefined) {
    if (currentReservoir - previousReservoir >= RESERVOIR_INCREASE_THRESHOLD) {
      const lastResPrompt = parseInt(localStorage.getItem('last_smart_reservoir_prompt') || '0', 10);
      
      // Ignoruj, jeśli użytkownik w ciągu ostatnich 6 godzin sam zarejestrował wymianę wkłucia lub zbiorniczka w aplikacji
      const recentManualChange = (now - lastInfusionSetChange < MANUAL_CHANGE_GRACE_PERIOD_MS) || (now - lastReservoirChange < MANUAL_CHANGE_GRACE_PERIOD_MS);
      
      if (!recentManualChange && (now - lastResPrompt > COOLDOWN_MS)) {
        triggerReservoir = true;
      }
    }
  }

  // 2. Detect Sensor Change
  if (entries && entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const newest = sorted[0];
    const previous = sorted[1];

    if (newest && previous) {
      const gap = newest.timestamp - previous.timestamp;
      if (gap >= SENSOR_GAP_MS_THRESHOLD) {
        // Ensure this gap is recent (not something from 3 days ago)
        if (now - newest.timestamp < 2 * 60 * 60 * 1000) { 
          const lastSensPrompt = parseInt(localStorage.getItem('last_smart_sensor_prompt') || '0', 10);
          
          // Ignoruj, jeśli użytkownik w ciągu ostatnich 6 godzin sam zarejestrował wymianę sensora
          const recentManualSensor = now - lastSensorChange < MANUAL_CHANGE_GRACE_PERIOD_MS;
          
          if (!recentManualSensor && (now - lastSensPrompt > COOLDOWN_MS)) {
            triggerSensor = true;
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
