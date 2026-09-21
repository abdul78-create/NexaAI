'use client'

import React, { useState } from 'react'
import { Check, Copy, RotateCw, ThumbsUp, ThumbsDown, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  content: string
  role: 'user' | 'assistant' | 'system'
  isLastAssistantMessage?: boolean
  isStreaming?: boolean
  onRegenerate?: () => void
  onEdit?: () => void
  siblingIndex?: number
  siblingCount?: number
  siblingIds?: string[]
  onSelectBranch?: (targetMessageId: string) => void
  tokens?: number
  className?: string
}

export function MessageActions({
  content,
  role,
  isStreaming,
  onRegenerate,
  onEdit,
  siblingIndex,
  siblingCount,
  siblingIds,
  onSelectBranch,
  tokens,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<boolean | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-muted-foreground/60', className)}>
      {/* Branch Navigation Controls */}
      {siblingCount !== undefined && siblingCount > 1 && siblingIds && onSelectBranch && (
        <div className="flex items-center gap-0.5 text-xs font-mono text-muted-foreground bg-muted/40 rounded-md px-1 py-0.5 border border-white/5 mr-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={!siblingIndex || siblingIndex <= 1}
            onClick={() => {
              if (siblingIndex && siblingIndex > 1 && siblingIds) {
                onSelectBranch(siblingIds[siblingIndex - 2])
              }
            }}
            className="size-5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Previous branch version"
          >
            <ChevronLeft className="size-3" />
          </Button>
          <span className="px-1 text-[11px] select-none font-sans font-medium">
            {siblingIndex || 1} / {siblingCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={!siblingIndex || siblingIndex >= siblingCount}
            onClick={() => {
              if (siblingIndex && siblingIndex < siblingCount && siblingIds) {
                onSelectBranch(siblingIds[siblingIndex])
              }
            }}
            className="size-5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Next branch version"
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      )}

      {/* Copy Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="size-7 rounded-md hover:text-foreground hover:bg-white/5"
              aria-label="Copy message text"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </Button>
          }
        />
        <TooltipContent side="bottom" className="text-xs">
          {copied ? 'Copied to clipboard' : 'Copy message'}
        </TooltipContent>
      </Tooltip>

      {/* Edit Button (User only) */}
      {role === 'user' && !isStreaming && onEdit && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="size-7 rounded-md hover:text-foreground hover:bg-white/5"
                aria-label="Edit message"
              >
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent side="bottom" className="text-xs">
            Edit prompt
          </TooltipContent>
        </Tooltip>
      )}

      {/* Regenerate Button (Assistant only) */}
      {role === 'assistant' && !isStreaming && onRegenerate && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                className="size-7 rounded-md hover:text-foreground hover:bg-white/5"
                aria-label="Regenerate response"
              >
                <RotateCw className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent side="bottom" className="text-xs">
            Regenerate response
          </TooltipContent>
        </Tooltip>
      )}

      {/* Feedback buttons (Assistant only) */}
      {role === 'assistant' && !isStreaming && (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLiked(liked === true ? null : true)}
                  className={cn(
                    'size-7 rounded-md hover:text-foreground hover:bg-white/5',
                    liked === true && 'text-brand'
                  )}
                  aria-label="Good response"
                >
                  <ThumbsUp className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">Good response</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLiked(liked === false ? null : false)}
                  className={cn(
                    'size-7 rounded-md hover:text-foreground hover:bg-white/5',
                    liked === false && 'text-destructive'
                  )}
                  aria-label="Poor response"
                >
                  <ThumbsDown className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">Poor response</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Token count indicator */}
      {tokens && tokens > 0 && (
        <span className="ml-2 text-[11px] font-mono text-muted-foreground/40 select-none">
          ~{tokens} tokens
        </span>
      )}
    </div>
  )
}

