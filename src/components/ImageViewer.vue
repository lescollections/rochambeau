<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Picture } from '@/types'
import { t } from '@/lib/i18n'

const props = defineProps<{
  pictures: Picture[]
  /** Index of the displayed picture; null closes the viewer. */
  index: number | null
  title: string
  /** Editorial caption shown under the picture. */
  caption?: string
  /** Photographic credit, kept distinct from the caption. */
  credit?: string
}>()

const emit = defineEmits<{
  close: []
  navigate: [index: number]
}>()

// A modal <dialog> gives us the focus trap, the Escape key and inertness of the
// rest of the page for free — three things that are delicate to reimplement.
const dialog = ref<HTMLDialogElement | null>(null)

const picture = computed(() => (props.index === null ? undefined : props.pictures[props.index]))
const hasSeveral = computed(() => props.pictures.length > 1)

watch(
  () => props.index,
  (value) => {
    const element = dialog.value
    if (!element) return
    if (value === null) {
      if (element.open) element.close()
    } else if (!element.open) {
      element.showModal()
    }
  },
  { flush: 'post' },
)

function move(step: number) {
  if (props.index === null || props.pictures.length === 0) return
  const next = (props.index + step + props.pictures.length) % props.pictures.length
  emit('navigate', next)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    move(-1)
  }
}

/** A click on the empty area around the picture closes; a click on the picture does not. */
function onBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto max-h-full w-full max-w-full bg-transparent p-0 backdrop:bg-stone-950/90 open:flex"
    :aria-label="t('viewer.title')"
    @close="emit('close')"
    @cancel.prevent="emit('close')"
    @keydown="onKeydown"
    @click="onBackdropClick"
  >
    <div v-if="picture" class="flex h-dvh w-full flex-col">
      <div class="flex items-center justify-between gap-4 px-4 py-3 text-stone-100">
        <p class="truncate font-serif">{{ title }}</p>
        <div class="flex shrink-0 items-center gap-3">
          <span v-if="hasSeveral" class="text-sm tabular-nums text-stone-400">
            {{ t('viewer.counter', { position: (index ?? 0) + 1, total: pictures.length }) }}
          </span>
          <button
            type="button"
            class="rounded-md p-1.5 hover:bg-white/10"
            :aria-label="t('viewer.close')"
            @click="emit('close')"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <figure class="m-0 flex min-h-0 flex-1 flex-col">
        <div class="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <img
          :src="picture.plein"
          :alt="picture.legende ?? title"
          :width="picture.l"
          :height="picture.h"
          class="max-h-full max-w-full object-contain"
        />

        <button
          v-if="hasSeveral"
          type="button"
          class="absolute left-2 rounded-full bg-stone-950/60 p-2 text-stone-100 hover:bg-stone-950/90"
          :aria-label="t('viewer.previous')"
          @click="move(-1)"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-if="hasSeveral"
          type="button"
          class="absolute right-2 rounded-full bg-stone-950/60 p-2 text-stone-100 hover:bg-stone-950/90"
          :aria-label="t('viewer.next')"
          @click="move(1)"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <figcaption class="mx-auto max-w-4xl px-4 pb-5 text-center">
        <p v-if="caption" class="text-sm text-stone-200">{{ caption }}</p>
        <!-- Only worth showing when it says more than the title already does. -->
        <p v-if="picture.legende && picture.legende !== title" class="mt-1 text-sm text-stone-400">
          {{ picture.legende }}
        </p>
        <p v-if="credit" class="mt-1 text-xs text-stone-500">{{ credit }}</p>
        </figcaption>
      </figure>
    </div>
  </dialog>
</template>
