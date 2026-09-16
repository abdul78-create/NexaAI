'use client'

import React from 'react'
import { AttachmentItem } from '@/lib/attachments-api'
import { X, FileText, FileAudio, ImageIcon, Loader2, AlertCircle } from 'lucide-react'

export interface PendingAttachment {
  id: string
  file: File
  attachment?: AttachmentItem
  previewUrl?: string
  status: 'uploading' | 'ready' | 'error'
  progress: number
  errorMessage?: string
}

interface MultimodalAttachmentTrayProps {
  attachments: PendingAttachment[]
  onRemove: (id: string) => void
}

export const MultimodalAttachmentTray: React.FC<MultimodalAttachmentTrayProps> = ({
  attachments,
  onRemove,
}) => {
  if (attachments.length === 0) return null

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 px-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl mb-2">
      {attachments.map((item) => {
        const isImage = item.file.type.startsWith('image/') || item.attachment?.media_type === 'image'
        const isAudio = item.file.type.startsWith('audio/') || item.attachment?.media_type === 'audio'

        return (
          <div
            key={item.id}
            className="relative flex items-center gap-2.5 p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg group max-w-[200px] flex-shrink-0 transition-all shadow-sm"
          >
            {/* Image Preview / Icon */}
            {isImage && item.previewUrl ? (
              <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-900 flex-shrink-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
              </div>
            ) : isAudio ? (
              <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}

            {/* Title & Status */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{item.file.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.status === 'uploading' && (
                  <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Uploading ({item.progress}%)
                  </span>
                )}
                {item.status === 'ready' && (
                  <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
                )}
                {item.status === 'error' && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1" title={item.errorMessage}>
                    <AlertCircle className="w-2.5 h-2.5" />
                    Failed
                  </span>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-md transition-all"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
