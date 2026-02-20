import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// ──────────────────────────────────────────────
// Grolab — Vite Configuration
// ──────────────────────────────────────────────
// Base path is '/' for custom domain (grolab.work).
// If deploying to github.io/grolab, change to '/grolab/'.
// ──────────────────────────────────────────────

export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
