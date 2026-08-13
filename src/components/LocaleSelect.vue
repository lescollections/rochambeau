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
      class="cursor-pointer rounded-md border border-white/40 bg-transparent px-2 py-1 text-sm text-white"
      @change="onChange"
    >
      <!-- Options are drawn by the OS: they need their own readable colours. -->
      <option v-for="code in LOCALES" :key="code" :value="code" class="bg-white text-stone-900">
        {{ t(`locale.${code}`) }}
      </option>
    </select>
  </label>
</template>
