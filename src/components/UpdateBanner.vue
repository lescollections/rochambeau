<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { t } from '@/lib/i18n'

// registerType: 'prompt' — a new version never installs itself under the
// visitor's feet in the middle of a visit, it offers itself.
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

function dismiss() {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900"
    role="status"
  >
    <p class="flex-1">
      {{ needRefresh ? t('pwa.update_available') : t('pwa.offline_ready') }}
    </p>
    <button
      v-if="needRefresh"
      type="button"
      class="shrink-0 rounded-md bg-stone-900 px-3 py-1.5 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
      @click="updateServiceWorker(true)"
    >
      {{ t('pwa.update') }}
    </button>
    <button
      type="button"
      class="shrink-0 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      @click="dismiss"
    >
      {{ t('pwa.dismiss') }}
    </button>
  </div>
</template>
