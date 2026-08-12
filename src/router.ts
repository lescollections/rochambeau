import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import VueAccueil from '@/views/VueAccueil.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'accueil',
    component: VueAccueil,
  },
  {
    // La fiche est chargée à la demande : l'accueil reste le plus léger possible.
    path: '/objet/:id',
    name: 'objet',
    component: () => import('@/views/VueObjet.vue'),
    props: true,
  },
  {
    path: '/:chemin(.*)*',
    name: 'introuvable',
    component: () => import('@/views/VueIntrouvable.vue'),
  },
]

export const router = createRouter({
  // `BASE_URL` suit `VITE_BASE` : l'app fonctionne à la racine comme en sous-répertoire.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(vers, depuis, positionSauvegardee) {
    if (positionSauvegardee) return positionSauvegardee
    // Changer de terme de recherche ne doit pas renvoyer en haut de page à chaque frappe.
    if (vers.name === depuis.name && vers.name === 'accueil') return {}
    return { top: 0 }
  },
})
