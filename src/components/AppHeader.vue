<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { t } from '@/lib/i18n'
import LocaleSelect from '@/components/LocaleSelect.vue'

const { info } = useCollection()
const route = useRoute()
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/90 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/90"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
      <!-- Coming back from a record keeps the search term the visitor typed. -->
      <RouterLink
        :to="{ name: 'home', query: route.query.q ? { q: route.query.q } : undefined }"
        class="min-w-0 flex-1 rounded-sm"
      >
        <p class="truncate font-serif text-lg leading-tight sm:text-xl">
          {{ info?.titre ?? t('app.title') }}
        </p>
        <p v-if="info?.description" class="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">
          {{ info.description }}
        </p>
      </RouterLink>

      <LocaleSelect />
    </div>
  </header>
</template>
