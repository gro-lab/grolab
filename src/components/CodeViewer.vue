<!--
  ──────────────────────────────────────────────
  CodeViewer.vue — Code Display Component
  ──────────────────────────────────────────────
  Reusable component for displaying source code.
  Features: copy to clipboard, line numbers,
  language label, scrollable.
  ──────────────────────────────────────────────
-->

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** Source code string to display */
  code: { type: String, default: '' },
  /** Language label shown in header */
  language: { type: String, default: 'text' },
  /** Maximum height before scroll (CSS value) */
  maxHeight: { type: String, default: '400px' },
  /** Show line numbers */
  showLines: { type: Boolean, default: true },
})

const copied = ref(false)

/** Split code into lines for line-number rendering */
const lines = computed(() => {
  if (!props.code) return []
  return props.code.split('\n')
})

/** Copy code to clipboard with visual feedback */
async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // Fallback: older browsers
    const ta = document.createElement('textarea')
    ta.value = props.code
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}
</script>

<template>
  <div class="code-viewer panel">
    <!-- Header bar -->
    <div class="panel-header">
      <span class="code-lang">{{ language }}</span>
      <button class="copy-btn" @click="copyCode" :title="copied ? 'Copied!' : 'Copy code'">
        {{ copied ? '✓ copied' : 'copy' }}
      </button>
    </div>

    <!-- Code area -->
    <div class="code-body" :style="{ maxHeight }">
      <div v-if="code" class="code-scroll">
        <table class="code-table">
          <tbody>
            <tr v-for="(line, i) in lines" :key="i" class="code-line">
              <td v-if="showLines" class="line-number">{{ i + 1 }}</td>
              <td class="line-content"><pre>{{ line }}</pre></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <span class="empty-state-icon">{ }</span>
        <span>No code to display</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-viewer {
  overflow: hidden;
}

.code-lang {
  text-transform: uppercase;
}

.copy-btn {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2px var(--space-2);
  cursor: pointer;
  transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
}
.copy-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.code-body {
  overflow: auto;
}

.code-scroll {
  padding: var(--space-3) 0;
}

.code-table {
  width: 100%;
  border-collapse: collapse;
}

.code-line:hover {
  background: var(--color-bg-hover);
}

.line-number {
  width: 1%;
  min-width: 40px;
  padding: 0 var(--space-3);
  text-align: right;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  user-select: none;
  white-space: nowrap;
  vertical-align: top;
  opacity: 0.5;
}

.line-content {
  padding: 0 var(--space-4);
}

.line-content pre {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.65;
  white-space: pre;
  margin: 0;
}
</style>
