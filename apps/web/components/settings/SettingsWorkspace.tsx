'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  UserPreferences,
  UserProfile,
  getUserPreferences,
  updateUserPreferences,
  getUserProfile,
} from '@/lib/settings-api'
import { ProfileSettings } from './ProfileSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { AIPreferencesSettings } from './AIPreferencesSettings'
import { PrivacySettings } from './PrivacySettings'
import { SecuritySettings } from './SecuritySettings'
import { Settings, User, Palette, Sparkles, Shield, KeyRound, Loader2, AlertCircle } from 'lucide-react'

export const SettingsWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'ai' | 'privacy' | 'security'>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [profRes, prefRes] = await Promise.all([
        getUserProfile(),
        getUserPreferences(),
      ])
      setProfile(profRes)
      setPreferences(prefRes)
    } catch (err: any) {
      setError(err.message || 'Failed to load user settings.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettingsData()
  }, [loadSettingsData])

  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const updated = await updateUserPreferences(updates)
      setPreferences(updated)
    } catch (err: any) {
      console.error('Failed to update preferences', err)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Preferences', icon: Sparkles },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'security', label: 'Security', icon: KeyRound },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            Account Settings Studio
          </h1>
          <p className="text-sm text-slate-400">
            Manage your personal profile, theme preferences, default AI models, and privacy controls.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-2xl">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading user settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tab Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Active Tab Panel */}
          <div className="lg:col-span-9">
            {activeTab === 'profile' && (
              <ProfileSettings profile={profile} onProfileUpdated={(p) => setProfile(p)} />
            )}
            {activeTab === 'appearance' && (
              <AppearanceSettings preferences={preferences} onUpdate={handleUpdatePreferences} />
            )}
            {activeTab === 'ai' && (
              <AIPreferencesSettings preferences={preferences} onUpdate={handleUpdatePreferences} />
            )}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>
      )}
    </div>
  )
}
