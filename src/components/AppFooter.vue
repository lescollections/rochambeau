<script setup lang="ts">
import { computed } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { formatDate, t } from '@/lib/i18n'

const { manifest, objects, info } = useCollection()

/** Each showcase gets its own subdomain, derived from the collection slug. */
const domain = computed(() => (info.value?.slug ? `${info.value.slug}.lescollections.fr` : ''))
</script>

<template>
  <footer class="mt-12 border-t border-stone-200 dark:border-stone-800">
    <div
      class="flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-6 text-xs text-stone-500 sm:px-6 dark:text-stone-400"
    >
      <p class="flex flex-wrap gap-x-3">
        <span v-if="domain" class="flex items-center gap-2 text-stone-700 dark:text-stone-300">
          <!-- A chip of the banner blue, tying the footer back to the header. -->
          <span aria-hidden="true" class="brand-chip size-[10px] shrink-0" />
          {{ domain }}
        </span>
        <span>{{ t('footer.objects', { n: objects.length }) }}</span>
      </p>
      <p v-if="manifest?.genere_le">
        {{ t('footer.generated_on', { date: formatDate(manifest.genere_le) }) }}
      </p>
    </div>
  </footer>
</template>
