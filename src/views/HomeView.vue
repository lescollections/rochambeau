<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { search } from '@/lib/search'
import { formatNumber, t } from '@/lib/i18n'
import SearchBar from '@/components/SearchBar.vue'
import ObjectCard from '@/components/ObjectCard.vue'

const route = useRoute()
const router = useRouter()
const { objects, fields, total } = useCollection()

/**
 * The query lives in the URL, so a result can be shared and found again in
 * history. Writing to it is debounced so we do not push one history entry per
 * keystroke.
 */
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
let debounce: ReturnType<typeof setTimeout> | undefined

watch(query, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    const current = typeof route.query.q === 'string' ? route.query.q : ''
    if (current === value) return
    void router.replace({ query: value ? { ...route.query, q: value } : withoutQuery() })
  }, 250)
})

// Browser back, or an incoming link: the URL wins over the local value.
watch(
  () => route.query.q,
  (value) => {
    const fromUrl = typeof value === 'string' ? value : ''
    if (fromUrl !== query.value) query.value = fromUrl
  },
)

onUnmounted(() => clearTimeout(debounce))

function withoutQuery() {
  const { q: _omitted, ...rest } = route.query
  return rest
}

const results = computed(() => search(objects.value, query.value))

/** The first field flagged as a facet doubles as the caption under thumbnails. */
const captionField = computed(() => fields.value.find((field) => field.facette)?.code)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <SearchBar v-model="query" />

    <p class="mt-4 text-sm text-stone-500 dark:text-stone-400" aria-live="polite">
      {{ t('list.results', { n: results.length }) }}
      <template v-if="query">
        {{ t('list.of_total', { total: formatNumber(total) }) }}
      </template>
    </p>

    <div v-if="results.length === 0" class="py-20 text-center">
      <p class="font-serif text-lg">{{ t('search.empty') }}</p>
      <p class="mt-2 text-sm text-stone-500 dark:text-stone-400">{{ t('search.empty_hint') }}</p>
    </div>

    <ul
      v-else
      class="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <li v-for="object in results" :key="object.id">
        <ObjectCard :object="object" :query="query" :caption-field="captionField" />
      </li>
    </ul>
  </div>
</template>
