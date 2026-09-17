'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useScroll, AnimatePresence } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  ArrowRight, Sparkles, Zap, Brain, FileText, BarChart3,
  ChevronRight, Code2, MessageSquare, CheckCircle2,
  Terminal, GitBranch, Layers, Mic, Image as ImageIcon,
  ShieldCheck, Cpu, Activity, Lock, Database, Server,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Stagger, StaggerItem, FadeUp } from '@/components/motion'
import { SmoothScrollProvider } from '@/components/marketing/SmoothScrollProvider'
import { MagneticButton, PointerGlow } from '@/components/marketing/MagneticButton'
import { AiOrb } from '@/components/marketing/AiOrb'
import { cn } from '@/lib/utils'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ============================================================
   NAVBAR
   ============================================================ */
function Navbar() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 40))
    return unsub
  }, [scrollY])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'How it works', href: '#workflow' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            className="relative flex h-8 w-8 items-center justify-center rounded-lg gradient-brand"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="size-4 text-white" />
            <div className="absolute inset-0 rounded-lg glow-brand-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
          <span className="text-lg font-semibold tracking-tight">
            Nexa<span className="gradient-text">AI</span>
          </span>
        </Link>

        {/* Nav links — with animated underline */}
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="group relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/5">
              {link.label}
              <span className="absolute bottom-1 left-4 right-4 h-px bg-brand scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-sm">Sign in</Button>
          </Link>
          <MagneticButton strength={0.25}>
            <Link href="/signup">
              <Button size="sm" className="gradient-brand border-0 text-white hover:opacity-90 shadow-lg text-sm">
                Get started
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </Link>
          </MagneticButton>
        </div>
      </nav>
    </header>
  )
}

/* ============================================================
   ANIMATED GRID BACKGROUND
   ============================================================ */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
      {/* Line grid subtle */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(currentColor 1px, transparent 1px),
            linear-gradient(90deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />
    </div>
  )
}

/* ============================================================
   HERO SECTION
   ============================================================ */
