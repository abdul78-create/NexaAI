'use client'

import React from 'react'
import { SpeechHistoryItem, deleteSpeechHistory } from '@/lib/speech-api'
import { ProviderBadge } from './ProviderBadge'
import { Clock, Trash2, FileText, ChevronRight } from 'lucide-react'

interface SpeechHistoryProps {
  items: SpeechHistoryItem[]
  onSelect: (item: SpeechHistoryItem) => void
  onItemDeleted: (id: string) => void
  selectedId?: string
}

export const SpeechHistory: React.FC<SpeechHistoryProps> = ({
  items,
  onSelect,
  onItemDeleted,
  selectedId,
}) => {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteSpeechHistory(id)
      onItemDeleted(id)
    } catch (err) {
      console.error('Failed to delete history item', err)
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl">
        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium text-foreground">No transcription history yet</p>
        <p className="text-xs text-muted-foreground mt-1">Record microphone audio or upload an audio file to start.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider px-1">
        Past Transcriptions ({items.length})
      </h3>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isSelected = selectedId === item.id
          const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary/10 border-primary shadow-sm'
                  : 'bg-card hover:bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={item.provider} isMock={item.is_mock} modelName={item.model_name} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-foreground line-clamp-2 leading-relaxed font-sans">
                {item.transcript}
              </p>

              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                <span>Language: {item.language.toUpperCase()}</span>
                {item.audio_duration_seconds && (
                  <span>Duration: {item.audio_duration_seconds.toFixed(1)}s</span>
                )}
                <span className="flex items-center text-indigo-500 group-hover:translate-x-0.5 transition-transform">
                  View <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
