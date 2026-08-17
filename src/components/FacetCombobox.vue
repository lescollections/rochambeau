<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { Facet } from '@/lib/facets'
import { normalizeForIndex, splitTerms } from '@/lib/text'
import { formatNumber, t } from '@/lib/i18n'
import HighlightedText from '@/components/HighlightedText.vue'

/**
 * One filter, as a text field over its own values: six hundred authors are
 * typed at, not scrolled through. The list stays underneath and shows the whole
 * vocabulary as long as nothing has been typed, so it can still be browsed.
 *
 * Values tick rather than replace one another: several values of one field
 * widen the selection, and the list stays open to take the next tick.
 */

const props = defineProps<{
  facet: Facet
  /** Values currently ticked for this field. */
  selected: readonly string[]
}>()

const emit = defineEmits<{ toggle: [value: string] }>()

const open = ref(false)
/** What is being typed. Only ever a search: the ticks carry the choice. */
const draft = ref('')
const active = ref(0)
const field = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

const identifier = computed(() => `facet-${props.facet.code}`)

/** At rest the field says what it holds, since the ticks are out of sight. */
const summary = computed(() => {
  if (props.selected.length === 0) return t('filters.all')
  if (props.selected.length === 1) return props.selected[0] as string
  return t('filters.chosen', { n: props.selected.length })
})

/** Terms match at a word start, as in the collection search. */
const matches = computed(() => {
  const terms = splitTerms(draft.value)
  if (terms.length === 0) return props.facet.options

  return props.facet.options.filter((option) => {
    const text = normalizeForIndex(option.value)
    return terms.every((term) => text.includes(` ${term}`))
  })
})

/** The rows the keyboard walks through; clearing the field is the first one. */
const rows = computed(() => {
  const values = matches.value.map((option) => ({
    value: option.value,
    count: option.count,
    ticked: props.selected.includes(option.value),
  }))
  if (props.selected.length === 0) return values
  return [{ value: '', count: -1, ticked: false }, ...values]
})

/**
 * The field is as wide as the longest value it offers, capped: a short
 * vocabulary leaves room for the next filter on the same line.
 */
const width = computed(() => {
  let longest = 0
  for (const option of props.facet.options) longest = Math.max(longest, option.value.length)
  return `min(100%, max(9rem, ${Math.min(longest + 6, 34)}ch))`
})

/**
 * Opening lands on the first value rather than on the "clear" row: a down
 * arrow followed by Enter must tick something, not wipe the field.
 */
function firstValue(): number {
  return rows.value[0]?.value === '' ? 1 : 0
}

/** Widest the list may get, matching its `max-w-96`. */
const LIST_WIDTH = 384

/** A filter sitting near the right edge drops its list to the left instead. */
const alignRight = ref(false)

function show() {
  if (props.facet.options.length === 0) return
  const box = field.value?.getBoundingClientRect()
  alignRight.value = box !== undefined && box.left + LIST_WIDTH > window.innerWidth
  open.value = true
  active.value = firstValue()
}

function close() {
  open.value = false
  draft.value = ''
}

function pick(value: string) {
  const before = props.selected
  emit('toggle', value)
  // The list stays open: ticking one value rarely is the whole intent. The
  // "clear" row appearing on the first tick — or leaving on the last untick —
  // shifts everything below it, so the highlight follows rather than drifting.
  if (!value) active.value = 0
  else if (before.length === 0) active.value += 1
  else if (before.length === 1 && before[0] === value) active.value = Math.max(active.value - 1, 0)
}

function move(step: number) {
  if (!open.value) return show()
  const count = rows.value.length
  if (count === 0) return
  active.value = (active.value + step + count) % count
}

// Keeping the highlighted row in sight is what makes the arrow keys usable on
// a list of several hundred values.
watch(active, async () => {
  await nextTick()
  const row = list.value?.children[active.value]
  if (row instanceof HTMLElement) row.scrollIntoView({ block: 'nearest' })
})

function onEnter() {
  if (!open.value) return show()
  const row = rows.value[active.value]
  if (row) pick(row.value)
}

function onInput() {
  open.value = true
  active.value = firstValue()
}

// Leaving this filter for anything outside closes the list; a click on one of
// its own rows keeps the focus on the field and only ticks.
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next)) return
  close()
}
</script>

<template>
  <div class="relative" :style="{ width }" @focusout="onFocusOut">
    <label
      :for="identifier"
      class="mb-1 block truncate text-xs tracking-wide text-stone-500 dark:text-stone-400"
    >
      {{ facet.libelle }}
    </label>

    <input
      :id="identifier"
      ref="field"
      v-model="draft"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      :disabled="facet.options.length === 0"
      :placeholder="summary"
      :aria-expanded="open"
      :aria-controls="`${identifier}-list`"
      :aria-activedescendant="open ? `${identifier}-row-${active}` : undefined"
      class="w-full rounded-lg border border-stone-300 bg-white py-2 pr-8 pl-3 text-sm dark:border-stone-700 dark:bg-stone-900"
      :class="
        selected.length
          ? 'placeholder:text-stone-900 dark:placeholder:text-stone-100'
          : 'placeholder:text-stone-400 disabled:text-stone-400 dark:placeholder:text-stone-500 dark:disabled:text-stone-600'
      "
      @focus="show"
      @input="onInput"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="close"
    />

    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute top-5 right-0 bottom-0 flex w-8 items-center justify-center text-stone-500"
      @mousedown.prevent="open ? close() : field?.focus()"
    >
      <svg
        viewBox="0 0 20 20"
        class="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="M5 8l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <ul
      v-if="open"
      :id="`${identifier}-list`"
      ref="list"
      role="listbox"
      aria-multiselectable="true"
      class="absolute z-20 mt-1 max-h-72 w-max max-w-96 min-w-full overflow-y-auto rounded-lg border border-stone-300 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900"
      :class="alignRight ? 'right-0' : 'left-0'"
    >
      <li
        v-for="(row, index) in rows"
        :id="`${identifier}-row-${index}`"
        :key="row.value || '*'"
        role="option"
        :aria-selected="row.ticked"
        class="flex cursor-pointer items-baseline gap-2 px-3 py-1.5"
        :class="index === active ? 'bg-stone-100 dark:bg-stone-800' : ''"
        @mousedown.prevent="pick(row.value)"
        @mousemove="active = index"
      >
        <template v-if="row.value">
          <span
            class="relative top-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border"
            :class="
              row.ticked
                ? 'border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900'
                : 'border-stone-400 dark:border-stone-600'
            "
          >
            <svg
              v-if="row.ticked"
              viewBox="0 0 12 12"
              class="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M2 6.5l2.5 2.5L10 3.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>

          <span>
            <HighlightedText :text="row.value" :query="draft" />
            <span class="text-stone-500 dark:text-stone-400"> ({{ formatNumber(row.count) }})</span>
          </span>
        </template>

        <!-- Untick everything at once, offered only when there is something to undo. -->
        <span v-else class="text-stone-500 dark:text-stone-400">{{ t('filters.all') }}</span>
      </li>

      <li v-if="matches.length === 0" class="px-3 py-1.5 text-stone-500 dark:text-stone-400">
        {{ t('filters.no_match') }}
      </li>
    </ul>
  </div>
</template>
