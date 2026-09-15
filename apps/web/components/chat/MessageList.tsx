'use client'

import React, { useEffect, useRef } from 'react'
import { Message } from '@/types/chat'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { EmptyChatState } from '@/components/chat/EmptyChatState'

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  modelName: string
  onSelectPrompt: (prompt: string) => void
  onRegenerate: () => void
}

export function MessageList({
  messages,
  isStreaming,
  modelName,
  onSelectPrompt,
  onRegenerate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on messages change or when streaming
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex overflow-y-auto">
        <EmptyChatState onSelectPrompt={onSelectPrompt} modelName={modelName} />
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
    <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-none pb-4">
      <div className="flex flex-col divide-y divide-white/[0.03]">
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastAssistantMessage={index === lastAssistantIndex}
            isStreaming={isStreaming}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}
