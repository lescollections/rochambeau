<script setup lang="ts">
import { load, useCollection } from '@/composables/useCollection'
import { t } from '@/lib/i18n'

const { error } = useCollection()
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-24 text-center">
    <h1 class="font-serif text-xl">{{ t('error.title') }}</h1>

    <p v-if="error" class="mt-4 text-sm text-stone-500 dark:text-stone-400">
      {{ t('error.detail') }}
      <span class="font-mono">{{ error.message }}</span>
    </p>

    <button
      type="button"
      class="mt-6 rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
      @click="load(true)"
    >
      {{ t('error.retry') }}
    </button>
  </div>
</template>
