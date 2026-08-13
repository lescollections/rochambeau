<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { flatten } from '@/lib/text'
import { editorialCaption } from '@/lib/caption'
import { formatNumber, t } from '@/lib/i18n'
import ImageViewer from '@/components/ImageViewer.vue'

const props = defineProps<{ id: string }>()

const route = useRoute()
const { objectById, neighbours, fields, objects } = useCollection()

const object = computed(() => objectById(props.id))
const context = computed(() => neighbours(props.id))

/** The search term travels along with navigation, so the visitor can retrace their steps. */
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const backLink = computed(() => ({
  name: 'home' as const,
  query: query.value ? { q: query.value } : undefined,
}))

/** Schema fields filled in for this object, in the schema's display order. */
const rows = computed(() => {
  const current = object.value
  if (!current) return []
  return fields.value
    .map((field) => ({ field, value: flatten(current.champs[field.code]) }))
    .filter((row) => row.value !== '')
})

const openPicture = ref<number | null>(null)
watch(
  () => props.id,
  () => {
    openPicture.value = null
  },
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <RouterLink
      :to="backLink"
      class="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
    >
      <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M12 4l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ t('app.back_to_collection') }}
    </RouterLink>

    <p v-if="!object" class="py-20 text-center font-serif text-lg">
      {{ t('object.not_found') }}
    </p>

    <article v-else class="mt-4 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <div v-if="object.images.length > 0" class="flex flex-col gap-3">
          <button
            v-for="(picture, position) in object.images"
            :key="picture.plein"
            type="button"
            class="overflow-hidden rounded-md bg-stone-200/60 dark:bg-stone-800/60"
            :aria-label="t('object.enlarge')"
            @click="openPicture = position"
          >
            <img
              :src="picture.plein"
              :alt="picture.legende ?? object.titre"
              :width="picture.l"
              :height="picture.h"
              :loading="position === 0 ? 'eager' : 'lazy'"
              decoding="async"
              class="w-full cursor-zoom-in object-contain"
            />
          </button>
        </div>
        <div
          v-else
          class="flex aspect-4/5 items-center justify-center rounded-md bg-stone-200/60 text-sm text-stone-400 dark:bg-stone-800/60 dark:text-stone-500"
        >
          {{ t('list.no_image') }}
        </div>
      </div>

      <!-- Clear of the pinned banner, which is 86px tall at its widest. -->
      <div class="md:sticky md:top-24 md:self-start">
        <h1 class="font-serif text-2xl leading-tight text-balance">{{ object.titre }}</h1>

        <dl class="mt-6 space-y-3 text-sm">
          <div v-for="row in rows" :key="row.field.code" class="grid grid-cols-3 gap-3">
            <dt class="text-stone-500 dark:text-stone-400">{{ row.field.libelle }}</dt>
            <dd class="col-span-2">{{ row.value }}</dd>
          </div>

          <div class="grid grid-cols-3 gap-3 border-t border-stone-200 pt-3 dark:border-stone-800">
            <dt class="text-stone-500 dark:text-stone-400">{{ t('object.identifier') }}</dt>
            <dd class="col-span-2 font-mono text-xs">{{ object.id }}</dd>
          </div>

          <div v-if="object.credit" class="grid grid-cols-3 gap-3">
            <dt class="text-stone-500 dark:text-stone-400">{{ t('object.credit') }}</dt>
            <dd class="col-span-2">{{ object.credit }}</dd>
          </div>
        </dl>
      </div>
    </article>

    <!-- Browsing spans the whole record, so it sits under both columns. -->
    <nav
      v-if="object && context.position !== -1"
      class="mt-10 flex items-center justify-between gap-4 border-t border-stone-200 pt-4 text-sm dark:border-stone-800"
    >
      <RouterLink
        v-if="context.previous"
        :to="{ name: 'object', params: { id: context.previous.id }, query: route.query }"
        class="max-w-[45%] truncate text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        :title="context.previous.titre"
      >
        ← {{ t('object.previous') }}
      </RouterLink>
      <span v-else />

      <span class="shrink-0 text-xs tabular-nums text-stone-400 dark:text-stone-500">
        {{
          t('object.position', {
            position: formatNumber(context.position + 1),
            total: formatNumber(objects.length),
          })
        }}
      </span>

      <RouterLink
        v-if="context.next"
        :to="{ name: 'object', params: { id: context.next.id }, query: route.query }"
        class="max-w-[45%] truncate text-right text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        :title="context.next.titre"
      >
        {{ t('object.next') }} →
      </RouterLink>
      <span v-else />
    </nav>

    <ImageViewer
      v-if="object"
      :pictures="object.images"
      :index="openPicture"
      :title="object.titre"
      :caption="editorialCaption(object)"
      :credit="object.credit"
      @close="openPicture = null"
      @navigate="openPicture = $event"
    />
  </div>
</template>
