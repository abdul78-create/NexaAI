'use client'

import React from 'react'
import { QuotaSummaryResponse } from '@/lib/usage-api'
import { ShieldCheck, Zap, HardDrive, Clock } from 'lucide-react'

interface QuotaOverviewProps {
  quotas: QuotaSummaryResponse | null
}

export const QuotaOverview: React.FC<QuotaOverviewProps> = ({ quotas }) => {
  if (!quotas) return null

  const reqQuota = quotas.quotas?.requests
  const tokenQuota = quotas.quotas?.tokens
  const storageQuota = quotas.quotas?.storage

  const getPercent = (used: number = 0, limit: number = 1) =>
    Math.min(100, Math.round((used / limit) * 100))

  return (
    <div className="p-6 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Quota & Plan Status</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-300 border border-indigo-500/30">
            {quotas.plan_code.toUpperCase().replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Resets at 00:00 UTC
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Requests Quota */}
        {reqQuota && (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Daily Requests
              </span>
              <span className="font-mono text-slate-200">
                {reqQuota.used} / {reqQuota.limit}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${getPercent(reqQuota.used, reqQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{reqQuota.remaining} remaining today</p>
          </div>
        )}

        {/* Tokens Quota */}
        {tokenQuota && (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Daily Tokens
              </span>
              <span className="font-mono text-slate-200">
                {(tokenQuota.used / 1000).toFixed(1)}k / {(tokenQuota.limit / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${getPercent(tokenQuota.used, tokenQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{(tokenQuota.remaining / 1000).toFixed(1)}k remaining today</p>
          </div>
        )}

        {/* Storage Quota */}
        {storageQuota && (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Active Storage
              </span>
              <span className="font-mono text-slate-200">
                {(storageQuota.used / (1024 * 1024)).toFixed(1)} MB / {(storageQuota.limit / (1024 * 1024)).toFixed(0)} MB
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${getPercent(storageQuota.used, storageQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {((storageQuota.limit - storageQuota.used) / (1024 * 1024)).toFixed(1)} MB available
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
