/**
 * Frontend client for Phase 15 Usage Analytics & Quota API.
 */

import { useAuthStore } from '@/stores/auth-store'
import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

export interface UsageSummaryResponse {
  period: string
  start_date: string
  total_requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  avg_latency_ms: number
  speech_duration_seconds: number
  storage_bytes_used: number
  estimated_cost_usd: number
}

export interface TimeseriesDataPoint {
  date: string
  requests: number
  tokens: number
}

export interface FeatureBreakdownItem {
  feature: string
  requests: number
  tokens: number
}

export interface ProviderBreakdownItem {
  provider: string
  requests: number
  tokens: number
}

export interface UsageBreakdownResponse {
  by_feature: FeatureBreakdownItem[]
  by_provider: ProviderBreakdownItem[]
}

export interface UsageHistoryItem {
  id: string
  feature_type: string
  provider: string
  model_name: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  execution_duration_ms: number
  status: string
  error_code?: string | null
  created_at: string
}

export interface UsageHistoryList {
  items: UsageHistoryItem[]
  total: number
}

export interface QuotaItemDetail {
  limit: number
  used: number
  remaining: number
  unit: string
}

export interface QuotaSummaryResponse {
  plan_code: string
  quotas: Record<string, QuotaItemDetail>
  resets_at: string
}

export interface HighModeStatusResponse {
  mode: string
  used_today: number
  daily_limit: number
  remaining_today: number
  resets_at: string
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getUsageSummary(): Promise<UsageSummaryResponse> {
  const res = await fetch(`${API_BASE}/usage/summary`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch usage summary')
  return res.json()
}

export async function getUsageTimeseries(days: number = 14): Promise<TimeseriesDataPoint[]> {
  const res = await fetch(`${API_BASE}/usage/timeseries?days=${days}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch timeseries metrics')
  return res.json()
}

export async function getUsageBreakdown(): Promise<UsageBreakdownResponse> {
  const res = await fetch(`${API_BASE}/usage/breakdown`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch usage breakdown')
  return res.json()
}

export async function getUsageHistory(limit: number = 50, offset: number = 0): Promise<UsageHistoryList> {
  const res = await fetch(`${API_BASE}/usage/history?limit=${limit}&offset=${offset}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch usage audit logs')
  return res.json()
}

export async function getUserQuotas(): Promise<QuotaSummaryResponse> {
  const res = await fetch(`${API_BASE}/usage/quotas`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch quota details')
  return res.json()
}

export async function getHighModeStatus(): Promise<HighModeStatusResponse> {
  const res = await fetch(`${API_BASE}/usage/high-mode-status`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch high-mode status')
  return res.json()
}

export async function downloadUsageExport(format: 'json' | 'csv' = 'csv'): Promise<void> {
  const res = await fetch(`${API_BASE}/usage/export?format=${format}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to export usage data')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nexaai_usage_export.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
