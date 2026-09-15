'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Sparkles, MessageSquare, ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stagger, StaggerItem, FadeUp } from '@/components/motion'

const upcomingFeatures = [
  {
    icon: '🤖',
    title: 'AI Chat',
    description: 'Streaming conversations with GPT-4o and other frontier models.',
    status: 'Phase 4',
  },
  {
    icon: '🔬',
    title: 'NLP Studio',
    description: 'Sentiment, entity recognition, intent detection, and readability scoring.',
    status: 'Phase 6',
  },
  {
    icon: '📄',
    title: 'Document Intelligence',
    description: 'Upload, embed, and query your documents with vector search.',
    status: 'Phase 7',
  },
]

export default function AppPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-full p-8">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Icon */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="relative">
            <div className="flex size-20 items-center justify-center rounded-2xl gradient-brand shadow-2xl">
              <Sparkles className="size-9 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl glow-brand animate-pulse" />
          </div>
        </motion.div>

        <FadeUp>
          <Badge variant="outline" className="mb-4 border-white/10 bg-white/5 text-muted-foreground text-xs">
            Architecture Phase Complete · Frontend Foundation Next
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to{' '}
            <span className="gradient-text">NexaAI</span>
          </h1>

          <p className="mt-3 text-muted-foreground leading-relaxed">
            The application shell is live. Authentication and AI chat are coming in the
            next development phases. This workspace is where you&apos;ll do your best work.
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="border border-white/10 hover:border-white/20 hover:bg-white/5">
                Back to landing page
              </Button>
            </Link>
            <Button
              className="gradient-brand border-0 text-white hover:opacity-90"
              disabled
            >
              <Lock className="mr-2 size-3.5" />
              Sign in (coming soon)
            </Button>
          </div>
        </FadeUp>

        {/* Upcoming features */}
        <FadeUp delay={0.2}>
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-5">
              Coming in future phases
            </p>
            <Stagger className="grid gap-3 text-left">
              {upcomingFeatures.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="flex items-start gap-4 rounded-xl border border-white/8 bg-card p-4 hover:border-white/12 transition-colors">
                    <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold">{feature.title}</h3>
                        <Badge variant="secondary" className="text-[10px]">{feature.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </FadeUp>
      </div>
    </div>
  )
}
