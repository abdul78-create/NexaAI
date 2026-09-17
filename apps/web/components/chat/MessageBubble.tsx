'use client'

import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Message } from '@/types/chat'
import { MessageRenderer } from '@/components/chat/MessageRenderer'
import { MessageActions } from '@/components/chat/MessageActions'
import { Button } from '@/components/ui/button'
import { timeAgo, cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  isLastAssistantMessage?: boolean
  isStreaming?: boolean
  onRegenerate?: (messageId: string) => void
  onEdit?: (messageId: string, newContent: string) => Promise<void> | void
  onSelectBranch?: (targetMessageId: string) => void
}

export function MessageBubble({
  message,
  isLastAssistantMessage,
  isStreaming,
  onRegenerate,
  onEdit,
  onSelectBranch,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isCurrentlyStreaming = message.status === 'streaming'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const handleStartEdit = () => {
    setEditContent(message.content)
    setEditError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(message.content)
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === message.content || !onEdit) {
      setIsEditing(false)
      return
    }

    setIsSavingEdit(true)
    setEditError(null)
    try {
      await onEdit(message.id, trimmed)
      setIsEditing(false)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to save edits')
    } finally {
      setIsSavingEdit(false)
    }
  }

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
              isEditing ? (
                <div className="space-y-2 mt-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-white/15 bg-muted/40 p-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y"
                    disabled={isSavingEdit}
                  />
                  {editError && <p className="text-xs text-destructive">{editError}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSavingEdit}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editContent.trim()}
                      className="h-8 text-xs gradient-brand text-white"
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 className="mr-1.5 size-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save & Submit'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )
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
          {!isCurrentlyStreaming && !isEditing && (
            <MessageActions
              content={message.content}
              role={message.role}
              isLastAssistantMessage={isLastAssistantMessage}
              isStreaming={isStreaming}
              onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
              onEdit={isUser ? handleStartEdit : undefined}
              siblingIndex={message.siblingIndex}
              siblingCount={message.siblingCount}
              siblingIds={message.siblingIds}
              onSelectBranch={onSelectBranch}
              tokens={message.tokens}
              className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}

