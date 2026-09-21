'use client'

import React, { useState } from 'react'
import {
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Conversation, Folder } from '@/types/chat'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConversationItem } from '@/components/chat/ConversationItem'
import { PRESET_COLORS } from '@/components/folders/FolderDialog'
import { cn } from '@/lib/utils'

interface FolderItemProps {
  folder: Folder
  conversations: Conversation[]
  activeConversationId: string | null
  isSelectedFolder: boolean
  onSelectFolder: (folderId: string | null) => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
  onEditFolder: (folder: Folder) => void
  onDeleteFolder: (folderId: string) => void
  onPinConversation?: (id: string) => void
  onArchiveConversation?: (id: string) => void
  onMoveConversation?: (id: string, folderId: string | null) => void
  folders?: Folder[]
}

export function FolderItem({
  folder,
  conversations,
  activeConversationId,
  isSelectedFolder,
  onSelectFolder,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onEditFolder,
  onDeleteFolder,
  onPinConversation,
  onArchiveConversation,
  onMoveConversation,
  folders,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const preset = PRESET_COLORS.find((c) => c.id === folder.color) || PRESET_COLORS[0]

  return (
    <div className="space-y-0.5">
      {/* Folder Header */}
      <div
        onClick={() => {
          setIsExpanded(!isExpanded)
          onSelectFolder(isSelectedFolder ? null : folder.id)
        }}
        className={cn(
          'group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-150',
          isSelectedFolder
            ? 'bg-white/10 text-foreground font-medium border border-white/10 shadow-sm'
            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ChevronRight
            className={cn(
              'size-3.5 text-muted-foreground/60 transition-transform duration-200 flex-shrink-0',
              isExpanded && 'rotate-90'
            )}
          />
          <div className={cn('size-2.5 rounded-full flex-shrink-0', preset.bg)} />
          <span className="truncate">{folder.name}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground/60 group-hover:text-muted-foreground px-1.5 py-0.5 rounded-full bg-white/5">
            {conversations.length}
          </span>

          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    aria-label="Folder options"
                  >
                    <MoreVertical className="size-3" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40 bg-popover/95 backdrop-blur-md border border-white/10 shadow-xl">
                <DropdownMenuItem
                  onClick={() => onEditFolder(folder)}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  <span>Rename / Recolor</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/6 my-1" />
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(folder.id)}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Folder</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Nested Conversations list when expanded */}
      {isExpanded && (
        <div className="pl-4 space-y-0.5 border-l border-white/6 ml-3.5 py-0.5">
          {conversations.length === 0 ? (
            <div className="px-2 py-1 text-[11px] italic text-muted-foreground/50">
              No chats in this folder
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
                onRename={onRenameConversation}
                onPin={onPinConversation}
                onArchive={onArchiveConversation}
                onMoveToFolder={onMoveConversation}
                folders={folders}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
