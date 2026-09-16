'use client'

import React from 'react'

interface AudioWaveformProps {
  isRecording?: boolean
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording = false }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-8 px-4 py-1">
      {[40, 70, 30, 90, 60, 80, 45, 95, 50, 75, 35, 65].map((height, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-indigo-500 transition-all ${
            isRecording ? 'animate-pulse' : 'opacity-40'
          }`}
          style={{
            height: isRecording ? `${height}%` : '20%',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}
