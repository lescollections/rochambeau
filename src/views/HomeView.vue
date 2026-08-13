<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

/**
 * Card whose caption is showing, where a tap replaces hovering. Only one at a
 * time, and a tap anywhere else closes it: several open captions would turn
 * the list back into a wall of titles.
 */
const revealed = ref<string | null>(null)

function closeCaption(event: PointerEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('a')) return
  revealed.value = null
}

onMounted(() => document.addEventListener('pointerdown', closeCaption))
onUnmounted(() => document.removeEventListener('pointerdown', closeCaption))

// A new search starts over: the revealed card is probably gone from the list.
watch(results, () => (revealed.value = null))

/** The first field flagged as a facet doubles as the caption under thumbnails. */
const captionField = computed(() => fields.value.find((field) => field.facette)?.code)
</script>

<template>
  <div class="px-4 py-6 sm:px-6">
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

    <!--
      Masonry through CSS columns: pictures keep their own height, and the
      column count is pinned per width band rather than derived from a column
      width. Beware that reading order becomes column by column, not row by row.
    -->
    <ul
      v-else
      class="mt-6 columns-3 gap-4 min-[800px]:columns-4 min-[1200px]:columns-6 min-[1600px]:columns-8"
    >
      <li v-for="object in results" :key="object.id" class="mb-4 break-inside-avoid">
        <ObjectCard
          :object="object"
          :query="query"
          :caption-field="captionField"
          :revealed="revealed === object.id"
          @reveal="revealed = $event"
        />
      </li>
    </ul>
  </div>
</template>
