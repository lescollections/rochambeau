import { computed, readonly, ref, shallowRef } from 'vue'
import type { Field, IndexedObject, Manifest } from '@/types'
import { loadManifest, loadObjects } from '@/lib/loader'
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

      objects.value = Object.freeze(list)
      received.value = list.length
      status.value = 'ready'
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
