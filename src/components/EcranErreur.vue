<script setup lang="ts">
import { charger, useCollection } from '@/composables/collection'
import { t } from '@/lib/i18n'

const { erreur } = useCollection()
</script>

<template>
  <div class="mx-auto max-w-md px-6 py-24 text-center">
    <h1 class="font-serif text-xl">{{ t('erreur.titre') }}</h1>

    <p v-if="erreur" class="mt-4 text-sm text-stone-500 dark:text-stone-400">
      {{ t('erreur.detail') }}
      <span class="font-mono">{{ erreur.message }}</span>
    </p>

    <button
      type="button"
      class="mt-6 rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-900"
      @click="charger(true)"
    >
      {{ t('erreur.reessayer') }}
    </button>
  </div>
</template>
