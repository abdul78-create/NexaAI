'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  X,
  Pin,
} from 'lucide-react'
import { Conversation } from '@/types/chat'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSaveRename = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleCancelRename = () => {
    setEditTitle(conversation.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelRename()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5">
        <input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs text-foreground focus:outline-none"
          aria-label="Edit conversation title"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSaveRename}
          className="size-5 rounded hover:bg-white/10 text-emerald-400"
          aria-label="Save title"
        >
          <Check className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancelRename}
          className="size-5 rounded hover:bg-white/10 text-muted-foreground"
          aria-label="Cancel editing"
        >
          <X className="size-3" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-all duration-150',
        isActive
          ? 'bg-brand/15 text-foreground font-medium border border-brand/20 shadow-sm'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(conversation.id)
        }
      }}
      aria-label={`Select chat: ${conversation.title}`}
    >
      {/* Icon & Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {conversation.pinned ? (
          <Pin className="size-3 text-brand flex-shrink-0" />
        ) : (
          <MessageSquare
            className={cn(
              'size-3.5 flex-shrink-0',
              isActive ? 'text-brand' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
            )}
          />
        )}
        <span className="truncate">{conversation.title}</span>
      </div>

      {/* Actions menu */}
      <div
        className={cn(
          'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100',
          isActive && 'opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                aria-label="Conversation options"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-36 bg-popover/95 backdrop-blur-md border border-white/10 shadow-xl">
            <DropdownMenuItem
              onClick={() => setIsEditing(true)}
              className="gap-2 text-xs cursor-pointer"
            >
              <Pencil className="size-3.5" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/6 my-1" />
            <DropdownMenuItem
              onClick={() => onDelete(conversation.id)}
              className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
