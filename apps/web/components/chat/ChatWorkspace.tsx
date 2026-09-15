'use client'

import React from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { MessageList } from '@/components/chat/MessageList'
import { ChatComposer } from '@/components/chat/ChatComposer'

export function ChatWorkspace() {
  const {
    activeConversation,
    messages,
    activeModel,
    isStreaming,
    selectedModelId,
    sendMessage,
    stopGeneration,
    regenerateLastMessage,
    clearActiveConversation,
    setSelectedModel,
    setMobileSidebarOpen,
  } = useChat()

  const handleSelectPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <div className="flex h-full flex-col bg-background min-w-0 overflow-hidden">
      {/* Top Header */}
      <ChatHeader
        title={activeConversation?.title || 'New conversation'}
        modelName={activeModel.name}
        hasMessages={messages.length > 0}
        onClearChat={clearActiveConversation}
        onToggleMobileMenu={() => setMobileSidebarOpen(true)}
      />

      {/* Main Message Stream or Empty State */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        modelName={activeModel.name}
        onSelectPrompt={handleSelectPrompt}
        onRegenerate={regenerateLastMessage}
      />

      {/* Floating Bottom Composer */}
      <ChatComposer
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        isStreaming={isStreaming}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModel}
      />
    </div>
  )
}
