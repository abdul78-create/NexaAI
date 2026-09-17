import { useMemo } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { AI_MODELS } from '@/lib/mock-data'
import { Conversation, ConversationGroup } from '@/types/chat'

export function useChat() {
  const conversations = useChatStore((s) => s.conversations)
  const trashedConversations = useChatStore((s) => s.trashedConversations)
  const folders = useChatStore((s) => s.folders)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const selectedModelId = useChatStore((s) => s.selectedModelId)
  const searchQuery = useChatStore((s) => s.searchQuery)
  const activeView = useChatStore((s) => s.activeView)
  const selectedFolderId = useChatStore((s) => s.selectedFolderId)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const isSidebarCollapsed = useChatStore((s) => s.isSidebarCollapsed)
  const isMobileSidebarOpen = useChatStore((s) => s.isMobileSidebarOpen)
  const isLoadingConversations = useChatStore((s) => s.isLoadingConversations)
  const isLoadingFolders = useChatStore((s) => s.isLoadingFolders)

  const fetchConversations = useChatStore((s) => s.fetchConversations)
  const fetchTrashedConversationsStore = useChatStore((s) => s.fetchTrashedConversationsStore)
  const fetchFolders = useChatStore((s) => s.fetchFolders)
  const createFolder = useChatStore((s) => s.createFolder)
  const updateFolder = useChatStore((s) => s.updateFolder)
  const deleteFolder = useChatStore((s) => s.deleteFolder)
  const togglePinConversation = useChatStore((s) => s.togglePinConversation)
  const toggleArchiveConversation = useChatStore((s) => s.toggleArchiveConversation)
  const moveConversationToFolder = useChatStore((s) => s.moveConversationToFolder)
  const trashConversation = useChatStore((s) => s.trashConversation)
  const restoreConversation = useChatStore((s) => s.restoreConversation)
  const purgeConversation = useChatStore((s) => s.purgeConversation)
  const setActiveView = useChatStore((s) => s.setActiveView)
  const setSelectedFolderId = useChatStore((s) => s.setSelectedFolderId)

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
  const selectBranch = useChatStore((s) => s.selectBranch)
  const editUserMessageBranch = useChatStore((s) => s.editUserMessageBranch)
  const regenerateAssistantMessageBranch = useChatStore((s) => s.regenerateAssistantMessageBranch)

  const activeConversation = useMemo(() => {
    return (
      conversations.find((c) => c.id === activeConversationId) ||
      trashedConversations.find((c) => c.id === activeConversationId) ||
      null
    )
  }, [conversations, trashedConversations, activeConversationId])

  const messages = useMemo(() => {
    return activeConversation?.messages || []
  }, [activeConversation])

  const activeModel = useMemo(() => {
    return AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0]
  }, [selectedModelId])

  // Pinned conversations (active only)
  const pinnedConversations = useMemo(() => {
    return conversations.filter((c) => c.pinned && !c.isArchived && !c.deletedAt)
  }, [conversations])

  // Filter conversations according to active view, folder selection, and search query
  const viewFilteredConversations = useMemo(() => {
    let list: Conversation[] = []

    if (activeView === 'trash') {
      list = trashedConversations
    } else if (activeView === 'archived') {
      list = conversations.filter((c) => c.isArchived && !c.deletedAt)
    } else {
      // 'all' active view
      list = conversations.filter((c) => !c.isArchived && !c.deletedAt)
      if (selectedFolderId) {
        list = list.filter((c) => c.folderId === selectedFolderId)
      }
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
      )
    }

    return list
  }, [conversations, trashedConversations, activeView, selectedFolderId, searchQuery])

  // Group filtered conversations into Today, Yesterday, Previous 7 Days
  const groupedConversations = useMemo(() => {
    const groups: Record<ConversationGroup, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
    }

    viewFilteredConversations.forEach((conv) => {
      if (groups[conv.group]) {
        groups[conv.group].push(conv)
      } else {
        groups['Previous 7 Days'].push(conv)
      }
    })

    return groups
  }, [viewFilteredConversations])

  return {
    conversations,
    trashedConversations,
    folders,
    activeConversation,
    activeConversationId,
    messages,
    activeModel,
    selectedModelId,
    activeView,
    selectedFolderId,
    pinnedConversations,
    viewFilteredConversations,
    groupedConversations,
    searchQuery,
    isStreaming,
    isSidebarCollapsed,
    isMobileSidebarOpen,
    isLoadingConversations,
    isLoadingFolders,

    // Actions
    fetchConversations,
    fetchTrashedConversationsStore,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    togglePinConversation,
    toggleArchiveConversation,
    moveConversationToFolder,
    trashConversation,
    restoreConversation,
    purgeConversation,
    setActiveView,
    setSelectedFolderId,
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
    selectBranch,
    editUserMessageBranch,
    regenerateAssistantMessageBranch,
  }
}
