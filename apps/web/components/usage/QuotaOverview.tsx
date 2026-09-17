'use client'

import React from 'react'
import { QuotaSummaryResponse, HighModeStatusResponse } from '@/lib/usage-api'
import { ShieldCheck, Zap, HardDrive, Clock, Sparkles, CreditCard } from 'lucide-react'

interface QuotaOverviewProps {
  quotas: QuotaSummaryResponse | null
  highMode?: HighModeStatusResponse | null
}

export const QuotaOverview: React.FC<QuotaOverviewProps> = ({ quotas, highMode }) => {
  if (!quotas && !highMode) return null

  const reqQuota = quotas?.quotas?.requests
  const tokenQuota = quotas?.quotas?.tokens
  const storageQuota = quotas?.quotas?.storage

  const getPercent = (used: number = 0, limit: number = 1) =>
    Math.min(100, Math.max(0, Math.round((used / (limit || 1)) * 100)))

  return (
    <div className="p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-semibold text-foreground">Quota & Plan Status</h3>
        </div>

        <div className="flex items-center gap-2">
          {quotas?.plan_code && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {quotas.plan_code.toUpperCase().replace('_', ' ')}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Resets at 00:00 UTC
          </span>
        </div>
      </div>

      {/* Billing & Subscription Status Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            <strong className="text-foreground font-medium">Payment Gateway:</strong> Stripe billing portal is in developer sandbox preview. Quotas and daily limits are enforced via system access tiers.
          </span>
        </div>
        <span className="text-[11px] font-mono bg-secondary px-2 py-0.5 rounded text-foreground border border-border">
          {quotas?.plan_code?.toUpperCase() || 'STANDARD'} TIER
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* High Mode Daily Quota */}
        {highMode && (
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                High Mode (Daily)
              </span>
              <span className="font-mono font-semibold text-foreground">
                {highMode.used_today} / {highMode.daily_limit}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden border border-border">
              <div
                className={`h-full rounded-full transition-all ${
                  highMode.remaining_today === 0
                    ? 'bg-rose-500'
                    : highMode.remaining_today <= 1
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-amber-400 to-indigo-500'
                }`}
                style={{ width: `${getPercent(highMode.used_today, highMode.daily_limit)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {highMode.remaining_today} requests left today
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                GPT-4o
              </span>
            </div>
          </div>
        )}

        {/* Requests Quota */}
        {reqQuota && (
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                Daily Requests
              </span>
              <span className="font-mono font-semibold text-foreground">
                {reqQuota.used} / {reqQuota.limit}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden border border-border">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${getPercent(reqQuota.used, reqQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{reqQuota.remaining} remaining today</p>
          </div>
        )}

        {/* Tokens Quota */}
        {tokenQuota && (
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-500" />
                Daily Tokens
              </span>
              <span className="font-mono font-semibold text-foreground">
                {(tokenQuota.used / 1000).toFixed(1)}k / {(tokenQuota.limit / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden border border-border">
              <div
                className="h-full bg-violet-500 rounded-full transition-all"
                style={{ width: `${getPercent(tokenQuota.used, tokenQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{(tokenQuota.remaining / 1000).toFixed(1)}k remaining today</p>
          </div>
        )}

        {/* Storage Quota */}
        {storageQuota && (
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                Active Storage
              </span>
              <span className="font-mono font-semibold text-foreground">
                {(storageQuota.used / (1024 * 1024)).toFixed(1)} MB / {(storageQuota.limit / (1024 * 1024)).toFixed(0)} MB
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden border border-border">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${getPercent(storageQuota.used, storageQuota.limit)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {((storageQuota.limit - storageQuota.used) / (1024 * 1024)).toFixed(1)} MB available
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
