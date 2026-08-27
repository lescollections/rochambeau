import type { IndexedObject } from '@/types'

/**
 * Alignement du cache d'images sur la collection réellement publiée.
 *
 * Une vitrine peut être **détruite puis republiée** : les identifiants de
 * représentation changent, et avec eux les clés d'images
 * (`/media/<slug>/72-0f474a6b-large.jpg` remplace `…/70-….jpg`). Le service
 * worker garde alors, jusqu'à un jour, des entrées qui ne seront plus jamais
 * demandées : elles occupent la place — le cache est borné à 600 entrées, et
 * l'éviction LRU sacrifierait des images vivantes pour des mortes.
 *
 * Le format porte déjà le levier : `genere_le` dans collection.json change à
 * chaque republication. On le mémorise, et **on ne fait rien tant qu'il ne
 * bouge pas** — purger à chaque chargement reviendrait à retélécharger la
 * collection entière pour rien.
 *
 * Quand il bouge, on ne vide pas le cache pour autant : on en **retire les
 * seules entrées que la nouvelle liste ne référence plus**. Une image dont la
 * clé n'a pas changé reste en cache et n'est pas retéléchargée.
 */

/** DOIT rester identique au `cacheName` de la règle « images » de vite.config.ts. */
const IMAGE_CACHE = 'rochambeau-images'

/**
 * La clé porte la base de déploiement : deux vitrines peuvent partager une
 * origine (`VITE_BASE=/vitrines/augustins/`), donc le même localStorage.
 */
const STAMP_KEY = `rochambeau:genere_le:${import.meta.env.BASE_URL}`

function readStamp(): string | null {
  // Navigation privée, stockage bloqué : l'accès lui-même peut lever.
  try {
    return localStorage.getItem(STAMP_KEY)
  } catch {
    return null
  }
}

function writeStamp(value: string): void {
  try {
    localStorage.setItem(STAMP_KEY, value)
  } catch {
    // Sans mémoire, la comparaison est simplement toujours « différent » : on
    // élague une fois par chargement, ce qui reste sans effet sur le réseau
    // puisque l'élagage ne retire que des entrées devenues inutiles.
  }
}

/** Les trois dérivés (`apercu`, `moyen`, `plein`) de chaque image, en URL absolue. */
function referencedUrls(objects: readonly IndexedObject[]): Set<string> {
  const urls = new Set<string>()
  for (const object of objects) {
    for (const picture of object.images) {
      for (const candidate of [picture.apercu, picture.moyen, picture.plein]) {
        if (candidate) urls.add(new URL(candidate, location.href).href)
      }
    }
  }
  return urls
}

/**
 * Répertoires d'où viennent les images de CETTE collection (`…/media/<slug>/`).
 * L'élagage s'y limite : sur une origine qui héberge plusieurs vitrines, les
 * images des voisines ne sont référencées par aucune de nos listes et seraient
 * sinon supprimées à chacune de nos republications.
 */
function mediaPrefixes(urls: Set<string>): string[] {
  const prefixes = new Set<string>()
  for (const url of urls) prefixes.add(url.slice(0, url.lastIndexOf('/') + 1))
  return [...prefixes]
}

/**
 * À appeler une fois la collection chargée. Ne bloque rien : le résultat n'est
 * qu'un compte d'entrées retirées, utile en console.
 *
 * @returns le nombre d'entrées retirées du cache d'images.
 */
export async function syncImageCache(
  generatedAt: string | undefined,
  objects: readonly IndexedObject[],
): Promise<number> {
  // Un manifeste sans `genere_le` (le champ est optionnel dans le format) ne
  // permet aucune comparaison : ne rien purger vaut mieux que purger à l'aveugle.
  if (!generatedAt) return 0
  if (readStamp() === generatedAt) return 0

  let removed = 0
  // `caches` manque hors contexte sécurisé (http://…) : il n'y a alors pas de
  // service worker, donc pas de cache d'images à aligner.
  if (typeof caches !== 'undefined' && objects.length > 0) {
    const referenced = referencedUrls(objects)
    const prefixes = mediaPrefixes(referenced)
    const cache = await caches.open(IMAGE_CACHE)

    for (const request of await cache.keys()) {
      const url = request.url
      if (referenced.has(url)) continue
      if (!prefixes.some((prefix) => url.startsWith(prefix))) continue
      if (await cache.delete(request)) removed += 1
    }
  }

  writeStamp(generatedAt)
  if (removed > 0) {
    console.info(`Rochambeau: collection republiée, ${removed} image(s) périmée(s) retirée(s)`)
  }
  return removed
}
