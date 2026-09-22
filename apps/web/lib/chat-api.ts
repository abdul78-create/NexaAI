/**
 * NexaAI Chat API Client
 * Handles communication with the FastAPI chat and conversation backend endpoints,
 * including SSE streaming via fetch().
 */

import type { Conversation, Message } from '../types/chat'
import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

export interface BackendMessage {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  model?: string
  input_tokens: number
  output_tokens: number
  created_at: string
  parent_message_id?: string | null
  sibling_index?: number
  sibling_count?: number
  sibling_ids?: string[]
}

export interface BackendConversation {
  id: string
  user_id: string
  title: string
  model: string
  is_archived: boolean
  is_pinned?: boolean
  folder_id?: string | null
  deleted_at?: string | null
  active_leaf_message_id?: string | null
  created_at: string
  updated_at: string
  messages?: BackendMessage[]
}

export function mapBackendMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    createdAt: m.created_at,
    model: m.model,
    status: 'done',
    tokens: m.output_tokens || m.input_tokens,
    parentMessageId: m.parent_message_id ?? null,
    siblingIndex: m.sibling_index ?? 1,
    siblingCount: m.sibling_count ?? 1,
    siblingIds: m.sibling_ids ?? [m.id],
  }
}

function mapBackendConversation(bConv: BackendConversation): Conversation {
  return {
    id: bConv.id,
    title: bConv.title,
    createdAt: bConv.created_at,
    updatedAt: bConv.updated_at,
    modelId: bConv.model || 'nexa-standard',
    pinned: bConv.is_pinned ?? false,
    isArchived: bConv.is_archived ?? false,
    folderId: bConv.folder_id ?? null,
    deletedAt: bConv.deleted_at ?? null,
    activeLeafMessageId: bConv.active_leaf_message_id ?? null,
    messages: bConv.messages ? bConv.messages.map(mapBackendMessage) : [],
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

export async function fetchUserConversations(
  token: string,
  options?: { include_archived?: boolean; folder_id?: string; is_pinned?: boolean }
): Promise<Conversation[]> {
  const params = new URLSearchParams()
  if (options?.include_archived) params.append('include_archived', 'true')
  if (options?.folder_id) params.append('folder_id', options.folder_id)
  if (options?.is_pinned !== undefined) params.append('is_pinned', String(options.is_pinned))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE}/chat/conversations${queryString}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendConversation[]>(res)
  return data.map(mapBackendConversation)
}

export async function fetchTrashedConversations(token: string): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chat/conversations/trash`, {
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
  payload: { title?: string; model?: string; folder_id?: string }
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
  updates: {
    title?: string
    is_archived?: boolean
    is_pinned?: boolean
    folder_id?: string | null
    model?: string
  }
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

export async function trashConversationApi(token: string, conversationId: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/trash`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendConversation>(res)
  return mapBackendConversation(data)
}

export async function restoreConversationApi(token: string, conversationId: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendConversation>(res)
  return mapBackendConversation(data)
}

export async function purgeConversationApi(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/purge`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  await handleJsonResponse<void>(res)
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
  payload: { conversation_id?: string; content: string; model?: string; mode?: string },
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
  let currentEvent = 'token'
  let dataBuffer: string[] = []
  let hasFinished = false

  const dispatchEvent = () => {
    if (dataBuffer.length === 0) return
    const rawData = dataBuffer.join('\n')
    dataBuffer = []
    const eventName = currentEvent || 'token'
    currentEvent = 'token' // Reset event type for the next SSE message per spec

    if (rawData.trim() === '[DONE]') {
      hasFinished = true
      onEvent('message_end', { finish_reason: 'stop' })
      return
    }

    try {
      const parsed = JSON.parse(rawData)
      if (eventName === 'message_end' || eventName === 'error') {
        hasFinished = true
      }
      onEvent(eventName, parsed)
    } catch {
      // Plain-text token fallback
      onEvent(eventName, { text: rawData })
    }
  }

  const processLine = (line: string) => {
    // Standard SSE comment or empty line
    if (line.startsWith(':')) {
      return
    }
    if (line === '') {
      dispatchEvent()
      return
    }

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      // Slice after "data:" and drop single leading space if present
      let dataPayload = line.slice(5)
      if (dataPayload.startsWith(' ')) {
        dataPayload = dataPayload.slice(1)
      }
      dataBuffer.push(dataPayload)
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || '' // Retain trailing partial line in buffer

      for (const line of lines) {
        processLine(line)
      }
    }

    // Process any remaining bytes at stream close
    buffer += decoder.decode()
    if (buffer) {
      const finalLines = buffer.split(/\r?\n/)
      for (const line of finalLines) {
        processLine(line)
      }
    }
    // Flush any pending data buffer
    dispatchEvent()

    // Safety guarantee: If stream closed without an explicit message_end or error event,
    // dispatch a synthetic message_end so UI state never stays generating indefinitely.
    if (!hasFinished) {
      hasFinished = true
      onEvent('message_end', { finish_reason: 'stop', synthetic: true })
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // Ignore cleanup error if already released
    }
  }
}

export interface BackendBranchSelectResponse {
  active_leaf_message_id: string
  messages: BackendMessage[]
}

export async function selectBranchApi(
  token: string,
  conversationId: string,
  messageId: string
): Promise<{ activeLeafMessageId: string; messages: Message[] }> {
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/select-branch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ message_id: messageId }),
  })
  const data = await handleJsonResponse<BackendBranchSelectResponse>(res)
  return {
    activeLeafMessageId: data.active_leaf_message_id,
    messages: data.messages.map(mapBackendMessage),
  }
}

export async function editMessageApi(
  token: string,
  messageId: string,
  content: string
): Promise<{ activeLeafMessageId: string; messages: Message[] }> {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}/edit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  const data = await handleJsonResponse<BackendBranchSelectResponse>(res)
  return {
    activeLeafMessageId: data.active_leaf_message_id,
    messages: data.messages.map(mapBackendMessage),
  }
}

export async function regenerateMessageApi(
  token: string,
  messageId: string
): Promise<{ activeLeafMessageId: string; messages: Message[] }> {
  const res = await fetch(`${API_BASE}/chat/messages/${messageId}/regenerate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendBranchSelectResponse>(res)
  return {
    activeLeafMessageId: data.active_leaf_message_id,
    messages: data.messages.map(mapBackendMessage),
  }
}

