// ──────────────────────────────────────────────
// services/crawlerService.js — Crawler Business Logic
// ──────────────────────────────────────────────
// Encapsulates all crawler-related operations.
// Separates business logic from UI components.
//
// In mock mode: returns mock data with simulated delay.
// In API mode:  forwards to the real backend via api.js.
// ──────────────────────────────────────────────

import { isMockMode, apiPost } from './api.js'
import mockResponse from '../mock/crawlerResponse.json'

/**
 * Validates a URL string.
 * @param {string} url
 * @returns {{ valid: boolean, message: string }}
 */
export function validateUrl(url) {
  if (!url || !url.trim()) {
    return { valid: false, message: 'Please enter a URL' }
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, message: 'URL must start with http:// or https://' }
    }
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: 'Invalid URL format' }
  }
}

/**
 * Crawl a website and return structured results.
 *
 * @param {string} url - The URL to crawl
 * @returns {Promise<CrawlResult>} Crawl results
 *
 * @typedef {Object} CrawlResult
 * @property {string} url - The crawled URL
 * @property {string} title - Page title
 * @property {string} html - Raw HTML source
 * @property {string[]} css - Array of CSS rule strings
 * @property {string[]} assets - Array of discovered asset URLs
 * @property {Object} meta - Page metadata
 * @property {number} timestamp - Crawl timestamp (ms)
 */
export async function crawlWebsite(url) {
  // ── Validate first ──
  const { valid, message } = validateUrl(url)
  if (!valid) {
    throw new Error(message)
  }

  // ── Mock mode: simulate network delay, return mock data ──
  if (isMockMode()) {
    await simulateDelay(800, 1500)
    return {
      ...mockResponse,
      url,
      timestamp: Date.now(),
    }
  }

  // ── API mode: forward to real backend ──
  return apiPost('/crawl', { url })
}

/**
 * Simulate network latency for mock mode.
 * Produces a realistic feel during development.
 *
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 */
function simulateDelay(min = 500, max = 1200) {
  const ms = Math.floor(Math.random() * (max - min)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}