function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  // GSAP hero entrance timeline
  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.1 })

    tl.fromTo(
      '.hero-badge',
      { opacity: 0, y: -16, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
    )
    .fromTo(
      '.hero-word',
      { opacity: 0, y: 50, rotationX: -20 },
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.07,
      },
      '-=0.2',
    )
    .fromTo(
      '.hero-sub',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.3',
    )
    .fromTo(
      '.hero-cta',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.2',
    )
    .fromTo(
      '.hero-proof',
      { opacity: 0 },
      { opacity: 1, duration: 0.4 },
      '-=0.1',
    )
    .fromTo(
      '.hero-orb',
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' },
      0.2,
    )
  }, { scope: heroRef })

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden"
    >
      {/* Backgrounds */}
      <GridBackground />

      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.8, 0.6] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-[700px] w-[1100px] rounded-full"
            style={{
              background: 'radial-gradient(ellipse, oklch(0.50 0.22 280 / 0.10) 0%, transparent 65%)',
              filter: 'blur(50px)',
            }}
          />
        </motion.div>
        <motion.div
          className="absolute right-0 top-1/4 translate-x-1/3"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        >
          <div className="h-[500px] w-[500px] rounded-full"
            style={{
              background: 'radial-gradient(ellipse, oklch(0.72 0.16 195 / 0.08) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </motion.div>
      </div>

      {/* Split layout: text left / orb right on large screens */}
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="flex flex-col items-center lg:flex-row lg:items-center lg:gap-16">
          {/* Left — content */}
          <div className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            {/* Announcement badge */}
            <div className="hero-badge mb-8 flex justify-center lg:justify-start">
              <MagneticButton strength={0.15}>
                <Badge
                  variant="outline"
                  className="group cursor-default border-brand/20 bg-brand/8 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm hover:border-brand/40 hover:text-foreground transition-all duration-200"
                >
                  <span className="mr-2 size-1.5 rounded-full bg-brand inline-block animate-pulse" />
                  NexaAI Platform — Unified Multimodal Workspace
                  <ChevronRight className="ml-1 size-3 group-hover:translate-x-0.5 transition-transform" />
                </Badge>
              </MagneticButton>
            </div>

            {/* Headline — word by word via GSAP */}
            <h1
              ref={headlineRef}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.12] perspective-1000"
              style={{ perspective: '800px' }}
            >
              {['Your', 'AI', 'Workspace', 'for'].map((word) => (
                <span key={word} className="hero-word inline-block mr-[0.25em] last:mr-0">{word}</span>
              ))}
              <br />
              <span className="hero-word inline-block gradient-text">Chat,</span>{' '}
              <span className="hero-word inline-block gradient-text">Documents,</span>{' '}
              <span className="hero-word inline-block text-foreground">& Analysis</span>
            </h1>

            {/* Subtext */}
            <p className="hero-sub mt-6 text-lg text-muted-foreground leading-relaxed sm:text-xl max-w-xl mx-auto lg:mx-0">
              NexaAI brings AI conversations, document intelligence, speech transcription, image analysis, and productivity tools into one unified workspace.
            </p>

            {/* CTAs */}
            <div ref={ctaRef} className="hero-cta mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <MagneticButton strength={0.2}>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="group relative gradient-brand border-0 text-white h-13 px-8 text-base font-semibold shadow-2xl hover:opacity-90 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get started free
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowRight className="size-4" />
                      </motion.span>
                    </span>
                    {/* Shimmer */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </Button>
                </Link>
              </MagneticButton>
              <Link href="#features">
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-13 px-8 text-base border border-border/80 hover:border-brand/40 hover:bg-brand/5 transition-all duration-200"
                >
                  Explore features
                </Button>
              </Link>
            </div>

            {/* Verified Foundation info */}
            <div className="hero-proof mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <p className="text-xs text-muted-foreground/70">
                Free tier with 5 daily High reasoning requests · No credit card required
              </p>
              <div className="hidden sm:block h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <CheckCircle2 className="size-3.5 text-brand" />
                <span>Independently built & verified</span>
              </div>
            </div>
          </div>

          {/* Right — AI Orb */}
          <div className="hero-orb mt-16 lg:mt-0 flex-shrink-0 flex items-center justify-center">
            <div className="relative">
              {/* Outer glow halo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, oklch(0.55 0.22 280 / 0.20) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  transform: 'scale(1.5)',
                }}
                aria-hidden
              />
              <AiOrb />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Scroll</span>
        <div className="flex flex-col gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="size-1 rounded-full bg-muted-foreground/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ============================================================
   PRODUCT PREVIEW — upgraded mockup
   ============================================================ */
function ProductPreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'nlp' | 'docs'>('chat')

  // GSAP scroll-triggered reveal
  useGSAP(() => {
    gsap.fromTo(
      containerRef.current,
      { y: 60, opacity: 0, rotationX: 8 },
      {
        y: 0,
        opacity: 1,
        rotationX: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          once: true,
        },
      },
    )
  }, { scope: containerRef })

  const tabs = [
    { key: 'chat' as const, label: 'AI Chat', icon: MessageSquare },
    { key: 'nlp' as const, label: 'NLP Studio', icon: BarChart3 },
    { key: 'docs' as const, label: 'Documents', icon: FileText },
  ]

  return (
    <section className="relative py-16 px-6 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-full max-w-3xl rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, oklch(0.55 0.22 280 / 0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        aria-hidden
      />

      <div ref={containerRef} className="mx-auto w-full max-w-5xl" style={{ perspective: '1200px' }}>
        {/* Floating card */}
        <div className="relative rounded-2xl border border-white/8 bg-card/70 shadow-[0_32px_80px_oklch(0_0_0/0.6)] backdrop-blur-md overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-white/6 px-5 py-3 bg-black/25">
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-red-500/60" />
              <div className="size-3 rounded-full bg-yellow-500/60" />
              <div className="size-3 rounded-full bg-green-500/60" />
            </div>
            {/* Tab switcher */}
            <div className="flex items-center gap-1 mx-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-150',
                    activeTab === tab.key
                      ? 'bg-white/10 text-foreground'
                      : 'text-muted-foreground hover:bg-white/5',
                  )}
                >
                  <tab.icon className="size-3" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex-1 max-w-[180px] rounded-md bg-white/4 px-3 py-1 text-[10px] text-muted-foreground/50 text-center">
              app.nexaai.com
            </div>
          </div>

          {/* Content area */}
          <div className="grid grid-cols-5 min-h-[420px]">
            {/* Sidebar */}
            <div className="col-span-1 border-r border-white/6 p-3 bg-black/15 flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 py-2">
                <div className="size-6 rounded-md gradient-brand flex items-center justify-center flex-shrink-0">
                  <Sparkles className="size-3 text-white" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">NexaAI</span>
              </div>

              <div className="h-7 rounded-md bg-brand/15 border border-brand/25 flex items-center justify-center">
                <span className="text-[10px] text-brand font-medium">+ New Chat</span>
              </div>

              <div className="space-y-0.5 flex-1">
                <p className="px-1 pt-2 pb-1 text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold">Workspace</p>
                {[
                  { icon: MessageSquare, label: 'Chat', active: activeTab === 'chat' },
                  { icon: BarChart3, label: 'NLP Studio', active: activeTab === 'nlp' },
                  { icon: FileText, label: 'Documents', active: activeTab === 'docs' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] cursor-default transition-colors',
                      item.active ? 'bg-brand/15 text-brand' : 'text-muted-foreground',
                    )}
                  >
                    <item.icon className="size-3" />
                    {item.label}
                  </div>
                ))}

                <p className="px-1 pt-3 pb-1 text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold">Recent</p>
                {['Python async guide', 'Sentiment analysis', 'Q4 report.pdf'].map((title, i) => (
                  <div key={i} className="px-2 py-1.5 text-[10px] text-muted-foreground/60 truncate rounded-md hover:bg-white/4 cursor-default">
                    {title}
                  </div>
                ))}
              </div>

              {/* User avatar */}
              <div className="flex items-center gap-2 px-2 py-2 mt-auto border-t border-white/5 pt-2">
                <div className="size-5 rounded-full gradient-brand flex items-center justify-center text-[8px] font-bold text-white">A</div>
                <div>
                  <p className="text-[9px] font-medium">Abdul</p>
                  <p className="text-[8px] text-muted-foreground">Free plan</p>
                </div>
              </div>
            </div>

            {/* Main content — tab dependent */}
            <div className="col-span-4 flex flex-col">
              <AnimatePresence mode="wait">
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full p-5"
                  >
                    {/* Title */}
                    <div className="mb-4 text-xs font-medium text-muted-foreground border-b border-white/5 pb-3">
                      Python async patterns
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-hidden">
                      {/* AI msg */}
                      <div className="flex gap-3">
                        <div className="size-6 flex-shrink-0 rounded-full gradient-brand flex items-center justify-center mt-0.5">
                          <Sparkles className="size-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-xl rounded-tl-sm bg-white/5 p-3 text-xs leading-relaxed text-muted-foreground">
                            <span className="text-foreground font-medium">asyncio</span> uses a single-threaded event loop to schedule and run{' '}
                            <span className="text-brand">coroutines</span> cooperatively. Unlike threads, only one coroutine runs at a time, yielding control via{' '}
                            <code className="bg-white/8 px-1 rounded text-[10px] font-mono text-cyan">await</code>.
                          </div>
                        </div>
                      </div>

                      {/* User msg */}
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[70%] rounded-xl rounded-tr-sm bg-brand/15 border border-brand/15 p-3 text-xs text-foreground">
                          Can you show me a practical database example?
                        </div>
                        <div className="size-6 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">A</div>
                      </div>

                      {/* Streaming code response */}
                      <div className="flex gap-3">
                        <div className="size-6 flex-shrink-0 rounded-full gradient-brand flex items-center justify-center mt-0.5">
                          <Sparkles className="size-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-xl rounded-tl-sm bg-white/5 overflow-hidden">
                            {/* Code block */}
                            <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 bg-black/20">
                              <Code2 className="size-3 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground font-mono">python</span>
                              <div className="ml-auto flex items-center gap-1">
                                <div className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[9px] text-muted-foreground">typing...</span>
                              </div>
                            </div>
                            <pre className="p-3 text-[10px] font-mono leading-relaxed">
                              <code>
                                <span className="text-purple-400">async def</span>{' '}
                                <span className="text-blue-300">fetch_users</span>
                                <span className="text-white">():</span>{'\n'}
                                {'  '}<span className="text-purple-400">async with</span>{' '}
                                <span className="text-blue-300">asyncpg</span>
                                <span className="text-white">.create_pool(</span>
                                <span className="text-amber-300">DSN</span>
                                <span className="text-white">) </span>
                                <span className="text-purple-400">as</span>{' '}
                                <span className="text-white">pool:</span>{'\n'}
                                {'    '}<span className="text-muted-foreground">...</span>
                              </code>
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Composer */}
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-4 py-2.5">
                      <span className="flex-1 text-xs text-muted-foreground/30">Ask NexaAI anything...</span>
                      <div className="size-6 rounded-lg gradient-brand flex items-center justify-center">
                        <ArrowRight className="size-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'nlp' && (
                  <motion.div
                    key="nlp"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full p-5"
                  >
                    <div className="mb-4 text-xs font-medium text-muted-foreground border-b border-white/5 pb-3">NLP Studio — Text Analysis</div>
                    <div className="rounded-lg bg-white/3 border border-white/6 p-3 mb-4 text-xs text-muted-foreground leading-relaxed">
                      &ldquo;Natural language processing enables systems to extract entities, evaluate sentiment polarity, and assess text readability across complex documents.&rdquo;
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Sentiment', value: 'Positive', score: 0.92, color: 'bg-green-500' },
                        { label: 'Intent', value: 'Informing', score: 0.85, color: 'bg-blue-500' },
                        { label: 'Emotion', value: 'Neutral', score: 0.78, color: 'bg-amber-500' },
                        { label: 'Readability', value: 'Grade 9', score: 0.71, color: 'bg-purple-500' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-white/4 border border-white/6 p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                            <span className="text-[10px] font-semibold">{item.value}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10">
                            <motion.div
                              className={cn('h-full rounded-full', item.color)}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 block">{Math.round(item.score * 100)}% confidence</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'docs' && (
                  <motion.div
                    key="docs"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full p-5"
                  >
                    <div className="mb-4 text-xs font-medium text-muted-foreground border-b border-white/5 pb-3">Document Intelligence</div>
                    <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 p-3 mb-4">
                      <div className="size-8 rounded-md bg-brand/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="size-4 text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">System_Architecture_Overview.pdf</p>
                        <p className="text-[9px] text-muted-foreground">48 chunks · 1,536-dim embeddings</p>
                      </div>
                      <div className="size-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <div className="flex gap-2 mb-3">
                      <div className="size-6 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                        <Sparkles className="size-3 text-white" />
                      </div>
                      <div className="rounded-xl rounded-tl-sm bg-white/5 p-3 text-[10px] leading-relaxed text-muted-foreground flex-1">
                        Based on section 3 of the uploaded document, <span className="text-foreground">the platform implements asynchronous connection pooling</span>, vector indexing with pgvector, and isolated tenant storage.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2 mt-auto">
                      <span className="flex-1 text-[10px] text-muted-foreground/30">Ask about this document...</span>
                      <div className="size-5 rounded-md gradient-brand flex items-center justify-center">
                        <ArrowRight className="size-2.5 text-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Glow */}
        <div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 h-32 w-3/4 opacity-50 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, oklch(0.50 0.22 280 / 0.30) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
          aria-hidden
        />
      </div>
    </section>
  )
}

