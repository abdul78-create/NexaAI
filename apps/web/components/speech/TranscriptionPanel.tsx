'use client'

import React from 'react'
import { SpeechTranscriptionResponse } from '@/lib/speech-api'
import { TranscriptEditor } from './TranscriptEditor'
import { ProviderBadge } from './ProviderBadge'

interface TranscriptionPanelProps {
  transcription: SpeechTranscriptionResponse
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ transcription }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Transcription Result
        </h3>
        <ProviderBadge
          provider={transcription.provider}
          isMock={transcription.is_mock}
          modelName={transcription.model_name}
        />
      </div>

      <TranscriptEditor
        initialTranscript={transcription.transcript}
        audioDurationSeconds={transcription.audio_duration_seconds}
        executionDurationMs={transcription.duration_ms}
        language={transcription.language}
      />
    </div>
  )
}
