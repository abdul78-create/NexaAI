'use client'

import React, { useState } from 'react'
import { UserProfile, updateUserProfile } from '@/lib/settings-api'
import { User, Mail, Calendar, Save, Check } from 'lucide-react'

interface ProfileSettingsProps {
  profile: UserProfile | null
  onProfileUpdated: (updated: UserProfile) => void
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateUserProfile({ display_name: displayName.trim() })
      onProfileUpdated(updated)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <User className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-foreground">User Profile Settings</h3>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            min="2"
            max="100"
            className="w-full max-w-md px-3.5 py-2.5 bg-background border border-border focus:border-indigo-500 rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email Address
          </label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full max-w-md px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Email address cannot be modified directly for security compliance.</p>
        </div>

        {profile?.created_at && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
            <Calendar className="w-3.5 h-3.5" />
            Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {savedSuccess ? 'Profile Saved!' : isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  )
}
