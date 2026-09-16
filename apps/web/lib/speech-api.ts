/**
 * Frontend client for Phase 13 Speech Intelligence API.
 */

import { useAuthStore } from '@/stores/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface SpeechTranscriptionResponse {
  id: string
  attachment_id: string
  provider: string
  model_name: string
  language: string
  transcript: string
  status: string
  duration_ms: number
  audio_duration_seconds?: number | null
  is_mock: boolean
  created_at: string
}

export interface SpeechHistoryItem extends SpeechTranscriptionResponse {}

export interface SpeechHistoryList {
  items: SpeechHistoryItem[]
  total: number
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}


/**
 * Trigger Speech-to-Text transcription on an uploaded audio attachment.
 */
export async function transcribeAudioAttachment(
  attachmentId: string,
  language?: string,
  prompt?: string
): Promise<SpeechTranscriptionResponse> {
  const res = await fetch(`${API_BASE}/speech/transcribe`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attachment_id: attachmentId,
      language: language || undefined,
      prompt: prompt || undefined,
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || 'Speech transcription failed')
  }

  return res.json()
}

/**
 * Fetch past transcription history items for current user.
 */
export async function getSpeechHistory(
  limit: number = 50,
  offset: number = 0
): Promise<SpeechHistoryList> {
  const res = await fetch(`${API_BASE}/speech/history?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch speech history')
  }

  return res.json()
}

/**
 * Fetch single transcription record detail.
 */
export async function getSpeechDetail(id: string): Promise<SpeechTranscriptionResponse> {
  const res = await fetch(`${API_BASE}/speech/history/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to fetch speech detail')
  }

  return res.json()
}

/**
 * Delete a transcription record by ID.
 */
export async function deleteSpeechHistory(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/speech/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to delete transcription record')
  }

  return res.json()
}
