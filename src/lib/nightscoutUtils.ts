/**
 * Narzędzia pomocnicze do interpretacji danych z Nightscout (profile, devicestatus, baza).
 */

export function getBasalFromProfile(profileData: any, targetDate: Date = new Date()): number | null {
  if (!profileData) return null;
  const raw = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!raw) return null;

  const store = raw.store;
  const defaultProfileName = raw.defaultProfile;
  if (!store || !defaultProfileName) return null;

  const profile = store[defaultProfileName];
  if (!profile || !Array.isArray(profile.basal) || profile.basal.length === 0) return null;

  // Oblicz sekundy od początku doby w strefie czasowej
  const secondsOfDay = targetDate.getHours() * 3600 + targetDate.getMinutes() * 60 + targetDate.getSeconds();

  const sorted = [...profile.basal].sort((a, b) => {
    const secA = a.timeAsSeconds ?? (parseInt((a.time || '00:00').split(':')[0], 10) * 3600 + parseInt((a.time || '00:00').split(':')[1], 10) * 60);
    const secB = b.timeAsSeconds ?? (parseInt((b.time || '00:00').split(':')[0], 10) * 3600 + parseInt((b.time || '00:00').split(':')[1], 10) * 60);
    return secA - secB;
  });

  let currentBasal = sorted[0].value;
  for (const item of sorted) {
    const sec = item.timeAsSeconds ?? (parseInt((item.time || '00:00').split(':')[0], 10) * 3600 + parseInt((item.time || '00:00').split(':')[1], 10) * 60);
    if (sec <= secondsOfDay) {
      currentBasal = item.value;
    } else {
      break;
    }
  }

  const num = typeof currentBasal === 'number' ? currentBasal : parseFloat(currentBasal);
  return !isNaN(num) && num >= 0 ? num : null;
}
