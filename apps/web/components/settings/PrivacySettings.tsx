'use client'

import React, { useState } from 'react'
import { downloadUsageExport } from '@/lib/usage-api'
import { Shield, Download, Lock, Check } from 'lucide-react'

export const PrivacySettings: React.FC = () => {
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true)
    try {
      await downloadUsageExport(format)
      setExported(true)
      setTimeout(() => setExported(false), 2500)
    } catch (e) {
      console.error('Privacy export failed', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-slate-100">Privacy & Data Controls</h3>
      </div>

      <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" /> Data Isolation & Encryption
          </h4>
          <p className="text-slate-400">
            NexaAI enforces strict per-user ownership bounds across all conversations, attachments, vector embeddings, and telemetry logs. Storage paths remain opaque and encrypted at rest.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <h4 className="font-semibold text-slate-200">Export Your Personal Data</h4>
          <p className="text-slate-400">
            Download a complete audit archive of your execution telemetry logs and token usage history.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-700 transition-all"
            >
              {exported ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-indigo-400" />}
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
            >
              {exported ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
