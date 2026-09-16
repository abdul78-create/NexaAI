'use client'

import React from 'react'
import { Loader2, Mic, Sparkles } from 'lucide-react'

interface SpeechProcessingStatusProps {
  statusText?: string
}

export const SpeechProcessingStatus: React.FC<SpeechProcessingStatusProps> = ({
  statusText = 'Transcribing audio stream...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-4">
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <Mic className="w-4 h-4 absolute text-indigo-300" />
      </div>

      <div className="text-center space-y-1">
        <h4 className="text-base font-semibold text-slate-100 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          Speech Intelligence Active
        </h4>
        <p className="text-xs text-slate-400">{statusText}</p>
      </div>
    </div>
  )
}
