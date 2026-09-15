import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'NexaAI Workspace',
  description: 'Your AI workspace — intelligent chat, NLP analysis, and document intelligence.',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
