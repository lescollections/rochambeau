<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ObjetIndexe } from '@/types'
import { aplatir } from '@/lib/texte'
import { t } from '@/lib/i18n'
import TexteSurligne from '@/components/TexteSurligne.vue'

const props = defineProps<{
  objet: ObjetIndexe
  requete?: string
  /** Code du champ affiché en légende sous le titre (premier champ facette du schéma). */
  champLegende?: string
}>()

const legende = computed(() => {
  if (!props.champLegende) return ''
  return aplatir(props.objet.champs[props.champLegende])
})
</script>

<template>
  <RouterLink
    :to="{ name: 'objet', params: { id: objet.id }, query: requete ? { q: requete } : undefined }"
    class="group flex flex-col rounded-lg focus-visible:outline-offset-4"
  >
    <div
      class="relative overflow-hidden rounded-md bg-stone-200/60 dark:bg-stone-800/60"
      style="aspect-ratio: 4 / 5"
    >
      <img
        v-if="objet.couverture"
        :src="objet.couverture.apercu"
        :alt="objet.couverture.legende ?? objet.titre"
        :width="objet.couverture.l"
        :height="objet.couverture.h"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        v-else
        class="absolute inset-0 flex items-center justify-center text-xs text-stone-400 dark:text-stone-500"
      >
        {{ t('liste.sans_image') }}
      </span>
    </div>

    <p class="mt-2 font-serif leading-snug group-hover:underline">
      <TexteSurligne :texte="objet.titre" :requete="requete" />
    </p>
    <p v-if="legende" class="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
      <TexteSurligne :texte="legende" :requete="requete" />
    </p>
  </RouterLink>
</template>
