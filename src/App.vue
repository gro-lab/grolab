<!--
  ──────────────────────────────────────────────
  App.vue — Root Application Shell
  ──────────────────────────────────────────────
  Provides the global layout structure:
  Navbar → Main content (router-view) → Footer.
  All page views render inside <router-view>.
  ──────────────────────────────────────────────
-->

<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="app-shell">
    <Navbar />

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="app-footer">
      <span class="footer-mark">G.</span>
      <span>Grolab — Web Engineering Lab</span>
      <span class="footer-dot">·</span>
      <span class="footer-muted">built for learning</span>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

/* ── Footer ── */
.app-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-4);
  max-width: var(--content-max);
  margin: 0 auto;
  width: 100%;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}

.footer-mark {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-accent);
}

.footer-dot {
  opacity: 0.3;
}

.footer-muted {
  opacity: 0.5;
}

/* ── Page transition ── */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-fade-leave-to {
  opacity: 0;
}
</style>
