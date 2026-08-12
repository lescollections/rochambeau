<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useCollection } from '@/composables/collection'
import { t } from '@/lib/i18n'
import SelecteurLangue from '@/components/SelecteurLangue.vue'

const { infos } = useCollection()
const route = useRoute()
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/90 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/90"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
      <RouterLink
        :to="{ name: 'accueil', query: route.name === 'accueil' ? route.query : undefined }"
        class="min-w-0 flex-1 rounded-sm"
      >
        <p class="truncate font-serif text-lg leading-tight sm:text-xl">
          {{ infos?.titre ?? t('app.titre') }}
        </p>
        <p
          v-if="infos?.description"
          class="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400"
        >
          {{ infos.description }}
        </p>
      </RouterLink>

      <SelecteurLangue />
    </div>
  </header>
</template>
