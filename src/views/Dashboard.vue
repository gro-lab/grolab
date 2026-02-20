<!--
  ──────────────────────────────────────────────
  Dashboard.vue — Tools Overview
  ──────────────────────────────────────────────
  Landing page showing all available tools
  in a responsive grid. Each tool is a ToolCard
  that links to its dedicated page.
  ──────────────────────────────────────────────
-->

<script setup>
import { ref } from 'vue'
import ToolCard from '../components/ToolCard.vue'

/**
 * Tool definitions.
 * Add new tools here — the dashboard renders automatically.
 * Set status to 'wip' or 'planned' for unreleased tools.
 */
const tools = ref([
  {
    title: 'Website Crawler',
    description: 'Enter a URL and inspect its HTML, CSS, assets, and structure. Powered by mock data for now — backend ready.',
    to: '/crawler',
    icon: '🕷',
    status: 'ready',
  },
  {
    title: 'HTML Viewer',
    description: 'Paste or load raw HTML and view it formatted with line numbers and structure analysis.',
    to: '/html-viewer',
    icon: '◇',
    status: 'ready',
  },
  {
    title: 'CSS Inspector',
    description: 'Extract and analyze CSS rules from any page. View specificity, selectors, and declarations.',
    to: '/experiments',
    icon: '✦',
    status: 'planned',
  },
  {
    title: 'Experiments',
    description: 'Sandbox for prototyping ideas, testing concepts, and trying new web APIs.',
    to: '/experiments',
    icon: '⚗',
    status: 'ready',
  },
])
</script>

<template>
  <div class="dashboard">
    <!-- Hero section -->
    <header class="hero">
      <div class="hero-label">
        <span class="tag tag-accent">v0.1</span>
        <span class="hero-label-text">Web Engineering Lab</span>
      </div>
      <h1 class="hero-title">
        <span class="hero-accent">G.</span> grolab
      </h1>
      <p class="hero-subtitle">
        A personal collection of web tools — crawl, inspect, experiment.
        Built for learning, designed for real work.
      </p>
    </header>

    <!-- Tools grid -->
    <section class="tools-section">
      <h2 class="section-heading">Tools</h2>
      <div class="tools-grid">
        <ToolCard
          v-for="tool in tools"
          :key="tool.to"
          :title="tool.title"
          :description="tool.description"
          :to="tool.to"
          :icon="tool.icon"
          :status="tool.status"
        />
      </div>
    </section>

    <!-- Quick stats -->
    <section class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ tools.filter(t => t.status === 'ready').length }}</span>
        <span class="stat-label">Ready</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ tools.filter(t => t.status === 'wip').length }}</span>
        <span class="stat-label">In Progress</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ tools.filter(t => t.status === 'planned').length }}</span>
        <span class="stat-label">Planned</span>
      </div>
      <div class="stat">
        <span class="stat-value mono text-muted">mock</span>
        <span class="stat-label">Backend</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

/* ── Hero ── */
.hero {
  padding: var(--space-8) 0 var(--space-4);
}

.hero-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.hero-label-text {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-title {
  font-family: var(--font-mono);
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}

.hero-accent {
  color: var(--color-accent);
}

.hero-subtitle {
  font-size: var(--text-md);
  color: var(--color-text-secondary);
  max-width: 520px;
  line-height: var(--leading-normal);
}

/* ── Section ── */
.section-heading {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--space-4);
}

/* ── Tools Grid ── */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

/* ── Stats Bar ── */
.stats-bar {
  display: flex;
  gap: var(--space-8);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-6);
  }
}
</style>
