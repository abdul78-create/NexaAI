'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, Sparkles, Zap, Brain, FileText, BarChart3, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Stagger,
  StaggerItem,
  FadeUp,
  FadeIn,
  HoverCard,
} from '@/components/motion'
import { cn } from '@/lib/utils'

/* ============================================================
   NAVBAR
   ============================================================ */
function Navbar() {
  const { scrollY } = useScroll()
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1])
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.8])

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: `oklch(1 0 0 / calc(${borderOpacity.get()} * 0.08))`,
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: `oklch(0.08 0.01 280 / ${bgOpacity.get()})`,
          backdropFilter: `blur(${Math.min(bgOpacity.get() * 12, 12)}px)`,
        }}
      />
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
            <Sparkles className="size-4 text-white" />
            <div className="absolute inset-0 rounded-lg glow-brand-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Nexa<span className="gradient-text">AI</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-1">
          {['Features', 'NLP Studio', 'Pricing', 'Docs'].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 rounded-lg hover:bg-white/5"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-sm">
              Sign in
            </Button>
          </Link>
          <Link href="/app">
            <Button size="sm" className="gradient-brand border-0 text-white hover:opacity-90 transition-opacity text-sm shadow-lg">
              Get started
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </Link>
        </div>
      </nav>
    </motion.header>
  )
}

/* ============================================================
   HERO BACKGROUND — animated gradient orb
   ============================================================ */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Gradient mesh */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Large ambient orb */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="h-[600px] w-[900px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, oklch(0.55 0.22 280 / 0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </motion.div>

      {/* Secondary orb — cyan */}
      <motion.div
        className="absolute right-0 top-1/2 translate-x-1/3"
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      >
        <div
          className="h-[400px] w-[400px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, oklch(0.75 0.16 195 / 0.10) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </motion.div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(oklch(1 0 0) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}

/* ============================================================
   FEATURES DATA
   ============================================================ */
const features = [
  {
    icon: Brain,
    title: 'Intelligent AI Chat',
    description: 'Stream conversations with advanced language models. Context-aware, markdown-rendered, with code syntax highlighting.',
    tag: 'Core',
    color: 'from-violet-500/20 to-violet-600/5',
    iconColor: 'text-violet-400',
  },
  {
    icon: BarChart3,
    title: 'NLP Studio',
    description: 'Deep linguistic analysis — sentiment, entity recognition, intent detection, keywords, readability, and AI summarization.',
    tag: 'Analysis',
    color: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
  },
  {
    icon: FileText,
    title: 'Document Intelligence',
    description: 'Upload PDFs and documents. Extract, chunk, embed, and query content with vector search and AI-powered answers.',
    tag: 'RAG',
    color: 'from-cyan-500/20 to-cyan-600/5',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Zap,
    title: 'Streaming Responses',
    description: 'Real-time token-by-token streaming over SSE. Fast, responsive, and never keeps you waiting.',
    tag: 'Performance',
    color: 'from-amber-500/20 to-amber-600/5',
    iconColor: 'text-amber-400',
  },
]

/* ============================================================
   STAT ITEMS
   ============================================================ */
const stats = [
  { value: '< 200ms', label: 'Median response latency' },
  { value: '99.9%',   label: 'Uptime SLA' },
  { value: 'GPT-4o',  label: 'Flagship model support' },
  { value: '∞',       label: 'Conversation history' },
]

/* ============================================================
   LANDING PAGE
   ============================================================ */
