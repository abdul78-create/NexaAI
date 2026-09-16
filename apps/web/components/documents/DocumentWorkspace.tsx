'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Layers, Search, Sparkles, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
  deleteDocumentApi,
  fetchDocumentDetail,
  fetchDocuments,
  queryRagApi,
  searchDocumentsApi,
  uploadDocumentApi,
  DocumentDetail,
  DocumentItem,
  RAGQueryResponse,
  SearchResultChunk,
} from '@/lib/documents-api'
import { UploadDropzone } from '@/components/documents/UploadDropzone'
import { DocumentList } from '@/components/documents/DocumentList'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import { DocumentSearch } from '@/components/documents/DocumentSearch'
import { DocumentChat } from '@/components/documents/DocumentChat'
import { cn } from '@/lib/utils'

type WorkspaceTab = 'documents' | 'search' | 'chat'

export function DocumentWorkspace() {
  const { token, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('documents')
  const [isUploading, setIsUploading] = useState(false)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDetail, setSelectedDetail] = useState<DocumentDetail | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && token) {
      loadDocuments()
    }
  }, [isAuthenticated, token])

  const loadDocuments = async () => {
    if (!token) return
    try {
      const docs = await fetchDocuments(token)
      setDocuments(docs)
    } catch {
      // Ignore
    }
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      const newDoc = await uploadDocumentApi(token, file)
      setDocuments((prev) => [newDoc, ...prev])
      if (isAuthenticated && token) {
        await loadDocuments()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setError(msg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      return
    }
    try {
      await deleteDocumentApi(token, id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // Ignore
    }
  }

  const handleSelectPreview = async (id: string) => {
    if (!token) {
      const doc = documents.find((d) => d.id === id)
      if (doc) {
        setSelectedDetail({
          ...doc,
          chunks: [
            {
              id: 'chk-1',
              chunk_index: 0,
              content: 'Sample text chunk preview for guest mode.',
              page_number: 1,
            },
          ],
        })
        setIsPreviewOpen(true)
      }
      return
    }

    try {
      const detail = await fetchDocumentDetail(token, id)
      setSelectedDetail(detail)
      setIsPreviewOpen(true)
    } catch {
      setError('Failed to fetch document detail.')
    }
  }

  const handleSearch = async (query: string): Promise<SearchResultChunk[]> => {
    return searchDocumentsApi(token, query)
  }

  const handleRagQuery = async (question: string): Promise<RAGQueryResponse> => {
    return queryRagApi(token, question)
  }

  const indexedCount = documents.filter((d) => d.status === 'indexed').length

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 md:p-6 lg:p-8 space-y-6 scrollbar-thin">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg">
            <FileText className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Document Intelligence & RAG</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/15 text-brand border border-brand/20 font-bold">
                Phase 8 Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vector indexing, semantic cosine similarity search, & grounded Q&A with citations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-400" />
          <span>{indexedCount} Documents Indexed</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'documents', label: 'Documents & Ingestion', icon: Layers },
            { id: 'search', label: 'Semantic Search', icon: Search },
            { id: 'chat', label: 'Grounded RAG Q&A', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  isActive
                    ? 'bg-brand/15 text-brand border-brand/30 shadow-sm font-semibold'
                    : 'bg-white/5 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Active Tab Views */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <UploadDropzone onUpload={handleUpload} isUploading={isUploading} />
          <DocumentList
            documents={documents}
            onSelectPreview={handleSelectPreview}
            onDelete={handleDelete}
          />
        </div>
      )}

      {activeTab === 'search' && <DocumentSearch onSearch={handleSearch} />}

      {activeTab === 'chat' && <DocumentChat onQuery={handleRagQuery} />}

      {/* Preview Inspection Drawer */}
      <DocumentPreview
        documentDetail={selectedDetail}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  )
}
