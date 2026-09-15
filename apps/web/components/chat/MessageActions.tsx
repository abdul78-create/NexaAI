'use client'

import React, { useState } from 'react'
import { Check, Copy, RotateCw, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  content: string
  role: 'user' | 'assistant' | 'system'
  isLastAssistantMessage?: boolean
  isStreaming?: boolean
  onRegenerate?: () => void
  tokens?: number
  className?: string
}

export function MessageActions({
  content,
  role,
  isLastAssistantMessage,
  isStreaming,
  onRegenerate,
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
    <div className={cn('flex items-center gap-1 text-muted-foreground/60', className)}>
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

      {/* Regenerate Button (Assistant only) */}
      {role === 'assistant' && isLastAssistantMessage && !isStreaming && onRegenerate && (
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
