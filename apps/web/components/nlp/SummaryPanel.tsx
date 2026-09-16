'use client'

import React, { useState } from 'react'
import { FileCheck, ListChecks, Sparkles, Copy, Check } from 'lucide-react'
import { SummaryData } from '@/lib/nlp-api'
import { Button } from '@/components/ui/button'

interface SummaryPanelProps {
  summary: SummaryData
  originalText: string
}

export function SummaryPanel({ summary, originalText }: SummaryPanelProps) {
  const [copied, setCopied] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const handleCopy = () => {
    const textToCopy = `EXECUTIVE SUMMARY:\n${summary.executive_summary}\n\nKEY TAKEAWAYS:\n${summary.key_takeaways.join('\n')}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-5 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Executive Summary & Key Takeaways</h3>
            <p className="text-xs text-muted-foreground">
              Condensed context (Compression ratio: {(summary.compression_ratio * 100).toFixed(0)}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md"
          >
            {showOriginal ? 'Hide Original Text' : 'View Side-by-Side Original'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-3 text-xs gap-1.5 border-white/10 hover:bg-white/5"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </Button>
        </div>
      </div>

      <div className={showOriginal ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
        {/* Executive Summary Block */}
        <div className="space-y-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-brand flex items-center gap-2 uppercase tracking-wider">
              <FileCheck className="size-4" />
              Executive Summary
            </h4>
            <p className="text-xs leading-relaxed text-foreground/90 font-sans">
              {summary.executive_summary}
            </p>
          </div>

          {/* Key Takeaways List */}
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
              <ListChecks className="size-4" />
              Key Takeaways
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {summary.key_takeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground/80">
                  <span className="size-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Side-by-Side Original Text View */}
        {showOriginal && (
          <div className="rounded-lg bg-black/40 border border-white/10 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Original Source Text
            </h4>
            <div className="text-xs leading-relaxed text-muted-foreground max-h-80 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
              {originalText}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
