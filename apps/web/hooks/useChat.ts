import { useMemo } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { AI_MODELS } from '@/lib/mock-data'
import { Conversation, ConversationGroup } from '@/types/chat'

export function useChat() {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const selectedModelId = useChatStore((s) => s.selectedModelId)
  const searchQuery = useChatStore((s) => s.searchQuery)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const isSidebarCollapsed = useChatStore((s) => s.isSidebarCollapsed)
  const isMobileSidebarOpen = useChatStore((s) => s.isMobileSidebarOpen)

  const createNewChat = useChatStore((s) => s.createNewChat)
  const selectConversation = useChatStore((s) => s.selectConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const renameConversation = useChatStore((s) => s.renameConversation)
  const setSearchQuery = useChatStore((s) => s.setSearchQuery)
  const setSelectedModel = useChatStore((s) => s.setSelectedModel)
  const toggleSidebar = useChatStore((s) => s.toggleSidebar)
  const setSidebarCollapsed = useChatStore((s) => s.setSidebarCollapsed)
  const setMobileSidebarOpen = useChatStore((s) => s.setMobileSidebarOpen)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const stopGeneration = useChatStore((s) => s.stopGeneration)
  const regenerateLastMessage = useChatStore((s) => s.regenerateLastMessage)
  const clearActiveConversation = useChatStore((s) => s.clearActiveConversation)

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null
  }, [conversations, activeConversationId])

  const messages = useMemo(() => {
    return activeConversation?.messages || []
  }, [activeConversation])

  const activeModel = useMemo(() => {
    return AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0]
  }, [selectedModelId])

  // Filter and group conversations
  const groupedConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q))
        )
      : conversations

    const groups: Record<ConversationGroup, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
    }

    filtered.forEach((conv) => {
      if (groups[conv.group]) {
        groups[conv.group].push(conv)
      } else {
        groups['Previous 7 Days'].push(conv)
      }
    })

    return groups
  }, [conversations, searchQuery])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    activeModel,
    selectedModelId,
    groupedConversations,
    searchQuery,
    isStreaming,
    isSidebarCollapsed,
    isMobileSidebarOpen,

    // Actions
    createNewChat,
    selectConversation,
    deleteConversation,
    renameConversation,
    setSearchQuery,
    setSelectedModel,
    toggleSidebar,
    setSidebarCollapsed,
    setMobileSidebarOpen,
    sendMessage,
    stopGeneration,
    regenerateLastMessage,
    clearActiveConversation,
  }
}
