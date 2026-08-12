<script setup lang="ts">
import { definirLangue, langue, LANGUES, t, type Langue } from '@/lib/i18n'

function choisir(evenement: Event) {
  const cible = evenement.target as HTMLSelectElement
  definirLangue(cible.value as Langue)
}
</script>

<template>
  <label class="shrink-0 text-sm">
    <span class="sr-only">{{ t('langue.libelle') }}</span>
    <select
      :value="langue"
      class="cursor-pointer rounded-md border border-stone-300 bg-transparent px-2 py-1 text-sm dark:border-stone-700"
      @change="choisir"
    >
      <option v-for="code in LANGUES" :key="code" :value="code">
        {{ t(`langue.${code}`) }}
      </option>
    </select>
  </label>
</template>
