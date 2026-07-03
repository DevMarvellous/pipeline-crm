/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Pipeline',
        short_name: 'Pipeline',
        description: 'Personal deal pipeline and lead tracker',
        theme_color: '#0f1012',
        background_color: '#0f1012',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/today',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Add Lead',
            short_name: 'Add',
            url: '/add',
            icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }],
          },
          {
            name: 'Today',
            short_name: 'Today',
            url: '/today',
            icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
        importScripts: ['sw-notifications.js'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
