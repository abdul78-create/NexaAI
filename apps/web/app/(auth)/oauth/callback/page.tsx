'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { getApiBaseUrl } from '@/lib/api-config'

const API_BASE = getApiBaseUrl()

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((s) => s.setSession)

  const [statusText, setStatusText] = useState('Verifying authentication credentials...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function processCallback() {
      const code = searchParams.get('code')
      const token = searchParams.get('token')
      const state = searchParams.get('state')
      let provider = searchParams.get('provider')

      // Case 1: Direct token provided in redirect
      if (token) {
        setStatusText('Finalizing session...')
        await setSession(token)
        router.push('/app')
        return
      }

      // Case 2: Code exchange required
      if (!code) {
        const errorDesc = searchParams.get('error_description') || searchParams.get('error')
        setErrorMessage(errorDesc || 'No authorization code or session token received.')
        return
      }

      // Infer provider from pathname or query if not explicit
      if (!provider) {
        if (window.location.pathname.includes('github')) {
          provider = 'github'
        } else {
          provider = 'google'
        }
      }

      try {
        setStatusText(`Connecting with ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`)
        const res = await fetch(`${API_BASE}/auth/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            code,
            state: state || undefined,
          }),
          credentials: 'include',
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.detail || 'OAuth authorization exchange failed.')
        }

        const data = await res.json()
        await setSession(data.access_token)
        router.push('/app')
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.')
      }
    }

    processCallback()
  }, [searchParams, router, setSession])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl p-8 shadow-2xl">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl gradient-brand text-white shadow-md">
          <Sparkles className="size-6" />
        </div>

        {errorMessage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-destructive font-semibold">
              <AlertCircle className="size-5" />
              <span>Authentication Error</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Completing Sign In</h2>
            <div className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              <span>{statusText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
