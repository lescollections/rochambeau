import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { load } from '@/composables/useCollection'
import { locale } from '@/lib/i18n'
import '@/style.css'

document.documentElement.lang = locale.value

// The version is never shown on screen, but it has to reach the bundle: it is
// what makes a version bump change the precached files, hence what tells the
// service worker a new build is out. It also answers "which build is this?"
// from any browser console.
console.info(`Rochambeau v${__APP_VERSION__}`)

// Loading starts before the first render, so the network request and the
// application mount overlap.
void load()

createApp(App).use(router).mount('#app')
