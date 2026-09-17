'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginPayload, RegisterPayload } from '@/types/auth'
import { loginUser, registerUser, fetchCurrentUser, refreshAccessToken, logoutUser } from '@/lib/auth-api'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (payload: LoginPayload) => Promise<boolean>
  register: (payload: RegisterPayload) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setSession: (accessToken: string) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null })
        try {
          const { user, tokens } = await loginUser(payload)
          set({
            user,
            token: tokens.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return true
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
          set({ isLoading: false, error: message, isAuthenticated: false })
          return false
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null })
        try {
          await registerUser(payload)
          // Automatically log the user in following successful registration
          const loginResult = await get().login({
            email: payload.email,
            password: payload.password,
          })
          return loginResult
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Registration failed.'
          set({ isLoading: false, error: message })
          return false
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await logoutUser()
        } catch {
          // Continue clearing client state even if backend logout had an issue
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      checkAuth: async () => {
        const currentToken = get().token
        if (!currentToken) {
          // Attempt silent refresh via HTTP-only cookie
          try {
            const { accessToken, user } = await refreshAccessToken()
            const freshUser = user || (await fetchCurrentUser(accessToken))
            set({
              token: accessToken,
              user: freshUser,
              isAuthenticated: true,
            })
          } catch {
            set({ user: null, token: null, isAuthenticated: false })
          }
          return
        }

        try {
          const freshUser = await fetchCurrentUser(currentToken)
          set({ user: freshUser, isAuthenticated: true })
        } catch {
          // Token expired, attempt refresh
          try {
            const { accessToken, user } = await refreshAccessToken()
            const freshUser = user || (await fetchCurrentUser(accessToken))
            set({
              token: accessToken,
              user: freshUser,
              isAuthenticated: true,
            })
          } catch {
            set({ user: null, token: null, isAuthenticated: false })
          }
        }
      },

      setSession: async (accessToken: string) => {
        set({ isLoading: true, error: null })
        try {
          const freshUser = await fetchCurrentUser(accessToken)
          set({
            token: accessToken,
            user: freshUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch {
          await get().checkAuth()
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nexaai-auth-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
