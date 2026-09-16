'use client'

import React, { useState } from 'react'
import { FileText, Layers, Percent } from 'lucide-react'
import { RAGCitation } from '@/lib/documents-api'

interface SourceCitationProps {
  citation: RAGCitation
}

export function SourceCitation({ citation }: SourceCitationProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block ml-1.5 mr-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/15 hover:bg-brand/25 text-brand border border-brand/30 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
      >
        <FileText className="size-3" />
        <span>[Source {citation.citation_id}]</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-card border border-white/15 shadow-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
              <FileText className="size-3.5 text-brand" /> {citation.filename}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
              <Layers className="size-3" /> p.{citation.page_number}
            </span>
          </div>

          <p className="text-[11px] font-mono text-foreground/90 bg-white/5 p-2 rounded border border-white/5 leading-relaxed italic">
            "{citation.excerpt}"
          </p>

          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>Relevance Score:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <Percent className="size-3" /> {(citation.relevance_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
