'use client'

import React from 'react'
import { BookOpen, Clock, Mic, Layers, ShieldCheck, ShieldAlert, Award } from 'lucide-react'
import { ReadabilityData, TextStatisticsData, ToxicityData } from '@/lib/nlp-api'
import { cn } from '@/lib/utils'

interface TextStatisticsProps {
  statistics: TextStatisticsData
  readability: ReadabilityData
  safety: ToxicityData
}

export function TextStatistics({ statistics, readability, safety }: TextStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Core Text Metrics */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Layers className="size-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Text Metrics</h3>
            <p className="text-xs text-muted-foreground">Volume and structural counters</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/5 p-3 flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Words</span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5">{statistics.word_count}</span>
          </div>

          <div className="rounded-lg bg-white/5 p-3 flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Characters</span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5">{statistics.character_count}</span>
          </div>

          <div className="rounded-lg bg-white/5 p-3 flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Sentences</span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5">{statistics.sentence_count}</span>
          </div>

          <div className="rounded-lg bg-white/5 p-3 flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Paragraphs</span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5">{statistics.paragraph_count}</span>
          </div>
        </div>
      </div>

      {/* 2. Readability & Times */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <BookOpen className="size-4 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Readability Level</h3>
            <p className="text-xs text-muted-foreground">Flesch-Kincaid & Gunning Fog indices</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">{readability.reading_level}</span>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">Grade {readability.flesch_kincaid_grade}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-brand" /> Reading Time:
            </span>
            <span className="font-mono font-bold text-foreground">{statistics.reading_time_seconds} sec</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Mic className="size-3.5 text-cyan-400" /> Speaking Time:
            </span>
            <span className="font-mono font-bold text-foreground">{statistics.speaking_time_seconds} sec</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-t border-white/5 pt-2">
            <span className="text-muted-foreground">Lexical Diversity:</span>
            <span className="font-mono font-bold text-foreground">{(statistics.lexical_diversity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 3. Safety & Content Quality */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          {safety.is_safe ? (
            <ShieldCheck className="size-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="size-4 text-rose-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Safety & Moderation</h3>
            <p className="text-xs text-muted-foreground">Toxicity and profanity filter evaluation</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'p-3 rounded-lg border flex items-center justify-between',
              safety.is_safe ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
            )}
          >
            <span className="text-xs font-semibold">
              {safety.is_safe ? 'Content Safe & Clean' : 'Safety Warning Detected'}
            </span>
            <span className="text-xs font-mono font-bold">
              Toxicity: {(safety.toxicity_score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profanity Detected:</span>
              <span className={cn('font-bold', safety.profanity_detected ? 'text-rose-400' : 'text-emerald-400')}>
                {safety.profanity_detected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unique Words:</span>
              <span className="font-mono font-bold text-foreground">{statistics.unique_words_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