/* ============================================================
   STATS SECTION — verified codebase specifications
   ============================================================ */
function StatsSection() {
  const stats = [
    { value: '3 Modes', label: 'Quick, Standard & High reasoning', icon: Brain },
    { value: '5 Daily', label: 'Free High-mode quota per user', icon: Zap },
    { value: '116 Tests', label: 'Backend test suite passing', icon: CheckCircle2 },
    { value: 'PostgreSQL', label: 'Branching conversation persistence', icon: GitBranch },
  ]

  return (
    <section className="relative border-y border-white/6 bg-black/10 py-14">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
            Verified Project Specifications
          </p>
        </div>
        <Stagger className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <StaggerItem key={stat.label} className="text-center group">
              <div className="mb-2 flex justify-center">
                <div className="size-9 rounded-xl bg-brand/10 border border-brand/15 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                  <stat.icon className="size-4 text-brand" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

/* ============================================================
   FEATURES SECTION — verified implemented capabilities
   ============================================================ */
const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat Workspace',
    description: 'Conversational chat with markdown rendering, syntax-highlighted code blocks, copy actions, and tree-structured conversation branching.',
    tag: 'Implemented',
    color: 'from-violet-500/15 to-violet-600/5',
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    points: ['Streaming SSE responses', 'Tree-structured branching', 'Persistent conversation history'],
  },
  {
    icon: Brain,
    title: 'Multiple Chat Modes',
    description: 'Dynamic model routing across Quick (gpt-4o-mini), Standard (gpt-4o-mini), and High (gpt-4o) with server-enforced daily limits.',
    tag: 'Model Routing',
    color: 'from-purple-500/15 to-purple-600/5',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    points: ['Quick & Standard: gpt-4o-mini', 'High: gpt-4o deep reasoning', '5 daily High requests quota'],
  },
  {
    icon: Zap,
    title: 'Real-time SSE Streaming',
    description: 'Token-by-token response streaming over Server-Sent Events. Instant feedback with abort-controller mid-stream stop and regeneration.',
    tag: 'Implemented',
    color: 'from-amber-500/15 to-amber-600/5',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    points: ['FastAPI SSE streaming pipeline', 'Abort controller cancellation', 'Regenerate response handling'],
  },
  {
    icon: Layers,
    title: 'Curated Prompt Library',
    description: 'Searchable library of structured prompt templates categorized by task. Insert prompts directly into the composer with one click.',
    tag: 'Implemented',
    color: 'from-blue-500/15 to-blue-600/5',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    points: ['Task & role-based categories', 'Instant composer injection', 'Category & tag filtering'],
  },
  {
    icon: Mic,
    title: 'Speech Studio',
    description: 'Record via browser microphone or upload audio files. Edit transcripts, copy, download, or insert them directly into your chat workspace.',
    tag: 'Mock / Credential-ready',
    color: 'from-rose-500/15 to-rose-600/5',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    points: ['Local mock STT active', 'OpenAI Whisper architecture ready', '1-click transcript insertion'],
  },
  {
    icon: FileText,
    title: 'Document Intelligence & RAG',
    description: 'Architecture for document ingestion, text chunking, and semantic vector similarity search using PostgreSQL and embeddings.',
    tag: 'Architecture',
    color: 'from-cyan-500/15 to-cyan-600/5',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    points: ['PDF & text document ingestion', 'Chunking & vector index pipeline', 'Knowledge-grounded QA design'],
  },
  {
    icon: BarChart3,
    title: 'NLP Analysis Studio',
    description: 'In-depth text processing suite evaluating sentiment polarity, named entity recognition, intent classification, and readability scores.',
    tag: 'Implemented',
    color: 'from-emerald-500/15 to-emerald-600/5',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    points: ['Sentiment polarity scoring', 'Named entity extraction', 'Text readability index'],
  },
  {
    icon: ImageIcon,
    title: 'Image Intelligence',
    description: 'OpenCV and Pillow processing pipeline with OCR text extraction and vision model abstraction architecture.',
    tag: 'Vision & OCR',
    color: 'from-indigo-500/15 to-indigo-600/5',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    points: ['OpenCV & Pillow image pipeline', 'Tesseract OCR text extraction', 'Vision provider routing'],
  },
  {
    icon: Activity,
    title: 'Usage & Quota Monitoring',
    description: 'Monitor request counts, token consumption, and server-enforced daily High-mode reasoning allocations in real time.',
    tag: 'Implemented',
    color: 'from-teal-500/15 to-teal-600/5',
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    points: ['Real-time request metrics', 'Server-side 5/day High mode limit', 'Token usage visualization'],
  },
  {
    icon: ShieldCheck,
    title: 'Identity & Security Controls',
    description: 'Robust authentication with email registration, JWT session tokens, Argon2 password hashing, and user ownership isolation.',
    tag: 'Implemented',
    color: 'from-red-500/15 to-red-600/5',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10 border-red-500/20',
    points: ['Argon2 password hashing', 'HttpOnly cookie JWT tokens', 'Isolated user data boundaries'],
  },
]

