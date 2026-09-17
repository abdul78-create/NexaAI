import { PromptLibrary } from '@/components/prompts/PromptLibrary'

export const metadata = {
  title: 'Prompt Library — NexaAI Workspace',
  description: 'Curated system prompt templates and custom instructions for code review, writing, analysis, and productivity.',
}

export default function PromptsPage() {
  return <PromptLibrary />
}
