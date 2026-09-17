/**
 * NexaAI Auth API client
 * Handles communication with the FastAPI authentication backend.
 */

import { AuthTokens, LoginPayload, RegisterPayload, User } from '@/types/auth'
import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

interface BackendUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  has_password?: boolean
  oauth_providers?: string[]
  usage?: {
    total_tokens: number
    conversations: number
    documents: number
  }
}

interface BackendTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user?: BackendUser
}

function mapBackendUser(bUser: BackendUser): User {
  return {
    id: bUser.id,
    email: bUser.email,
    displayName: bUser.display_name,
    avatarUrl: bUser.avatar_url,
    isActive: bUser.is_active,
    isVerified: bUser.is_verified,
    createdAt: bUser.created_at,
    hasPassword: bUser.has_password,
    oauthProviders: bUser.oauth_providers || [],
    usage: bUser.usage
      ? {
          totalTokens: bUser.usage.total_tokens,
          conversations: bUser.usage.conversations,
          documents: bUser.usage.documents,
        }
      : undefined,
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
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
      // Fallback to default message
    }
    throw new Error(errorMsg)
  }
  if (res.status === 204) {
    return {} as T
  }
  return res.json()
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      display_name: payload.displayName,
    }),
  })
  const data = await handleResponse<BackendUser>(res)
  return mapBackendUser(data)
}

export async function loginUser(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // receives HttpOnly refresh cookie
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<BackendTokenResponse>(res)
  const user = data.user ? mapBackendUser(data.user) : await fetchCurrentUser(data.access_token)

  return {
    user,
    tokens: {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      user,
    },
  }
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const data = await handleResponse<BackendUser>(res)
  return mapBackendUser(data)
}

export async function refreshAccessToken(): Promise<{ accessToken: string; user?: User }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends refresh token cookie
  })
  const data = await handleResponse<BackendTokenResponse>(res)
  return {
    accessToken: data.access_token,
    user: data.user ? mapBackendUser(data.user) : undefined,
  }
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include', // clears refresh token cookie
  })
}
