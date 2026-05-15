import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = './';
  
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        includeAssets: ['pwa-icon.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        manifest: {
          name: 'GlikoControl',
          short_name: 'Gliko',
          description: 'Asystent Twojej cukrzycy z systemem GlikoSense AI',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          id: '/',
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
              src: 'pwa-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ],
          shortcuts: [
            {
              name: 'Dodaj Cukier',
              short_name: 'Cukier',
              description: 'Szybkie wpisanie poziomu glukozy',
              url: `${basePath}?action=add_glucose`,
              icons: [{ src: 'pwa-icon.svg', sizes: 'any' }]
            },
            {
              name: 'Dodaj Bolus',
              short_name: 'Bolus',
              description: 'Szybkie wpisanie insuliny',
              url: `${basePath}?action=add_bolus`,
              icons: [{ src: 'pwa-icon.svg', sizes: 'any' }]
            },
            {
              name: 'Dodaj Posiłek',
              short_name: 'Posiłek',
              description: 'Szybkie wpisanie posiłku',
              url: `${basePath}?action=add_meal`,
              icons: [{ src: 'pwa-icon.svg', sizes: 'any' }]
            }
          ]
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
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
