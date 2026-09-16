import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export const metadata: Metadata = {
  title: 'Authentication | NexaAI',
  description: 'Sign in or create your NexaAI account to access the AI intelligence platform.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-primary/15 via-accent/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Auth Topbar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform hover:scale-[1.02]"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent shadow-md shadow-primary/20 text-white">
            <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Nexa<span className="text-primary font-bold">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        {children}
      </main>

      {/* Auth Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} NexaAI Platform. Enterprise-grade AI intelligence.</p>
      </footer>
    </div>
  )
}
