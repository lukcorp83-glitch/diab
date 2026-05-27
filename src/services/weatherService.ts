interface CachedWeather {
  data: {
    temp: number;
    pressure: number;
    condition: string;
    city?: string;
    todayMax?: number;
    todayMin?: number;
    tomorrowMax?: number;
    tomorrowMin?: number;
    tomorrowCondition?: string;
  };
  timestamp: number;
}

let weatherCache: CachedWeather | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function fetchCurrentWeather(lat?: number, lon?: number, force: boolean = false) {
  try {
    // Check cache first
    const now = Date.now();
    if (!force && weatherCache && (now - weatherCache.timestamp < CACHE_DURATION_MS)) {
      return weatherCache.data;
    }

    let finalLat = lat;
    let finalLon = lon;
    let finalCity = undefined;

    // Use geojs to get approximate location if not provided
    if (finalLat === undefined || finalLon === undefined) {
      try {
        const geoResponse = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          finalLat = parseFloat(geoData.latitude);
          finalLon = parseFloat(geoData.longitude);
          finalCity = geoData.city;
        }
      } catch (geoError) {
        console.warn("Could not fetch geolocation from IP:", geoError);
      }
    } else {
      // If lat/lon provided (e.g. from GPS), use reverse geocoding to get city
      try {
        const reverseResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${finalLat}&longitude=${finalLon}&localityLanguage=pl`);
        if (reverseResponse.ok) {
          const reverseData = await reverseResponse.json();
          finalCity = reverseData.city || reverseData.locality || undefined;
        }
      } catch (reverseError) {
        console.warn("Could not reverse geocode:", reverseError);
      }
    }

    if (finalLat === undefined || finalLon === undefined) {
       console.warn("No location available for weather fetch.");
       return null;
    }

    // Open-Meteo is free and doesn't require an API key
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLon}&current=temperature_2m,surface_pressure,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    const result: any = {
      temp: data.current.temperature_2m,
      pressure: data.current.surface_pressure,
      condition: getWeatherCondition(data.current.weather_code)
    };
    
    if (data.daily) {
      if (Array.isArray(data.daily.temperature_2m_max) && data.daily.temperature_2m_max.length > 1) {
        result.todayMax = data.daily.temperature_2m_max[0];
        result.tomorrowMax = data.daily.temperature_2m_max[1];
      }
      if (Array.isArray(data.daily.temperature_2m_min) && data.daily.temperature_2m_min.length > 1) {
        result.todayMin = data.daily.temperature_2m_min[0];
        result.tomorrowMin = data.daily.temperature_2m_min[1];
      }
      if (Array.isArray(data.daily.weather_code) && data.daily.weather_code.length > 1) {
        result.tomorrowCondition = getWeatherCondition(data.daily.weather_code[1]);
      }
    }

    if (finalCity) {
      result.city = finalCity;
    }

    weatherCache = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  } catch (error) {
    console.warn("Weather fetch failed (can be safely ignored if offline/blocked):", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// WMO Weather interpretation codes
function getWeatherCondition(code: number): string {
  if (code === 0) return 'Czyste niebo';
  if (code === 1 || code === 2 || code === 3) return 'Częściowo zachmurzone';
  if (code === 45 || code === 48) return 'Mgła';
  if (code >= 51 && code <= 57) return 'Mżawka';
  if (code >= 61 && code <= 67) return 'Deszcz';
  if (code >= 71 && code <= 77) return 'Śnieg';
  if (code >= 80 && code <= 82) return 'Przelotny deszcz';
  if (code >= 95) return 'Burza';
  return 'Nieznana';
}
