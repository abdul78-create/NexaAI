'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Message } from '@/types/chat'
import { MessageRenderer } from '@/components/chat/MessageRenderer'
import { MessageActions } from '@/components/chat/MessageActions'
import { ThinkingDots } from '@/components/chat/ThinkingAnimation'
import { Button } from '@/components/ui/button'
import { timeAgo, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

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

  const user = useAuthStore((s) => s.user)
  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || 'U'

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

  /* ---- USER MESSAGE ---- */
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
        className="group flex w-full justify-end px-4 py-3 md:px-8"
      >
        <div className="flex flex-col items-end gap-1.5 max-w-[75%]">
          {/* Timestamp */}
          <span
            suppressHydrationWarning
            className="text-[11px] text-muted-foreground/45 px-1 select-none"
          >
            {timeAgo(message.createdAt)}
          </span>

          {/* Bubble body */}
          {isEditing ? (
            <div className="w-full space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full min-w-[280px] rounded-2xl border border-brand/30 bg-brand/5 p-3.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 resize-y"
                disabled={isSavingEdit}
              />
              {editError && <p className="text-xs text-destructive px-1">{editError}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSavingEdit}
                  className="h-8 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editContent.trim()}
                  className="h-8 text-xs gradient-brand text-white rounded-xl shadow-md glow-brand-sm"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="mr-1.5 size-3 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save & Submit'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'relative rounded-3xl rounded-br-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                'bg-brand/10 border border-brand/15 text-foreground',
                'shadow-sm shadow-brand/5'
              )}
            >
              {message.content}
            </div>
          )}

          {/* Actions (hover) */}
          {!isCurrentlyStreaming && !isEditing && (
            <MessageActions
              content={message.content}
              role={message.role}
              isLastAssistantMessage={isLastAssistantMessage}
              isStreaming={isStreaming}
              onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
              onEdit={handleStartEdit}
              siblingIndex={message.siblingIndex}
              siblingCount={message.siblingCount}
              siblingIds={message.siblingIds}
              onSelectBranch={onSelectBranch}
              tokens={message.tokens}
              className="opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"
            />
          )}
        </div>

        {/* User avatar */}
        <div className="ml-3 flex-shrink-0 self-end mb-1">
          <div className="size-8 rounded-full bg-brand/20 border border-brand/35 text-brand flex items-center justify-center text-xs font-bold shadow-sm select-none">
            {userInitial}
          </div>
        </div>
      </motion.div>
    )
  }

  /* ---- ASSISTANT MESSAGE ---- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className={cn(
        'group relative flex w-full gap-3.5 px-4 py-5 md:px-8',
        'border-b border-white/[0.025]',
        isCurrentlyStreaming ? 'bg-muted/10' : 'hover:bg-muted/5 transition-colors'
      )}
    >
      {/* AI Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <motion.div
          className="size-8 rounded-xl gradient-brand flex items-center justify-center shadow-md text-white relative"
          animate={isCurrentlyStreaming ? {
            boxShadow: [
              '0 0 8px oklch(0.72 0.22 280 / 0.30)',
              '0 0 18px oklch(0.72 0.22 280 / 0.55)',
              '0 0 8px oklch(0.72 0.22 280 / 0.30)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="size-3.5" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {message.model || 'NexaAI'}
          </span>
          <span suppressHydrationWarning className="text-[11px] text-muted-foreground/40">
            {timeAgo(message.createdAt)}
          </span>
          {isCurrentlyStreaming && !message.content && (
            <span className="text-[11px] font-medium text-brand/70 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-brand animate-pulse" />
              thinking
            </span>
          )}
        </div>

        {/* Body */}
        <div className="text-foreground">
          <AnimatePresence mode="wait">
            {!message.content && isCurrentlyStreaming ? (
              <ThinkingDots key="thinking" />
            ) : message.content ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <MessageRenderer content={message.content} />
                {/* Streaming cursor */}
                {isCurrentlyStreaming && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 bg-brand rounded-full animate-blink align-middle" />
                )}
              </motion.div>
            ) : (
              <span className="text-sm text-muted-foreground/40 italic">Empty response</span>
            )}
          </AnimatePresence>
        </div>

        {/* Action Toolbar */}
        {!isCurrentlyStreaming && !isEditing && (
          <MessageActions
            content={message.content}
            role={message.role}
            isLastAssistantMessage={isLastAssistantMessage}
            isStreaming={isStreaming}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
            siblingIndex={message.siblingIndex}
            siblingCount={message.siblingCount}
            siblingIds={message.siblingIds}
            onSelectBranch={onSelectBranch}
            tokens={message.tokens}
            className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"
          />
        )}
      </div>
    </motion.div>
  )
}
