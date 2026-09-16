'use client'

import React from 'react'
import { UsageBreakdownResponse } from '@/lib/usage-api'
import { Layers, Server } from 'lucide-react'

interface UsageBreakdownChartProps {
  breakdown: UsageBreakdownResponse | null
}

export const UsageBreakdownChart: React.FC<UsageBreakdownChartProps> = ({ breakdown }) => {
  const totalFeatureTokens = breakdown?.by_feature.reduce((acc, f) => acc + f.tokens, 0) || 1
  const totalProviderTokens = breakdown?.by_provider.reduce((acc, p) => acc + p.tokens, 0) || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Feature Breakdown */}
      <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Usage by Feature</h3>
        </div>

        <div className="space-y-3.5">
          {breakdown?.by_feature.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No feature usage recorded yet.</p>
          ) : (
            breakdown?.by_feature.map((item, i) => {
              const pct = Math.round((item.tokens / totalFeatureTokens) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 capitalize">{item.feature.replace('_', ' ')}</span>
                    <span className="text-slate-400 font-mono">
                      {item.requests} req ({item.tokens.toLocaleString()} tokens)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Server className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-100">Usage by AI Provider</h3>
        </div>

        <div className="space-y-3.5">
          {breakdown?.by_provider.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No provider usage recorded yet.</p>
          ) : (
            breakdown?.by_provider.map((item, i) => {
              const pct = Math.round((item.tokens / totalProviderTokens) * 100)
              const isMock = item.provider.toLowerCase() === 'mock'
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 capitalize flex items-center gap-2">
                      {item.provider.toUpperCase()}
                      {isMock && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Mock
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.requests} req ({item.tokens.toLocaleString()} tokens)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isMock ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
