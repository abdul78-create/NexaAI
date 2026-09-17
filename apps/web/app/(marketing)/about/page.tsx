import Link from 'next/link'
import { ArrowLeft, Sparkles, Target, Zap, Heart, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'About Us — NexaAI',
  description: 'Learn about the mission, engineering philosophy, and architecture behind NexaAI.',
}

export default function AboutPage() {
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
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand bg-brand/5">
            <Target className="size-3 mr-1.5" />
            Our Mission
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Built for Serious AI Work
          </h1>
          <p className="text-muted-foreground text-lg">
            NexaAI was created to deliver an uncompromising, honest, and beautifully engineered AI workspace
            that balances raw inference power with elegant ergonomics.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 my-12">
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 text-center space-y-3">
            <div className="size-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Zap className="size-6" />
            </div>
            <h3 className="font-semibold text-lg">High Performance</h3>
            <p className="text-sm text-muted-foreground">
              Real-time SSE streaming, instant tree-branching, and millisecond latency tracking.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 text-center space-y-3">
            <div className="size-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Heart className="size-6" />
            </div>
            <h3 className="font-semibold text-lg">Precision UX</h3>
            <p className="text-sm text-muted-foreground">
              Flawless dark and light modes, tactile feedback, and accessible keyboard-first navigation.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 text-center space-y-3">
            <div className="size-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="font-semibold text-lg">Enterprise Solid</h3>
            <p className="text-sm text-muted-foreground">
              Production-ready FastAPI microservices, PostgreSQL with Alembic migrations, and Redis caching.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-8 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Why NexaAI?</h2>
          <p>
            Modern knowledge workers shouldn&apos;t have to settle for clumsy web wrappers and unpredictable model interfaces.
            NexaAI brings multimodal intelligence (OCR, vision, speech-to-text, and conversational reasoning) together in one unified,
            delightful interface.
          </p>
          <p>
            Whether you&apos;re drafting technical specifications, reviewing code diffs, or exploring deep analytical questions
            with our high-reasoning chat mode, NexaAI works with you at the speed of thought.
          </p>
        </section>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaAI. Built with precision.</p>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
