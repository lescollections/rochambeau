<script setup lang="ts">
import type { Facet, Selection } from '@/lib/facets'
import { t } from '@/lib/i18n'
import FacetCombobox from '@/components/FacetCombobox.vue'

defineProps<{
  facets: Facet[]
  selection: Selection
}>()

const emit = defineEmits<{
  toggle: [code: string, value: string]
}>()
</script>

<template>
  <!--
    Each filter takes the width of its own values: a short vocabulary leaves
    room for the next one on the same line.
  -->
  <div
    v-if="facets.length"
    role="group"
    :aria-label="t('filters.label')"
    class="mt-3 flex flex-wrap items-start gap-3"
  >
    <FacetCombobox
      v-for="facet in facets"
      :key="facet.code"
      :facet="facet"
      :selected="selection[facet.code] ?? []"
      @toggle="emit('toggle', facet.code, $event)"
    />
  </div>
</template>
