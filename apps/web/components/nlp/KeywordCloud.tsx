'use client'

import React from 'react'
import { Key, Sparkles } from 'lucide-react'
import { KeywordData } from '@/lib/nlp-api'
import { cn } from '@/lib/utils'

interface KeywordCloudProps {
  keywords: KeywordData[]
}

export function KeywordCloud({ keywords }: KeywordCloudProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Keyword Cloud Visual */}
      <div className="md:col-span-2 rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2">
          <Key className="size-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Keyword & Keyphrase Cloud</h3>
            <p className="text-xs text-muted-foreground">Ranked terminology by TF-IDF & frequency weights</p>
          </div>
        </div>

        {/* Tag Cloud */}
        <div className="flex flex-wrap items-center gap-2 py-3">
          {keywords.map((kw, idx) => {
            const isHigh = kw.relevance >= 0.7
            const isMid = kw.relevance >= 0.4 && kw.relevance < 0.7
            return (
              <div
                key={`${kw.keyword}-${idx}`}
                className={cn(
                  'rounded-lg border px-3 py-1.5 transition-all flex items-center gap-2 hover:scale-105 cursor-pointer',
                  isHigh
                    ? 'bg-brand/15 border-brand/40 text-brand font-bold shadow-sm'
                    : isMid
                    ? 'bg-white/10 border-white/20 text-foreground font-medium'
                    : 'bg-white/5 border-white/5 text-muted-foreground'
                )}
              >
                <span className={cn('text-xs', isHigh && 'text-sm')}>#{kw.keyword}</span>
                <span className="text-[10px] font-mono opacity-85 px-1 py-0.2 rounded bg-black/20 font-bold">
                  {(kw.relevance * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Keywords Relevance List */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-3 shadow-md">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Sparkles className="size-4 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">Ranked Relevance</h3>
        </div>

        <div className="space-y-2.5 overflow-y-auto max-h-60 scrollbar-thin pr-1">
          {keywords.slice(0, 6).map((kw, idx) => (
            <div key={kw.keyword} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground capitalize">
                  {idx + 1}. {kw.keyword}
                </span>
                <span className="font-mono text-muted-foreground">{(kw.relevance * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-cyan-400 rounded-full"
                  style={{ width: `${kw.relevance * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
