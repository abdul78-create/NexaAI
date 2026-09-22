import { create } from 'zustand'
import { Conversation, Folder, Message } from '@/types/chat'
import { INITIAL_CONVERSATIONS, AI_MODELS, generateMockAiResponse } from '@/lib/mock-data'
import { useAuthStore } from '@/stores/auth-store'
import {
  deleteConversationApi,
  editMessageApi,
  fetchConversationDetail,
  fetchTrashedConversations,
  fetchUserConversations,
  purgeConversationApi,
  regenerateMessageApi,
  restoreConversationApi,
  selectBranchApi,
  streamChatCompletion,
  trashConversationApi,
  updateConversationApi,
} from '@/lib/chat-api'
import {
  createFolderApi,
  deleteFolderApi,
  fetchUserFolders,
  updateFolderApi,
} from '@/lib/folders-api'
import { getApiBaseUrl } from '@/lib/api-config'

export type WorkspaceView = 'all' | 'archived' | 'trash'
export type ChatMode = 'quick' | 'standard' | 'high'

export interface HighModeQuota {
  mode: string
  limit: number
  used: number
  remaining: number
  resets_at: string
}

interface ChatState {
  conversations: Conversation[]
  trashedConversations: Conversation[]
  folders: Folder[]
  activeConversationId: string | null
  selectedModelId: string
  selectedMode: ChatMode
  highModeQuota: HighModeQuota | null
  draftInput: string
  searchQuery: string
  activeView: WorkspaceView
  selectedFolderId: string | null
  isStreaming: boolean
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  isLoadingConversations: boolean
  isLoadingFolders: boolean
  error: string | null

  // Actions
  fetchConversations: () => Promise<void>
  fetchTrashedConversationsStore: () => Promise<void>
  fetchFolders: () => Promise<void>
  fetchHighModeQuota: () => Promise<void>
  createFolder: (name: string, color?: string) => Promise<Folder | null>
  updateFolder: (folderId: string, updates: { name?: string; color?: string }) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  togglePinConversation: (id: string) => Promise<void>
  toggleArchiveConversation: (id: string) => Promise<void>
  moveConversationToFolder: (id: string, folderId: string | null) => Promise<void>
  trashConversation: (id: string) => Promise<void>
  restoreConversation: (id: string) => Promise<void>
  purgeConversation: (id: string) => Promise<void>
  setActiveView: (view: WorkspaceView) => void
  setSelectedFolderId: (folderId: string | null) => void
  createNewChat: () => void
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setSelectedModel: (modelId: string) => void
  setSelectedMode: (mode: ChatMode) => void
  setDraftInput: (text: string) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  regenerateLastMessage: () => Promise<void>
  clearActiveConversation: () => void
  selectBranch: (conversationId: string, messageId: string) => Promise<void>
  editUserMessageBranch: (messageId: string, content: string) => Promise<void>
  regenerateAssistantMessageBranch: (messageId: string) => Promise<void>
}

let activeAbortController: AbortController | null = null

