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
  const hasExecutedRef = React.useRef(false)

  const [statusText, setStatusText] = useState('Verifying authentication credentials...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCancelled, setIsCancelled] = useState(false)

  useEffect(() => {
    if (hasExecutedRef.current) {
      return
    }

    const code = searchParams.get('code')
    const token = searchParams.get('token')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    let provider = searchParams.get('provider')

    // Infer provider from pathname or query if not explicit
    if (!provider) {
      if (typeof window !== 'undefined' && window.location.pathname.includes('github')) {
        provider = 'github'
      } else {
        provider = 'google'
      }
    }
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1)

    // Handle user cancellation or provider rejection
    if (error === 'access_denied' || errorDesc?.toLowerCase().includes('access_denied')) {
      setIsCancelled(true)
      setErrorMessage(`Login cancelled. You chose not to sign in with ${providerLabel}.`)
      return
    }

    if (error || errorDesc) {
      setErrorMessage(errorDesc || error || 'Authentication could not be completed. Please try again.')
      return
    }

    // Case 1: Direct token provided in redirect
    if (token) {
      hasExecutedRef.current = true
      setStatusText('Finalizing session...')
      setSession(token).then(() => {
        router.push('/app')
      })
      return
    }

    // Case 2: Code exchange required
    if (!code) {
      setErrorMessage('No authorization code or session token received from provider.')
      return
    }

    hasExecutedRef.current = true

    async function processCallback() {
      try {
        setStatusText(`Connecting with ${providerLabel}...`)

        // Construct canonical redirect URI matching Google Cloud configuration
        const redirectUri =
          typeof window !== 'undefined'
            ? `${window.location.origin}/api/auth/callback/${provider}`
            : undefined

        const res = await fetch(`${API_BASE}/auth/oauth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            code,
            state: state || undefined,
            redirect_uri: redirectUri,
          }),
          credentials: 'include',
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const detail =
            errData?.error?.message ||
            (typeof errData?.detail === 'string' ? errData.detail : null) ||
            'OAuth authorization exchange failed.'
          throw new Error(detail)
        }

        const data = await res.json()
        await setSession(data.access_token)
        router.push('/app')
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : 'Authentication failed.'
        // Never expose sensitive tokens or client secrets in the UI
        const cleanMsg = rawMsg.replace(/(?:key|secret|token)=[a-zA-Z0-9_\-]+/gi, '[REDACTED]')
        setErrorMessage(cleanMsg)
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
              <span>{isCancelled ? 'Sign In Cancelled' : 'Authentication Error'}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
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
