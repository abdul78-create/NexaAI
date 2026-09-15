'use client'

import React from 'react'
import { Check, ChevronDown, Sparkles, Zap, Brain } from 'lucide-react'
import { AI_MODELS } from '@/lib/mock-data'
import { AiModel } from '@/types/chat'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  disabled?: boolean
  className?: string
}

const MODEL_ICONS: Record<string, React.ElementType> = {
  'nexa-standard': Zap,
  'nexa-pro': Sparkles,
  'nexa-reasoning': Brain,
}

export function ModelSelector({
  selectedModelId,
  onSelectModel,
  disabled,
  className,
}: ModelSelectorProps) {
  const currentModel = AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0]
  const CurrentIcon = MODEL_ICONS[currentModel.id] || Sparkles

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className={cn(
              'h-8 gap-2 rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-white/5 border border-white/8 transition-colors',
              className
            )}
            aria-label={`Current model: ${currentModel.name}`}
          >
            <div className="flex size-4 items-center justify-center rounded text-brand">
              <CurrentIcon className="size-3.5" />
            </div>
            <span>{currentModel.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-muted-foreground font-mono">
              {currentModel.badge}
            </Badge>
            <ChevronDown className="size-3 text-muted-foreground/60" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-80 p-1.5 bg-popover/95 backdrop-blur-md border border-white/10 shadow-2xl">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Select AI Model
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/6 my-1" />

        <div className="space-y-1">
          {AI_MODELS.map((model: AiModel) => {
            const Icon = MODEL_ICONS[model.id] || Sparkles
            const isSelected = model.id === currentModel.id

            return (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-2.5 cursor-pointer transition-colors outline-none',
                  isSelected
                    ? 'bg-brand/10 border border-brand/20'
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-md',
                    isSelected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {model.name}
                    </span>
                    {isSelected && <Check className="size-3.5 text-brand" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                    {model.tagline}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/70 font-mono">
                    <span>{model.contextWindow}</span>
                    <span>•</span>
                    <span>{model.speed}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
