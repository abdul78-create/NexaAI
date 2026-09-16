'use client'

import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, Send, Tag, Lightbulb, Box, ShieldAlert, Cpu } from 'lucide-react'
import { VisionAnalysisResponse } from '@/lib/images-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ImageAnalysisPanelProps {
  onAnalyze: (prompt?: string) => Promise<void>
  result: VisionAnalysisResponse | null
  isLoading: boolean
}

export function ImageAnalysisPanel({ onAnalyze, result, isLoading }: ImageAnalysisPanelProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAnalyze(prompt.trim() || undefined)
  }

  return (
    <div className="space-y-4">
      {/* Header & Prompt Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-brand" />
            <span>AI Vision AI Understanding</span>
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">gpt-4o</span>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a question about this image or describe it..."
            disabled={isLoading}
            className="h-9 text-xs bg-white/5 border-white/10"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="h-9 px-3 gradient-brand text-white text-xs gap-1.5 flex-shrink-0"
          >
            <Send className="size-3.5" />
            <span>{prompt.trim() ? 'Ask' : 'Analyze'}</span>
          </Button>
        </div>
      </form>

      {/* Structured Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4"
        >
          {/* Provider & Mock Mode Badge */}
          <div className="flex items-center justify-between border-b border-white/6 pb-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="size-3.5 text-brand" />
              <span>Provider: <strong className="text-foreground uppercase font-mono">{result.provider}</strong></span>
            </div>

            {result.is_mock ? (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="size-3" />
                Mock Mode (Dev/Test)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Vision AI
              </span>
            )}
          </div>

          {/* Description / Answer */}
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">
              {result.answer ? 'Visual Q&A Response' : 'Image Description'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {result.answer || result.description}
            </p>
          </div>

          {/* Detected Objects */}
          {result.objects_detected?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Box className="size-3 text-brand" />
                Detected Elements
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.objects_detected.map((obj, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand"
                  >
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {result.tags?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Tag className="size-3 text-muted-foreground" />
                Visual Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {result.suggested_actions?.length > 0 && (
            <div className="space-y-1.5 border-t border-white/6 pt-3">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Lightbulb className="size-3 text-amber-400" />
                Suggested Actions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.suggested_actions.map((act, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20"
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
