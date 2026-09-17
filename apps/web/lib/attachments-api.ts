/**
 * NexaAI Attachment API Client — Phase 10 Multimodal Foundation
 *
 * Typed fetch wrapper for the /api/v1/attachments/* endpoints.
 * Matches AttachmentResponse and AttachmentListResponse Pydantic schemas.
 */

import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

export type AttachmentMediaType = 'image' | 'audio' | 'document' | 'video' | 'other'
export type AttachmentStatus = 'uploading' | 'ready' | 'processing' | 'failed' | 'deleted'

export interface AttachmentItem {
  id: string
  user_id: string
  original_filename: string
  mime_type: string
  file_size: number
  media_type: AttachmentMediaType
  status: AttachmentStatus
  checksum_sha256: string
  metadata_json?: string | null
  error_message?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
  download_url?: string | null
}

export interface AttachmentListResponse {
  items: AttachmentItem[]
  total: number
  page: number
  page_size: number
}

// ── Error handling ─────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error?.message) message = body.error.message
      else if (body?.detail) {
        message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      }
    } catch { /* ignore */ }
    throw new Error(message)
  }
  if (res.status === 204) return {} as T
  return res.json()
}

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Upload a file as an attachment.
 * Supports images (JPEG, PNG, WebP, GIF), documents (PDF, DOCX, TXT, MD),
 * and audio (WebM, MP3, WAV, M4A).
 */
export async function uploadAttachment(
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<AttachmentItem> {
  const formData = new FormData()
  formData.append('file', file)

  // Use XMLHttpRequest for upload progress support
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/attachments/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.withCredentials = true

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error('Invalid server response'))
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            reject(new Error(err?.error?.message || err?.detail || `Upload failed (${xhr.status})`))
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        }
      }
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.send(formData)
    })
  }

  const res = await fetch(`${API_BASE}/attachments/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: formData,
  })
  return handleResponse<AttachmentItem>(res)
}

/** List attachments for the authenticated user, optionally filtered by media type. */
export async function fetchAttachments(
  token: string,
  options?: {
    mediaType?: AttachmentMediaType
    page?: number
    pageSize?: number
  }
): Promise<AttachmentListResponse> {
  const params = new URLSearchParams()
  if (options?.mediaType) params.set('media_type', options.mediaType)
  if (options?.page) params.set('page', String(options.page))
  if (options?.pageSize) params.set('page_size', String(options.pageSize))

  const res = await fetch(`${API_BASE}/attachments?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  return handleResponse<AttachmentListResponse>(res)
}

/** Fetch metadata for a single attachment. */
export async function fetchAttachment(token: string, id: string): Promise<AttachmentItem> {
  const res = await fetch(`${API_BASE}/attachments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  return handleResponse<AttachmentItem>(res)
}

/** Delete an attachment. */
export async function deleteAttachment(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  })
  await handleResponse<void>(res)
}

/** Return the streaming download URL for an attachment. */
export function getAttachmentDownloadUrl(id: string): string {
  return `${API_BASE}/attachments/${id}/download`
}

/** Human-readable file size string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
