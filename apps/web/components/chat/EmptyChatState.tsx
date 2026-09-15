'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Sparkles, Brain, FileText, BarChart3, ArrowUpRight } from 'lucide-react'
import { SUGGESTED_PROMPTS } from '@/lib/mock-data'
import { SuggestedPrompt } from '@/types/chat'
import { Badge } from '@/components/ui/badge'

const ICON_MAP = {
  Sparkles,
  Brain,
  FileText,
  BarChart3,
}

interface EmptyChatStateProps {
  onSelectPrompt: (promptText: string) => void
  modelName: string
}

export function EmptyChatState({ onSelectPrompt, modelName }: EmptyChatStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-2xl w-full"
      >
        {/* Brand Icon Badge */}
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl gradient-brand shadow-xl glow-brand-sm">
          <Sparkles className="size-7 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          What would you like to explore?
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Start a new conversation with <span className="font-semibold text-brand">{modelName}</span>.
          Choose a recommended capability below or type your own question.
        </p>

        {/* Suggested Prompt Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
          {SUGGESTED_PROMPTS.map((item: SuggestedPrompt, index: number) => {
            const Icon = ICON_MAP[item.iconName] || Sparkles

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group relative flex flex-col justify-between rounded-xl border border-white/8 bg-card/60 p-4 transition-all duration-200 hover:border-brand/40 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-brand/5 text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 border-white/10 text-muted-foreground">
                      {item.category}
                    </Badge>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Try this prompt</span>
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
