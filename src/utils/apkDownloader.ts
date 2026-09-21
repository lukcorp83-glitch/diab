import { Capacitor } from '@capacitor/core';
import { CURRENT_VERSION } from '../constants/versions';

export interface ApkDownloadInfo {
  url: string;
  version: string;
  isBeta: boolean;
  filename: string;
  releasePageUrl: string;
}

/**
 * Dynamicznie rozwiązuje aktualny adres pliku APK z GitHuba / version.json.
 * Żadne wersje nie są zahardkodowane na sztywno — numery i linki są
 * pobierane w czasie rzeczywistym z GitHub Releases API lub plików konfiguracyjnych.
 */
export async function resolveApkDownloadUrl(): Promise<ApkDownloadInfo> {
  const isBeta = localStorage.getItem("betaProgramEnabled") === "true";
  const targetTag = isBeta ? 'aktualizacja-beta' : 'aktualizacja';

  // 1. Sprawdź GitHub Releases API (najbardziej aktualne źródło rzeczywistych plików binarnych)
  try {
    const res = await fetch('https://api.github.com/repos/lukcorp83-glitch/diab/releases', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (res.ok) {
      const releases = await res.json();
      if (Array.isArray(releases)) {
        const targetRelease = releases.find((r: any) => r.tag_name === targetTag);
        const apkAsset = targetRelease?.assets?.find((a: any) => a.name?.toLowerCase().endsWith('.apk'));

        if (apkAsset) {
          const versionMatch = apkAsset.name.match(/(\d+\.\d+\.\d+)/);
          const detectedVersion = versionMatch ? versionMatch[1] : (targetRelease.name || CURRENT_VERSION);

          return {
            url: apkAsset.browser_download_url,
            version: detectedVersion,
            isBeta: apkAsset.name.toLowerCase().includes('beta') || isBeta,
            filename: apkAsset.name,
            releasePageUrl: targetRelease?.html_url || `https://github.com/lukcorp83-glitch/diab/releases/tag/${targetTag}`,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[apkDownloader] Nie udało się odpytać GitHub Releases API, sprawdzam zdalny version.json:', err);
  }

  // 2. Fallback: Pobierz version.json ze zdalnego serwera odpowiedniego dla kanału
  try {
    const jsonUrl = isBeta
      ? 'https://raw.githubusercontent.com/lukcorp83-glitch/diab/beta/version.json?t=' + Date.now()
      : 'https://glikocontrol.pl/version.json?t=' + Date.now();

    const jsonRes = await fetch(jsonUrl);
    if (jsonRes.ok) {
      const data = await jsonRes.json();
      if (data && (data.apkUrl || data.version)) {
        const v = data.version || CURRENT_VERSION;
        const dynamicUrl = data.apkUrl || (isBeta
          ? `https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja-beta/GlikoControl_${v}-beta_OTA.apk`
          : `https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja/GlikoControl_${v}_OTA.apk`);

        return {
          url: dynamicUrl,
          version: v,
          isBeta,
          filename: isBeta ? `GlikoControl_${v}-beta_OTA.apk` : `GlikoControl_${v}_OTA.apk`,
          releasePageUrl: `https://github.com/lukcorp83-glitch/diab/releases/tag/${targetTag}`,
        };
      }
    }
  } catch (jsonErr) {
    console.warn('[apkDownloader] Nie udało się odpytać zdalnego version.json:', jsonErr);
  }

  // 3. Ostateczny dynamiczny fallback oparty o CURRENT_VERSION z kodu aplikacji
  const fallbackVersion = CURRENT_VERSION;
  const fallbackUrl = isBeta
    ? `https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja-beta/GlikoControl_${fallbackVersion}-beta_OTA.apk`
    : `https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja/GlikoControl_${fallbackVersion}_OTA.apk`;

  return {
    url: fallbackUrl,
    version: fallbackVersion,
    isBeta,
    filename: isBeta ? `GlikoControl_${fallbackVersion}-beta_OTA.apk` : `GlikoControl_${fallbackVersion}_OTA.apk`,
    releasePageUrl: `https://github.com/lukcorp83-glitch/diab/releases/tag/${targetTag}`,
  };
}

/**
 * Bezpiecznie inicjuje pobieranie pliku APK na Androidzie i w przeglądarce.
 * Unika window.location.href, które w PWA i WebView zamraża stronę i blokuje monit Chrome Safe Browsing.
 */
export function triggerApkDownload(url: string): void {
  if (Capacitor.isNativePlatform()) {
    try {
      window.open(url, '_system');
    } catch {
      window.location.href = url;
    }
    return;
  }

  // W przeglądarce Web / PWA:
  // Tworzymy ukryty element <a> z target="_blank" i atrybutem download
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('download', '');
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch {
      // Ignoruj
    }
  }, 1000);
}
