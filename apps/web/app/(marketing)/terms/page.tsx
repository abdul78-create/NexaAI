import Link from 'next/link'
import { ArrowLeft, FileText, Sparkles, Scale, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Terms of Service — NexaAI',
  description: 'Terms and conditions governing the use of NexaAI platform and services.',
}

export default function TermsPage() {
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
        <div className="mb-10">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand bg-brand/5">
            <FileText className="size-3 mr-1.5" />
            Legal Terms
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg">
            Effective Date: September 2026. Please read these terms carefully before utilizing the NexaAI platform.
          </p>
        </div>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Scale className="size-5 text-brand" />
              <h2>1. Agreement & Platform Eligibility</h2>
            </div>
            <p>
              By accessing or using NexaAI services, APIs, and client applications, you agree to be bound by these
              Terms. You represent that you are at least 18 years old or have reached the age of majority in your jurisdiction.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <AlertCircle className="size-5 text-brand" />
              <h2>2. Acceptable Use Policy</h2>
            </div>
            <p>
              You agree not to use NexaAI to generate, promote, or distribute malicious code, unlawful materials,
              defamatory content, harassment, or attempt to bypass security measures or resource quota allocations.
              Violation of acceptable use guidelines may result in immediate suspension.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <RefreshCw className="size-5 text-brand" />
              <h2>3. Subscription, Quotas & High Mode Limits</h2>
            </div>
            <p>
              NexaAI provides distinct tiers and chat modes. High-mode queries utilize resource-intensive reasoning models
              and are subject to daily quota allocations (default 5 high-reasoning requests per day on standard plans).
              Daily limits reset at 00:00 UTC.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Sparkles className="size-5 text-brand" />
              <h2>4. Intellectual Property & Output Ownership</h2>
            </div>
            <p>
              As between you and NexaAI, you retain all rights, title, and ownership in the prompts, attachments, and content
              you submit, as well as the output generated for you by the models, subject to applicable third-party provider terms.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaAI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing Plans</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
