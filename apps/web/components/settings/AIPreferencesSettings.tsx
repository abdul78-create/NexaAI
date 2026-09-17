'use client'

import React from 'react'
import { UserPreferences } from '@/lib/settings-api'
import { Sparkles, Eye, FileSearch, ShieldCheck, Zap, Layers, Flame, Check } from 'lucide-react'

interface AIPreferencesSettingsProps {
  preferences: UserPreferences | null
  onUpdate: (updates: Partial<UserPreferences>) => void
}

export const AIPreferencesSettings: React.FC<AIPreferencesSettingsProps> = ({
  preferences,
  onUpdate,
}) => {
  const currentModel = preferences?.default_model || 'quick'

  const chatModes = [
    {
      id: 'quick',
      name: 'Quick Mode',
      model: 'Fast & Lightweight',
      desc: 'Lightning fast responses with lowest latency. Ideal for everyday chats.',
      badge: 'Unlimited',
      badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      icon: Zap,
    },
    {
      id: 'standard',
      name: 'Standard Mode',
      model: 'GPT-4o Mini',
      desc: 'Balanced reasoning and high precision for coding, analysis, and writing.',
      badge: 'Standard Quota',
      badgeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      icon: Layers,
    },
    {
      id: 'high',
      name: 'High Mode',
      model: 'GPT-4o Omni',
      desc: 'Deep multi-step reasoning, architectural synthesis, and mathematical proofs.',
      badge: '5 Daily Limit',
      badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      icon: Flame,
    },
  ]

  const isModeSelected = (modeId: string) => {
    if (modeId === 'quick') return currentModel === 'quick' || currentModel === 'nexa-standard' || currentModel === 'fast'
    if (modeId === 'standard') return currentModel === 'standard' || currentModel === 'gpt-4o-mini' || currentModel === 'nexa-pro'
    if (modeId === 'high') return currentModel === 'high' || currentModel === 'gpt-4o'
    return false
  }

  return (
    <div className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-foreground">AI & Chat Mode Defaults</h3>
      </div>

      <div className="space-y-5">
        {/* Default Chat Mode */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground">Default Chat Mode</label>
            <p className="text-[11px] text-muted-foreground">Select the default intelligence profile used when launching new conversations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {chatModes.map((mode) => {
              const Icon = mode.icon
              const isSelected = isModeSelected(mode.id)

              return (
                <div
                  key={mode.id}
                  onClick={() => onUpdate({ default_model: mode.id })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-muted/40 hover:bg-muted border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-background border border-border text-indigo-500">
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected ? (
                      <span className="p-1 rounded-full bg-primary text-primary-foreground">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mode.badgeColor}`}>
                        {mode.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground">{mode.name}</h4>
                      {isSelected && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${mode.badgeColor}`}>
                          {mode.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{mode.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" /> Auto-OCR Preprocessing
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Automatically extract text from image attachments when sending to text-only models.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ auto_ocr_enabled: !preferences?.auto_ocr_enabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.auto_ocr_enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences?.auto_ocr_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-indigo-500" /> Auto Document Context (RAG)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Automatically retrieve semantic chunks from document attachments to answer chat prompts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ auto_rag_enabled: !preferences?.auto_rag_enabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.auto_rag_enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences?.auto_rag_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Provider Disclosures
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Show explicit provider badges (OpenAI, Tesseract, Mock Mode) in analysis UI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ show_provider_disclosures: !preferences?.show_provider_disclosures })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.show_provider_disclosures ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences?.show_provider_disclosures ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
