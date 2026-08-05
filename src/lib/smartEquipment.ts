import { LogEntry } from "../types";

const RESERVOIR_INCREASE_THRESHOLD = 20; // Minimum 20 units increase to count as a change
const SENSOR_GAP_MS_THRESHOLD = 60 * 60 * 1000; // 60 minutes gap
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours cooldown to prevent spamming

export function detectSmartEquipmentChanges(
  currentReservoir: number | undefined,
  previousReservoir: number | undefined,
  entries: LogEntry[]
) {
  let triggerReservoir = false;
  let triggerSensor = false;

  const now = Date.now();

  // 1. Detect Reservoir Change
  if (currentReservoir !== undefined && previousReservoir !== undefined) {
    if (currentReservoir - previousReservoir >= RESERVOIR_INCREASE_THRESHOLD) {
      const lastResPrompt = parseInt(localStorage.getItem('last_smart_reservoir_prompt') || '0', 10);
      if (now - lastResPrompt > COOLDOWN_MS) {
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
          if (now - lastSensPrompt > COOLDOWN_MS) {
            triggerSensor = true;
          }
        }
      }
    }
  }

  return { triggerReservoir, triggerSensor };
}

export function markSmartPromptShown(type: 'reservoir' | 'sensor') {
  if (type === 'reservoir') {
    localStorage.setItem('last_smart_reservoir_prompt', Date.now().toString());
  } else {
    localStorage.setItem('last_smart_sensor_prompt', Date.now().toString());
  }
}