function sanitizeErrorMessage(rawMessage?: string): string {
  if (!rawMessage) return 'Unable to generate AI response. Please try again.'
  const lower = rawMessage.toLowerCase()
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429')) {
    return 'Rate limit or quota exceeded. Please wait a moment and try again.'
  }
  if (lower.includes('not found') || lower.includes('404') || lower.includes('provider_api_error')) {
    return 'The AI model service encountered an issue. Please try again.'
  }
  if (lower.includes('timeout') || lower.includes('connection')) {
    return 'Network connection timed out. Please check your connection and try again.'
  }
  // Strip URLs or credentials if present
  const sanitized = rawMessage.replace(/https?:\/\/\S+/gi, '').replace(/[a-zA-Z0-9_-]{24,}/g, '[redacted]').trim()
  return sanitized || 'An error occurred during generation. Please try again.'
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: INITIAL_CONVERSATIONS,
  trashedConversations: [],
  folders: [],
  activeConversationId: 'conv-fastapi-async',
  selectedModelId: 'nexa-standard',
  selectedMode: 'standard',
  highModeQuota: null,
  draftInput: '',
  searchQuery: '',
  activeView: 'all',
  selectedFolderId: null,
  isStreaming: false,
  isSidebarCollapsed: typeof window !== 'undefined' ? localStorage.getItem('nexaai_sidebar_collapsed') === 'true' : false,
  isMobileSidebarOpen: false,
  isLoadingConversations: false,
  isLoadingFolders: false,
  error: null,

  setSelectedMode: (mode: ChatMode) => set({ selectedMode: mode }),
  setDraftInput: (draft: string) => set({ draftInput: draft }),

  toggleSidebar: () => {
    const next = !get().isSidebarCollapsed
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexaai_sidebar_collapsed', String(next))
      } catch {}
    }
    set({ isSidebarCollapsed: next })
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexaai_sidebar_collapsed', String(collapsed))
      } catch {}
    }
    set({ isSidebarCollapsed: collapsed })
  },

  setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),

  fetchHighModeQuota: async () => {
    const token = useAuthStore.getState().token
    if (!token) return
    const apiBase = getApiBaseUrl()
    try {
      const res = await fetch(`${apiBase}/usage/high-mode-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        set({ highModeQuota: data })
      }
    } catch {
      // Non-critical
    }
  },

  fetchConversations: async () => {
    const token = useAuthStore.getState().token
    if (!token) {
      return
    }

    set({ isLoadingConversations: true, error: null })
    try {
      const backendConvs = await fetchUserConversations(token, { include_archived: true })
      if (backendConvs.length > 0) {
        set({
          conversations: backendConvs,
          isLoadingConversations: false,
        })
        const currentActive = get().activeConversationId
        const activeId = currentActive && backendConvs.some((c) => c.id === currentActive)
          ? currentActive
          : backendConvs[0].id
        try {
          const detail = await fetchConversationDetail(token, activeId)
          set((state) => ({
            conversations: state.conversations.map((c) => (c.id === detail.id ? detail : c)),
            activeConversationId: activeId,
          }))
        } catch {
          set({ activeConversationId: activeId })
        }
      } else {
        set({ conversations: [], activeConversationId: null, isLoadingConversations: false })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations.'
      set({ isLoadingConversations: false, error: message })
    }
  },

  fetchTrashedConversationsStore: async () => {
    const token = useAuthStore.getState().token
    if (!token) return
    try {
      const trashed = await fetchTrashedConversations(token)
      set({ trashedConversations: trashed })
    } catch {
      // Fallback
    }
  },

  fetchFolders: async () => {
    const token = useAuthStore.getState().token
    if (!token) return
    set({ isLoadingFolders: true })
    try {
      const userFolders = await fetchUserFolders(token)
      set({ folders: userFolders, isLoadingFolders: false })
    } catch {
      set({ isLoadingFolders: false })
    }
  },

  createFolder: async (name: string, color?: string) => {
    const token = useAuthStore.getState().token
    if (!token) return null
    try {
      const newFolder = await createFolderApi(token, { name, color })
      set((state) => ({ folders: [...state.folders, newFolder] }))
      return newFolder
    } catch (err: any) {
      throw err
    }
  },

  updateFolder: async (folderId: string, updates: { name?: string; color?: string }) => {
    const token = useAuthStore.getState().token
    if (!token) return
    try {
      const updated = await updateFolderApi(token, folderId, updates)
      set((state) => ({
        folders: state.folders.map((f) => (f.id === folderId ? updated : f)),
      }))
    } catch (err: any) {
      throw err
    }
  },

  deleteFolder: async (folderId: string) => {
    const token = useAuthStore.getState().token
    if (!token) return
    try {
      await deleteFolderApi(token, folderId)
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId),
        conversations: state.conversations.map((c) =>
          c.folderId === folderId ? { ...c, folderId: null } : c
        ),
        selectedFolderId: state.selectedFolderId === folderId ? null : state.selectedFolderId,
      }))
    } catch (err: any) {
      throw err
    }
  },

  togglePinConversation: async (id: string) => {
    const conv = get().conversations.find((c) => c.id === id)
    if (!conv) return
    const newPinned = !conv.pinned

    // Optimistic UI update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, pinned: newPinned } : c
      ),
    }))

    const token = useAuthStore.getState().token
    if (token) {
      try {
        await updateConversationApi(token, id, { is_pinned: newPinned })
      } catch {
        // Revert on error
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !newPinned } : c
          ),
        }))
      }
    }
  },

  toggleArchiveConversation: async (id: string) => {
    const conv = get().conversations.find((c) => c.id === id)
    if (!conv) return
    const newArchived = !conv.isArchived

    // Optimistic UI update
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, isArchived: newArchived } : c
      ),
    }))

    const token = useAuthStore.getState().token
    if (token) {
      try {
        await updateConversationApi(token, id, { is_archived: newArchived })
      } catch {
        // Revert on error
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, isArchived: !newArchived } : c
          ),
        }))
      }
    }
  },

  moveConversationToFolder: async (id: string, folderId: string | null) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, folderId } : c
      ),
    }))

    const token = useAuthStore.getState().token
    if (token) {
      try {
        await updateConversationApi(token, id, { folder_id: folderId })
      } catch {
        // Revert on error
      }
    }
  },

  trashConversation: async (id: string) => {
    const conv = get().conversations.find((c) => c.id === id)
    if (!conv) return

    const token = useAuthStore.getState().token
    if (token) {
      try {
        await trashConversationApi(token, id)
      } catch {
        // Fallback
      }
    }

    const { conversations, activeConversationId, trashedConversations } = get()
    const updatedActive = conversations.filter((c) => c.id !== id)
    const trashedItem = { ...conv, deletedAt: new Date().toISOString() }

    let nextActive = activeConversationId
    if (activeConversationId === id) {
      nextActive = updatedActive.length > 0 ? updatedActive[0].id : null
    }

    set({
      conversations: updatedActive,
      trashedConversations: [trashedItem, ...trashedConversations],
      activeConversationId: nextActive,
    })
  },

  restoreConversation: async (id: string) => {
    const token = useAuthStore.getState().token
    let restoredConv: Conversation | null = null

    if (token) {
      try {
        restoredConv = await restoreConversationApi(token, id)
      } catch {
        // Fallback
      }
    }

    const { trashedConversations, conversations } = get()
    const item = trashedConversations.find((c) => c.id === id)
    if (!item && !restoredConv) return

    const restored = restoredConv || { ...item!, deletedAt: null }
    set({
      trashedConversations: trashedConversations.filter((c) => c.id !== id),
      conversations: [restored, ...conversations],
      activeConversationId: restored.id,
    })
  },

  purgeConversation: async (id: string) => {
    const token = useAuthStore.getState().token
    if (token) {
      try {
        await purgeConversationApi(token, id)
      } catch {
        // Fallback
      }
    }

    set((state) => ({
      trashedConversations: state.trashedConversations.filter((c) => c.id !== id),
    }))
  },

  setActiveView: (view: WorkspaceView) => set({ activeView: view, selectedFolderId: null }),
  setSelectedFolderId: (folderId: string | null) => set({ selectedFolderId: folderId }),

  createNewChat: () => {

    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
    set({
      activeConversationId: null,
      isStreaming: false,
      isMobileSidebarOpen: false,
    })
  },

  selectConversation: async (id: string) => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }

    set({
      activeConversationId: id,
      isStreaming: false,
      isMobileSidebarOpen: false,
    })

    const token = useAuthStore.getState().token
    if (token) {
      try {
        const detail = await fetchConversationDetail(token, id)
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === detail.id ? detail : c)),
        }))
      } catch {
        // Fallback silently if offline or cached
      }
    }
  },

  deleteConversation: async (id: string) => {
    const token = useAuthStore.getState().token
    if (token) {
      try {
        await deleteConversationApi(token, id)
      } catch {
        // Continue clearing local state
      }
    }

    const { conversations, activeConversationId } = get()
    const updated = conversations.filter((c) => c.id !== id)
    let nextActive = activeConversationId
    if (activeConversationId === id) {
      nextActive = updated.length > 0 ? updated[0].id : null
    }
    set({
      conversations: updated,
      activeConversationId: nextActive,
    })
  },

  renameConversation: async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
      ),
    }))

    const token = useAuthStore.getState().token
    if (token) {
      try {
        await updateConversationApi(token, id, { title: trimmed })
      } catch {
        // Fallback
      }
    }
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setSelectedModel: (modelId: string) => set({ selectedModelId: modelId }),

  sendMessage: async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const { activeConversationId, conversations, selectedModelId } = get()
    const selectedModel = AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0]
    const userMsgId = `usr-${Date.now()}`
    const assistantMsgId = `asst-${Date.now() + 1}`

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: 'done',
    }

    const activeConvId = activeConversationId
    const isConvExisting = Boolean(activeConvId && conversations.some((c) => c.id === activeConvId))
    let currentConvId: string = isConvExisting && activeConvId ? activeConvId : `conv-${Date.now()}`
    let updatedConversations = [...conversations]

    // If starting from empty state or active conversation is not in current conversation list, initialize new conversation
    if (!isConvExisting) {
      const newTitle = trimmed.length > 35 ? trimmed.slice(0, 35) + '...' : trimmed
      const newConversation: Conversation = {
        id: currentConvId,
        title: newTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelId: selectedModelId,
        messages: [userMessage],
        group: 'Today',
      }
      updatedConversations = [newConversation, ...updatedConversations]
      set({
        conversations: updatedConversations,
        activeConversationId: currentConvId,
      })
    } else {
      updatedConversations = updatedConversations.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMessage],
          }
        }
        return c
      })
      set({ conversations: updatedConversations })
    }

    // Prepare assistant placeholder message
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: 'assistant',
      model: selectedModel.name,
      createdAt: new Date().toISOString(),
      content: '',
      status: 'streaming',
    }

    set((state) => ({
      isStreaming: true,
      conversations: state.conversations.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
          }
        }
        return c
      }),
    }))

    const token = useAuthStore.getState().token

    // AUTHENTICATED REAL SSE STREAMING
    if (token) {
      activeAbortController = new AbortController()
      let accumulatedText = ''
      const realBackendConvId = currentConvId.startsWith('conv-') ? undefined : currentConvId

      try {
        await streamChatCompletion(
          token,
          {
            conversation_id: realBackendConvId,
            content: trimmed,
            model: selectedModelId,
            mode: get().selectedMode || 'standard',
          },
          (event, data) => {
            if (event === 'message_start') {
              if (data.conversation_id) {
                const newBackendId = data.conversation_id
                set((state) => ({
                  activeConversationId: newBackendId,
                  conversations: state.conversations.map((c) =>
                    c.id === currentConvId ? { ...c, id: newBackendId } : c
                  ),
                }))
                currentConvId = newBackendId
              }
            } else if (event === 'token') {
              accumulatedText += data.text || ''
              set((state) => ({
                conversations: state.conversations.map((c) => {
                  if (c.id === currentConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                      ),
                    }
                  }
                  return c
                }),
              }))
            } else if (event === 'usage') {
              set((state) => ({
                conversations: state.conversations.map((c) => {
                  if (c.id === currentConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, tokens: (data.output_tokens || 0) + (data.input_tokens || 0) }
                          : m
                      ),
                    }
                  }
                  return c
                }),
              }))
            } else if (event === 'message_end') {
              if (get().selectedMode === 'high') {
                get().fetchHighModeQuota()
              }
              set((state) => ({
                isStreaming: false,
                conversations: state.conversations.map((c) => {
                  if (c.id === currentConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: accumulatedText,
                              status: 'done',
                              tokens: Math.round(accumulatedText.length / 4),
                            }
                          : m
                      ),
                    }
                  }
                  return c
                }),
              }))
            } else if (event === 'error') {
              if (get().selectedMode === 'high') {
                get().fetchHighModeQuota()
              }
              const cleanError = sanitizeErrorMessage(data?.message)
              set((state) => ({
                isStreaming: false,
                conversations: state.conversations.map((c) => {
                  if (c.id === currentConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: accumulatedText,
                              status: 'error',
                              error: cleanError,
                            }
                          : m
                      ),
                    }
                  }
                  return c
                }),
              }))
            }
          },
          activeAbortController.signal
        )
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const cleanError = isAbort ? undefined : sanitizeErrorMessage(err instanceof Error ? err.message : 'Stream interrupted.')
        set((state) => ({
          isStreaming: false,
          conversations: state.conversations.map((c) => {
            if (c.id === currentConvId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: accumulatedText,
                        status: isAbort ? 'done' : 'error',
                        error: cleanError,
                      }
                    : m
                ),
              }
            }
            return c
          }),
        }))
      } finally {
        activeAbortController = null
      }
      return
    }

    // GUEST MODE FALLBACK (Zero-cost client mock stream)
    const fullResponse = generateMockAiResponse(trimmed, selectedModelId)
    const words = fullResponse.split(/(\s+)/)
    let currentContent = ''
    let isCancelled = false

    const abortController = new AbortController()
    activeAbortController = abortController
    abortController.signal.addEventListener('abort', () => {
      isCancelled = true
    })

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await delay(350)

    for (let i = 0; i < words.length; i++) {
      if (isCancelled) break
      currentContent += words[i]

      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: currentContent } : m
              ),
            }
          }
          return c
        }),
      }))

      if (words[i].trim().length > 0) {
        await delay(Math.floor(Math.random() * 20) + 15)
      }
    }

    set((state) => ({
      isStreaming: false,
      conversations: state.conversations.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: currentContent,
                    status: 'done',
                    tokens: Math.round(currentContent.length / 4),
                  }
                : m
            ),
          }
        }
        return c
      }),
    }))

    activeAbortController = null
  },

  stopGeneration: () => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
    set({ isStreaming: false })
  },

  regenerateLastMessage: async () => {
    const { activeConversationId, conversations } = get()
    if (!activeConversationId) return

    const conv = conversations.find((c) => c.id === activeConversationId)
    if (!conv || conv.messages.length === 0) return

    let lastUserPrompt = ''
    let lastUserIndex = -1
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].role === 'user') {
        lastUserPrompt = conv.messages[i].content
        lastUserIndex = i
        break
      }
    }

    if (!lastUserPrompt || lastUserIndex === -1) return

    // Truncate messages after that user message
    const trimmedMessages = conv.messages.slice(0, lastUserIndex + 1)
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId ? { ...c, messages: trimmedMessages } : c
      ),
    }))

    // Re-send user prompt
    await get().sendMessage(lastUserPrompt)
  },

  clearActiveConversation: () => {
    const { activeConversationId } = get()
    if (!activeConversationId) return
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === activeConversationId ? { ...c, messages: [] } : c
      ),
    }))
  },

  selectBranch: async (conversationId: string, messageId: string) => {
    const token = useAuthStore.getState().token
    if (!token) return
    try {
      const res = await selectBranchApi(token, conversationId, messageId)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, activeLeafMessageId: res.activeLeafMessageId, messages: res.messages }
            : c
        ),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch branch.'
      set({ error: message })
    }
  },

  editUserMessageBranch: async (messageId: string, content: string) => {
    const token = useAuthStore.getState().token
    const { activeConversationId } = get()
    if (!token || !activeConversationId) return
    try {
      const res = await editMessageApi(token, messageId, content)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === activeConversationId
            ? { ...c, activeLeafMessageId: res.activeLeafMessageId, messages: res.messages }
            : c
        ),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to edit message branch.'
      set({ error: message })
    }
  },

  regenerateAssistantMessageBranch: async (messageId: string) => {
    const token = useAuthStore.getState().token
    const { activeConversationId } = get()
    if (!token || !activeConversationId) return
    try {
      const res = await regenerateMessageApi(token, messageId)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === activeConversationId
            ? { ...c, activeLeafMessageId: res.activeLeafMessageId, messages: res.messages }
            : c
        ),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate response.'
      set({ error: message })
    }
  },
}))

