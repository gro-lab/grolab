<!--
  ──────────────────────────────────────────────
  HtmlViewer.vue — HTML Source Viewer
  ──────────────────────────────────────────────
  Paste raw HTML or load from a URL to view it
  formatted with line numbers.

  Future enhancements:
  - Syntax highlighting
  - DOM tree view
  - Element count breakdown
  ──────────────────────────────────────────────
-->

<script setup>
import { ref, computed } from 'vue'
import CodeViewer from '../components/CodeViewer.vue'

// ── State ──
const rawHtml = ref('')
const viewMode = ref('source') // 'source' | 'preview'

// ── Stats computed from the input ──
const stats = computed(() => {
  const html = rawHtml.value
  if (!html) return null

  const lines = html.split('\n').length
  const bytes = new Blob([html]).size
  const tags = (html.match(/<[a-zA-Z][^>]*>/g) || []).length

  return { lines, bytes, tags }
})

/**
 * Load sample HTML so users can try the viewer immediately.
 */
function loadSample() {
  rawHtml.value = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sample Page</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #333;
    }
    h1 { color: #1a1a2e; }
    .highlight { background: #fff3cd; padding: 2px 6px; }
  </style>
</head>
<body>
  <h1>Hello, Grolab</h1>
  <p>This is a <span class="highlight">sample page</span> for testing the HTML Viewer.</p>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
    <li>Item three</li>
  </ul>
  <footer>
    <p>&copy; 2025 Grolab</p>
  </footer>
</body>
</html>`
}

function clearAll() {
  rawHtml.value = ''
  viewMode.value = 'source'
}
</script>

<template>
  <div class="html-viewer-page">
    <!-- Header -->
    <header class="page-header">
      <div class="page-header-top">
        <h1 class="page-title">
          <span class="page-icon">◇</span>
          HTML Viewer
        </h1>
      </div>
      <p class="page-desc">
        Paste raw HTML to view it formatted with line numbers and stats.
      </p>
    </header>

    <!-- Input area -->
    <div class="input-section">
      <div class="input-toolbar">
        <span class="panel-header-label">Paste HTML</span>
        <div class="toolbar-actions">
          <button class="btn btn-ghost" @click="loadSample">Load sample</button>
          <button v-if="rawHtml" class="btn btn-ghost" @click="clearAll">Clear</button>
        </div>
      </div>
      <textarea
        v-model="rawHtml"
        class="html-textarea"
        placeholder="Paste your HTML here…"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="result-stats">
      <div class="stat-item">
        <span class="stat-val">{{ stats.lines }}</span>
        <span class="stat-key">lines</span>
      </div>
      <div class="stat-item">
        <span class="stat-val">{{ stats.bytes }}</span>
        <span class="stat-key">bytes</span>
      </div>
      <div class="stat-item">
        <span class="stat-val">{{ stats.tags }}</span>
        <span class="stat-key">tags</span>
      </div>
    </div>

    <!-- View mode tabs -->
    <div v-if="rawHtml" class="tabs">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': viewMode === 'source' }"
        @click="viewMode = 'source'"
      >Source</button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': viewMode === 'preview' }"
        @click="viewMode = 'preview'"
      >Preview</button>
    </div>

    <!-- Output -->
    <div v-if="rawHtml">
      <CodeViewer
        v-if="viewMode === 'source'"
        :code="rawHtml"
        language="html"
        max-height="600px"
      />

      <div v-if="viewMode === 'preview'" class="preview-frame panel">
        <div class="panel-header">
          <span>Preview</span>
        </div>
        <iframe
          class="preview-iframe"
          :srcdoc="rawHtml"
          sandbox="allow-same-origin"
          title="HTML Preview"
        ></iframe>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!rawHtml" class="empty-state">
      <span class="empty-state-icon">◇</span>
      <span>Paste HTML above or load a sample to get started</span>
    </div>
  </div>
</template>

<style scoped>
.html-viewer-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.page-header {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.page-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-xl);
  font-weight: 600;
}

.page-icon {
  font-size: var(--text-lg);
  color: var(--color-accent);
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ── Input ── */
.input-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.html-textarea {
  min-height: 180px;
  resize: vertical;
  font-size: var(--text-sm);
  line-height: 1.6;
}

/* ── Stats ── */
.result-stats {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.stat-val {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-accent);
}

.stat-key {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color var(--duration-fast) ease;
  margin-bottom: -1px;
}
.tab-btn:hover { color: var(--color-text); }
.tab-btn--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* ── Preview ── */
.preview-frame {
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  min-height: 400px;
  border: none;
  background: #fff;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}
</style>
