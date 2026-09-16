'use client'

import React from 'react'
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
  const currentTheme = preferences?.theme || 'dark'

  const themes = [
    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Optimized OLED dark aesthetic (Default)' },
    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'High-contrast light surface' },
    { id: 'system', label: 'System Default', icon: Monitor, desc: 'Syncs with operating system theme' },
  ]

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Palette className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-100">Appearance & Theme Preferences</h3>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-medium text-slate-300">Theme Preference</label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => {
            const Icon = t.icon
            const isSelected = currentTheme === t.id

            return (
              <div
                key={t.id}
                onClick={() => onUpdate({ theme: t.id })}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-indigo-600 text-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{t.label}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-medium text-slate-200">Reduced Motion</h4>
            <p className="text-[11px] text-slate-400">Minimize UI animations and transitions.</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdate({ reduced_motion: !preferences?.reduced_motion })}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              preferences?.reduced_motion ? 'bg-indigo-600' : 'bg-slate-800'
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
