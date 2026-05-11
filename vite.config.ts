import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.png', 'icons.svg', 'decks/**/*.json'],
      manifest: {
        name: 'Elephant',
        short_name: 'Elephant',
        description: 'Flip cards with spaced repetition',
        theme_color: '#5b2dff',
        background_color: '#0b2239',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.png',
            sizes: '158x158',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon.png',
            sizes: '158x158',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,json,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
