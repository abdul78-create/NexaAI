'use client'

import React from 'react'
import { Smile, Frown, Meh, Sparkles, HeartHandshake } from 'lucide-react'
import { SentimentData, EmotionData } from '@/lib/nlp-api'
import { cn } from '@/lib/utils'

interface SentimentCardProps {
  sentiment: SentimentData
  emotions: EmotionData
  intent: string
}

export function SentimentCard({ sentiment, emotions, intent }: SentimentCardProps) {
  const getSentimentIcon = () => {
    if (sentiment.label === 'POSITIVE') return <Smile className="size-6 text-emerald-400" />
    if (sentiment.label === 'NEGATIVE') return <Frown className="size-6 text-rose-400" />
    return <Meh className="size-6 text-amber-400" />
  }

  const getBadgeColor = () => {
    if (sentiment.label === 'POSITIVE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (sentiment.label === 'NEGATIVE') return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Sentiment Gauge Card */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {getSentimentIcon()}
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sentiment Analysis</h3>
              <p className="text-xs text-muted-foreground">Polarity and compound score metrics</p>
            </div>
          </div>
          <span className={cn('text-xs font-mono font-bold px-2.5 py-1 rounded-full border', getBadgeColor())}>
            {sentiment.label}
          </span>
        </div>

        {/* Polarity Progress Bars */}
        <div className="space-y-3 pt-2">
          {/* Positive */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-400">Positive</span>
              <span className="font-mono text-muted-foreground">{(sentiment.positive_score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, sentiment.positive_score * 100)}%` }}
              />
            </div>
          </div>

          {/* Neutral */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-amber-400">Neutral</span>
              <span className="font-mono text-muted-foreground">{(sentiment.neutral_score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, sentiment.neutral_score * 100)}%` }}
              />
            </div>
          </div>

          {/* Negative */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-rose-400">Negative</span>
              <span className="font-mono text-muted-foreground">{(sentiment.negative_score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, sentiment.negative_score * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Compound Polarity Score Footer */}
        <div className="mt-auto border-t border-white/5 pt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Compound Polarity Score:</span>
          <span className="font-mono font-bold text-foreground">
            {sentiment.compound_score > 0 ? `+${sentiment.compound_score}` : sentiment.compound_score}
          </span>
        </div>
      </div>

      {/* Emotion & Intent Card */}
      <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <HeartHandshake className="size-5 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Emotion & Intent</h3>
            <p className="text-xs text-muted-foreground">Dominant mood and communicative intent</p>
          </div>
        </div>

        {/* Intent Badge */}
        <div className="rounded-lg bg-white/5 border border-white/5 p-3 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">Classified Intent</span>
          <span className="text-xs font-medium text-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-brand" />
            {intent}
          </span>
        </div>

        {/* Emotion Distribution Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Dominant Emotion:</span>
            <strong className="text-brand font-semibold">{emotions.dominant_emotion}</strong>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {Object.entries(emotions.scores).map(([emotionName, score]) => (
              <div
                key={emotionName}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs',
                  emotionName === emotions.dominant_emotion
                    ? 'bg-brand/10 border-brand/30 text-brand font-medium'
                    : 'bg-white/5 border-white/5 text-muted-foreground'
                )}
              >
                <span>{emotionName}</span>
                <span className="font-mono font-bold">{(score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
