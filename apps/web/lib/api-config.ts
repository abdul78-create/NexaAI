/**
 * Centralized API configuration for NexaAI web client.
 * In browser/client context, always routes through same-origin relative '/api/v1' to use Next.js reverse proxy.
 * In server context, uses NEXT_PUBLIC_API_URL or INTERNAL_API_URL with normalized '/api/v1' suffix.
 */
export function getApiBaseUrl(): string {
  // 1. In browser/client context, ALWAYS use same-origin relative proxy
  if (typeof window !== 'undefined') {
    return '/api/v1'
  }

  // 2. In server context, use explicit backend URL
  const rawUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.INTERNAL_API_URL?.trim()
  if (rawUrl) {
    const cleaned = rawUrl.replace(/\/+$/, '')
    return cleaned.endsWith('/api/v1') ? cleaned : `${cleaned}/api/v1`
  }

  return 'http://localhost:8000/api/v1'
}

export const API_BASE = getApiBaseUrl()

