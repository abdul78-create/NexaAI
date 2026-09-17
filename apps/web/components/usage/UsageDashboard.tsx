'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  UsageSummaryResponse,
  TimeseriesDataPoint,
  UsageBreakdownResponse,
  UsageHistoryItem,
  QuotaSummaryResponse,
  HighModeStatusResponse,
  getUsageSummary,
  getUsageTimeseries,
  getUsageBreakdown,
  getUsageHistory,
  getUserQuotas,
  getHighModeStatus,
  downloadUsageExport,
} from '@/lib/usage-api'
import { UsageSummaryCards } from './UsageSummaryCards'
import { UsageTimeseriesChart } from './UsageTimeseriesChart'
import { UsageBreakdownChart } from './UsageBreakdownChart'
import { QuotaOverview } from './QuotaOverview'
import { UsageHistoryTable } from './UsageHistoryTable'
import { BarChart3, Download, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

export const UsageDashboard: React.FC = () => {
  const [summary, setSummary] = useState<UsageSummaryResponse | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesDataPoint[]>([])
  const [breakdown, setBreakdown] = useState<UsageBreakdownResponse | null>(null)
  const [quotas, setQuotas] = useState<QuotaSummaryResponse | null>(null)
  const [highMode, setHighMode] = useState<HighModeStatusResponse | null>(null)
  const [history, setHistory] = useState<UsageHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [sumRes, tsRes, bdRes, qRes, hmRes, histRes] = await Promise.all([
        getUsageSummary(),
        getUsageTimeseries(14),
        getUsageBreakdown(),
        getUserQuotas(),
        getHighModeStatus().catch(() => null),
        getUsageHistory(25, 0),
      ])

      setSummary(sumRes)
      setTimeseries(tsRes)
      setBreakdown(bdRes)
      setQuotas(qRes)
      setHighMode(hmRes)
      setHistory(histRes.items)
    } catch (err: any) {
      setError(err.message || 'Failed to load usage dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true)
    try {
      await downloadUsageExport(format)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card text-card-foreground border border-border rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            AI Usage & Quota Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time telemetry tracking tokens, request volume, speech seconds, and daily quotas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all border border-border"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all border border-border"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-card border border-border rounded-3xl space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading AI usage metrics...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <UsageSummaryCards summary={summary} />

          {/* Quotas Banner */}
          <QuotaOverview quotas={quotas} highMode={highMode} />

          {/* Timeseries Chart */}
          <UsageTimeseriesChart data={timeseries} />

          {/* Feature & Provider Breakdowns */}
          <UsageBreakdownChart breakdown={breakdown} />

          {/* Execution History Table */}
          <UsageHistoryTable logs={history} />
        </>
      )}
    </div>
  )
}
