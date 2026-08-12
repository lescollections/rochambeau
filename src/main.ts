import { createApp } from 'vue'
import App from '@/App.vue'
import { router } from '@/router'
import { charger } from '@/composables/collection'
import { langue } from '@/lib/i18n'
import '@/style.css'

document.documentElement.lang = langue.value

// Le chargement démarre sans attendre le premier rendu : le réseau et le
// montage de l'application se recouvrent.
void charger()

createApp(App).use(router).mount('#app')
