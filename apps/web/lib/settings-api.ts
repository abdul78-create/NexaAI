/**
 * Frontend client for Phase 15 Settings & User Preferences API.
 */

import { useAuthStore } from '@/stores/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface UserPreferences {
  id: string
  user_id: string
  theme: string
  accent_color: string
  default_model: string
  default_language: string
  auto_ocr_enabled: boolean
  auto_rag_enabled: boolean
  show_provider_disclosures: boolean
  reduced_motion: boolean
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  created_at: string
}


function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await fetch(`${API_BASE}/settings/preferences`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch user preferences')
  return res.json()
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await fetch(`${API_BASE}/settings/preferences`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update user preferences')
  return res.json()
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/settings/profile`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return res.json()
}

export async function updateUserProfile(updates: { display_name?: string }): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/settings/profile`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update user profile')
  return res.json()
}
