// ──────────────────────────────────────────────
// services/api.js — Central API Layer
// ──────────────────────────────────────────────
// All backend communication goes through this module.
// Currently operates in mock mode (returns local JSON).
//
// When you add a real backend:
//   1. Set VITE_API_URL in your .env
//   2. The fetch calls below will route to your server
//   3. No other files need to change
//
// This is the ONLY file that talks to external APIs.
// Views and components never fetch directly.
// ──────────────────────────────────────────────

/**
 * Base URL for the API.
 * Falls back to 'mock' which signals crawlerService
 * to return local mock data instead of fetching.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'mock'

/**
 * Determines if we're running in mock mode.
 * @returns {boolean}
 */
export function isMockMode() {
  return API_BASE === 'mock'
}

/**
 * Generic GET request to the API.
 * @param {string} endpoint - API endpoint path (e.g. '/crawl')
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * Generic POST request to the API.
 * @param {string} endpoint - API endpoint path
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function apiPost(endpoint, body = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
