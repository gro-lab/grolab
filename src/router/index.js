// ──────────────────────────────────────────────
// Grolab — Router Configuration
// ──────────────────────────────────────────────
// Defines all application routes.
// Uses HTML5 history mode (works with GitHub Pages
// 404.html redirect trick).
//
// Each route lazy-loads its view component to keep
// the initial bundle small as tools are added.
// ──────────────────────────────────────────────

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: '/crawler',
    name: 'Crawler',
    component: () => import('../views/Crawler.vue'),
    meta: { title: 'Website Crawler' },
  },
  {
    path: '/html-viewer',
    name: 'HtmlViewer',
    component: () => import('../views/HtmlViewer.vue'),
    meta: { title: 'HTML Viewer' },
  },
  {
    path: '/experiments',
    name: 'Experiments',
    component: () => import('../views/Experiments.vue'),
    meta: { title: 'Experiments' },
  },
  {
    // Catch-all → redirect to dashboard
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Scroll to top on navigation
  scrollBehavior() {
    return { top: 0 }
  },
})

// ── Update document title on navigation ──
router.afterEach((to) => {
  const base = 'Grolab'
  document.title = to.meta.title ? `${to.meta.title} — ${base}` : base
})

export default router
