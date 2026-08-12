<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useCollection } from '@/composables/useCollection'
import { t } from '@/lib/i18n'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ErrorScreen from '@/components/ErrorScreen.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'

// No view can do anything without the collection, so loading and failure are
// handled once here rather than in each route.
const { status } = useCollection()
</script>

<template>
  <a href="#content" class="lien-evitement">{{ t('app.skip_to_content') }}</a>

  <AppHeader />

  <main id="content" class="min-h-[60vh]">
    <ErrorScreen v-if="status === 'error'" />
    <LoadingScreen v-else-if="status !== 'ready'" />
    <RouterView v-else />
  </main>

  <AppFooter v-if="status === 'ready'" />
  <UpdateBanner />
</template>
