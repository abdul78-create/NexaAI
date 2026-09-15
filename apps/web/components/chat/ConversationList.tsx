'use client'

import React from 'react'
import { Search, X, MessageSquareDashed } from 'lucide-react'
import { Conversation, ConversationGroup } from '@/types/chat'
import { ConversationItem } from '@/components/chat/ConversationItem'

interface ConversationListProps {
  groupedConversations: Record<ConversationGroup, Conversation[]>
  activeConversationId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
}

const GROUPS: ConversationGroup[] = ['Today', 'Yesterday', 'Previous 7 Days']

export function ConversationList({
  groupedConversations,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}: ConversationListProps) {
  const totalCount =
    groupedConversations.Today.length +
    groupedConversations.Yesterday.length +
    groupedConversations['Previous 7 Days'].length

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="px-3 py-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-white/8 bg-muted/40 py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
            aria-label="Search conversation history"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations Container */}
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none space-y-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <MessageSquareDashed className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No conversations found</p>
            {searchQuery && (
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Try searching for different terms
              </p>
            )}
          </div>
        ) : (
          GROUPS.map((group) => {
            const items = groupedConversations[group]
            if (!items || items.length === 0) return null

            return (
              <div key={group} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {items.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={onSelectConversation}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
