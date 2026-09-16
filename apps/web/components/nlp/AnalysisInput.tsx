'use client'

import React, { useState } from 'react'
import { Sparkles, Trash2, FileText, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnalysisInputProps {
  onAnalyze: (text: string) => void
  isLoading: boolean
}

const SAMPLE_PRESETS = [
  {
    label: 'Tech Announcement',
    text: 'NexaAI is thrilled to announce Phase 7 of our high-performance AI platform built with Python, FastAPI, and Next.js. Our engineering team in London worked around the clock to deliver real-time SSE streaming, Argon2id security, and an advanced NLP Analysis Studio. Early performance metrics show outstanding 99.9% uptime and lightning-fast query execution.',
  },
  {
    label: 'Product Review',
    text: 'I have been using the new NexaAI platform for 3 weeks now. The user interface is sleek and responsive, and the real-time token streaming works without any lag. However, the initial database migration took some configuration. Overall, it is a brilliant product that has boosted my team productivity significantly.',
  },
  {
    label: 'Support Inquiry',
    text: 'Hello support team, I encountered an issue where my JWT authentication token expired while sending a long prompt. Can you please provide guidance on how refresh token rotation handles background session extensions? Thank you for your assistance.',
  },
]

export function AnalysisInput({ onAnalyze, isLoading }: AnalysisInputProps) {
  const [text, setText] = useState('')

  const handlePresetSelect = (presetText: string) => {
    setText(presetText)
  }

  const handleClear = () => {
    setText('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isLoading) return
    onAnalyze(text.trim())
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 shadow-lg flex flex-col gap-4">
      {/* Preset Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Sample Templates
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset.text)}
              className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground border border-white/5 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative rounded-lg border border-white/10 bg-background/50 focus-within:border-brand/50 transition-colors">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type any document, feedback, code comment, or article text here for deep NLP analysis..."
            rows={6}
            className="w-full resize-y bg-transparent p-3.5 text-sm placeholder:text-muted-foreground focus:outline-none scrollbar-thin"
          />
          <div className="flex items-center justify-between border-t border-white/5 px-3 py-2 text-xs text-muted-foreground bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span>Words: <strong className="text-foreground font-mono">{wordCount}</strong></span>
              <span>Chars: <strong className="text-foreground font-mono">{charCount}</strong></span>
            </div>
            {text && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={!text.trim() || isLoading}
            className={cn(
              'gradient-brand text-white text-xs font-semibold px-5 h-9 rounded-lg shadow-md hover:opacity-95 active:scale-95 flex items-center gap-2',
              (!text.trim() || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Analyzing NLP Features...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Analyze Text</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
