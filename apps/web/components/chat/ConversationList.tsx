'use client'

import React, { useState } from 'react'
import {
  Search,
  X,
  MessageSquareDashed,
  Pin,
  FolderPlus,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Conversation, ConversationGroup, Folder } from '@/types/chat'
import { ConversationItem } from '@/components/chat/ConversationItem'
import { FolderItem } from '@/components/folders/FolderItem'
import { FolderDialog } from '@/components/folders/FolderDialog'
import { Button } from '@/components/ui/button'
import { WorkspaceView } from '@/stores/chat-store'

interface ConversationListProps {
  groupedConversations: Record<ConversationGroup, Conversation[]>
  pinnedConversations: Conversation[]
  folders: Folder[]
  activeConversationId: string | null
  activeView: WorkspaceView
  selectedFolderId: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, newTitle: string) => void
  onPinConversation: (id: string) => void
  onArchiveConversation: (id: string) => void
  onMoveConversation: (id: string, folderId: string | null) => void
  onRestoreConversation?: (id: string) => void
  onPurgeConversation?: (id: string) => void
  onCreateFolder: (name: string, color?: string) => Promise<Folder | null>
  onUpdateFolder: (folderId: string, updates: { name?: string; color?: string }) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onSelectFolder: (folderId: string | null) => void
}

const GROUPS: ConversationGroup[] = ['Today', 'Yesterday', 'Previous 7 Days']

export function ConversationList({
  groupedConversations,
  pinnedConversations,
  folders,
  activeConversationId,
  activeView,
  selectedFolderId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
  onArchiveConversation,
  onMoveConversation,
  onRestoreConversation,
  onPurgeConversation,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onSelectFolder,
}: ConversationListProps) {
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null)
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false)

  const totalCount =
    groupedConversations.Today.length +
    groupedConversations.Yesterday.length +
    groupedConversations['Previous 7 Days'].length

  const handleOpenCreateFolder = () => {
    setFolderToEdit(null)
    setIsFolderDialogOpen(true)
  }

  const handleOpenEditFolder = (folder: Folder) => {
    setFolderToEdit(folder)
    setIsFolderDialogOpen(true)
  }

  const handleSaveFolder = async (name: string, color: string) => {
    if (folderToEdit) {
      await onUpdateFolder(folderToEdit.id, { name, color })
    } else {
      await onCreateFolder(name, color)
    }
  }

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
      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none space-y-3">
        {/* 1. PINNED CONVERSATIONS SECTION */}
        {activeView === 'all' && !searchQuery && !selectedFolderId && pinnedConversations.length > 0 && (
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand/80 flex items-center gap-1.5">
              <Pin className="size-3" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedConversations.map((conv) => (
                <ConversationItem
                  key={`pinned-${conv.id}`}
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
              ))}
            </div>
          </div>
        )}

        {/* 2. WORKSPACE FOLDERS SECTION */}
        {activeView === 'all' && !searchQuery && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <button
                onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {isFoldersCollapsed ? (
                  <ChevronRight className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
                <span>Folders</span>
                <span className="text-[9px] text-muted-foreground/50">({folders.length})</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenCreateFolder}
                className="size-4 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground"
                title="New Folder"
              >
                <FolderPlus className="size-3" />
              </Button>
            </div>

            {!isFoldersCollapsed && (
              <div className="space-y-0.5">
                {folders.length === 0 ? (
                  <div
                    onClick={handleOpenCreateFolder}
                    className="px-2.5 py-1.5 rounded-lg border border-dashed border-white/8 text-[11px] text-muted-foreground/60 hover:text-foreground hover:border-white/20 cursor-pointer flex items-center gap-2 transition-all"
                  >
                    <FolderPlus className="size-3.5 text-muted-foreground/50" />
                    <span>Create a folder...</span>
                  </div>
                ) : (
                  folders.map((folder) => {
                    const fConvs = Object.values(groupedConversations)
                      .flat()
                      .filter((c) => c.folderId === folder.id)
                    return (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        conversations={fConvs}
                        activeConversationId={activeConversationId}
                        isSelectedFolder={selectedFolderId === folder.id}
                        onSelectFolder={onSelectFolder}
                        onSelectConversation={onSelectConversation}
                        onDeleteConversation={onDeleteConversation}
                        onRenameConversation={onRenameConversation}
                        onEditFolder={handleOpenEditFolder}
                        onDeleteFolder={onDeleteFolder}
                        onPinConversation={onPinConversation}
                        onArchiveConversation={onArchiveConversation}
                        onMoveConversation={onMoveConversation}
                        folders={folders}
                      />
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. RECENT / ACTIVE / ARCHIVED / TRASH LIST SECTION */}
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            {activeView === 'trash' ? (
              <Trash2 className="size-8 text-muted-foreground/40 mb-2" />
            ) : activeView === 'archived' ? (
              <Archive className="size-8 text-muted-foreground/40 mb-2" />
            ) : (
              <MessageSquareDashed className="size-8 text-muted-foreground/40 mb-2" />
            )}
            <p className="text-xs text-muted-foreground">
              {activeView === 'trash'
                ? 'Trash is empty'
                : activeView === 'archived'
                ? 'No archived conversations'
                : 'No conversations found'}
            </p>
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
                      isTrashView={activeView === 'trash'}
                      onSelect={onSelectConversation}
                      onDelete={onDeleteConversation}
                      onRename={onRenameConversation}
                      onPin={onPinConversation}
                      onArchive={onArchiveConversation}
                      onMoveToFolder={onMoveConversation}
                      onRestore={onRestoreConversation}
                      onPurge={onPurgeConversation}
                      folders={folders}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Folder Dialog */}
      <FolderDialog
        isOpen={isFolderDialogOpen}
        folderToEdit={folderToEdit}
        onClose={() => setIsFolderDialogOpen(false)}
        onSave={handleSaveFolder}
      />
    </div>
  )
}
