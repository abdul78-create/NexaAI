'use client'

import React from 'react'

interface ProviderBadgeProps {
  provider: string
  isMock: boolean
  modelName?: string
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  isMock,
  modelName,
}) => {
  if (isMock || provider.toLowerCase() === 'mock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Simulated STT output for offline/dev/guest mode">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Mock Mode
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      {provider.toUpperCase() === 'OPENAI' ? 'OpenAI Whisper' : provider} {modelName ? `(${modelName})` : ''}
    </span>
  )
}
