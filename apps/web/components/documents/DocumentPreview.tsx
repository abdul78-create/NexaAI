'use client'

import React from 'react'
import { FileText, X, Hash, Layers } from 'lucide-react'
import { DocumentDetail } from '@/lib/documents-api'
import { Button } from '@/components/ui/button'

interface DocumentPreviewProps {
  documentDetail: DocumentDetail | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreview({ documentDetail, isOpen, onClose }: DocumentPreviewProps) {
  if (!isOpen || !documentDetail) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg h-full bg-sidebar border-l border-white/10 p-5 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="size-4 text-brand flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground truncate">{documentDetail.filename}</h3>
              <p className="text-[10px] font-mono text-muted-foreground">{documentDetail.chunk_count} Chunks Indexed</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1">
          {documentDetail.chunks && documentDetail.chunks.length > 0 ? (
            documentDetail.chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-white/5 pb-1.5">
                  <span className="flex items-center gap-1">
                    <Hash className="size-3 text-brand" /> Chunk #{chunk.chunk_index + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="size-3" /> Page {chunk.page_number}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No chunks available for this document.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
