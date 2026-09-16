'use client'

import React from 'react'
import { FileText, Trash2, Eye, CheckCircle2, AlertCircle, Clock, Layers } from 'lucide-react'
import { DocumentItem } from '@/lib/documents-api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DocumentListProps {
  documents: DocumentItem[]
  onSelectPreview: (id: string) => void
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentList({ documents, onSelectPreview, onDelete }: DocumentListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="size-3" /> Indexed
          </span>
        )
      case 'failed':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertCircle className="size-3" /> Failed
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="size-3 animate-spin" /> Processing
          </span>
        )
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">Document Library ({documents.length})</h3>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-brand transition-colors">
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mt-0.5">
                    <span>{doc.file_type}</span>
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>{doc.chunk_count} chunks</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {getStatusBadge(doc.status)}

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelectPreview(doc.id)}
                    className="size-7 rounded-md text-muted-foreground hover:text-brand hover:bg-brand/10"
                    title="Inspect Chunks"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(doc.id)}
                    className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete Document"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <FileText className="size-8 opacity-40" />
          <p>No documents uploaded yet. Upload a PDF, DOCX, TXT, or MD file above.</p>
        </div>
      )}
    </div>
  )
}
