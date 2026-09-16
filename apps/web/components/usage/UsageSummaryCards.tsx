'use client'

import React from 'react'
import { UsageSummaryResponse } from '@/lib/usage-api'
import { Activity, Cpu, Clock, HardDrive, DollarSign } from 'lucide-react'

interface UsageSummaryCardsProps {
  summary: UsageSummaryResponse | null
}

export const UsageSummaryCards: React.FC<UsageSummaryCardsProps> = ({ summary }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const cards = [
    {
      title: 'Total Requests',
      value: summary?.total_requests?.toLocaleString() || '0',
      subtitle: 'This month',
      icon: Activity,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Total Tokens',
      value: summary?.total_tokens?.toLocaleString() || '0',
      subtitle: `${((summary?.prompt_tokens || 0) / 1000).toFixed(1)}k prompt / ${((summary?.completion_tokens || 0) / 1000).toFixed(1)}k completion`,
      icon: Cpu,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
      title: 'Speech Seconds',
      value: `${summary?.speech_duration_seconds?.toFixed(1) || '0.0'}s`,
      subtitle: 'Total transcribed audio',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Active Storage',
      value: formatBytes(summary?.storage_bytes_used || 0),
      subtitle: 'Media & documents stored',
      icon: HardDrive,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Est. USD Cost',
      value: `$${summary?.estimated_cost_usd?.toFixed(4) || '0.0000'}`,
      subtitle: 'Based on token usage',
      icon: DollarSign,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            className="p-5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-xl border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
