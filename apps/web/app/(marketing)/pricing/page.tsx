import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Pricing Plans — NexaAI',
  description: 'Transparent pricing for developers, researchers, and enterprises. Start free today.',
}

export default function PricingPage() {
  const plans = [
    {
      name: 'Free Starter',
      badge: 'Zero Commitment',
      price: '$0',
      period: 'forever',
      description: 'Ideal for trying out multimodal chat and exploring prompts.',
      icon: Zap,
      features: [
        'Quick & Standard chat modes',
        '200 daily requests allowance',
        '100 MB multimodal storage',
        'Access to standard prompt library',
        'Community support',
      ],
      cta: 'Start Free',
      ctaHref: '/signup',
      highlighted: false,
    },
    {
      name: 'Professional',
      badge: 'Most Popular',
      price: '$29',
      period: 'per user / month',
      description: 'Full access to High-mode deep reasoning models and advanced multimodal analysis.',
      icon: Crown,
      features: [
        'Everything in Starter',
        'High-mode deep reasoning (5/day or pooled)',
        'Uncapped Standard & Quick modes',
        'OCR, vision, & audio transcriptions',
        'Custom prompt template creation',
        'Priority SSE response latency',
        'Export conversations in JSON / Markdown',
      ],
      cta: 'Get Started with Pro',
      ctaHref: '/signup',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      badge: 'Bespoke Scale',
      price: 'Custom',
      period: 'tailored annual contract',
      description: 'Dedicated cloud deployment, SSO/SAML, and custom model routing.',
      icon: Shield,
      features: [
        'Everything in Professional',
        'Custom High-mode daily limit allocation',
        'SSO / SAML & OAuth account synchronization',
        'Dedicated PostgreSQL & Redis instances',
        'Custom system prompt library deployment',
        'Zero data retention & HIPAA/SOC2 options',
        '99.9% SLA & dedicated account engineer',
      ],
      cta: 'Contact Sales',
      ctaHref: '/contact',
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand/20">
      {/* Navigation */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg gradient-brand flex items-center justify-center">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="font-bold text-lg">Nexa<span className="gradient-text">AI</span></span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand bg-brand/5">
            <Sparkles className="size-3 mr-1.5" />
            Clear, Predictable Pricing
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Invest in Pure Productivity
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose the right tier for your workflow. No hidden token surcharges. Cancel or upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-3xl p-8 border transition-all duration-200 ${
                  p.highlighted
                    ? 'border-brand bg-card/90 shadow-2xl shadow-brand/10 ring-2 ring-brand/50'
                    : 'border-border/60 bg-card/40 backdrop-blur-sm hover:border-border'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="gradient-brand text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                      {p.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${
                    p.highlighted ? 'gradient-brand text-white' : 'bg-brand/10 text-brand'
                  }`}>
                    <Icon className="size-5" />
                  </div>
                  {!p.highlighted && (
                    <span className="text-xs text-muted-foreground border border-border/60 px-2.5 py-0.5 rounded-full">
                      {p.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{p.description}</p>

                <div className="mt-6 mb-6">
                  <span className="text-4xl font-black">{p.price}</span>
                  <span className="text-xs text-muted-foreground ml-2">/ {p.period}</span>
                </div>

                <div className="border-t border-border/50 pt-6 my-2 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">Features included</p>
                  <ul className="space-y-3">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check className="size-4 text-brand shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Link href={p.ctaHref} className="block w-full">
                    <Button
                      className={`w-full font-semibold h-11 ${
                        p.highlighted
                          ? 'gradient-brand text-white hover:opacity-90 shadow-md'
                          : 'border border-border/80 hover:bg-muted/50'
                      }`}
                      variant={p.highlighted ? 'default' : 'outline'}
                    >
                      {p.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-20 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaAI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
