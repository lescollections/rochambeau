<script setup lang="ts">
import { locale, LOCALES, setLocale, t, type Locale } from '@/lib/i18n'

function onChange(event: Event) {
  const target = event.target as HTMLSelectElement
  setLocale(target.value as Locale)
}
</script>

<template>
  <label class="shrink-0 text-sm">
    <span class="sr-only">{{ t('locale.label') }}</span>
    <select
      :value="locale"
      class="cursor-pointer rounded-md border border-stone-300 bg-transparent px-2 py-1 text-sm dark:border-stone-700"
      @change="onChange"
    >
      <option v-for="code in LOCALES" :key="code" :value="code">
        {{ t(`locale.${code}`) }}
      </option>
    </select>
  </label>
</template>
