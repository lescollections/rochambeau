<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

// A few pixels of slack, so the banner does not flip back and forth on the
// elastic scroll of a trackpad.
function readScroll() {
  condensed.value = window.scrollY > 24
}

onMounted(() => {
  readScroll()
  window.addEventListener('scroll', readScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', readScroll))
</script>

<template>
  <!-- The banner leaves the flow once pinned: this wrapper holds its place. -->
  <div class="h-[270px]">
    <!-- `isolate` keeps the screen blending with the banner and nothing else. -->
    <header
      class="header-gradient isolate overflow-hidden text-white transition-shadow duration-300 motion-reduce:transition-none"
      :class="
        condensed
          ? 'fixed inset-x-0 top-0 z-40 bg-banner shadow-lg shadow-black/25'
          : 'relative h-full'
      "
    >
      <HeaderHalftone :src="screened" />

      <!--
        The two halves of the fold are staggered rather than simultaneous: the
        type shrinks first, the padding follows at two thirds of that. Folding
        back plays the same sequence in reverse, so the delays live on the
        state each element is heading to.
      -->
      <div
        class="flex h-full px-4 transition-[padding,gap] duration-300 motion-reduce:transition-none sm:px-6"
        :class="
          condensed
            ? 'flex-row-reverse items-center gap-4 py-[20px] delay-[400ms]'
            : 'flex-col py-6 delay-0'
        "
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
            class="font-serif leading-tight transition-[font-size] duration-[600ms] motion-reduce:transition-none"
            :class="
              condensed
                ? 'truncate text-[0.9375rem] delay-0 sm:text-[1.125rem] md:text-[1.5rem]'
                : 'text-3xl text-balance delay-[400ms] sm:text-4xl md:text-5xl'
            "
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
            class="max-w-3xl text-white/80 transition-[font-size,line-height,margin-top] duration-[600ms] motion-reduce:transition-none"
            :class="condensed ? 'mt-1 truncate text-xs leading-none delay-0' : 'mt-3 delay-[400ms]'"
          >
            {{ info.description }}
          </p>
        </RouterLink>
      </div>
    </header>
  </div>
</template>
