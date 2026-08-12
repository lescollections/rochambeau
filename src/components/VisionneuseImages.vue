<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Image } from '@/types'
import { t } from '@/lib/i18n'

const props = defineProps<{
  images: Image[]
  /** Index de l'image affichée ; `null` ferme la visionneuse. */
  index: number | null
  titre: string
}>()

const emit = defineEmits<{
  fermer: []
  naviguer: [index: number]
}>()

// `<dialog>` en mode modal fournit gratuitement le piège de focus, la touche
// Échap et l'inertie du reste de la page — trois choses délicates à refaire.
const dialogue = ref<HTMLDialogElement | null>(null)

const image = computed(() => (props.index === null ? undefined : props.images[props.index]))
const plusieurs = computed(() => props.images.length > 1)

watch(
  () => props.index,
  (valeur) => {
    const element = dialogue.value
    if (!element) return
    if (valeur === null) {
      if (element.open) element.close()
    } else if (!element.open) {
      element.showModal()
    }
  },
  { flush: 'post' },
)

function deplacer(pas: number) {
  if (props.index === null || props.images.length === 0) return
  const suivant = (props.index + pas + props.images.length) % props.images.length
  emit('naviguer', suivant)
}

function surTouche(evenement: KeyboardEvent) {
  if (evenement.key === 'ArrowRight') {
    evenement.preventDefault()
    deplacer(1)
  } else if (evenement.key === 'ArrowLeft') {
    evenement.preventDefault()
    deplacer(-1)
  }
}

/** Un clic dans la zone vide autour de l'image ferme, un clic sur l'image non. */
function surClicFond(evenement: MouseEvent) {
  if (evenement.target === dialogue.value) emit('fermer')
}
</script>

<template>
  <dialog
    ref="dialogue"
    class="m-auto max-h-full w-full max-w-full bg-transparent p-0 backdrop:bg-stone-950/90 open:flex"
    :aria-label="t('visionneuse.titre')"
    @close="emit('fermer')"
    @cancel.prevent="emit('fermer')"
    @keydown="surTouche"
    @click="surClicFond"
  >
    <div v-if="image" class="flex h-dvh w-full flex-col">
      <div class="flex items-center justify-between gap-4 px-4 py-3 text-stone-100">
        <p class="truncate font-serif">{{ titre }}</p>
        <div class="flex shrink-0 items-center gap-3">
          <span v-if="plusieurs" class="text-sm tabular-nums text-stone-400">
            {{ t('visionneuse.compteur', { position: (index ?? 0) + 1, total: images.length }) }}
          </span>
          <button
            type="button"
            class="rounded-md p-1.5 hover:bg-white/10"
            :aria-label="t('visionneuse.fermer')"
            @click="emit('fermer')"
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

      <div class="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        <img
          :src="image.plein"
          :alt="image.legende ?? titre"
          :width="image.l"
          :height="image.h"
          class="max-h-full max-w-full object-contain"
        />

        <button
          v-if="plusieurs"
          type="button"
          class="absolute left-2 rounded-full bg-stone-950/60 p-2 text-stone-100 hover:bg-stone-950/90"
          :aria-label="t('visionneuse.precedente')"
          @click="deplacer(-1)"
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
          v-if="plusieurs"
          type="button"
          class="absolute right-2 rounded-full bg-stone-950/60 p-2 text-stone-100 hover:bg-stone-950/90"
          :aria-label="t('visionneuse.suivante')"
          @click="deplacer(1)"
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

      <p v-if="image.legende" class="px-4 pb-4 text-center text-sm text-stone-300">
        {{ image.legende }}
      </p>
    </div>
  </dialog>
</template>
