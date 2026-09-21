'use client'

import React, { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  Code2,
  FileText,
  BarChart3,
  ArrowUpRight,
  Zap,
  Library,
  Image as ImageIcon,
  Mic,
  FlaskConical,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { ThinkingAnimation } from '@/components/chat/ThinkingAnimation'

const STARTER_PROMPTS = [
  {
    id: 'code-refactor',
    title: 'Code Review & Refactor',
    description: 'Find performance bottlenecks, clean architecture improvements, and type safety issues.',
    prompt: 'Review the following code for performance, readability, and security vulnerabilities:\n\n```ts\n// paste code here\n```',
    category: 'Engineering',
    icon: Code2,
    accent: 'oklch(0.72 0.22 280)',
  },
  {
    id: 'deep-analysis',
    title: 'Data Insights & Strategy',
    description: 'Synthesize data trends, uncover anomalies, and generate executive summaries.',
    prompt: 'Analyze this metric trend and provide 3 key strategic recommendations:\n\n- Monthly Active Users: +18%\n- Churn: 2.1%\n- Average Session Duration: 14m',
    category: 'Analysis',
    icon: BarChart3,
    accent: 'oklch(0.80 0.16 195)',
  },
  {
    id: 'document-polish',
    title: 'Executive Summary Polish',
    description: 'Turn draft technical documents or meeting notes into crisp, actionable prose.',
    prompt: 'Distill the following draft into an executive summary with key takeaways, risks, and next steps:\n\n[Paste draft here]',
    category: 'Writing',
    icon: FileText,
    accent: 'oklch(0.82 0.12 160)',
  },
  {
    id: 'architecture-design',
    title: 'System Architecture PRD',
    description: 'Draft end-to-end specifications with user stories, API endpoints, and failure modes.',
    prompt: 'Generate a detailed technical design document (PRD) for a real-time event notifications pipeline.',
    category: 'Productivity',
    icon: Zap,
    accent: 'oklch(0.82 0.18 50)',
  },
]

const QUICK_STUDIOS = [
  { href: '/app/images', icon: ImageIcon, label: 'Image Studio', description: 'Vision & OCR' },
  { href: '/app/speech', icon: Mic, label: 'Speech Studio', description: 'Voice & Audio' },
  { href: '/app/nlp', icon: FlaskConical, label: 'NLP Studio', description: 'Text Analysis' },
]

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
      return { label: 'Deep Reasoning Mode', color: 'from-purple-500/20 to-purple-400/5 border-purple-500/25 text-purple-400' }
    }
    if (norm === 'quick' || norm === 'low' || norm === 'fast') {
      return { label: 'Quick Response Mode', color: 'from-blue-500/20 to-blue-400/5 border-blue-500/25 text-blue-400' }
    }
    return { label: 'Balanced Intelligence Mode', color: 'from-brand/20 to-brand/5 border-brand/25 text-brand' }
  }, [mode])

  return (
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-12 overflow-y-auto scrollbar-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* ---- Hero Section ---- */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* Orbital orb */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mb-6"
          >
            <ThinkingAnimation size="lg" />
          </motion.div>

          {/* Mode badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border bg-gradient-to-r mb-4 ${modeBadge.color}`}
            >
              <span className="size-1.5 rounded-full bg-current opacity-80" />
              {modeBadge.label}
            </span>
          </motion.div>

          {/* Greeting */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0, 0, 0.2, 1] }}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            {greeting}
            {displayName ? (
              <span className="gradient-text-animated">{`, ${displayName}`}</span>
            ) : (
              <span className="gradient-text"> — Welcome</span>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.35 }}
            className="mt-3 text-sm text-muted-foreground/80 leading-relaxed max-w-sm"
          >
            Connected to{' '}
            <span className="font-semibold text-foreground">{modelName}</span>.
            {' '}Start with a starter below, or ask anything.
          </motion.p>
        </div>

        {/* ---- Starter Prompt Cards ---- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-left"
        >
          {STARTER_PROMPTS.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.4 + index * 0.07 }}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-surface-1/60 backdrop-blur-sm p-4 text-left cursor-pointer transition-all duration-200 hover:border-brand/35 hover:bg-surface-2/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/6"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 30% 30%, ${item.accent}10 0%, transparent 70%)`,
                  }}
                />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${item.accent}25`, color: item.accent }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span
                      className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-md border"
                      style={{
                        background: `${item.accent}12`,
                        borderColor: `${item.accent}25`,
                        color: item.accent,
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground/75 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="relative mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground/50 group-hover:text-brand transition-colors duration-200">
                  <span>Use template</span>
                  <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* ---- Quick Studios Row ---- */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.35 }}
          className="mt-6"
        >
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/40 text-center mb-3">
            Other Studios
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {QUICK_STUDIOS.map((studio) => {
              const Icon = studio.icon
              return (
                <Link key={studio.href} href={studio.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 gap-2 text-xs border-white/8 hover:border-brand/30 hover:bg-brand/5 hover:text-brand text-muted-foreground transition-all duration-200 rounded-xl"
                  >
                    <Icon className="size-3.5" />
                    <span>{studio.label}</span>
                    <span className="text-[10px] opacity-50">{studio.description}</span>
                  </Button>
                </Link>
              )
            })}
            <Link href="/app/prompts">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 gap-2 text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                <Library className="size-3.5 text-brand" />
                Prompt Library
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
