<script setup lang="ts">
import { computed } from 'vue'
import { useCollection } from '@/composables/collection'
import { formaterNombre, t } from '@/lib/i18n'

const { statut, recus, total } = useCollection()

const pourcentage = computed(() => {
  if (total.value <= 0) return null
  return Math.min(100, Math.round((recus.value / total.value) * 100))
})
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
    <p class="font-serif text-xl">
      {{ statut === 'manifeste' ? t('chargement.manifeste') : t('chargement.objets') }}
    </p>

    <div
      class="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
      role="progressbar"
      :aria-valuenow="pourcentage ?? undefined"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('chargement.objets')"
    >
      <!-- Sans total connu, une barre indéterminée plutôt qu'une fausse progression. -->
      <div
        v-if="pourcentage !== null"
        class="h-full bg-stone-800 transition-[width] duration-200 dark:bg-stone-200"
        :style="{ width: `${pourcentage}%` }"
      />
      <div v-else class="h-full w-1/3 animate-pulse bg-stone-400 dark:bg-stone-600" />
    </div>

    <p v-if="total > 0" class="text-sm tabular-nums text-stone-500 dark:text-stone-400">
      {{ t('chargement.compte', { recus: formaterNombre(recus), total: formaterNombre(total) }) }}
    </p>
  </div>
</template>