export default function LandingPage() {
  return (
    <main className="flex-1">
      <Navbar />

      {/* ---- HERO ---- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center">
        <HeroBackground />

        <div className="relative z-10 mx-auto max-w-4xl">
          {/* Badge */}
          <FadeIn>
            <div className="mb-8 flex justify-center">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Badge
                  variant="outline"
                  className="group cursor-default border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm hover:border-brand/30 hover:text-foreground transition-all duration-200"
                >
                  <Sparkles className="mr-2 size-3 text-brand" />
                  Now with NLP Studio & Document Intelligence
                  <ChevronRight className="ml-1 size-3 group-hover:translate-x-0.5 transition-transform" />
                </Badge>
              </motion.div>
            </div>
          </FadeIn>

          {/* Headline */}
          <FadeUp>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              AI that{' '}
              <span className="gradient-text">understands</span>
              <br />
              your world
            </h1>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed sm:text-xl">
              NexaAI combines intelligent conversation, deep NLP analysis, and document
              intelligence into one premium AI workspace. Built for people who demand more.
            </p>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/app">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    size="lg"
                    className="gradient-brand border-0 text-white h-12 px-8 text-base font-semibold shadow-xl hover:opacity-90 transition-opacity glow-brand-sm"
                  >
                    Start for free
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="#features">
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-12 px-8 text-base border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  See how it works
                </Button>
              </Link>
            </div>
          </FadeUp>

          {/* Social proof */}
          <FadeIn>
            <p className="mt-8 text-xs text-muted-foreground/60">
              No credit card required · Free tier available · Cancel anytime
            </p>
          </FadeIn>
        </div>

        {/* Product preview */}
        <FadeUp delay={0.3}>
          <div className="relative z-10 mt-20 mx-auto w-full max-w-5xl">
            <div className="relative rounded-2xl border border-white/8 bg-card/60 shadow-2xl backdrop-blur-sm overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/6 px-5 py-3 bg-black/20">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/70" />
                  <div className="size-3 rounded-full bg-yellow-500/70" />
                  <div className="size-3 rounded-full bg-green-500/70" />
                </div>
                <div className="mx-auto flex-1 max-w-xs rounded-md bg-white/5 px-4 py-1 text-xs text-muted-foreground text-center">
                  app.nexaai.com
                </div>
              </div>

              {/* App preview content */}
              <div className="grid grid-cols-4 min-h-[380px]">
                {/* Sidebar */}
                <div className="col-span-1 border-r border-white/6 p-4 bg-black/10">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="size-6 rounded-md gradient-brand flex items-center justify-center">
                      <Sparkles className="size-3 text-white" />
                    </div>
                    <span className="text-xs font-medium">NexaAI</span>
                  </div>

                  {/* New chat button */}
                  <div className="mb-4 h-8 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center">
                    <span className="text-xs text-brand font-medium">+ New Chat</span>
                  </div>

                  {/* Conversation list */}
                  {['Python async patterns', 'Marketing copy review', 'Data pipeline design'].map((title, i) => (
                    <div
                      key={i}
                      className={cn(
                        'mb-1 rounded-md px-3 py-2 text-xs truncate cursor-default',
                        i === 0 ? 'bg-white/8 text-foreground' : 'text-muted-foreground hover:bg-white/4',
                      )}
                    >
                      {title}
                    </div>
                  ))}
                </div>

                {/* Chat area */}
                <div className="col-span-3 flex flex-col p-6">
                  {/* AI message */}
                  <div className="flex gap-3 mb-4">
                    <div className="size-7 flex-shrink-0 rounded-full gradient-brand flex items-center justify-center">
                      <Sparkles className="size-3 text-white" />
                    </div>
                    <div className="flex-1 rounded-xl rounded-tl-sm bg-white/5 p-4 text-sm leading-relaxed text-muted-foreground">
                      I can help you understand async patterns in Python.{' '}
                      <span className="text-foreground">
                        asyncio uses an event loop to manage coroutines
                      </span>{' '}
                      — tasks are scheduled cooperatively rather than preemptively...
                    </div>
                  </div>

                  {/* User message */}
                  <div className="flex gap-3 mb-4 justify-end">
                    <div className="max-w-xs rounded-xl rounded-tr-sm bg-brand/20 border border-brand/20 p-4 text-sm text-foreground">
                      Can you show me a practical example with database queries?
                    </div>
                    <div className="size-7 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                      A
                    </div>
                  </div>

                  {/* Streaming indicator */}
                  <div className="flex gap-3">
                    <div className="size-7 flex-shrink-0 rounded-full gradient-brand flex items-center justify-center">
                      <Sparkles className="size-3 text-white" />
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-white/5 px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="size-1.5 rounded-full bg-brand"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Composer */}
                  <div className="mt-auto pt-6">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-4 py-3">
                      <span className="flex-1 text-sm text-muted-foreground/40">Ask NexaAI anything...</span>
                      <div className="size-7 rounded-lg gradient-brand flex items-center justify-center">
                        <ArrowRight className="size-3 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow under preview */}
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-24 w-3/4 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(ellipse, oklch(0.55 0.22 280 / 0.30) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
              aria-hidden
            />
          </div>
        </FadeUp>
      </section>

      {/* ---- STATS ---- */}
      <section className="relative border-y border-white/6 bg-black/10 py-14">
        <Stagger className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem key={stat.label} className="text-center">
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---- FEATURES ---- */}
      <section id="features" className="relative py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-white/10 bg-white/5 text-muted-foreground">
                Platform Capabilities
              </Badge>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Everything you need.
                <br />
                <span className="gradient-text">Nothing you don&apos;t.</span>
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                A complete AI workspace — not a collection of disconnected tools.
              </p>
            </div>
          </FadeUp>

          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <HoverCard className="h-full">
                  <div
                    className={cn(
                      'group relative h-full rounded-2xl border border-white/8 bg-card p-8',
                      'transition-all duration-300',
                      'hover:border-white/12 hover:shadow-2xl card-hover',
                    )}
                  >
                    {/* Feature icon */}
                    <div className={cn(
                      'mb-5 inline-flex size-12 items-center justify-center rounded-xl',
                      `bg-gradient-to-br ${feature.color}`,
                    )}>
                      <feature.icon className={cn('size-5', feature.iconColor)} />
                    </div>

                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {feature.tag}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-5 flex items-center gap-1 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span>Learn more</span>
                      <ChevronRight className="size-3" />
                    </div>
                  </div>
                </HoverCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---- CTA SECTION ---- */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" aria-hidden />
        <FadeUp>
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to experience
              <br />
              <span className="gradient-text">the future of AI?</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Join the platform built for serious work. No gimmicks, no hallucinations presented as facts — just powerful, honest AI tooling.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/app">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="gradient-brand border-0 text-white h-12 px-10 text-base font-semibold shadow-xl hover:opacity-90 glow-brand-sm"
                  >
                    Get started free
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="border-t border-white/6 py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-brand">
              <Sparkles className="size-3 text-white" />
            </div>
            <span className="text-sm font-medium">
              Nexa<span className="gradient-text">AI</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2024 NexaAI. Built with precision.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Status</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
