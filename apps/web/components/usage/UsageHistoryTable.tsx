'use client'

import React from 'react'
import { UsageHistoryItem } from '@/lib/usage-api'
import { History, CheckCircle2, AlertCircle } from 'lucide-react'

interface UsageHistoryTableProps {
  logs: UsageHistoryItem[]
}

export const UsageHistoryTable: React.FC<UsageHistoryTableProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
        No execution audit logs found.
      </div>
    )
  }

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Execution Audit Log</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">Showing {logs.length} entries</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Feature</th>
              <th className="py-2.5 px-3">Provider</th>
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3 text-right">Tokens</th>
              <th className="py-2.5 px-3 text-right">Latency</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {logs.map((log) => {
              const isSuccess = log.status === 'success'
              const dateStr = new Date(log.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })

              return (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{dateStr}</td>
                  <td className="py-3 px-3 capitalize font-medium text-slate-200">{log.feature_type.replace('_', ' ')}</td>
                  <td className="py-3 px-3 uppercase font-semibold text-indigo-300">{log.provider}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">{log.model_name}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                    {log.total_tokens.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    {(log.execution_duration_ms / 1000).toFixed(2)}s
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isSuccess ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20" title={log.error_code || 'Error'}>
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
