<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/lib/i18n'

const model = defineModel<string>({ required: true })

// The input keeps its own value and is synced both ways: typing must not depend
// on the round-trip through the URL, which is deliberately debounced.
const draft = ref(model.value)
watch(model, (value) => {
  if (value !== draft.value) draft.value = value
})

const field = ref<HTMLInputElement | null>(null)

function clear() {
  draft.value = ''
  model.value = ''
  field.value?.focus()
}
</script>

<template>
  <div class="relative">
    <label class="sr-only" for="search">{{ t('search.label') }}</label>
    <input
      id="search"
      ref="field"
      v-model="draft"
      type="search"
      autocomplete="off"
      spellcheck="false"
      :placeholder="t('search.placeholder')"
      class="w-full rounded-lg border border-stone-300 bg-white py-2.5 pr-10 pl-4 text-base placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-500"
      @input="model = draft"
    />

    <button
      v-if="draft"
      type="button"
      class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      :aria-label="t('search.clear')"
      @click="clear"
    >
      <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
