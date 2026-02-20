<!--
  ──────────────────────────────────────────────
  Crawler.vue — Website Crawler Tool
  ──────────────────────────────────────────────
  Core tool page. User enters a URL, clicks Crawl,
  and the UI shows the extracted HTML, CSS rules,
  assets, and metadata.

  Architecture notes:
  - UI logic stays here in the view
  - Business logic is in crawlerService.js
  - API calls go through services/api.js
  - Results are displayed via CodeViewer component
  ──────────────────────────────────────────────
-->

<script setup>
import { ref, computed } from 'vue'
import { crawlWebsite, validateUrl } from '../services/crawlerService.js'
import CodeViewer from '../components/CodeViewer.vue'
import Loader from '../components/Loader.vue'

// ── State ──
const url = ref('')
const result = ref(null)
const error = ref('')
const loading = ref(false)
const activeTab = ref('html')

// ── Tabs definition ──
const tabs = [
  { id: 'html',   label: 'HTML' },
  { id: 'css',    label: 'CSS' },
  { id: 'assets', label: 'Assets' },
  { id: 'meta',   label: 'Meta' },
]

// ── Computed: formatted CSS for code viewer ──
const cssFormatted = computed(() => {
  if (!result.value?.css) return ''
  return result.value.css.join('\n\n')
})

// ── Computed: formatted meta for code viewer ──
const metaFormatted = computed(() => {
  if (!result.value?.meta) return ''
  return JSON.stringify(result.value.meta, null, 2)
})

// ── Computed: formatted assets list ──
const assetsFormatted = computed(() => {
  if (!result.value?.assets) return ''
  return result.value.assets.join('\n')
})

/**
 * Handle crawl form submission.
 * Validates URL, calls crawler service, and
 * updates UI state with results or error.
 */
async function handleCrawl() {
  // Reset state
  error.value = ''
  result.value = null

  // Validate
  const validation = validateUrl(url.value)
  if (!validation.valid) {
    error.value = validation.message
    return
  }

  // Crawl
  loading.value = true
  try {
    result.value = await crawlWebsite(url.value)
    activeTab.value = 'html'
  } catch (err) {
    error.value = err.message || 'Crawl failed. Please try again.'
  } finally {
    loading.value = false
  }
}

/**
 * Clear all state and reset the form.
 */
function clearResults() {
  url.value = ''
  result.value = null
  error.value = ''
  activeTab.value = 'html'
}
</script>

<template>
  <div class="crawler-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="page-header-top">
        <h1 class="page-title">
          <span class="page-icon">🕷</span>
          Website Crawler
        </h1>
        <span class="tag tag-accent">mock mode</span>
      </div>
      <p class="page-desc">
        Enter a URL to inspect its source code, CSS rules, assets, and metadata.
      </p>
    </header>

    <!-- Crawl Input -->
    <div class="crawl-input-area">
      <div class="input-row">
        <input
          v-model="url"
          type="url"
          class="url-input"
          placeholder="https://example.com"
          @keydown.enter="handleCrawl"
          :disabled="loading"
        />
        <button
          class="btn btn-primary crawl-btn"
          @click="handleCrawl"
          :disabled="loading || !url.trim()"
        >
          {{ loading ? 'Crawling…' : 'Crawl' }}
        </button>
        <button
          v-if="result"
          class="btn btn-ghost"
          @click="clearResults"
        >
          Clear
        </button>
      </div>

      <!-- Error message -->
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

    <!-- Loading State -->
    <Loader v-if="loading" label="Crawling website…" />

    <!-- Results -->
    <div v-if="result && !loading" class="results">
      <!-- Stats bar -->
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-val">{{ result.stats?.htmlSize || '—' }}</span>
          <span class="stat-key">bytes</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{{ result.stats?.cssRules || '—' }}</span>
          <span class="stat-key">CSS rules</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{{ result.stats?.assetCount || '—' }}</span>
          <span class="stat-key">assets</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{{ result.stats?.linkCount || '—' }}</span>
          <span class="stat-key">links</span>
        </div>
      </div>

      <!-- Tab navigation -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab content -->
      <div class="tab-content">
        <CodeViewer
          v-if="activeTab === 'html'"
          :code="result.html"
          language="html"
          max-height="500px"
        />

        <CodeViewer
          v-if="activeTab === 'css'"
          :code="cssFormatted"
          language="css"
          max-height="500px"
        />

        <CodeViewer
          v-if="activeTab === 'assets'"
          :code="assetsFormatted"
          language="assets"
          max-height="500px"
          :show-lines="false"
        />

        <CodeViewer
          v-if="activeTab === 'meta'"
          :code="metaFormatted"
          language="json"
          max-height="500px"
        />
      </div>

      <!-- Links section -->
      <div v-if="result.links?.length" class="links-section panel">
        <div class="panel-header">
          <span>Links found</span>
          <span>{{ result.links.length }}</span>
        </div>
        <div class="panel-body links-list">
          <div
            v-for="(link, i) in result.links"
            :key="i"
            class="link-item"
          >
            <span class="link-text">{{ link.text || '(no text)' }}</span>
            <span class="link-href mono">{{ link.href }}</span>
            <span v-if="link.external" class="tag tag-info">external</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crawler-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Page Header ── */
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

/* ── Input Area ── */
.crawl-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-row {
  display: flex;
  gap: var(--space-2);
}

.url-input {
  flex: 1;
}

.crawl-btn {
  min-width: 100px;
}

.error-msg {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-danger);
}

/* ── Results ── */
.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stats Bar ── */
.result-stats {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-4);
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
  font-size: var(--text-lg);
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
  padding-bottom: 0;
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
  transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
  margin-bottom: -1px;
}
.tab-btn:hover {
  color: var(--color-text);
}
.tab-btn--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* ── Links Section ── */
.links-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.link-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}
.link-item:last-child {
  border-bottom: none;
}

.link-text {
  color: var(--color-text);
  font-weight: 500;
  min-width: 120px;
}

.link-href {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .input-row {
    flex-direction: column;
  }

  .result-stats {
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-5);
  }

  .tabs {
    overflow-x: auto;
  }
}
</style>
