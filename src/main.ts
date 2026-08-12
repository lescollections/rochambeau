import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { load } from '@/composables/useCollection'
import { locale } from '@/lib/i18n'
import '@/style.css'

document.documentElement.lang = locale.value

// Loading starts before the first render, so the network request and the
// application mount overlap.
void load()

createApp(App).use(router).mount('#app')
