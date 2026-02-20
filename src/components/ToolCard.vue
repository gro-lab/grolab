<!--
  ──────────────────────────────────────────────
  ToolCard.vue — Dashboard Tool Card
  ──────────────────────────────────────────────
  Reusable card displayed on the dashboard grid.
  Shows tool name, description, status, and icon.
  Navigates to the tool page on click.
  ──────────────────────────────────────────────
-->

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  /** Tool display name */
  title: { type: String, required: true },
  /** Short description of what the tool does */
  description: { type: String, default: '' },
  /** Route path (e.g. '/crawler') */
  to: { type: String, required: true },
  /** Emoji or text icon */
  icon: { type: String, default: '⚙' },
  /** Status label: 'ready', 'wip', 'planned' */
  status: {
    type: String,
    default: 'ready',
    validator: (v) => ['ready', 'wip', 'planned'].includes(v),
  },
})

const router = useRouter()

function navigate() {
  if (props.status !== 'planned') {
    router.push(props.to)
  }
}

const statusLabel = {
  ready: 'Ready',
  wip: 'WIP',
  planned: 'Planned',
}

const statusClass = {
  ready: 'tag-accent',
  wip: 'tag-warning',
  planned: 'tag-info',
}
</script>

<template>
  <article
    class="tool-card"
    :class="{
      'tool-card--clickable': status !== 'planned',
      'tool-card--planned': status === 'planned',
    }"
    role="button"
    :tabindex="status !== 'planned' ? 0 : -1"
    @click="navigate"
    @keydown.enter="navigate"
  >
    <!-- Icon area -->
    <div class="tool-card-icon">
      {{ icon }}
    </div>

    <!-- Content -->
    <div class="tool-card-content">
      <div class="tool-card-header">
        <h3 class="tool-card-title">{{ title }}</h3>
        <span class="tag" :class="statusClass[status]">
          {{ statusLabel[status] }}
        </span>
      </div>
      <p class="tool-card-desc">{{ description }}</p>
    </div>

    <!-- Arrow indicator -->
    <div v-if="status !== 'planned'" class="tool-card-arrow">→</div>
  </article>
</template>

<style scoped>
.tool-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-normal) var(--ease-out),
              background var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.tool-card--clickable {
  cursor: pointer;
}
.tool-card--clickable:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}
.tool-card--clickable:hover .tool-card-arrow {
  opacity: 1;
  transform: translateX(0);
}

.tool-card--planned {
  opacity: 0.5;
  cursor: default;
}

/* ── Icon ── */
.tool-card-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: var(--text-lg);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

/* ── Content ── */
.tool-card-content {
  flex: 1;
  min-width: 0;
}

.tool-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.tool-card-title {
  font-size: var(--text-md);
  font-weight: 600;
}

.tool-card-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

/* ── Arrow ── */
.tool-card-arrow {
  flex-shrink: 0;
  align-self: center;
  font-family: var(--font-mono);
  font-size: var(--text-md);
  color: var(--color-accent);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}
</style>
