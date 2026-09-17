/**
 * Centralized API configuration for NexaAI web client.
 * In browser context, defaults to relative '/api/v1' to seamlessly route through Nginx reverse proxy.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined') {
    return '/api/v1'
  }
  return 'http://localhost:8000/api/v1'
}

export const API_BASE = getApiBaseUrl()
