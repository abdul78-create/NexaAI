import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare, Sparkles, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContactForm } from '@/components/marketing/ContactForm'

export const metadata = {
  title: 'Contact Support & Sales — NexaAI',
  description: 'Get in touch with the NexaAI engineering, product, and customer success teams.',
}

export default function ContactPage() {
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
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 border-brand/30 text-brand bg-brand/5">
            <MessageSquare className="size-3 mr-1.5" />
            Get in Touch
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            We&apos;re Here to Help
          </h1>
          <p className="text-muted-foreground text-lg">
            Have questions about custom model deployments, API quotas, or enterprise security?
            Our engineering team is always ready to connect.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Info Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Mail className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">Email Support</h3>
              <p className="text-sm text-muted-foreground">Direct technical assistance and feedback.</p>
              <a href="mailto:support@nexaai.com" className="text-sm font-medium text-brand hover:underline block">
                support@nexaai.com
              </a>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Clock className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We respond within 24 hours on business days for standard plans, and under 1 hour for priority enterprise.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-4">
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <MapPin className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">Headquarters</h3>
              <p className="text-sm text-muted-foreground">San Francisco, CA & Remote Distributed</p>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="md:col-span-3 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-8 space-y-6">
            <h2 className="text-xl font-bold">Send us a message</h2>
            <ContactForm />
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaAI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
