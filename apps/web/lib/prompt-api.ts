/**
 * NexaAI Prompt Library API Client
 */

import { useAuthStore } from '@/stores/auth-store'
import {
  PromptCreateInput,
  PromptItem,
  PromptListResponse,
  PromptUpdateInput,
} from '@/types/prompt'
import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

function getHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function fetchPrompts(params?: {
  category?: string
  search?: string
  featured_only?: boolean
}): Promise<PromptListResponse> {
  const query = new URLSearchParams()
  if (params?.category && params.category !== 'all') {
    query.set('category', params.category)
  }
  if (params?.search) {
    query.set('search', params.search)
  }
  if (params?.featured_only) {
    query.set('featured_only', 'true')
  }

  const url = `${API_BASE}/prompts${query.toString() ? `?${query.toString()}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch prompts: ${res.statusText}`)
  }

  return res.json()
}

export async function fetchPrompt(id: string): Promise<PromptItem> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch prompt ${id}: ${res.statusText}`)
  }

  return res.json()
}

export async function createPrompt(data: PromptCreateInput): Promise<PromptItem> {
  const res = await fetch(`${API_BASE}/prompts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create prompt template.')
  }

  return res.json()
}

export async function updatePrompt(id: string, data: PromptUpdateInput): Promise<PromptItem> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update prompt template.')
  }

  return res.json()
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Failed to delete prompt: ${res.statusText}`)
  }
}

export async function recordPromptUse(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/prompts/${id}/use`, {
      method: 'POST',
      headers: getHeaders(),
    })
  } catch {
    // Non-critical telemetry counter
  }
}
