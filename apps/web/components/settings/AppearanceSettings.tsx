'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { UserPreferences } from '@/lib/settings-api'
import { Palette, Moon, Sun, Monitor, Check } from 'lucide-react'

interface AppearanceSettingsProps {
  preferences: UserPreferences | null
  onUpdate: (updates: Partial<UserPreferences>) => void
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  preferences,
  onUpdate,
}) => {
  const { theme: activeNextTheme, setTheme } = useTheme()
  const currentTheme = activeNextTheme || preferences?.theme || 'dark'

  const themes = [
    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Optimized OLED dark aesthetic' },
    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'High-contrast light surface' },
    { id: 'system', label: 'System Default', icon: Monitor, desc: 'Syncs with operating system theme' },
  ]

  const handleSelectTheme = (themeId: string) => {
    setTheme(themeId)
    onUpdate({ theme: themeId })
  }

  return (
    <div className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Palette className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-foreground">Appearance & Theme Preferences</h3>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-medium text-foreground">Theme Preference</label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => {
            const Icon = t.icon
            const isSelected = currentTheme === t.id

            return (
              <div
                key={t.id}
                onClick={() => handleSelectTheme(t.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-muted/40 hover:bg-muted border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-background border border-border text-indigo-500">
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground">{t.label}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div>
            <h4 className="text-xs font-medium text-foreground">Reduced Motion</h4>
            <p className="text-[11px] text-muted-foreground">Minimize UI animations and transitions.</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdate({ reduced_motion: !preferences?.reduced_motion })}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              preferences?.reduced_motion ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                preferences?.reduced_motion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
