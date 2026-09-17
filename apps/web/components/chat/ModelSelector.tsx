'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Check, ChevronDown, Sparkles, Zap, Brain, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'
import { getApiBaseUrl } from '@/lib/api-config'

export type ChatModeType = 'quick' | 'standard' | 'high'

interface HighModeStatus {
  mode: string
  limit: number
  used: number
  remaining: number
  resets_at: string
}

interface ModelSelectorProps {
  selectedModelId?: string
  onSelectModel?: (modelId: string) => void
  disabled?: boolean
  className?: string
}

const MODES_CONFIG: Record<
  ChatModeType,
  {
    name: string
    tagline: string
    modelId: string
    modelName: string
    badge: string
    icon: React.ElementType
    color: string
    bgLight: string
  }
> = {
  quick: {
    name: 'Quick',
    tagline: 'Fast responses for everyday queries and lookups',
    modelId: 'nexa-fast',
    modelName: 'gpt-4o-mini',
    badge: 'Fast',
    icon: Zap,
    color: 'text-amber-500',
    bgLight: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  standard: {
    name: 'Standard',
    tagline: 'Balanced intelligence, writing & productivity',
    modelId: 'nexa-standard',
    modelName: 'gpt-4o-mini',
    badge: 'Default',
    icon: Sparkles,
    color: 'text-brand',
    bgLight: 'bg-brand/10 border-brand/20 text-brand',
  },
  high: {
    name: 'High',
    tagline: 'Deep reasoning, complex logic & architecture',
    modelId: 'nexa-reasoning',
    modelName: 'gpt-4o',
    badge: 'Deep Reasoning',
    icon: Brain,
    color: 'text-purple-500',
    bgLight: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
  },
}

export function ModelSelector({
  selectedModelId,
  onSelectModel,
  disabled,
  className,
}: ModelSelectorProps) {
  const token = useAuthStore((s) => s.token)
  const selectedMode = useChatStore((s) => s.selectedMode) || 'standard'
  const setSelectedMode = useChatStore((s) => s.setSelectedMode)
  const highModeQuota = useChatStore((s) => s.highModeQuota)
  const fetchHighModeQuota = useChatStore((s) => s.fetchHighModeQuota)

  const [quota, setQuota] = useState<HighModeStatus | null>(highModeQuota)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync quota from store or fetch
  const refreshQuota = useCallback(async () => {
    if (!token) return
    setIsRefreshing(true)
    try {
      if (fetchHighModeQuota) {
        await fetchHighModeQuota()
      } else {
        const apiBase = getApiBaseUrl()
        const res = await fetch(`${apiBase}/usage/high-mode-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setQuota(data)
        }
      }
    } catch {
      // Non-critical quota fetch error
    } finally {
      setIsRefreshing(false)
    }
  }, [token, fetchHighModeQuota])

  useEffect(() => {
    refreshQuota()
  }, [refreshQuota])

  useEffect(() => {
    if (highModeQuota) {
      setQuota(highModeQuota)
    }
  }, [highModeQuota])

  const currentModeConfig = MODES_CONFIG[selectedMode as ChatModeType] || MODES_CONFIG.standard
  const CurrentIcon = currentModeConfig.icon

  const handleSelectMode = (mode: ChatModeType) => {
    if (mode === 'high' && quota && quota.remaining <= 0) {
      alert(`Daily limit of ${quota.limit} High-mode requests reached. Resets at 00:00 UTC. Falling back to Standard mode.`)
      return
    }

    if (setSelectedMode) {
      setSelectedMode(mode)
    }
    if (onSelectModel) {
      onSelectModel(MODES_CONFIG[mode].modelId)
    }
  }

  const highRemainingText = quota
    ? `${quota.remaining}/${quota.limit} left`
    : '5/day'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={cn(
              'h-8 gap-2 rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-muted/60 border border-border/80 transition-colors shadow-sm',
              className
            )}
            aria-label={`Current chat mode: ${currentModeConfig.name}`}
          >
            <div className={cn('flex size-4 items-center justify-center rounded', currentModeConfig.color)}>
              <CurrentIcon className="size-3.5" />
            </div>
            <span className="font-semibold">{currentModeConfig.name}</span>

            {selectedMode === 'high' ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 bg-purple-500/10 text-purple-500 font-mono">
                {highRemainingText}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground font-mono">
                {currentModeConfig.badge}
              </Badge>
            )}

            <ChevronDown className="size-3 text-muted-foreground/70" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-84 p-2 bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="p-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Select Chat Mode
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              refreshQuota()
            }}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-1"
            title="Refresh High mode quota"
          >
            <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        <DropdownMenuSeparator className="my-1.5 bg-border/50" />

        <div className="space-y-1">
          {(Object.keys(MODES_CONFIG) as ChatModeType[]).map((modeKey) => {
            const cfg = MODES_CONFIG[modeKey]
            const Icon = cfg.icon
            const isSelected = selectedMode === modeKey
            const isHigh = modeKey === 'high'
            const isHighExhausted = isHigh && Boolean(quota && quota.remaining <= 0)

            return (
              <DropdownMenuItem
                key={modeKey}
                onClick={() => handleSelectMode(modeKey)}
                disabled={isHighExhausted}
                className={cn(
                  'flex items-start gap-3 rounded-xl p-2.5 cursor-pointer transition-all outline-none',
                  isSelected
                    ? 'bg-brand/10 border border-brand/30 shadow-xs'
                    : isHighExhausted
                    ? 'opacity-60 cursor-not-allowed hover:bg-transparent border border-transparent'
                    : 'hover:bg-muted/60 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg',
                    isSelected ? 'bg-brand text-white shadow-sm' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {cfg.name}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({cfg.modelName})
                      </span>
                    </span>

                    {isHigh ? (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-md font-mono border',
                          isHighExhausted
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        )}
                      >
                        {isHighExhausted ? '0 left today' : highRemainingText}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cfg.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {cfg.tagline}
                  </p>

                  {isHighExhausted && (
                    <p className="mt-1 text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Daily limit reached · Resets 00:00 UTC
                    </p>
                  )}
                </div>

                {isSelected && (
                  <Check className="size-4 text-brand shrink-0 mt-1" />
                )}
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
