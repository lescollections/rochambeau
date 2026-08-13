import { fileURLToPath, URL } from 'node:url'
import { createReadStream, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * In production the showcase is deployed next to its data: the app and
 * collection.json / objets.ndjson share the directory served by Apache.
 * In development the demo data lives in example/, and this plugin exposes it at
 * the dev server root so paths are identical on both sides — no copy, no extra
 * environment variable.
 */
const DEMO_FILES = ['collection.json', 'objets.ndjson', 'objets.csv', 'objets.xlsx']

const MIME_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.ndjson': 'application/x-ndjson; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

type DevMiddleware = (
  request: { url?: string },
  response: { setHeader: (name: string, value: string) => void },
  next: () => void,
) => void

function serveDemoData() {
  return {
    name: 'rochambeau:demo-data',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (handler: DevMiddleware) => void } }) {
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0] ?? ''
        const name = path.replace(/^\//, '')
        if (!DEMO_FILES.includes(name)) return next()

        const file = fileURLToPath(new URL(`./example/${name}`, import.meta.url))
        if (!existsSync(file)) return next()

        const extension = name.slice(name.lastIndexOf('.'))
        response.setHeader('Content-Type', MIME_TYPES[extension] ?? 'application/octet-stream')
        createReadStream(file).pipe(response as unknown as NodeJS.WritableStream)
      })
    },
  }
}

export default defineConfig({
  // Set VITE_BASE at build time for a subdirectory deployment:
  //   VITE_BASE=/vitrines/augustins/ npm run build
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    vue(),
    tailwindcss(),
    serveDemoData(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'Rochambeau — collection showcase',
        short_name: 'Rochambeau',
        description: 'Public showcase of a collection',
        lang: 'fr',
        theme_color: '#0e086e',
        background_color: '#faf7f1',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/\.(?:json|ndjson|csv|xlsx)$/],
        runtimeCaching: [
          {
            // Manifest and objects: served from cache, refreshed in the background.
            urlPattern: ({ url }: { url: URL }) => /\.(?:json|ndjson)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rochambeau-data',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images are hosted elsewhere: keep them as the visitor browses.
            urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'rochambeau-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
