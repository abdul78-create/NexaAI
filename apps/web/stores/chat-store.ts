import { create } from 'zustand'
import { Conversation, Message } from '@/types/chat'
import { INITIAL_CONVERSATIONS, AI_MODELS, generateMockAiResponse } from '@/lib/mock-data'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  selectedModelId: string
  searchQuery: string
  isStreaming: boolean
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean

  // Actions
  createNewChat: () => void
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, newTitle: string) => void
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

let activeStreamAbort: (() => void) | null = null

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: INITIAL_CONVERSATIONS,
  activeConversationId: 'conv-fastapi-async',
  selectedModelId: 'nexa-standard',
  searchQuery: '',
  isStreaming: false,
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,

  createNewChat: () => {
    // If currently streaming, stop it
    if (activeStreamAbort) {
      activeStreamAbort()
      activeStreamAbort = null
    }
    set({
      activeConversationId: null,
      isStreaming: false,
      isMobileSidebarOpen: false,
    })
  },

  selectConversation: (id: string) => {
    if (activeStreamAbort) {
      activeStreamAbort()
      activeStreamAbort = null
    }
    set({
      activeConversationId: id,
      isStreaming: false,
      isMobileSidebarOpen: false,
    })
  },

  deleteConversation: (id: string) => {
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

  renameConversation: (id: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
      ),
    }))
  },

  setSearchQuery: (q: string) => {
    set({ searchQuery: q })
  },

  setSelectedModel: (modelId: string) => {
    set({ selectedModelId: modelId })
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed })
  },

  setMobileSidebarOpen: (open: boolean) => {
    set({ isMobileSidebarOpen: open })
  },

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

    // If starting from empty state, create new conversation
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
      // Append user message to active conversation
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

    // Simulate response generation with token streaming
    const fullResponse = generateMockAiResponse(trimmed, selectedModelId)
    const words = fullResponse.split(/(\s+)/)
    let currentContent = ''
    let isCancelled = false

    activeStreamAbort = () => {
      isCancelled = true
    }

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Initial slight "thinking" latency
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

      // Realistic typing cadence (15ms - 35ms)
      if (words[i].trim().length > 0) {
        await delay(Math.floor(Math.random() * 20) + 15)
      }
    }

    // Finalize assistant message
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

    activeStreamAbort = null
  },

  stopGeneration: () => {
    if (activeStreamAbort) {
      activeStreamAbort()
      activeStreamAbort = null
    }
    set({ isStreaming: false })
  },

  regenerateLastMessage: async () => {
    const { activeConversationId, conversations } = get()
    if (!activeConversationId) return

    const conv = conversations.find((c) => c.id === activeConversationId)
    if (!conv || conv.messages.length === 0) return

    // Find the last user message
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

    // Re-trigger response generation for the user message
    const selectedModel = AI_MODELS.find((m) => m.id === get().selectedModelId) || AI_MODELS[0]
    const assistantMsgId = `asst-regen-${Date.now()}`
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
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, assistantMessage],
          }
        }
        return c
      }),
    }))

    const fullResponse = generateMockAiResponse(lastUserPrompt, get().selectedModelId)
    const words = fullResponse.split(/(\s+)/)
    let currentContent = ''
    let isCancelled = false

    activeStreamAbort = () => {
      isCancelled = true
    }

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await delay(300)

    for (let i = 0; i < words.length; i++) {
      if (isCancelled) break
      currentContent += words[i]

      set((state) => ({
        conversations: state.conversations.map((c) => {
          if (c.id === activeConversationId) {
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
        if (c.id === activeConversationId) {
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

    activeStreamAbort = null
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
