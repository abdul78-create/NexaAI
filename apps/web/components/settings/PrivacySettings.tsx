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
    <div className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <Shield className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-semibold text-foreground">Privacy & Data Controls</h3>
      </div>

      <div className="space-y-4 text-xs text-foreground leading-relaxed">
        <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
          <h4 className="font-semibold text-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500" /> Data Isolation & Encryption
          </h4>
          <p className="text-muted-foreground">
            NexaAI enforces strict per-user ownership bounds across all conversations, attachments, vector embeddings, and telemetry logs. Storage paths remain opaque and encrypted at rest.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <h4 className="font-semibold text-foreground">Export Your Personal Data</h4>
          <p className="text-muted-foreground">
            Download a complete audit archive of your execution telemetry logs and token usage history.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all"
            >
              {exported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5 text-indigo-500" />}
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-sm transition-all"
            >
              {exported ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
