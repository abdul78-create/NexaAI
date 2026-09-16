'use client'

import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { History, Trash2, Sparkles, ScanLine, Sliders } from 'lucide-react'
import { ImageAnalysisHistoryItem } from '@/lib/images-api'
import { Button } from '@/components/ui/button'

interface ImageHistoryProps {
  historyItems: ImageAnalysisHistoryItem[]
  onSelectHistoryItem: (item: ImageAnalysisHistoryItem) => void
  onDeleteHistoryItem: (id: string) => Promise<void>
  isLoading: boolean
}

export function ImageHistory({
  historyItems,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  isLoading,
}: ImageHistoryProps) {
  if (historyItems.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl bg-white/5">
        <History className="size-8 text-muted-foreground/40 mb-2" />
        <p className="text-xs font-medium">No Analysis History Yet</p>
        <p className="text-[10px] text-muted-foreground/60">Processed image tasks will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/6 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <History className="size-3.5 text-brand" />
          <span>Analysis History</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{historyItems.length} records</span>
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-none pr-1">
        <AnimatePresence initial={false}>
          {historyItems.map((item) => {
            const isVision = item.analysis_type === 'vision'
            const isOCR = item.analysis_type === 'ocr'
            const Icon = isVision ? Sparkles : isOCR ? ScanLine : Sliders

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center justify-between rounded-lg border border-white/6 bg-white/5 p-2.5 text-xs hover:border-brand/40 transition-colors cursor-pointer"
                onClick={() => onSelectHistoryItem(item)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate uppercase tracking-wider">
                      {item.analysis_type}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.prompt || item.extracted_text || new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteHistoryItem(item.id)
                  }}
                  className="size-6 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete record"
                >
                  <Trash2 className="size-3" />
                </Button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
