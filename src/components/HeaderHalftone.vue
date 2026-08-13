<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { drawHalftone, loadScreenableImage, type HalftoneOptions } from '@/lib/halftone'

/**
 * The dial of the effect. A plain grey wash lets the motif read best, which is
 * what the banner is after; `dotted: true` brings back the printed screen, at
 * `step` pixels apart and `angle` degrees.
 */
const SCREEN: HalftoneOptions = { dotted: false, step: 4, angle: 45 }

/**
 * The record's picture, screened into the banner. It sits behind the title
 * (negative z-index) and blends into the gradient at 20%, deepening it where
 * the picture is dark and lifting it where the picture is light, so it reads
 * as a relief rather than as an image.
 */
const props = defineProps<{ src?: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const painted = ref(false)

/** Kept so a resize can redraw the screen without downloading again. */
let picture: HTMLImageElement | null = null
/** Discards a slow picture when the visitor has already moved to another record. */
let generation = 0
let observer: ResizeObserver | null = null
let frame = 0

function paint() {
  const element = canvas.value
  if (!element) return
  if (!picture) {
    painted.value = false
    return
  }
  const box = element.getBoundingClientRect()
  painted.value = drawHalftone(element, picture, box.width, box.height, SCREEN)
}

/** Resizing fires in bursts; one screen per frame is plenty. */
function schedulePaint() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(paint)
}

watch(
  () => props.src,
  async (src) => {
    const mine = ++generation
    picture = null
    painted.value = false
    if (!src) return

    try {
      const image = await loadScreenableImage(src)
      if (mine !== generation) return
      picture = image
      schedulePaint()
    } catch {
      // Missing picture, or a host that refuses CORS: the banner stays plain.
    }
  },
  { immediate: true },
)

onMounted(() => {
  observer = new ResizeObserver(schedulePaint)
  if (canvas.value) observer.observe(canvas.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
})
</script>

<template>
  <canvas
    ref="canvas"
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 -z-10 h-full w-full mix-blend-hard-light transition-opacity duration-700 motion-reduce:transition-none"
    :class="painted ? 'opacity-20' : 'opacity-0'"
  />
</template>
