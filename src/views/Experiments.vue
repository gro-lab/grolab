<!--
  ──────────────────────────────────────────────
  Experiments.vue — Sandbox / Lab
  ──────────────────────────────────────────────
  A playground for trying things out.
  Includes a small JS eval console and space
  for future experiments.

  This is intentionally loose — it's your sandbox.
  ──────────────────────────────────────────────
-->

<script setup>
import { ref } from 'vue'

// ── Mini Console State ──
const codeInput = ref('// Try something\nJSON.stringify({ tool: "grolab", version: "0.1" }, null, 2)')
const output = ref('')
const outputType = ref('') // 'success' | 'error'

/**
 * Evaluate the code input and display the result.
 * Uses indirect eval to run in global scope.
 * Catches errors and displays them gracefully.
 */
function runCode() {
  try {
    // Indirect eval — runs in global scope
    const result = (0, eval)(codeInput.value)
    output.value = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    outputType.value = 'success'
  } catch (err) {
    output.value = `${err.name}: ${err.message}`
    outputType.value = 'error'
  }
}

function clearConsole() {
  output.value = ''
  outputType.value = ''
}

// ── Experiment ideas (just for UI display) ──
const ideas = [
  { title: 'Regex Tester', desc: 'Live regex pattern matching with visual highlighting', status: 'idea' },
  { title: 'Color Palette Generator', desc: 'Extract dominant colors from an image or URL', status: 'idea' },
  { title: 'JSON Formatter', desc: 'Paste raw JSON and view it formatted and validated', status: 'idea' },
  { title: 'Base64 Encoder', desc: 'Encode/decode strings and files to Base64', status: 'idea' },
]
</script>

<template>
  <div class="experiments-page">
    <!-- Header -->
    <header class="page-header">
      <div class="page-header-top">
        <h1 class="page-title">
          <span class="page-icon">⚗</span>
          Experiments
        </h1>
        <span class="tag tag-warning">sandbox</span>
      </div>
      <p class="page-desc">
        A place for trying things out. Run quick JavaScript, prototype ideas, break things.
      </p>
    </header>

    <!-- Mini Console -->
    <section class="console-section">
      <div class="console-toolbar">
        <span class="section-label">Quick Console</span>
        <div class="toolbar-actions">
          <button class="btn btn-primary" @click="runCode">Run</button>
          <button class="btn btn-ghost" @click="clearConsole">Clear</button>
        </div>
      </div>

      <textarea
        v-model="codeInput"
        class="code-textarea"
        spellcheck="false"
        @keydown.ctrl.enter="runCode"
        @keydown.meta.enter="runCode"
      ></textarea>

      <div
        v-if="output"
        class="console-output"
        :class="{
          'console-output--success': outputType === 'success',
          'console-output--error': outputType === 'error',
        }"
      >
        <span class="output-label">{{ outputType === 'error' ? 'Error' : 'Output' }}</span>
        <pre class="output-text">{{ output }}</pre>
      </div>

      <p class="console-hint">Ctrl+Enter to run</p>
    </section>

    <!-- Future experiment ideas -->
    <section class="ideas-section">
      <h2 class="section-label">Experiment Ideas</h2>
      <div class="ideas-grid">
        <div v-for="idea in ideas" :key="idea.title" class="idea-card">
          <h3 class="idea-title">{{ idea.title }}</h3>
          <p class="idea-desc">{{ idea.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.experiments-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

/* ── Header ── */
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
}

.page-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ── Section Label ── */
.section-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Console ── */
.console-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.console-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
}

.code-textarea {
  min-height: 140px;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.console-output {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.console-output--success {
  background: var(--color-accent-dim);
  border-color: rgba(34, 211, 167, 0.2);
}

.console-output--error {
  background: var(--color-danger-dim);
  border-color: rgba(240, 80, 110, 0.2);
}

.output-label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--space-2);
}

.output-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.console-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-align: right;
}

/* ── Ideas Grid ── */
.ideas-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.idea-card {
  padding: var(--space-4);
  background: var(--color-bg-raised);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  opacity: 0.6;
  transition: opacity var(--duration-normal) ease;
}
.idea-card:hover {
  opacity: 0.85;
}

.idea-title {
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.idea-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}
</style>
