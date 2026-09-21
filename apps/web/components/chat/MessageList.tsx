'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowDown } from 'lucide-react'
import { Message } from '@/types/chat'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { EmptyChatState } from '@/components/chat/EmptyChatState'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  modelName: string
  mode?: string
  onSelectPrompt: (prompt: string) => void
  onRegenerate: () => void
  onRegenerateMessage?: (messageId: string) => void
  onEditMessage?: (messageId: string, newContent: string) => Promise<void> | void
  onSelectBranch?: (targetMessageId: string) => void
}

export function MessageList({
  messages,
  isStreaming,
  modelName,
  mode,
  onSelectPrompt,
  onRegenerate,
  onRegenerateMessage,
  onEditMessage,
  onSelectBranch,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolled, setIsUserScrolled] = useState(false)

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' })
    }
    setIsUserScrolled(false)
  }, [])

  // Detect user scroll position
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const userScrolled = distanceFromBottom > 120
    setIsUserScrolled(userScrolled)
    setShowScrollButton(userScrolled && messages.length > 0)
  }, [messages.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Auto-scroll on new messages / streaming (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolled) {
      // Use requestAnimationFrame for smoother scrolling during streaming
      const raf = requestAnimationFrame(() => {
        scrollToBottom(messages.length <= 1 ? 'instant' : 'smooth')
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [messages, isStreaming, isUserScrolled, scrollToBottom])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex overflow-y-auto">
        <EmptyChatState onSelectPrompt={onSelectPrompt} modelName={modelName} mode={mode} />
      </div>
    )
  }

  // Find last assistant message index
  let lastAssistantIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantIndex = i
      break
    }
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {/* Top scroll fade mask */}
      <div
        className="absolute top-0 inset-x-0 h-10 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, var(--background) 0%, transparent 100%)',
        }}
      />

      {/* Scrollable message area */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-none"
      >
        <div className="flex flex-col divide-y divide-white/[0.025] pb-4">
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLastAssistantMessage={index === lastAssistantIndex}
              isStreaming={isStreaming}
              onRegenerate={onRegenerateMessage || onRegenerate}
              onEdit={onEditMessage}
              onSelectBranch={onSelectBranch}
            />
          ))}
        </div>
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Scroll-to-bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => scrollToBottom()}
            className={cn(
              'absolute bottom-6 left-1/2 -translate-x-1/2 z-20',
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'bg-surface-2/90 backdrop-blur-md border border-white/10',
              'text-xs font-medium text-muted-foreground hover:text-foreground',
              'shadow-lg shadow-black/30 transition-colors'
            )}
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="size-3.5" />
            <span>Scroll to latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
