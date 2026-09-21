/**
 * Centralized API configuration for NexaAI web client.
 * Ensures API base URL always ends with '/api/v1' without duplicate slashes or prefixes.
 */
export function getApiBaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (rawUrl) {
    // Strip any trailing slashes
    const cleaned = rawUrl.replace(/\/+$/, '')
    // Ensure /api/v1 prefix is appended if omitted
    if (!cleaned.endsWith('/api/v1')) {
      return `${cleaned}/api/v1`
    }
    return cleaned
  }

  // In browser context without explicit absolute URL, use same-origin relative proxy
  if (typeof window !== 'undefined') {
    return '/api/v1'
  }

  // Server-side fallback for internal requests or local dev
  const internalUrl = process.env.INTERNAL_API_URL?.trim()
  if (internalUrl) {
    const cleaned = internalUrl.replace(/\/+$/, '')
    return cleaned.endsWith('/api/v1') ? cleaned : `${cleaned}/api/v1`
  }

  return 'http://localhost:8000/api/v1'
}

export const API_BASE = getApiBaseUrl()