function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.fromTo(
      '.feature-card',
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      },
    )
  }, { scope: sectionRef })

  return (
    <section id="features" ref={sectionRef} className="relative py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-white/10 bg-white/5 text-muted-foreground text-xs">
              Platform Capabilities
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Genuinely Implemented.
              <br />
              <span className="gradient-text">Fully Verified.</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              Explore the capabilities currently built into NexaAI. Implemented features are functional today; provider-dependent features are clearly disclosed.
            </p>
          </div>
        </FadeUp>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="feature-card group relative rounded-2xl border border-white/8 bg-card p-7 transition-all duration-300 hover:border-white/14 card-hover overflow-hidden"
            >
              {/* Pointer glow */}
              <PointerGlow />

              {/* Gradient bg hover */}
              <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br', feature.color)} />

              <div className="relative z-10">
                {/* Icon */}
                <div className={cn('mb-5 inline-flex size-11 items-center justify-center rounded-xl border', feature.iconBg)}>
                  <feature.icon className={cn('size-5', feature.iconColor)} />
                </div>

                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">{feature.tag}</Badge>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Feature points */}
                <ul className="space-y-1.5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 text-brand flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center gap-1 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link href="/app" className="flex items-center gap-1 hover:underline">
                    <span>Open in workspace</span>
                    <ChevronRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   ARCHITECTURE & SECURITY SECTION
   ============================================================ */
function ArchitectureSection() {
  const archRef = useRef<HTMLElement>(null)

  const controls = [
    {
      icon: Lock,
      title: 'Argon2 Password Hashing',
      description: 'Memory-hard Argon2id hashing protecting user credentials against dictionary attacks and offline brute forcing.',
      status: 'Implemented',
    },
    {
      icon: ShieldCheck,
      title: 'JWT Session Management',
      description: 'Cryptographically signed JSON Web Tokens for stateless authentication, session hydration, and request authorization.',
      status: 'Implemented',
    },
    {
      icon: Database,
      title: 'PostgreSQL & Alembic Migrations',
      description: 'Relational data persistence with isolated tenant ownership checks on all conversations, messages, and assets.',
      status: 'Implemented',
    },
    {
      icon: Server,
      title: 'Nginx Reverse Proxy & Health Probes',
      description: 'Containerized reverse proxy routing traffic to FastAPI API and Next.js frontend with live /health and /ready endpoints.',
      status: 'Implemented',
    },
    {
      icon: Cpu,
      title: 'Modular Provider Abstraction',
      description: 'Swappable backend provider interfaces for chat, speech, and vision. Supports OpenAI models when API credentials are provided.',
      status: 'Configurable',
    },
    {
      icon: Activity,
      title: 'Server-Enforced Quotas & Rate Limits',
      description: 'Redis-backed request throttling and strict server-side quota enforcement for 5 daily High-mode reasoning queries per user.',
      status: 'Implemented',
    },
  ]

  useGSAP(() => {
    gsap.fromTo(
      '.arch-card',
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: archRef.current,
          start: 'top 75%',
          once: true,
        },
      },
    )
  }, { scope: archRef })

  return (
    <section id="architecture" ref={archRef} className="relative py-24 px-6 border-t border-white/6 bg-card/20">
      <div className="mx-auto max-w-6xl">
        <FadeUp>
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-white/10 bg-white/5 text-muted-foreground text-xs">
              System Architecture & Controls
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Engineering Built on{' '}
              <span className="gradient-text">Verifiable Truth</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              Built and tested as an independent AI workspace project. Every control, adapter, and endpoint below is genuinely implemented in the codebase.
            </p>
          </div>
        </FadeUp>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {controls.map((item) => (
            <div
              key={item.title}
              className="arch-card rounded-2xl border border-white/8 bg-card/60 p-6 backdrop-blur-sm hover:border-white/16 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <item.icon className="size-5" />
                </div>
                <Badge variant={item.status === 'Implemented' ? 'secondary' : 'outline'} className="text-[10px]">
                  {item.status}
                </Badge>
              </div>
              <h3 className="text-base font-semibold mb-2">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Modular Provider Notice */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/3 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="size-4 text-brand" />
              Modular Provider Architecture
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              External providers (OpenAI API, OpenAI Whisper, and OAuth) are designed with modular backend interfaces.
              Local mock transcription is active out of the box; live commercial provider calls activate seamlessly when credentials are configured.
            </p>
          </div>
          <Link href="/docs">
            <Button variant="outline" size="sm" className="whitespace-nowrap text-xs border-white/12 hover:bg-white/5">
              Explore Backend API
              <ArrowRight className="ml-1.5 size-3" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   WORKFLOW SECTION — truthful application workflow
   ============================================================ */
function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null)

  const steps = [
    {
      step: '01',
      icon: ShieldCheck,
      title: 'Sign in securely',
      description: 'Register or authenticate with email and Argon2id-hashed credentials, receiving a cryptographically signed JWT session.',
    },
    {
      step: '02',
      icon: Brain,
      title: 'Select a chat mode',
      description: 'Choose Quick or Standard for lightweight tasks (gpt-4o-mini), or switch to High mode for deep reasoning (5 daily requests included).',
    },
    {
      step: '03',
      icon: MessageSquare,
      title: 'Start an AI conversation',
      description: 'Submit prompts with real-time SSE token streaming, markdown rendering, syntax-highlighted code blocks, and branching dialogues.',
    },
    {
      step: '04',
      icon: Layers,
      title: 'Upload or analyze content',
      description: 'Record or upload audio in Speech Studio, run NLP linguistic analysis, or query documents with semantic vector search architecture.',
    },
    {
      step: '05',
      icon: CheckCircle2,
      title: 'Review and manage results',
      description: 'Edit speech transcripts, copy markdown outputs, insert audio transcriptions directly into chat, or branch active conversation leaves.',
    },
    {
      step: '06',
      icon: Activity,
      title: 'Work from unified workspace',
      description: 'Search curated prompt templates, track real-time token and request usage quotas, and manage all your work seamlessly.',
    },
  ]

  useGSAP(() => {
    gsap.fromTo(
      '.workflow-step',
      { x: -30, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      },
    )
  }, { scope: sectionRef })

  return (
    <section id="workflow" ref={sectionRef} className="relative py-24 px-6 overflow-hidden">
      {/* Side gradient */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at right, oklch(0.50 0.22 280 / 0.06) 0%, transparent 60%)',
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-5xl">
        <FadeUp>
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-white/10 bg-white/5 text-muted-foreground text-xs">
              Product Workflow
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Intuitive, Transparent{' '}
              <span className="gradient-text">Workflow.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              From authentication to multimodal analysis, experience a cohesive workspace designed for productivity.
            </p>
          </div>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.step} className="workflow-step group relative flex flex-col rounded-2xl border border-white/8 bg-card/50 p-6 hover:border-white/12 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {step.step}
                </div>
                <div className="flex items-center gap-2">
                  <step.icon className="size-4 text-brand" />
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   CTA SECTION — final call to action
   ============================================================ */
function CtaSection() {
  const ctaRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.fromTo(
      '.cta-content',
      { y: 40, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ctaRef.current,
          start: 'top 80%',
          once: true,
        },
      },
    )
  }, { scope: ctaRef })

  return (
    <section ref={ctaRef} className="relative py-28 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh opacity-70 pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.50 0.22 280 / 0.08) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="cta-content relative mx-auto max-w-3xl text-center">
        <Badge variant="outline" className="mb-6 border-border bg-muted/40 text-muted-foreground text-xs dark:border-white/10 dark:bg-white/5">
          Get Started Today
        </Badge>
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Ready to experience
          <br />
          <span className="gradient-text">NexaAI?</span>
        </h2>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          Explore the platform built for real productivity — honest engineering, reliable controls, and an elegant interface.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <MagneticButton strength={0.2}>
            <Link href="/signup">
              <Button
                size="lg"
                className="group relative gradient-brand border-0 text-white h-14 px-10 text-base font-semibold shadow-2xl hover:opacity-90 overflow-hidden glow-brand"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get started free
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="size-4" />
                  </motion.span>
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </Button>
            </Link>
          </MagneticButton>
          <Link href="/app">
            <Button variant="ghost" size="lg" className="h-14 px-8 text-base border border-border hover:bg-muted/50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5">
              Open Workspace
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground/50">
          Free tier with 5 daily High reasoning requests · No credit card required · Built & verified independently
        </p>
      </div>
    </section>
  )
}

