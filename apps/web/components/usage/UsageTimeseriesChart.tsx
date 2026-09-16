'use client'

import React, { useState } from 'react'
import { TimeseriesDataPoint } from '@/lib/usage-api'
import { TrendingUp, BarChart2 } from 'lucide-react'

interface UsageTimeseriesChartProps {
  data: TimeseriesDataPoint[]
}

export const UsageTimeseriesChart: React.FC<UsageTimeseriesChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'requests' | 'tokens'>('tokens')

  const maxValue = Math.max(1, ...data.map((d) => (metric === 'tokens' ? d.tokens : d.requests)))

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Daily Execution Activity</h3>
        </div>

        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMetric('tokens')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              metric === 'tokens'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tokens
          </button>
          <button
            type="button"
            onClick={() => setMetric('requests')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              metric === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-800/80">
        {data.map((item, i) => {
          const val = metric === 'tokens' ? item.tokens : item.requests
          const heightPercent = Math.max(6, Math.round((val / maxValue) * 100))
          const dateLabel = item.date.slice(5) // MM-DD

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                {metric === 'tokens' ? `${(val / 1000).toFixed(1)}k` : val}
              </div>

              <div
                className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                  val > 0
                    ? 'bg-indigo-500 hover:bg-indigo-400 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800/40'
                }`}
                style={{ height: `${heightPercent}%` }}
              />

              <span className="text-[10px] text-slate-500 font-mono truncate">{dateLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
