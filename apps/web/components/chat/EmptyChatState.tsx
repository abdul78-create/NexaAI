'use client'

import React, { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  Sparkles,
  Code2,
  FileText,
  BarChart3,
  ArrowUpRight,
  Zap,
  Bot,
  Library,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STARTER_PROMPTS = [
  {
    id: 'code-refactor',
    title: 'Code Review & Refactor',
    description: 'Find performance bottlenecks, clean architecture improvements, and type safety issues.',
    prompt: 'Review the following code for performance, readability, and security vulnerabilities:\n\n```ts\n// paste code here\n```',
    category: 'Engineering',
    icon: Code2,
  },
  {
    id: 'deep-analysis',
    title: 'Data Insights & Strategy',
    description: 'Synthesize data trends, uncover anomalies, and generate executive summaries.',
    prompt: 'Analyze this metric trend and provide 3 key strategic recommendations:\n\n- Monthly Active Users: +18%\n- Churn: 2.1%\n- Average Session Duration: 14m',
    category: 'Analysis',
    icon: BarChart3,
  },
  {
    id: 'document-polish',
    title: 'Executive Summary Polish',
    description: 'Turn draft technical documents or meeting notes into crisp, actionable prose.',
    prompt: 'Distill the following draft into an executive summary with key takeaways, risks, and next steps:\n\n[Paste draft here]',
    category: 'Writing',
    icon: FileText,
  },
  {
    id: 'architecture-design',
    title: 'System Architecture PRD',
    description: 'Draft end-to-end specifications with user stories, API endpoints, and failure modes.',
    prompt: 'Generate a detailed technical design document (PRD) for a real-time event notifications pipeline.',
    category: 'Productivity',
    icon: Zap,
  },
]

import { useAuthStore } from '@/stores/auth-store'

interface EmptyChatStateProps {
  onSelectPrompt: (promptText: string) => void
  modelName: string
  mode?: string
}

export function EmptyChatState({ onSelectPrompt, modelName, mode = 'standard' }: EmptyChatStateProps) {
  const user = useAuthStore((s) => s.user)
  const displayName = user?.displayName ? user.displayName.split(' ')[0] : null

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const modeBadge = useMemo(() => {
    const norm = mode.toLowerCase()
    if (norm === 'high' || norm === 'deep') {
      return { label: 'High Mode · Deep Reasoning', variant: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' }
    }
    if (norm === 'quick' || norm === 'low' || norm === 'fast') {
      return { label: 'Quick Mode · Instant Response', variant: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
    }
    return { label: 'Standard Mode · Balanced Intelligence', variant: 'bg-brand/10 text-brand border-brand/20' }
  }, [mode])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-2xl w-full"
      >
        {/* Top Floating Glow Banner */}
        <div className="mx-auto mb-6 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="size-16 rounded-2xl gradient-brand flex items-center justify-center shadow-xl shadow-brand/20 ring-4 ring-background">
              <Bot className="size-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
              <Sparkles className="size-3 text-white" />
            </div>
          </div>

          <Badge variant="outline" className={`text-xs px-3 py-1 font-medium rounded-full mb-3 ${modeBadge.variant}`}>
            {modeBadge.label}
          </Badge>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            {greeting}{displayName ? `, ${displayName}` : ''} — ready to build?
          </h2>

          <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Connected to <span className="font-semibold text-foreground">{modelName}</span>.
            Pick a quick starter prompt below, browse the prompt library, or ask anything.
          </p>
        </div>

        {/* Suggested Prompt Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-left">
          {STARTER_PROMPTS.map((item, index: number) => {
            const Icon = item.icon

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-sm p-4.5 transition-all duration-200 hover:border-brand/50 hover:bg-card hover:shadow-lg hover:shadow-brand/5 text-left cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors duration-200">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border text-muted-foreground group-hover:border-brand/30 transition-colors">
                      {item.category}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-brand opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Use template</span>
                  <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Footer Link to Prompt Library */}
        <div className="mt-6 pt-2 flex items-center justify-center">
          <Link href="/app/prompts">
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Library className="size-3.5 text-brand" />
              Browse full Prompt Library
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
