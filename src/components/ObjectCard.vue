<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { IndexedObject } from '@/types'
import { flatten } from '@/lib/text'
import { t } from '@/lib/i18n'
import { useCompact } from '@/composables/useCompact'
import HighlightedText from '@/components/HighlightedText.vue'

const props = defineProps<{
  object: IndexedObject
  query?: string
  /** Code of the field shown under the title (first facet field of the schema). */
  captionField?: string
  /** Whether this card is the one showing its caption, where tapping rules. */
  revealed?: boolean
}>()

const emit = defineEmits<{ reveal: [id: string] }>()

const compact = useCompact()

/**
 * Where there is no hovering, the caption takes the first tap and the record
 * takes the second — otherwise every thumbnail would carry a permanent label
 * and the list would read as titles rather than as pictures.
 *
 * A work without a picture shows its title already, so it goes straight there.
 *
 * Caught on the way down: RouterLink runs its own handler on the way up, and
 * would have navigated before this one had a chance to hold the tap back.
 */
function onClick(event: MouseEvent) {
  if (!compact.value || !props.object.cover || props.revealed) return
  // `detail` is 0 when Enter did the clicking: focus has shown the caption
  // already, so asking for a second key press would only be in the way.
  if (event.detail === 0) return
  event.preventDefault()
  emit('reveal', props.object.id)
}

const caption = computed(() => {
  if (!props.captionField) return ''
  return flatten(props.object.champs[props.captionField])
})

/**
 * Pictures are shown at their natural ratio, so the space is reserved up front
 * from the dimensions carried by the format — no reflow as images arrive.
 */
const ratio = computed(() => {
  const cover = props.object.cover
  if (!cover?.l || !cover?.h) return undefined
  return `${cover.l} / ${cover.h}`
})

/**
 * Two candidates, and only two — the ones whose width the format states.
 *
 * `apercu` is a bounding box, so its width depends on the orientation of the
 * photograph and the format never says what it is: on the demonstration set,
 * two thirds of the works are portraits and their `apercu` is 115px wide for a
 * column of about 195px. It cannot carry a `w` descriptor without lying, so it
 * stays where it was, as the plain `src` of a card that has nothing better.
 *
 * `moyen` is optional: a collection published before 2026-08-25 has none, and
 * then this falls back to exactly what it used to do.
 */
const srcset = computed(() => {
  const cover = props.object.cover
  if (!cover?.moyen || !cover.moyen_l) return undefined
  const candidates = [`${cover.moyen} ${cover.moyen_l}w`]
  // `plein` earns its place only above the width `moyen` already covers —
  // otherwise a screen at twice the density would be offered the same picture
  // twice and the widest wins for nothing.
  if (cover.l && cover.l > cover.moyen_l) candidates.push(`${cover.plein} ${cover.l}w`)
  return candidates.join(', ')
})

/**
 * The mosaic is CSS columns, so a card is exactly one column wide. The count is
 * pinned per width band (HomeView), the gap is `gap-4` = 1rem, and the page is
 * padded by `px-4`/`sm:px-6` — 2rem is used for every band, which overstates the
 * column slightly above 640px. That is the safe direction to be wrong in: too
 * wide picks the larger candidate, too narrow would upscale.
 *
 * ⚠️ These four bands must be read together with the `columns-*` classes of
 * HomeView. Changing one without the other silently serves the wrong size —
 * nothing breaks, the pictures just get soft.
 */
const SIZES = [
  '(min-width: 1600px) calc((100vw - 9rem) / 8)',
  '(min-width: 1200px) calc((100vw - 7rem) / 6)',
  '(min-width: 800px) calc((100vw - 5rem) / 4)',
  'calc((100vw - 4rem) / 3)',
].join(', ')
</script>

<template>
  <RouterLink
    :to="{ name: 'object', params: { id: object.id }, query: query ? { q: query } : undefined }"
    class="group relative block overflow-hidden bg-stone-200/60 focus-visible:outline-offset-2 dark:bg-stone-800/60"
    @click.capture="onClick"
  >
    <img
      v-if="object.cover"
      :src="object.cover.moyen ?? object.cover.apercu"
      :srcset="srcset"
      :sizes="srcset ? SIZES : undefined"
      :alt="object.cover.legende ?? object.titre"
      :width="object.cover.l"
      :height="object.cover.h"
      :style="ratio ? { aspectRatio: ratio } : undefined"
      loading="lazy"
      decoding="async"
      class="block w-full"
    />
    <!--
      Without a picture the caption is all there is, so it stays visible. The
      gradient stands in for the missing picture, in both themes — hence the
      type colours, which no longer follow the theme either: the ground under
      them is light in both.
    -->
    <div v-else class="no-picture-gradient flex aspect-4/5 items-center p-4 text-stone-900">
      <div>
        <p class="font-serif leading-snug">
          <HighlightedText :text="object.titre" :query="query" />
        </p>
        <p v-if="caption" class="mt-1 text-sm text-stone-800">
          <HighlightedText :text="caption" :query="query" />
        </p>
        <p class="mt-2 text-xs text-stone-800">{{ t('list.no_image') }}</p>
      </div>
    </div>

    <!--
      Hover-only information would be unreachable by keyboard, and out of reach
      of a touch screen: it also shows on focus, and answers the first tap
      where there is nothing to hover with.
    -->
    <div
      v-if="object.cover"
      class="absolute inset-x-0 bottom-0 bg-black p-3 text-white transition-transform duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none"
      :class="revealed ? 'translate-y-0' : 'translate-y-full'"
    >
      <p class="font-serif leading-snug">
        <HighlightedText :text="object.titre" :query="query" />
      </p>
      <p v-if="caption" class="mt-0.5 text-sm text-white/70">
        <HighlightedText :text="caption" :query="query" />
      </p>
    </div>
  </RouterLink>
</template>
