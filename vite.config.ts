import { fileURLToPath, URL } from 'node:url'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * In production the showcase is deployed next to its data: the app and
 * collection.json / objets.ndjson share the directory served by Apache.
 * In development the demo data lives in example/, and this plugin exposes it at
 * the dev server root so paths are identical on both sides — no copy needed.
 *
 * Another set can be served from a subdirectory of example/:
 *   DEMO=cleveland npm run dev
 */
const DEMO_FILES = ['collection.json', 'objets.ndjson', 'objets.csv', 'objets.xlsx']

/**
 * The version of package.json, which a pre-commit hook raises on every commit.
 * Freezing it into the bundle is what makes a version bump reach the visitor:
 * the precached files change, the service worker sees a new build, and the
 * update banner offers it.
 */
const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
)

const DEMO_DIR = process.env.DEMO ? `example/${process.env.DEMO}` : 'example'

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

        const file = fileURLToPath(new URL(`./${DEMO_DIR}/${name}`, import.meta.url))
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
  define: { __APP_VERSION__: JSON.stringify(version) },
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
        // ⚠️ `/gestion` DOIT ÊTRE EXCLU, et ce n'est pas une précaution théorique.
        // La vitrine et l'atelier de catalogage partagent le MÊME hôte
        // (`<slug>.lescollections.fr` : la racine sert la vitrine, `/gestion` sert
        // Providence). Sans cette exclusion, le service worker — dont la portée est
        // l'origine entière — répond à toute navigation par la coquille de la SPA, y
        // compris vers `/gestion`. L'abonné qui clique « gérer ma collection » obtient
        // alors « Cette œuvre est introuvable », depuis le cache, sans jamais atteindre
        // son atelier. Constaté en production le 2026-08-15 sur exemple-toulouse.
        //
        // Un vidage de cache masque le symptôme et ne corrige rien : le service worker se
        // réinstalle à la visite suivante de la vitrine.
        navigateFallbackDenylist: [/\.(?:json|ndjson|csv|xlsx)$/, /^\/gestion(\/|$)/],
        runtimeCaching: [
          {
            // Manifeste et objets : le RÉSEAU D'ABORD, le cache seulement en secours.
            //
            // C'était l'inverse — StaleWhileRevalidate, expiration à 30 jours — et
            // c'est ce qui a brisé les images d'exemple-toulouse. Constaté en
            // production le 2026-08-27 : le locataire avait été détruit puis
            // republié la veille au soir, ses identifiants de représentation étaient
            // passés de `70-…` à `72-…`, et le navigateur servait une liste de la
            // veille qui désignait des clés supprimées. Le serveur, lui, répondait
            // juste (douze images tirées au hasard, douze fois 200 ; collection.json
            // et objets.ndjson en `no-cache, must-revalidate`) : c'est la liste en
            // cache qui mentait. Règle qui en découle — **une liste ne peut pas être
            // plus vieille que ce qu'elle référence** : les images expirent en un
            // jour (voir la règle suivante), la liste ne pouvait pas en tenir trente.
            //
            // Pourquoi NetworkFirst plutôt qu'une expiration plus courte : deux
            // fichiers petits (2 Ko + 181 Ko sur exemple-toulouse), critiques —
            // toute la vitrine en dépend — et demandés une seule fois par visite. Un
            // aller-retour réseau est le prix juste pour ne jamais afficher un
            // catalogue périmé, alors qu'une expiration, même courte, laisse toujours
            // une fenêtre où la republication n'est pas vue.
            // `networkTimeoutSeconds: 3` borne le « lie-fi » : passé trois secondes
            // sans réponse, la copie en cache est servie et la requête réseau se
            // poursuit — elle rafraîchit le cache pour la visite suivante.
            //
            // ⚠️ Le hors-ligne n'est pas perdu, c'est la seconde moitié de la
            // stratégie : réseau injoignable ⇒ le `fetch` échoue tout de suite ⇒
            // repli sur la copie en cache, et la vitrine déjà visitée s'affiche. La
            // coquille et les actifs, eux, restent précachés (`globPatterns`).
            // L'expiration reste à 30 jours mais elle change de rôle : elle ne
            // gouverne plus la fraîcheur (le réseau s'en charge), elle ne dit plus
            // que combien de temps une vitrine déjà visitée reste consultable sans
            // réseau. La raccourcir n'améliorerait rien et amputerait le hors-ligne.
            urlPattern: ({ url }: { url: URL }) => /\.(?:json|ndjson)$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rochambeau-data',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images sont servies par le proxy (<slug>.lescollections.fr/media/…) avec
            // Cache-Control: max-age=86400 : une dépublication doit disparaître sous 24 h.
            // StaleWhileRevalidate sert le cache immédiatement puis revalide en tâche de
            // fond, et l'expiration à 1 jour aligne le service worker sur le proxy — au
            // lieu des 60 jours de CacheFirst qui auraient gardé une image dépubliée.
            urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rochambeau-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 },
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
