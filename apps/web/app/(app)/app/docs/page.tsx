import { DocumentWorkspace } from '@/components/documents/DocumentWorkspace'

export const metadata = {
  title: 'Document Intelligence & RAG | NexaAI',
  description: 'Document ingestion, text chunking, semantic vector similarity search, and grounded Q&A with source citations.',
}

export default function DocsPage() {
  return <DocumentWorkspace />
}
