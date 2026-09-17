export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  model?: string
  status?: 'sending' | 'streaming' | 'done' | 'error'
  tokens?: number
  error?: string
  parentMessageId?: string | null
  siblingIndex?: number
  siblingCount?: number
  siblingIds?: string[]
}

export type ConversationGroup = 'Today' | 'Yesterday' | 'Previous 7 Days'

export interface Folder {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  modelId: string
  messages: Message[]
  group: ConversationGroup
  pinned?: boolean
  isArchived?: boolean
  folderId?: string | null
  deletedAt?: string | null
  activeLeafMessageId?: string | null
}


export interface AiModel {
  id: string
  name: string
  tagline: string
  description: string
  badge: string
  speed: 'Ultra Fast' | 'Fast' | 'Deep'
  reasoning: 'Standard' | 'Advanced' | 'Maximum'
  contextWindow: string
  isAvailable: boolean
}

export interface SuggestedPrompt {
  id: string
  title: string
  category: string
  description: string
  prompt: string
  iconName: 'Sparkles' | 'Brain' | 'FileText' | 'BarChart3'
}
