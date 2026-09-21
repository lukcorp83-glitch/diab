import { SKINS, ACCESSORIES } from '../data/petDatabase';

// In-memory cache for preloaded & decoded images
const preloadedUrls = new Set<string>();

export const DEFAULT_AVATAR_IMAGES = [
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Egg.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Turtle.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Sauropod.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/T-Rex.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon.png',
];

/**
 * Preload and decode an image in the background into browser cache.
 */
export async function preloadImage(src: string): Promise<boolean> {
  if (!src || preloadedUrls.has(src)) return true;
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = async () => {
      try {
        if ('decode' in img && typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // decode might reject if cancelled or partial, but image is in cache
      }
      preloadedUrls.add(src);
      resolve(true);
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = src;
  });
}

/**
 * Preload essential pet assets: current active skin, accessory and base evolution tiers.
 */
export function preloadPetAssets(petData?: any): void {
  if (typeof window === 'undefined') return;

  const urlsToPreload: string[] = [];

  // 1. Current skin
  if (petData?.skin) {
    const skin = SKINS.find((s) => s.id === petData.skin);
    if (skin?.imageUrl) urlsToPreload.push(skin.imageUrl);
  }

  // 2. Current accessory
  if (petData?.currentAccessory && petData.currentAccessory !== 'none') {
    const acc = ACCESSORIES.find((a) => a.id === petData.currentAccessory);
    if (acc?.imageUrl) urlsToPreload.push(acc.imageUrl);
  }

  // 3. Current level evolution tier avatar
  const lvl = petData?.level || 1;
  if (lvl < 5) urlsToPreload.push(DEFAULT_AVATAR_IMAGES[0]);
  else if (lvl < 10) urlsToPreload.push(DEFAULT_AVATAR_IMAGES[1]);
  else if (lvl < 15) urlsToPreload.push(DEFAULT_AVATAR_IMAGES[2]);
  else if (lvl < 20) urlsToPreload.push(DEFAULT_AVATAR_IMAGES[3]);
  else urlsToPreload.push(DEFAULT_AVATAR_IMAGES[4]);

  // Execute immediate preloads for active assets
  urlsToPreload.forEach((url) => preloadImage(url));

  // 4. Idle preloading for other common items
  const scheduleIdle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1000));
  scheduleIdle(() => {
    DEFAULT_AVATAR_IMAGES.forEach((url) => preloadImage(url));
  });
}

/**
 * Check if an asset URL has already been preloaded into cache.
 */
export function isAssetPreloaded(src: string): boolean {
  return preloadedUrls.has(src);
}
