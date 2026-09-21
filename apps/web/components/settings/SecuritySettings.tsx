'use client'

import React, { useState, useEffect } from 'react'
import { KeyRound, ShieldAlert, LogOut, CheckCircle2, Link2, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getApiBaseUrl } from '@/lib/api-config'

export const SecuritySettings: React.FC = () => {
  const { user, logout } = useAuthStore()
  const [providerAvailability, setProviderAvailability] = useState<{ google: boolean; github: boolean }>({
    google: false,
    github: false,
  })

  useEffect(() => {
    // Check available OAuth providers from backend
    const apiBase = getApiBaseUrl()
    fetch(`${apiBase}/auth/oauth/providers`)
      .then((res) => res.json())
      .then((data) => {
        setProviderAvailability({
          google: Boolean(data.google),
          github: Boolean(data.github),
        })
      })
      .catch(() => {})
  }, [])

  const handleConnectProvider = (provider: 'google' | 'github') => {
    const apiBase = getApiBaseUrl()
    window.location.assign(new URL(`${apiBase}/auth/oauth/url?provider=${provider}`, window.location.origin).href)
  }

  const linkedProviders = user?.oauthProviders || []
  const isGoogleLinked = linkedProviders.includes('google')
  const isGithubLinked = linkedProviders.includes('github')

  return (
    <div className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <KeyRound className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-foreground">Security & Authentication</h3>
      </div>

      <div className="space-y-6 text-xs">
        {/* Connected Accounts Section */}
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-indigo-500" /> Connected Social Accounts
            </h4>
            <p className="text-muted-foreground mt-0.5">
              Link your social accounts for instant one-click login and unified identity management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <div>
                  <span className="font-semibold text-foreground">Google</span>
                  <p className="text-[11px] text-muted-foreground">
                    {isGoogleLinked ? 'Connected' : providerAvailability.google ? 'Available to connect' : 'Not configured'}
                  </p>
                </div>
              </div>

              {isGoogleLinked ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnectProvider('google')}
                  disabled={!providerAvailability.google}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all disabled:opacity-40"
                >
                  <ExternalLink className="w-3 h-3" /> Connect
                </button>
              )}
            </div>

            {/* GitHub */}
            <div className="p-4 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current text-foreground" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <div>
                  <span className="font-semibold text-foreground">GitHub</span>
                  <p className="text-[11px] text-muted-foreground">
                    {isGithubLinked ? 'Connected' : providerAvailability.github ? 'Available to connect' : 'Not configured'}
                  </p>
                </div>
              </div>

              {isGithubLinked ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnectProvider('github')}
                  disabled={!providerAvailability.github}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all disabled:opacity-40"
                >
                  <ExternalLink className="w-3 h-3" /> Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security Info Card */}
        <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> JWT Refresh Token Rotation & Encryption
          </h4>
          <p className="text-muted-foreground leading-relaxed">
            Your active session uses short-lived JWT access tokens paired with rotating HttpOnly refresh tokens. Passwords are salted and hashed using Argon2id with 64MB memory cost. Signing out immediately revokes your active refresh token across all devices.
          </p>
        </div>

        {/* Active Session Management */}
        <div className="pt-2 flex items-center justify-between border-t border-border">
          <div>
            <h4 className="font-medium text-foreground">Active Session Management</h4>
            <p className="text-muted-foreground">Sign out of your account on this browser session.</p>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-semibold rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
