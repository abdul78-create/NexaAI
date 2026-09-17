import Link from 'next/link'
import { ArrowLeft, Shield, Sparkles, Lock, Eye, Database, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Privacy Policy — NexaAI',
  description: 'How NexaAI protects your personal data and respect your confidentiality.',
}

export default function PrivacyPage() {
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
            <Shield className="size-3 mr-1.5" />
            Privacy & Trust
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last updated: September 2026. Your privacy and intellectual property are our highest priority.
          </p>
        </div>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Lock className="size-5 text-brand" />
              <h2>1. Data Collection & Usage Principles</h2>
            </div>
            <p>
              NexaAI collects only the information necessary to provide you with seamless, intelligent AI workspace
              capabilities. When you register, we collect your email address and display name. If you sign in using OAuth
              (such as Google or GitHub), we verify your identity without storing external passwords.
            </p>
            <p>
              We <strong className="text-foreground font-medium">do not sell</strong> your personal information or chat transcripts to third-party data brokers or advertisers.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Eye className="size-5 text-brand" />
              <h2>2. AI Processing & Confidentiality</h2>
            </div>
            <p>
              Your prompts, document uploads, and audio recordings are transmitted to verified AI model inference providers
              strictly to fulfill your generation requests. By default, customer data processed through NexaAI is not used
              to train foundational models unless explicitly agreed upon under enterprise agreements.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Database className="size-5 text-brand" />
              <h2>3. Data Retention & Deletion</h2>
            </div>
            <p>
              You maintain complete ownership of your conversations. You can edit, branch, archive, soft-delete, or permanently
              purge conversations and attachments at any time directly through the NexaAI workspace. Once purged, data is
              irreversibly removed from active storage clusters.
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-semibold text-xl">
              <Globe className="size-5 text-brand" />
              <h2>4. Security Standards & Compliance</h2>
            </div>
            <p>
              All network transmissions are protected with TLS 1.3 encryption. Passwords are salted and hashed using state-of-the-art
              Argon2id algorithms, and refresh credentials utilize SHA-256 rotation inside strict HttpOnly cookies.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaAI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact Security</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
