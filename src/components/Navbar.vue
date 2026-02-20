<!--
  ──────────────────────────────────────────────
  Navbar.vue — Global Navigation
  ──────────────────────────────────────────────
  Persistent top bar with logo and route links.
  Active route is highlighted via router-link-active.
  ──────────────────────────────────────────────
-->

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const scrolled = ref(false)
const mobileOpen = ref(false)

const navLinks = [
  { to: '/',            label: 'Dashboard' },
  { to: '/crawler',     label: 'Crawler' },
  { to: '/html-viewer', label: 'HTML Viewer' },
  { to: '/experiments', label: 'Experiments' },
]

function onScroll() {
  scrolled.value = window.scrollY > 8
}

function closeMobile() {
  mobileOpen.value = false
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <nav class="navbar" :class="{ 'navbar--scrolled': scrolled }">
    <div class="navbar-inner">
      <!-- Logo -->
      <router-link to="/" class="navbar-brand" @click="closeMobile">
        <span class="brand-mark">G.</span>
        <span class="brand-text">grolab</span>
      </router-link>

      <!-- Desktop links -->
      <div class="navbar-links">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ 'nav-link--active': route.path === link.to }"
        >
          {{ link.label }}
        </router-link>
      </div>

      <!-- Mobile toggle -->
      <button
        class="mobile-toggle"
        :class="{ 'mobile-toggle--open': mobileOpen }"
        @click="mobileOpen = !mobileOpen"
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
      </button>
    </div>

    <!-- Mobile menu -->
    <transition name="mobile-menu">
      <div v-if="mobileOpen" class="mobile-menu">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="mobile-link"
          :class="{ 'mobile-link--active': route.path === link.to }"
          @click="closeMobile"
        >
          {{ link.label }}
        </router-link>
      </div>
    </transition>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-bg);
  border-bottom: 1px solid transparent;
  transition: border-color var(--duration-normal) ease,
              background var(--duration-normal) ease;
}

.navbar--scrolled {
  border-bottom-color: var(--color-border);
  background: rgba(8, 8, 13, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-3) var(--space-4);
}

/* ── Brand ── */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: var(--color-text);
}

.brand-mark {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.brand-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

/* ── Desktop Links ── */
.navbar-links {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.nav-link {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) ease,
              background var(--duration-fast) ease;
  text-decoration: none;
}
.nav-link:hover {
  color: var(--color-text);
  background: var(--color-bg-hover);
}

.nav-link--active {
  color: var(--color-accent);
  background: var(--color-accent-dim);
}

/* ── Mobile Toggle ── */
.mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
}
.mobile-toggle span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--color-text-secondary);
  border-radius: 1px;
  transition: transform var(--duration-normal) ease, opacity var(--duration-fast) ease;
}
.mobile-toggle--open span:first-child {
  transform: translateY(3.5px) rotate(45deg);
}
.mobile-toggle--open span:last-child {
  transform: translateY(-3.5px) rotate(-45deg);
}

/* ── Mobile Menu ── */
.mobile-menu {
  display: none;
  flex-direction: column;
  padding: var(--space-2) var(--space-4) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.mobile-link {
  padding: var(--space-3) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: color var(--duration-fast) ease, background var(--duration-fast) ease;
}
.mobile-link:hover { color: var(--color-text); background: var(--color-bg-hover); }
.mobile-link--active { color: var(--color-accent); background: var(--color-accent-dim); }

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .navbar-links { display: none; }
  .mobile-toggle { display: flex; }
  .mobile-menu { display: flex; }
}
</style>
