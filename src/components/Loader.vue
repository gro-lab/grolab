<!--
  ──────────────────────────────────────────────
  Loader.vue — Loading Indicator
  ──────────────────────────────────────────────
  Pulsing dots animation with optional label.
  Used in Crawler and anywhere async work happens.
  ──────────────────────────────────────────────
-->

<script setup>
defineProps({
  /** Text shown below the dots */
  label: { type: String, default: 'Loading…' },
})
</script>

<template>
  <div class="loader" role="status" aria-live="polite">
    <div class="loader-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
    <span class="loader-label">{{ label }}</span>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<style scoped>
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) 0;
}

.loader-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.loader-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
