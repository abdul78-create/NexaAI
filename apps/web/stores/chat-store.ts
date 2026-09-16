import { create } from 'zustand'
import { Conversation, Message } from '@/types/chat'
import { INITIAL_CONVERSATIONS, AI_MODELS, generateMockAiResponse } from '@/lib/mock-data'
import { useAuthStore } from '@/stores/auth-store'
import {
  deleteConversationApi,
  fetchConversationDetail,
  fetchUserConversations,
  streamChatCompletion,
  updateConversationApi,
} from '@/lib/chat-api'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  selectedModelId: string
  searchQuery: string
  isStreaming: boolean
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  isLoadingConversations: boolean
  error: string | null

  // Actions
  fetchConversations: () => Promise<void>
  createNewChat: () => void
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, newTitle: string) => Promise<void>
  setSearchQuery: (q: string) => void
  setSelectedModel: (modelId: string) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  regenerateLastMessage: () => Promise<void>
  clearActiveConversation: () => void
}

let activeAbortController: AbortController | null = null

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: INITIAL_CONVERSATIONS,
  activeConversationId: 'conv-fastapi-async',
  selectedModelId: 'nexa-standard',
  searchQuery: '',
  isStreaming: false,
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isLoadingConversations: false,
  error: null,

  fetchConversations: async () => {
    const token = useAuthStore.getState().token
    if (!token) {
      // Guest mode: retain client mock conversations
      return
    }

    set({ isLoadingConversations: true, error: null })
    try {
      const backendConvs = await fetchUserConversations(token)
      if (backendConvs.length > 0) {
        set({
          conversations: backendConvs,
          activeConversationId: backendConvs[0].id,
          isLoadingConversations: false,
        })
        // Fetch full message history for active conversation
        const detail = await fetchConversationDetail(token, backendConvs[0].id)
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === detail.id ? detail : c)),
        }))
      } else {
        set({ conversations: [], activeConversationId: null, isLoadingConversations: false })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations from backend.'
      set({ isLoadingConversations: false, error: message })
    }
  },

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
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ isSidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),

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

    let currentConvId = activeConversationId
    let updatedConversations = [...conversations]

    // If starting from empty state, initialize new conversation
    if (!currentConvId) {
      const newTitle = trimmed.length > 35 ? trimmed.slice(0, 35) + '...' : trimmed
      currentConvId = `conv-${Date.now()}`
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
      let realBackendConvId = currentConvId.startsWith('conv-') ? undefined : currentConvId

      try {
        await streamChatCompletion(
          token,
          {
            conversation_id: realBackendConvId,
            content: trimmed,
            model: selectedModelId,
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
                              content: accumulatedText || 'Error generating response.',
                              status: 'error',
                              error: data.message || 'Stream connection error.',
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
                        error: isAbort ? undefined : (err instanceof Error ? err.message : 'Stream interrupted.'),
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
}))
