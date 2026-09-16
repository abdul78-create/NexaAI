/**
 * NexaAI Chat API Client
 * Handles communication with the FastAPI chat and conversation backend endpoints,
 * including SSE streaming via fetch().
 */

import { Conversation, Message } from '@/types/chat'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface BackendMessage {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  model?: string
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface BackendConversation {
  id: string
  user_id: string
  title: string
  model: string
  is_archived: boolean
  created_at: string
  updated_at: string
  messages?: BackendMessage[]
}

function mapBackendConversation(bConv: BackendConversation): Conversation {
  return {
    id: bConv.id,
    title: bConv.title,
    createdAt: bConv.created_at,
    updatedAt: bConv.updated_at,
    modelId: bConv.model || 'nexa-standard',
    messages: bConv.messages
      ? bConv.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          createdAt: m.created_at,
          model: m.model,
          status: 'done',
          tokens: m.output_tokens || m.input_tokens,
        }))
      : [],
    group: 'Today',
  }
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message
      } else if (errJson?.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg)
  }
  if (res.status === 204) {
    return {} as T
  }
  return res.json()
}

export async function fetchUserConversations(token: string): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendConversation[]>(res)
  return data.map(mapBackendConversation)
}

export async function fetchConversationDetail(token: string, conversationId: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendConversation>(res)
  return mapBackendConversation(data)
}

export async function createConversationApi(
  token: string,
  payload: { title?: string; model?: string }
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await handleJsonResponse<BackendConversation>(res)
  return mapBackendConversation(data)
}

export async function updateConversationApi(
  token: string,
  conversationId: string,
  updates: { title?: string; is_archived?: boolean; model?: string }
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  })
  const data = await handleJsonResponse<BackendConversation>(res)
  return mapBackendConversation(data)
}

export async function deleteConversationApi(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  await handleJsonResponse<void>(res)
}

/**
 * Stream AI chat completion using SSE over fetch()
 */
export async function streamChatCompletion(
  token: string,
  payload: { conversation_id?: string; content: string; model?: string },
  onEvent: (event: string, data: any) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    let errorMsg = `Streaming request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message
      } else if (errJson?.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg)
  }

  if (!res.body) {
    throw new Error('ReadableStream not supported by browser or empty response body.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || '' // Keep last incomplete line in buffer

    let currentEvent = 'token'

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.slice(6).trim()
      } else if (trimmed.startsWith('data:')) {
        const rawData = trimmed.slice(5).trim()
        try {
          const parsed = JSON.parse(rawData)
          onEvent(currentEvent, parsed)
        } catch {
          // If plain text token
          onEvent(currentEvent, { text: rawData })
        }
      }
    }
  }
}
