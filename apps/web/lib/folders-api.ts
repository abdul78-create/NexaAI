/**
 * NexaAI Folders API Client
 * Communication with FastAPI folder endpoints under /api/v1/folders
 */

import { Folder } from '@/types/chat'
import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

export interface BackendFolder {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

function mapBackendFolder(bFolder: BackendFolder): Folder {
  return {
    id: bFolder.id,
    userId: bFolder.user_id,
    name: bFolder.name,
    color: bFolder.color,
    createdAt: bFolder.created_at,
    updatedAt: bFolder.updated_at,
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

export async function fetchUserFolders(token: string): Promise<Folder[]> {
  const res = await fetch(`${API_BASE}/folders`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  const data = await handleJsonResponse<BackendFolder[]>(res)
  return data.map(mapBackendFolder)
}

export async function createFolderApi(
  token: string,
  payload: { name: string; color?: string }
): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await handleJsonResponse<BackendFolder>(res)
  return mapBackendFolder(data)
}

export async function updateFolderApi(
  token: string,
  folderId: string,
  updates: { name?: string; color?: string }
): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders/${folderId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updates),
  })
  const data = await handleJsonResponse<BackendFolder>(res)
  return mapBackendFolder(data)
}

export async function deleteFolderApi(token: string, folderId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/folders/${folderId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })
  await handleJsonResponse<void>(res)
}
