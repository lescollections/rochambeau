<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCollection } from '@/composables/collection'
import { rechercher } from '@/lib/recherche'
import { formaterNombre, t } from '@/lib/i18n'
import BarreRecherche from '@/components/BarreRecherche.vue'
import CarteObjet from '@/components/CarteObjet.vue'

const route = useRoute()
const router = useRouter()
const { objets, champs, total } = useCollection()

/**
 * La recherche vit dans l'URL : un résultat se partage et se retrouve dans
 * l'historique. L'écriture y est différée pour ne pas empiler une entrée
 * d'historique par caractère frappé.
 */
const requete = ref(typeof route.query.q === 'string' ? route.query.q : '')
let report: ReturnType<typeof setTimeout> | undefined

watch(requete, (valeur) => {
  clearTimeout(report)
  report = setTimeout(() => {
    const actuelle = typeof route.query.q === 'string' ? route.query.q : ''
    if (actuelle === valeur) return
    void router.replace({ query: valeur ? { ...route.query, q: valeur } : omettreQ() })
  }, 250)
})

// Retour arrière du navigateur, ou lien entrant : l'URL réimpose son terme.
watch(
  () => route.query.q,
  (valeur) => {
    const depuisUrl = typeof valeur === 'string' ? valeur : ''
    if (depuisUrl !== requete.value) requete.value = depuisUrl
  },
)

onUnmounted(() => clearTimeout(report))

function omettreQ() {
  const { q: _ignore, ...reste } = route.query
  return reste
}

const resultats = computed(() => rechercher(objets.value, requete.value))

/** Le premier champ marqué comme facette sert de légende sous les vignettes. */
const champLegende = computed(() => champs.value.find((champ) => champ.facette)?.code)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <BarreRecherche v-model="requete" />

    <p class="mt-4 text-sm text-stone-500 dark:text-stone-400" aria-live="polite">
      {{ t('liste.resultats', { n: resultats.length }) }}
      <template v-if="requete">
        {{ t('liste.sur_total', { total: formaterNombre(total) }) }}
      </template>
    </p>

    <div v-if="resultats.length === 0" class="py-20 text-center">
      <p class="font-serif text-lg">{{ t('recherche.aucun') }}</p>
      <p class="mt-2 text-sm text-stone-500 dark:text-stone-400">
        {{ t('recherche.aucun_conseil') }}
      </p>
    </div>

    <ul
      v-else
      class="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <li v-for="objet in resultats" :key="objet.id">
        <CarteObjet :objet="objet" :requete="requete" :champ-legende="champLegende" />
      </li>
    </ul>
  </div>
</template>
