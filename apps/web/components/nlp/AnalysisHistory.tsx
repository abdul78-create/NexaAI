'use client'

import React from 'react'
import { History, Trash2, ArrowUpRight, X, Clock } from 'lucide-react'
import { NLPAnalysisSummary } from '@/lib/nlp-api'
import { Button } from '@/components/ui/button'

interface AnalysisHistoryProps {
  history: NLPAnalysisSummary[]
  isOpen: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function AnalysisHistory({
  history,
  isOpen,
  onClose,
  onSelect,
  onDelete,
}: AnalysisHistoryProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-sidebar border-l border-white/10 p-5 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Analysis History</h3>
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

        {history.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-thin pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-brand/40 hover:bg-white/[0.06] transition-all"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item.id)
                    onClose()
                  }}
                  className="flex-1 text-left min-w-0 mr-2"
                >
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-brand transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span>{item.word_count} words</span>
                  </div>
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onSelect(item.id)
                      onClose()
                    }}
                    className="size-7 rounded-md text-muted-foreground hover:text-brand hover:bg-brand/10"
                    title="Load report"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete report"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
            <History className="size-8 opacity-40" />
            <p className="text-xs">No saved NLP analysis reports found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
