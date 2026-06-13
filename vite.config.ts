/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-redux': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
                    'vendor-framer': ['framer-motion'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                    'vendor-utils': ['axios', 'lodash', 'colorthief'],
                }
            }
        },
        chunkSizeWarningLimit: 600,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'favicon.png',
                'apple-touch-icon.png',
            ],
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/jiosaavn-api-cyan-theta\.vercel\.app\/api\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 // 24 hours
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/(www\.)?jiosaavn\.com\/.*\.jpg/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                            }
                        }
                    }
                ]
            },
            manifest: {
                name: 'VibeOn',
                short_name: 'VibeOn',
                description: 'A modern music streaming app with Glassmorphism UI',
                theme_color: '#ef4444',
                background_color: '#ffffff',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                orientation: 'portrait',
                icons: [
                    {
                        src: '/android/android-launchericon-48-48.png',
                        sizes: '48x48',
                        type: 'image/png'
                    },
                    {
                        src: '/android/android-launchericon-72-72.png',
                        sizes: '72x72',
                        type: 'image/png'
                    },
                    {
                        src: '/android/android-launchericon-96-96.png',
                        sizes: '96x96',
                        type: 'image/png'
                    },
                    {
                        src: '/android/android-launchericon-144-144.png',
                        sizes: '144x144',
                        type: 'image/png'
                    },
                    {
                        src: '/android/android-launchericon-192-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/android/android-launchericon-512-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                ],
            },
        }),
    ],
});
