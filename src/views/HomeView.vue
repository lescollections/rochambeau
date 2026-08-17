<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { search } from '@/lib/search'
import { applyFilters, buildFacets, filterableFields, FILTER_PREFIX, isEmpty } from '@/lib/facets'
import type { Selection } from '@/lib/facets'
import { formatNumber, t } from '@/lib/i18n'
import SearchBar from '@/components/SearchBar.vue'
import FacetFilters from '@/components/FacetFilters.vue'
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

/**
 * The filters live in the URL too, a "f.<code>" parameter per ticked value.
 * Unlike the query they are written straight away: ticking is a deliberate
 * choice, not a stream of keystrokes.
 */
const selection = computed<Selection>(() => {
  const chosen: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (!key.startsWith(FILTER_PREFIX)) continue
    const values = (Array.isArray(value) ? value : [value]).filter(
      (single): single is string => typeof single === 'string' && single !== '',
    )
    if (values.length > 0) chosen[key.slice(FILTER_PREFIX.length)] = values
  }
  return chosen
})

/** Ticks or unticks one value; an empty value clears the whole field. */
function toggleFilter(code: string, value: string) {
  const key = FILTER_PREFIX + code
  const current = selection.value[code] ?? []
  const next = { ...route.query }

  const values = value
    ? current.includes(value)
      ? current.filter((chosen) => chosen !== value)
      : [...current, value]
    : []

  if (values.length > 0) next[key] = [...values]
  else delete next[key]

  void router.replace({ query: next })
}

function clearFilters() {
  const next = { ...route.query }
  for (const key of Object.keys(next)) {
    if (key.startsWith(FILTER_PREFIX)) delete next[key]
  }
  void router.replace({ query: next })
}

const searched = computed(() => search(objects.value, query.value))
const results = computed(() => applyFilters(searched.value, selection.value))

// Which fields deserve a dropdown is a property of the collection, not of the
// current search: the row of filters must not appear and vanish as one types.
const filterable = computed(() => filterableFields(objects.value, fields.value))
const facets = computed(() => buildFacets(searched.value, filterable.value, selection.value))

const filtering = computed(() => !isEmpty(selection.value))

/**
 * The row of dropdowns stays folded until asked for: the visitor comes for the
 * pictures, and a wall of selects above them would say otherwise. A shared link
 * carrying filters opens folded too, its wording saying what is already at work.
 */
const showFilters = ref(false)

const filtersLabel = computed(() => {
  if (showFilters.value) return t('filters.hide')
  return filtering.value ? t('filters.show') : t('filters.add')
})

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

    <p class="mt-4 text-sm text-stone-500 dark:text-stone-400">
      <span aria-live="polite">
        {{ t('list.results', { n: results.length }) }}
        <template v-if="query || filtering">
          {{ t('list.of_total', { total: formatNumber(total) }) }}
        </template>
      </span>

      <template v-if="facets.length">
        —
        <button
          type="button"
          class="underline underline-offset-4 hover:text-stone-900 dark:hover:text-stone-100"
          :aria-expanded="showFilters"
          aria-controls="collection-filters"
          @click="showFilters = !showFilters"
        >
          {{ filtersLabel }}
        </button>
      </template>

      <!-- Undoing everything at once belongs on this line rather than under the
           dropdowns, where it would push the works further down. -->
      <template v-if="showFilters && filtering">
        —
        <button
          type="button"
          class="underline underline-offset-4 hover:text-stone-900 dark:hover:text-stone-100"
          @click="clearFilters"
        >
          {{ t('filters.clear') }}
        </button>
      </template>
    </p>

    <FacetFilters
      v-if="showFilters"
      id="collection-filters"
      :facets="facets"
      :selection="selection"
      @toggle="toggleFilter"
    />

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
