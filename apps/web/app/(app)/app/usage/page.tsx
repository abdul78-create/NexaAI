import { UsageDashboard } from '@/components/usage/UsageDashboard'

export const metadata = {
  title: 'Usage & Quotas | NexaAI Multimodal Platform',
  description: 'AI Usage analytics, token consumption metrics, execution audit logs, and quota status.',
}

export default function UsagePage() {
  return <UsageDashboard />
}
