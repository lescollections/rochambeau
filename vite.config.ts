import { fileURLToPath, URL } from 'node:url'
import { createReadStream, existsSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * En production, la vitrine est déposée à côté de ses données : l'app et
 * `collection.json` / `objets.ndjson` partagent le même répertoire servi par Apache.
 * En développement, les données de démonstration vivent dans `example/` ; ce plugin
 * les expose à la racine du serveur de dev pour que les chemins soient identiques
 * des deux côtés — aucune copie, aucune variable d'environnement supplémentaire.
 */
const DONNEES_DEMO = ['collection.json', 'objets.ndjson', 'objets.csv', 'objets.xlsx']

const TYPES_MIME: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.ndjson': 'application/x-ndjson; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function donneesExemple() {
  return {
    name: 'rochambeau:donnees-exemple',
    apply: 'serve' as const,
    configureServer(serveur: { middlewares: { use: (fn: MiddlewareDev) => void } }) {
      serveur.middlewares.use((req, res, next) => {
        const chemin = (req.url ?? '').split('?')[0] ?? ''
        const nom = chemin.replace(/^\//, '')
        if (!DONNEES_DEMO.includes(nom)) return next()

        const fichier = fileURLToPath(new URL(`./example/${nom}`, import.meta.url))
        if (!existsSync(fichier)) return next()

        const extension = nom.slice(nom.lastIndexOf('.'))
        res.setHeader('Content-Type', TYPES_MIME[extension] ?? 'application/octet-stream')
        createReadStream(fichier).pipe(res)
      })
    },
  }
}

type MiddlewareDev = (
  req: { url?: string },
  res: { setHeader: (nom: string, valeur: string) => void },
  next: () => void,
) => void

export default defineConfig({
  // Renseigner VITE_BASE au build pour un déploiement en sous-répertoire :
  //   VITE_BASE=/vitrines/augustins/ npm run build
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    vue(),
    tailwindcss(),
    donneesExemple(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Rochambeau — vitrine de collection',
        short_name: 'Rochambeau',
        description: 'Vitrine publique de collection',
        lang: 'fr',
        theme_color: '#1c1917',
        background_color: '#fafaf9',
        display: 'standalone',
        icons: [
          { src: 'icons/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icone-512-masquable.png',
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
            // Le manifeste et les objets : servis depuis le cache, rafraîchis en tâche de fond.
            urlPattern: ({ url }: { url: URL }) => /\.(?:json|ndjson)$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rochambeau-donnees',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Les images sont hébergées ailleurs : on les garde au fil de la consultation.
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
