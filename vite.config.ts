import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = './';

  let gitBranch = process.env.VITE_APP_CHANNEL || process.env.GITHUB_REF_NAME || '';
  if (!gitBranch) {
    try {
      const headContent = fs.readFileSync(path.resolve(__dirname, '.git/HEAD'), 'utf8').trim();
      if (headContent.startsWith('ref: refs/heads/')) {
        gitBranch = headContent.replace('ref: refs/heads/', '').trim();
      } else {
        gitBranch = headContent;
      }
    } catch (e) {
      gitBranch = 'main';
    }
  }
  const isBetaChannel = gitBranch === 'beta' || process.env.VITE_APP_CHANNEL === 'beta';
  
  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['pwa-icon.svg', 'pwa-icon-maskable.svg', 'google.svg', 'assets/sql-wasm.wasm', 'status_clear.mp3'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3}'],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/pobierz/,
            /^\/diab\/pobierz/,
            /^\/api/,
            /\.apk$/
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
          manifest: {
          name: 'GlikoControl',
          short_name: 'GlikoControl',
          description: 'Asystent Twojej cukrzycy z systemem GlikoSense AI',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          dir: 'ltr',
          lang: 'pl-PL',
          start_url: '/diab/',
          scope: '/diab/',
          id: '/diab/',
          categories: ['medical', 'health', 'fitness'],
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'pwa-icon-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Dodaj Cukier',
              short_name: 'Cukier',
              description: 'Szybkie wpisanie poziomu glukozy',
              url: '/diab/?action=add_glucose',
              icons: [{ src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
            },
            {
              name: 'Dodaj Bolus',
              short_name: 'Bolus',
              description: 'Szybkie wpisanie insuliny',
              url: '/diab/?action=add_bolus',
              icons: [{ src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
            },
            {
              name: 'Dodaj Posiłek',
              short_name: 'Posiłek',
              description: 'Szybkie wpisanie posiłku',
              url: '/diab/?action=add_meal',
              icons: [{ src: 'pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
            }
          ],
          widgets: [
            {
              name: "Gliko Status",
              short_name: "Status",
              description: "Podgląd poziomu cukru",
              tag: "gliko-status",
              template: "gliko-status",
              ms_ac_template: "gliko-status.json",
              icons: [
                {
                  src: "pwa-icon.svg",
                  sizes: "192x192",
                  type: "image/svg+xml"
                }
              ]
            }
          ]
        } as any,
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID),
      'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(env.VITE_FIREBASE_DATABASE_URL),
      'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(gitBranch),
      'import.meta.env.VITE_IS_BETA_CHANNEL': JSON.stringify(isBetaChannel),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        external: ['@tensorflow/tfjs-backend-wasm']
      }
    }
  };
});


