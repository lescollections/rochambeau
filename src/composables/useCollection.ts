import { computed, readonly, ref, shallowRef } from 'vue'
import type { Field, IndexedObject, Manifest } from '@/types'
import { loadManifest, loadObjects } from '@/lib/loader'
import { syncImageCache } from '@/lib/imageCache'
import { shuffle } from '@/lib/shuffle'
import { suggestLocale } from '@/lib/i18n'

/**
 * Global state of the showcase. One instance serves one collection, loaded once
 * and kept in memory: no state library is warranted for read-only data whose
 * only mutation is "loaded / not loaded".
 */

export type Status = 'idle' | 'manifest' | 'objects' | 'ready' | 'error'

const status = ref<Status>('idle')
const manifest = shallowRef<Manifest | null>(null)
// shallowRef: the list only ever changes by replacement, and making 2,500 objects
// deeply reactive would cost a lot for nothing.
const objects = shallowRef<readonly IndexedObject[]>([])
const received = ref(0)
const error = ref<Error | null>(null)

let pending: Promise<void> | null = null

/** id → object index, for direct access from a record URL. */
const byIdentifier = computed(() => {
  const index = new Map<string, IndexedObject>()
  for (const object of objects.value) index.set(object.id, object)
  return index
})

/** Loads the manifest then the objects. Concurrent calls share the same load. */
export function load(force = false): Promise<void> {
  if (pending && !force) return pending
  if (status.value === 'ready' && !force) return Promise.resolve()

  pending = (async () => {
    status.value = 'manifest'
    error.value = null
    received.value = 0

    try {
      const loaded = await loadManifest()
      manifest.value = loaded
      suggestLocale(loaded.collection.langue)

      status.value = 'objects'
      const list = await loadObjects(loaded.objets, {
        onBatch: (_batch, totalReceived) => {
          received.value = totalReceived
        },
      })

      // Display order is drawn at random, so the same collection is discovered
      // differently on each visit. `rank` still carries the catalogue order.
      objects.value = Object.freeze(shuffle(list))
      received.value = list.length
      status.value = 'ready'

      // Une republication change les clés d'images : les entrées que cette
      // liste ne référence plus sont retirées du cache du service worker.
      // Hors du chemin critique — la vitrine est déjà affichée — et sans effet
      // tant que `genere_le` n'a pas bougé.
      void syncImageCache(loaded.genere_le, objects.value).catch((cause) => {
        console.warn('Rochambeau: alignement du cache d\'images impossible', cause)
      })
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause))
      status.value = 'error'
    } finally {
      pending = null
    }
  })()

  return pending
}

export function useCollection() {
  return {
    status: readonly(status),
    manifest,
    objects,
    received: readonly(received),
    error: readonly(error),

    total: computed(() => manifest.value?.collection.nb_objets ?? 0),
    info: computed(() => manifest.value?.collection ?? null),
    fields: computed<Field[]>(() => manifest.value?.champs ?? []),
    isReady: computed(() => status.value === 'ready'),

    objectById: (id: string): IndexedObject | undefined => byIdentifier.value.get(id),
    neighbours: (id: string) => {
      const list = objects.value
      const position = list.findIndex((object) => object.id === id)
      if (position === -1) return { position: -1, previous: undefined, next: undefined }
      return {
        position,
        previous: position > 0 ? list[position - 1] : undefined,
        next: position < list.length - 1 ? list[position + 1] : undefined,
      }
    },

    load,
  }
}
