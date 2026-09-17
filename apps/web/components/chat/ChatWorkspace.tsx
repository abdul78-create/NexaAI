'use client'

import React from 'react'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/stores/chat-store'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { MessageList } from '@/components/chat/MessageList'
import { ChatComposer } from '@/components/chat/ChatComposer'

export function ChatWorkspace() {
  const {
    activeConversation,
    activeConversationId,
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
    editUserMessageBranch,
    regenerateAssistantMessageBranch,
    selectBranch,
  } = useChat()

  const handleSelectPrompt = (prompt: string) => {
    useChatStore.getState().setDraftInput(prompt)
  }

  const handleSelectBranch = (targetMessageId: string) => {
    if (activeConversationId) {
      selectBranch(activeConversationId, targetMessageId)
    }
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
        onRegenerateMessage={regenerateAssistantMessageBranch}
        onEditMessage={editUserMessageBranch}
        onSelectBranch={handleSelectBranch}
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
