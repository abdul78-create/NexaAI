'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { Message } from '@/types/chat'
import { MessageRenderer } from '@/components/chat/MessageRenderer'
import { MessageActions } from '@/components/chat/MessageActions'
import { timeAgo, cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  isLastAssistantMessage?: boolean
  isStreaming?: boolean
  onRegenerate?: () => void
}

export function MessageBubble({
  message,
  isLastAssistantMessage,
  isStreaming,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isCurrentlyStreaming = message.status === 'streaming'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'group relative flex w-full gap-4 px-4 py-6 md:px-6 transition-colors',
        isUser ? 'bg-transparent' : 'bg-muted/20 border-y border-white/[0.02]'
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="size-8 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center text-xs font-bold shadow-sm">
              A
            </div>
          ) : (
            <div className="size-8 rounded-xl gradient-brand flex items-center justify-center shadow-md text-white">
              <Sparkles className="size-4" />
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground tracking-tight">
              {isUser ? 'You' : message.model || 'NexaAI'}
            </span>
            <span suppressHydrationWarning className="text-[11px] text-muted-foreground/50">
              {timeAgo(message.createdAt)}
            </span>
            {!isUser && isCurrentlyStreaming && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand">
                <span className="size-1.5 rounded-full bg-brand animate-ping" />
                Thinking...
              </span>
            )}
          </div>

          {/* Body */}
          <div className="text-foreground">
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div>
                {message.content ? (
                  <MessageRenderer content={message.content} />
                ) : (
                  // Empty state while streaming starts
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="size-2 rounded-full bg-brand/80 animate-pulse" />
                    <span className="size-2 rounded-full bg-brand/60 animate-pulse [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-brand/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                )}
                {/* Streaming pulse cursor */}
                {isCurrentlyStreaming && message.content && (
                  <span className="inline-block w-2 h-4 ml-1 bg-brand animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          {!isCurrentlyStreaming && (
            <MessageActions
              content={message.content}
              role={message.role}
              isLastAssistantMessage={isLastAssistantMessage}
              isStreaming={isStreaming}
              onRegenerate={onRegenerate}
              tokens={message.tokens}
              className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
