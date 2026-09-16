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
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-400">No transcription history yet</p>
        <p className="text-xs text-slate-500 mt-1">Record microphone audio or upload an audio file to start.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider px-1">
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
                  ? 'bg-indigo-600/10 border-indigo-500/40 shadow-md shadow-indigo-500/5'
                  : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <ProviderBadge provider={item.provider} isMock={item.is_mock} modelName={item.model_name} />
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dateStr}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-sans">
                {item.transcript}
              </p>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                <span>Language: {item.language.toUpperCase()}</span>
                {item.audio_duration_seconds && (
                  <span>Duration: {item.audio_duration_seconds.toFixed(1)}s</span>
                )}
                <span className="flex items-center text-indigo-400 group-hover:translate-x-0.5 transition-transform">
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
