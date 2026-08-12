<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { IndexedObject } from '@/types'
import { flatten } from '@/lib/text'
import { t } from '@/lib/i18n'
import HighlightedText from '@/components/HighlightedText.vue'

const props = defineProps<{
  object: IndexedObject
  query?: string
  /** Code of the field shown under the title (first facet field of the schema). */
  captionField?: string
}>()

const caption = computed(() => {
  if (!props.captionField) return ''
  return flatten(props.object.champs[props.captionField])
})
</script>

<template>
  <RouterLink
    :to="{ name: 'object', params: { id: object.id }, query: query ? { q: query } : undefined }"
    class="group flex flex-col rounded-lg focus-visible:outline-offset-4"
  >
    <div
      class="relative overflow-hidden rounded-md bg-stone-200/60 dark:bg-stone-800/60"
      style="aspect-ratio: 4 / 5"
    >
      <img
        v-if="object.cover"
        :src="object.cover.apercu"
        :alt="object.cover.legende ?? object.titre"
        :width="object.cover.l"
        :height="object.cover.h"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        v-else
        class="absolute inset-0 flex items-center justify-center text-xs text-stone-400 dark:text-stone-500"
      >
        {{ t('list.no_image') }}
      </span>
    </div>

    <p class="mt-2 font-serif leading-snug group-hover:underline">
      <HighlightedText :text="object.titre" :query="query" />
    </p>
    <p v-if="caption" class="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
      <HighlightedText :text="caption" :query="query" />
    </p>
  </RouterLink>
</template>
