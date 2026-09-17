export interface PromptItem {
  id: string
  user_id?: string | null
  title: string
  content: string
  description?: string | null
  category: string
  is_public: boolean
  is_featured: boolean
  usage_count: number
  created_at: string
  updated_at: string
  is_system?: boolean
}

export interface PromptCreateInput {
  title: string
  content: string
  description?: string
  category?: string
  is_public?: boolean
}

export interface PromptUpdateInput {
  title?: string
  content?: string
  description?: string
  category?: string
  is_public?: boolean
}

export interface PromptListResponse {
  items: PromptItem[]
  total: number
  categories: string[]
}
