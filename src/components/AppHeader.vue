<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import LocaleSelect from '@/components/LocaleSelect.vue'
import HeaderHalftone from '@/components/HeaderHalftone.vue'

const { info, objectById } = useCollection()
const route = useRoute()

/**
 * On a record, the cover picture bleeds through the banner. The thumbnail is
 * enough: the screen throws away most of the detail anyway, and it is already
 * in the browser's cache.
 */
const screened = computed(() => {
  if (route.name !== 'object' || typeof route.params.id !== 'string') return undefined
  const cover = objectById(route.params.id)?.cover
  return cover?.apercu ?? cover?.plein
})

/**
 * Both the list and a record are long scrolls, so the banner follows along —
 * but halved and pinned, otherwise 270px of blue would eat the viewport.
 */
const condensed = ref(false)

/**
 * The fold is animated only when the visitor drives the scroll themselves.
 * Landing on a page, or coming back to a saved position, has to show the
 * banner in its final state at once rather than fold under the reader's eyes.
 *
 * Intent is read from the input rather than from the scroll event, which
 * cannot tell a reader's gesture from the jump the router makes on arrival.
 */
const moving = ref(false)
const INTENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const

function readIntent() {
  moving.value = true
}

// A new page starts still, whatever the visitor was doing on the previous one.
watch(() => route.fullPath, () => (moving.value = false))

/**
 * Transition classes, held together because they only ever apply while the
 * visitor scrolls — delays included: `transition-delay` alone would still hold
 * a change back, since `transition-property` defaults to `all`.
 *
 * The two halves of the fold are staggered rather than simultaneous: the type
 * shrinks first, the padding follows at two thirds of that, and unfolding
 * plays the same sequence in reverse — hence delays that swap with the state.
 */
const folding = computed(() => {
  if (!moving.value) return { banner: '', block: '', title: '', description: '' }
  const type = condensed.value ? 'delay-0' : 'delay-[400ms]'
  const padding = condensed.value ? 'delay-[400ms]' : 'delay-0'
  const reduced = 'motion-reduce:transition-none'
  return {
    banner: `transition-shadow duration-300 ${reduced}`,
    block: `transition-[padding,gap] duration-300 ${padding} ${reduced}`,
    title: `transition-[font-size] duration-[600ms] ${type} ${reduced}`,
    description: `transition-[font-size,line-height,margin-top] duration-[600ms] ${type} ${reduced}`,
  }
})

// A few pixels of slack, so the banner does not flip back and forth on the
// elastic scroll of a trackpad.
function readScroll() {
  condensed.value = window.scrollY > 24
}

onMounted(() => {
  readScroll()
  window.addEventListener('scroll', readScroll, { passive: true })
  for (const intent of INTENTS) window.addEventListener(intent, readIntent, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', readScroll)
  for (const intent of INTENTS) window.removeEventListener(intent, readIntent)
})
</script>

<template>
  <!-- The banner leaves the flow once pinned: this wrapper holds its place. -->
  <div class="h-[270px]">
    <!-- `isolate` keeps the screen blending with the banner and nothing else. -->
    <header
      class="header-gradient isolate overflow-hidden text-white"
      :class="[
        folding.banner,
        condensed
          ? 'fixed inset-x-0 top-0 z-40 bg-banner shadow-lg shadow-black/25'
          : 'relative h-full',
      ]"
    >
      <HeaderHalftone :src="screened" />

      <div
        class="flex h-full px-4 sm:px-6"
        :class="[
          folding.block,
          condensed ? 'flex-row-reverse items-center gap-4 py-[20px]' : 'flex-col py-6',
        ]"
      >
        <div class="flex justify-end">
          <LocaleSelect />
        </div>

        <!-- Coming back from a record keeps the search term the visitor typed. -->
        <RouterLink
          :to="{ name: 'home', query: route.query.q ? { q: route.query.q } : undefined }"
          class="flex min-h-0 min-w-0 flex-1 flex-col justify-center rounded-sm"
        >
          <!-- `text-balance` has to go when condensed: it would undo `truncate`. -->
          <h1
            class="font-serif leading-tight"
            :class="[
              folding.title,
              condensed
                ? 'truncate text-[0.9375rem] sm:text-[1.125rem] md:text-[1.5rem]'
                : 'text-3xl text-balance sm:text-4xl md:text-5xl',
            ]"
          >
            <!--
              Nothing until the collection names itself: a placeholder title
              would be read, then replaced. The non-breaking space holds the
              line so the banner does not jump.
            -->
            {{ info?.titre ?? '\u00a0' }}
          </h1>
          <!--
            Halved as well: text-xs on a flat line-height, and a single line, so
            the description stays under half the height it had.
          -->
          <p
            v-if="info?.description"
            class="max-w-3xl text-white/80"
            :class="[
              folding.description,
              condensed ? 'mt-1 truncate text-xs leading-none' : 'mt-3',
            ]"
          >
            {{ info.description }}
          </p>
        </RouterLink>
      </div>
    </header>
  </div>
</template>
