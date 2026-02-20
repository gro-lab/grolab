// ──────────────────────────────────────────────
// Grolab — Application Entry Point
// ──────────────────────────────────────────────
// Bootstraps the Vue 3 application, registers
// the router, and mounts to #app.
// ──────────────────────────────────────────────

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

app.use(router)

// ── GitHub Pages SPA redirect recovery ──
// If 404.html stored a path, navigate to it after mount.
const redirect = sessionStorage.getItem('grolab-redirect')
if (redirect) {
  sessionStorage.removeItem('grolab-redirect')
  router.replace(redirect)
}

app.mount('#app')
