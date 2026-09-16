'use client'

import React from 'react'
import { Mic, Square, Pause, Play } from 'lucide-react'

interface RecordingControlsProps {
  recordingState: 'idle' | 'recording' | 'paused' | 'stopped'
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  disabled?: boolean
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  recordingState,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-3">
      {recordingState === 'idle' && (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
        >
          <Mic className="w-4 h-4" />
          Start Recording
        </button>
      )}

      {recordingState === 'recording' && (
        <>
          <button
            type="button"
            onClick={onPause}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
            title="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop
          </button>
        </>
      )}

      {recordingState === 'paused' && (
        <>
          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop
          </button>
        </>
      )}
    </div>
  )
}