/* ============================================================
   FOOTER
   ============================================================ */
function Footer() {
  const cols = [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Chat Workspace', href: '/app' },
        { label: 'Prompt Library', href: '/app/prompts' },
        { label: 'Pricing Plans', href: '/pricing' },
        { label: 'Changelog', href: '/about#changelog' },
      ],
    },
    {
      heading: 'Developers',
      links: [
        { label: 'API Documentation', href: '/docs', external: true },
        { label: 'System Health', href: '/health', external: true },
        { label: 'GitHub Repository', href: 'https://github.com', external: true },
        { label: 'Usage & Quotas', href: '/app/usage' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Support', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ]

  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm pt-16 pb-10 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="size-7 rounded-lg gradient-brand flex items-center justify-center">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <span className="font-semibold">Nexa<span className="gradient-text">AI</span></span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Premium AI platform for intelligent conversation, deep reasoning, and multimodal analysis.
            </p>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} NexaAI. Built with precision.</p>
          <p className="text-xs text-muted-foreground/40">Next-generation AI conversation & reasoning workspace</p>
        </div>
      </div>
    </footer>
  )
}

/* ============================================================
   LANDING PAGE — root export
   ============================================================ */
export default function LandingPage() {
  return (
    <SmoothScrollProvider>
      <main className="flex-1 overflow-x-hidden">
        <Navbar />
        <HeroSection />
        <ProductPreview />
        <StatsSection />
        <FeaturesSection />
        <ArchitectureSection />
        <WorkflowSection />
        <CtaSection />
        <Footer />
      </main>
    </SmoothScrollProvider>
  )
}
