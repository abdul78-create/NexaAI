import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Pricing & Tiers — NexaAI',
  description: 'Explore active access and planned roadmap tiers for the NexaAI workspace.',
}

export default function PricingPage() {
  const plans = [
    {
      name: 'Free Starter',
      badge: 'Active Today',
      price: '$0',
      period: 'free access',
      description: 'Fully active tier with complete access to all implemented workspace tools.',
      icon: Zap,
      status: 'active' as const,
      features: [
        'Quick & Standard chat modes (gpt-4o-mini)',
        '5 daily High-mode reasoning requests (gpt-4o)',
        'Prompt Library with category search',
        'Speech Studio (mic recording & mock STT)',
        'NLP Analysis Studio & sentiment evaluation',
        'Tree-structured conversation history',
        'Community & issue tracker support',
      ],
      cta: 'Start Free Today',
      ctaHref: '/signup',
      highlighted: true,
    },
    {
      name: 'Professional',
      badge: 'Roadmap Preview',
      price: '$29',
      period: 'planned / month',
      description: 'Planned tier for expanded reasoning quotas and commercial provider routing.',
      icon: Crown,
      status: 'planned' as const,
      features: [
        'Everything in Free Starter',
        'Expanded High-mode daily reasoning allocations',
        'Direct OpenAI commercial API key integration',
        'OpenAI Whisper cloud transcription support',
        'Custom prompt template creation and sharing',
        'Priority SSE response streaming pipelines',
        'Export conversations to Markdown and JSON',
      ],
      cta: 'Planned (In Development)',
      ctaHref: '/contact',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      badge: 'Architecture Preview',
      price: 'Custom',
      period: 'planned deployment',
      description: 'Planned dedicated cloud and private network deployment options.',
      icon: Shield,
      status: 'planned' as const,
      features: [
        'Everything in Professional',
        'Custom High-mode quota limit configurations',
        'OAuth identity federation (Google & GitHub)',
        'Dedicated PostgreSQL and Redis instances',
        'Isolated private VPC / Nginx configurations',
        'Custom model provider backend adapters',
        'Direct architecture support from maintainers',
      ],
      cta: 'Contact Maintainers',
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
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand bg-brand/5">
            <Sparkles className="size-3 mr-1.5" />
            Transparent Platform Access
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Workspace Access & Roadmap
          </h1>
          <p className="text-muted-foreground text-lg">
            NexaAI is currently free to use with all implemented features. Commercial subscription tiers are shown below as an architectural preview.
          </p>
        </div>

        {/* Project Status Disclosure Banner */}
        <div className="mb-12 max-w-3xl mx-auto rounded-2xl border border-brand/20 bg-brand/5 p-4 sm:p-5 flex items-start gap-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <Info className="size-5 text-brand shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Project Billing Notice: </span>
            Paid payment processing and automated billing subscriptions are not yet active in production. All users can register and access the platform for free under the Free Starter tier today. Commercial tiers represent planned features.
          </div>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-4">
                    {p.status === 'active' ? 'Features active today' : 'Planned capabilities'}
                  </p>
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
                          : 'border border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
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
          <p>© {new Date().getFullYear()} NexaAI. Built with precision.</p>
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
