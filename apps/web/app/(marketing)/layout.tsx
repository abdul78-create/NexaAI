import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NexaAI — Premium AI Platform',
  description: 'The next generation of AI conversation. Intelligent chat, NLP analysis, and document intelligence in one premium platform.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  )
}
