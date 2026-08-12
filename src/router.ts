import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    // Loaded on demand, so the landing view stays as light as possible.
    path: '/objet/:id',
    name: 'object',
    component: () => import('@/views/ObjectView.vue'),
    props: true,
  },
  {
    path: '/:path(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  // BASE_URL follows VITE_BASE: the app works at the root and in a subdirectory alike.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Changing the search term must not jump back to the top on every keystroke.
    if (to.name === from.name && to.name === 'home') return {}
    return { top: 0 }
  },
})
