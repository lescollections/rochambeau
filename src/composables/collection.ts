import { computed, readonly, ref, shallowRef } from 'vue'
import type { Champ, Manifeste, ObjetIndexe } from '@/types'
import { chargerManifeste, chargerObjets } from '@/lib/chargement'
import { proposerLangue } from '@/lib/i18n'

/**
 * État global de la vitrine. Une instance = une collection, chargée une fois,
 * conservée en mémoire : pas de magasin d'état à installer pour une donnée
 * en lecture seule dont la seule mutation est « chargée / pas chargée ».
 */

export type Statut = 'inactif' | 'manifeste' | 'objets' | 'pret' | 'erreur'

const statut = ref<Statut>('inactif')
const manifeste = shallowRef<Manifeste | null>(null)
// `shallowRef` : la liste ne change que par remplacement, et rendre 2 500 objets
// profondément réactifs coûterait cher pour rien.
const objets = shallowRef<readonly ObjetIndexe[]>([])
const recus = ref(0)
const erreur = ref<Error | null>(null)

let chargementEnCours: Promise<void> | null = null

/** Index id → objet, pour l'accès direct depuis une URL de fiche. */
const parIdentifiant = computed(() => {
  const index = new Map<string, ObjetIndexe>()
  for (const objet of objets.value) index.set(objet.id, objet)
  return index
})

export function useCollection() {
  return {
    statut: readonly(statut),
    manifeste,
    objets,
    recus: readonly(recus),
    erreur: readonly(erreur),

    total: computed(() => manifeste.value?.collection.nb_objets ?? 0),
    infos: computed(() => manifeste.value?.collection ?? null),
    champs: computed<Champ[]>(() => manifeste.value?.champs ?? []),
    pret: computed(() => statut.value === 'pret'),

    objetParIdentifiant: (id: string): ObjetIndexe | undefined => parIdentifiant.value.get(id),
    voisins: (id: string) => {
      const liste = objets.value
      const position = liste.findIndex((objet) => objet.id === id)
      if (position === -1) return { position: -1, precedent: undefined, suivant: undefined }
      return {
        position,
        precedent: position > 0 ? liste[position - 1] : undefined,
        suivant: position < liste.length - 1 ? liste[position + 1] : undefined,
      }
    },

    charger,
  }
}

/** Charge manifeste puis objets. Les appels concurrents partagent le même chargement. */
export function charger(forcer = false): Promise<void> {
  if (chargementEnCours && !forcer) return chargementEnCours
  if (statut.value === 'pret' && !forcer) return Promise.resolve()

  chargementEnCours = (async () => {
    statut.value = 'manifeste'
    erreur.value = null
    recus.value = 0

    try {
      const charge = await chargerManifeste()
      manifeste.value = charge
      proposerLangue(charge.collection.langue)

      statut.value = 'objets'
      const liste = await chargerObjets(charge.objets, {
        surLot: (_lot, totalRecus) => {
          recus.value = totalRecus
        },
      })

      objets.value = Object.freeze(liste)
      recus.value = liste.length
      statut.value = 'pret'
    } catch (cause) {
      erreur.value = cause instanceof Error ? cause : new Error(String(cause))
      statut.value = 'erreur'
    } finally {
      chargementEnCours = null
    }
  })()

  return chargementEnCours
}
