'use client'

import React from 'react'
import { UserPreferences } from '@/lib/settings-api'
import { Sparkles, Eye, FileSearch, ShieldCheck } from 'lucide-react'

interface AIPreferencesSettingsProps {
  preferences: UserPreferences | null
  onUpdate: (updates: Partial<UserPreferences>) => void
}

export const AIPreferencesSettings: React.FC<AIPreferencesSettingsProps> = ({
  preferences,
  onUpdate,
}) => {
  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-100">AI & Execution Defaults</h3>
      </div>

      <div className="space-y-5">
        {/* Default Model */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Default AI Model
          </label>
          <select
            value={preferences?.default_model || 'nexa-standard'}
            onChange={(e) => onUpdate({ default_model: e.target.value })}
            className="w-full max-w-md px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="nexa-standard">Nexa Standard (Fast & Balanced)</option>
            <option value="nexa-pro">Nexa Pro (Complex Reasoning)</option>
            <option value="gpt-4o">GPT-4o Omni (High Intelligence)</option>
            <option value="gpt-4o-mini">GPT-4o Mini (Ultra Fast)</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" /> Auto-OCR Preprocessing
              </h4>
              <p className="text-[11px] text-slate-400">
                Automatically extract text from image attachments when sending to text-only models.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ auto_ocr_enabled: !preferences?.auto_ocr_enabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.auto_ocr_enabled ? 'bg-indigo-600' : 'bg-slate-800'
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
              <h4 className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-indigo-400" /> Auto Document Context (RAG)
              </h4>
              <p className="text-[11px] text-slate-400">
                Automatically retrieve semantic chunks from document attachments to answer chat prompts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ auto_rag_enabled: !preferences?.auto_rag_enabled })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.auto_rag_enabled ? 'bg-indigo-600' : 'bg-slate-800'
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
              <h4 className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Provider Disclosures
              </h4>
              <p className="text-[11px] text-slate-400">
                Show explicit provider badges (OpenAI, Tesseract, Mock Mode) in analysis UI.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdate({ show_provider_disclosures: !preferences?.show_provider_disclosures })}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences?.show_provider_disclosures ? 'bg-indigo-600' : 'bg-slate-800'
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
