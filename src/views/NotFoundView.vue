<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { t } from '@/lib/i18n'
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-24 text-center">
    <p class="font-serif text-lg">{{ t('object.not_found') }}</p>
    <RouterLink
      :to="{ name: 'home' }"
      class="mt-6 inline-block rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
    >
      {{ t('app.back_to_collection') }}
    </RouterLink>
  </div>
</template>
