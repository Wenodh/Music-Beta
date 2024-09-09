import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name: 'Music Beta',
        short_name: 'music-beat',
        description: 'Jio Saavn clone',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'android/android-launchericon-192-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android/android-launchericon-512-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10, // Cache up to 10 HTML files
                maxAgeSeconds: 60 * 60 * 24, // Cache for 1 day
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 50, // Cache up to 50 assets (JS/CSS)
                maxAgeSeconds: 60 * 60 * 24 * 30, // Cache for 30 days
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100, // Cache up to 100 images
                maxAgeSeconds: 60 * 60 * 24 * 365, // Cache for 1 year
              },
              cacheableResponse: {
                statuses: [0, 200], // Cache valid responses
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20, // Cache up to 20 fonts
                maxAgeSeconds: 60 * 60 * 24 * 365, // Cache for 1 year
              },
            },
          },
        ],
        navigateFallback: '/index.html', // Fallback to index.html for navigation
        skipWaiting: true, // Ensure the new service worker takes control immediately
        clientsClaim: true, // Ensure the service worker takes control of all clients
      },
    }),
  ],
});
