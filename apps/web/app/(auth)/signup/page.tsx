'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User as UserIcon, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Check, X, Compass } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

export default function SignupPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Password rules validation
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!displayName || !email || !password) {
      setLocalError('Please fill in all required fields.')
      return
    }

    if (!isPasswordValid) {
      setLocalError('Please meet all password requirements before continuing.')
      return
    }

    const success = await register({
      email,
      password,
      displayName,
    })

    if (success) {
      router.push('/app')
    }
  }

  const displayedError = localError || error

  return (
    <div className="w-full max-w-md">
      {/* Signup Card */}
      <div className="relative rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 p-7 sm:p-8 shadow-2xl shadow-primary/5">
        {/* Glowing top border indicator */}
        <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Your Account
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Start using enterprise AI chat, NLP studio & intelligence tools
          </p>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in-50 duration-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="leading-snug">{displayedError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative flex items-center">
              <UserIcon className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Abdul Developer"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/80 border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/80 border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background/80 border border-border text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Validation Checklist */}
          {password.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-xs text-muted-foreground animate-in fade-in-50 duration-200">
              <div className="font-medium text-foreground/80 mb-1">Password requirements:</div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-medium' : ''}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 opacity-50" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-medium' : ''}`}>
                  {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 opacity-50" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-500 font-medium' : ''}`}>
                  {hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 opacity-50" />}
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-medium' : ''}`}>
                  {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 opacity-50" />}
                  <span>One number</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || (password.length > 0 && !isPasswordValid)}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary via-primary to-accent hover:opacity-95 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create NexaAI Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <span className="relative px-3 bg-card text-xs text-muted-foreground font-medium">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Third-Party OAuth Providers */}
        <div className="mb-4">
          <OAuthButtons />
        </div>

        {/* Guest Access Alternative */}
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="w-full py-2.5 px-4 rounded-xl border border-border/80 hover:border-border hover:bg-muted/40 text-foreground/80 hover:text-foreground font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Compass className="w-4 h-4 text-primary" />
          <span>Continue as Guest (Demo Mode)</span>
        </button>

        {/* Link to Login */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
