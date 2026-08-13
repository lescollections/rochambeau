<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { t } from '@/lib/i18n'
import LocaleSelect from '@/components/LocaleSelect.vue'

const { info } = useCollection()
const route = useRoute()
</script>

<template>
  <!--
    A 270px banner cannot stay pinned while scrolling without eating the
    viewport, so the header scrolls away with the page.
  -->
  <header class="header-gradient h-[270px] text-white">
    <div class="flex h-full flex-col px-4 py-6 sm:px-6">
      <div class="flex justify-end">
        <LocaleSelect />
      </div>

      <!-- Coming back from a record keeps the search term the visitor typed. -->
      <RouterLink
        :to="{ name: 'home', query: route.query.q ? { q: route.query.q } : undefined }"
        class="flex min-h-0 flex-1 flex-col justify-center rounded-sm"
      >
        <h1 class="font-serif text-3xl leading-tight text-balance sm:text-4xl md:text-5xl">
          {{ info?.titre ?? t('app.title') }}
        </h1>
        <p v-if="info?.description" class="mt-3 max-w-3xl text-white/70">
          {{ info.description }}
        </p>
      </RouterLink>
    </div>
  </header>
</template>
