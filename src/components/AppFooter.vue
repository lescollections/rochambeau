<script setup lang="ts">
import { useCollection } from '@/composables/useCollection'
import { formatDate, t } from '@/lib/i18n'

const { manifest, objects } = useCollection()
</script>

<template>
  <footer class="mt-12 border-t border-stone-200 dark:border-stone-800">
    <div
      class="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-6 text-xs text-stone-500 sm:px-6 dark:text-stone-400"
    >
      <p>{{ t('footer.objects', { n: objects.length }) }}</p>
      <p v-if="manifest?.genere_le">
        {{ t('footer.generated_on', { date: formatDate(manifest.genere_le) }) }}
      </p>
    </div>
  </footer>
</template>
