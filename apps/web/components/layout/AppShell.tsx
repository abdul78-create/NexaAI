'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  MessageSquare,
  FlaskConical,
  FileText,
  BookOpen,
  BarChart3,
  Sparkles,
  Image as ImageIcon,
  Mic,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogIn,
  LogOut,
  Search,
  Archive,
  Trash2,
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConversationList } from '@/components/chat/ConversationList'
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog'
import { cn } from '@/lib/utils'
import { slideInLeft } from '@/lib/animations'

/* ============================================================
   SECONDARY NAV ITEMS
   ============================================================ */
const secondaryNav = [
  { href: '/app/images', icon: ImageIcon, label: 'Image Studio', badge: 'Vision' },
  { href: '/app/speech', icon: Mic, label: 'Speech Studio', badge: 'Speech' },
  { href: '/app/nlp', icon: FlaskConical, label: 'NLP Studio', badge: 'New' },
  { href: '/app/docs', icon: FileText, label: 'Documents', badge: 'RAG' },
  { href: '/app/prompts', icon: BookOpen, label: 'Prompt Library', badge: undefined },
  { href: '/app/usage', icon: BarChart3, label: 'Usage', badge: undefined },
  { href: '/app/settings', icon: Settings, label: 'Settings', badge: undefined },
]

/* ============================================================
   SIDEBAR COMPONENT
   ============================================================ */
interface SidebarProps {
  isMobile?: boolean
  onClose?: () => void
  onOpenSearch?: () => void
}

export function Sidebar({ isMobile = false, onClose, onOpenSearch }: SidebarProps) {
  const pathname = usePathname()
  const {
    groupedConversations,
    pinnedConversations,
    folders,
    trashedConversations,
    conversations,
    activeConversationId,
    activeView,
    selectedFolderId,
    searchQuery,
    setSearchQuery,
    createNewChat,
    selectConversation,
    renameConversation,
    togglePinConversation,
    toggleArchiveConversation,
    moveConversationToFolder,
    trashConversation,
    restoreConversation,
    purgeConversation,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveView,
    setSelectedFolderId,
    fetchConversations,
    fetchFolders,
    fetchTrashedConversationsStore,
    isSidebarCollapsed,
    toggleSidebar,
  } = useChat()
  const { user, isAuthenticated, logout } = useAuthStore()

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchConversations()
      fetchFolders()
      fetchTrashedConversationsStore()
    }
  }, [isAuthenticated, fetchConversations, fetchFolders, fetchTrashedConversationsStore])

  const handleSelectConversation = (id: string) => {
    selectConversation(id)
    if (isMobile) onClose?.()
  }

  const handleCreateNewChat = () => {
    setActiveView('all')
    createNewChat()
    if (isMobile) onClose?.()
  }

  const archivedCount = conversations.filter((c) => c.isArchived && !c.deletedAt).length
  const trashCount = trashedConversations.length

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? '100%' : isSidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'relative flex flex-col border-r border-white/[0.05] h-full flex-shrink-0 overflow-hidden select-none',
        'sidebar-gradient',
        isMobile ? 'w-full border-r-0' : ''
      )}
    >
      {/* Ambient top glow */}
      {!isSidebarCollapsed && (
        <div
          className="absolute top-0 inset-x-0 h-32 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse at 50% -20%, oklch(0.72 0.22 280 / 0.10) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Brand Header */}
      <div
        className={cn(
          'relative z-10 flex h-14 flex-shrink-0 items-center border-b border-white/[0.05] px-3',
          !isMobile && isSidebarCollapsed ? 'justify-center' : 'justify-between px-3.5'
        )}
      >
        {!isMobile && isSidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right" className="text-xs">
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
              <div className="size-7 flex-shrink-0 rounded-lg gradient-brand flex items-center justify-center shadow-lg group-hover:glow-brand-sm transition-all duration-200">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight whitespace-nowrap">
                Nexa<span className="gradient-text">AI</span>
              </span>
            </Link>

            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
                aria-label="Close navigation drawer"
              >
                <X className="size-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="size-7 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Action Buttons: New Chat & Global Search */}
      <div className={cn('relative z-10 p-3 pb-2 space-y-1.5', !isMobile && isSidebarCollapsed && 'p-2 space-y-1')}>
        {!isMobile && isSidebarCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    onClick={handleCreateNewChat}
                    className="w-full h-9 gradient-brand border-0 text-white shadow-md glow-brand-sm hover:opacity-90 active:scale-95"
                    aria-label="New chat"
                  >
                    <Plus className="size-4" />
                  </Button>
                }
              />
              <TooltipContent side="right" className="text-xs">
                New chat
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenSearch}
                    className="w-full h-9 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                    aria-label="Global Search"
                  >
                    <Search className="size-4 text-brand/70" />
                  </Button>
                }
              />
              <TooltipContent side="right" className="text-xs">
                Global Search (Cmd+K)
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Button
              onClick={handleCreateNewChat}
              className="w-full h-9 gradient-brand border-0 text-white text-xs font-semibold shadow-md glow-brand-sm hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 rounded-xl"
            >
              <Plus className="size-3.5" />
              <span>New chat</span>
            </Button>

            <Button
              variant="ghost"
              onClick={onOpenSearch}
              className="w-full h-8 text-xs font-normal border border-white/[0.07] hover:bg-white/5 hover:border-white/12 text-muted-foreground/70 hover:text-foreground justify-between px-2.5 rounded-lg transition-all"
            >
              <div className="flex items-center gap-2">
                <Search className="size-3.5 text-brand/60" />
                <span>Search chats…</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/8 rounded text-muted-foreground/50">
                ⌘K
              </kbd>
            </Button>
          </>
        )}
      </div>

      {/* Workspace Quick View Navigation Tabs */}
      {(isMobile || !isSidebarCollapsed) && (
        <div className="relative z-10 px-3 py-1.5 flex items-center gap-1 border-b border-white/[0.04]">
          <button
            onClick={() => setActiveView('all')}
            className={cn(
              'flex-1 py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors',
              activeView === 'all'
                ? 'bg-brand/12 text-brand font-semibold border border-brand/20'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
            )}
          >
            <MessageSquare className="size-3" />
            <span>Chats</span>
          </button>

          <button
            onClick={() => setActiveView('archived')}
            className={cn(
              'py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors',
              activeView === 'archived'
                ? 'bg-white/8 text-foreground font-semibold'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
            )}
            title="Archived chats"
          >
            <Archive className="size-3" />
            {archivedCount > 0 && <span>{archivedCount}</span>}
          </button>

          <button
            onClick={() => setActiveView('trash')}
            className={cn(
              'py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors',
              activeView === 'trash'
                ? 'bg-destructive/12 text-destructive font-semibold border border-destructive/20'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
            )}
            title="Trash"
          >
            <Trash2 className="size-3" />
            {trashCount > 0 && <span>{trashCount}</span>}
          </button>
        </div>
      )}

      {/* Main Conversation List */}
      {isMobile || !isSidebarCollapsed ? (
        <ConversationList
          groupedConversations={groupedConversations}
          pinnedConversations={pinnedConversations}
          folders={folders}
          activeConversationId={activeConversationId}
          activeView={activeView}
          selectedFolderId={selectedFolderId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={trashConversation}
          onRenameConversation={renameConversation}
          onPinConversation={togglePinConversation}
          onArchiveConversation={toggleArchiveConversation}
          onMoveConversation={moveConversationToFolder}
          onRestoreConversation={restoreConversation}
          onPurgeConversation={purgeConversation}
          onCreateFolder={createFolder}
          onUpdateFolder={updateFolder}
          onDeleteFolder={deleteFolder}
          onSelectFolder={setSelectedFolderId}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center py-3 gap-2 overflow-y-auto scrollbar-none">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => selectConversation('conv-fastapi-async')}
                  className={cn(
                    'size-9 rounded-lg hover:bg-white/5',
                    activeConversationId ? 'text-brand bg-brand/8' : 'text-muted-foreground'
                  )}
                  aria-label="Recent conversation"
                >
                  <MessageSquare className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right" className="text-xs">
              Active conversation
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Secondary workspace links */}
      <div className={cn('relative z-10 border-t border-white/[0.04] p-2 space-y-0.5', isSidebarCollapsed && 'p-1.5')}>
        {secondaryNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          if (isSidebarCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-white/5 transition-all duration-150',
                        isActive && 'text-brand bg-brand/10'
                      )}
                      aria-label={item.label}
                    >
                      <Icon className="size-4" />
                    </Link>
                  }
                />
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150',
                isActive
                  ? 'bg-brand/10 text-brand font-medium border-l-2 border-brand pl-2'
                  : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn('size-3.5', isActive && 'text-brand')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-brand/12 text-brand/80 border border-brand/18">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* User profile */}
      <div className={cn('relative z-10 border-t border-white/[0.04] p-2.5', isSidebarCollapsed && 'p-2')}>
        {isSidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="w-full size-9 rounded-lg hover:bg-white/5 text-muted-foreground"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right" className="text-xs">
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl p-1.5 hover:bg-white/[0.03] transition-colors">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Avatar with subtle ring */}
                  <div className="relative flex-shrink-0">
                    <div className="size-7 rounded-full bg-brand/25 border border-brand/40 flex items-center justify-center text-xs font-bold text-brand uppercase">
                      {user.displayName.charAt(0) || 'U'}
                    </div>
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{user.displayName}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">{user.email}</p>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => logout()}
                        className="size-7 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        aria-label="Sign out"
                      >
                        <LogOut className="size-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent side="top" className="text-xs">
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-full bg-muted/60 border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Guest Mode</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">Demo Workspace</p>
                  </div>
                </div>

                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-brand hover:text-brand hover:bg-brand/10 rounded-lg gap-1 flex-shrink-0"
                  >
                    <LogIn className="size-3" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  )
}

/* ============================================================
   MOBILE SIDEBAR DRAWER
   ============================================================ */
function MobileDrawer({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useChat()

  return (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer content */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/[0.05] md:hidden flex flex-col sidebar-gradient"
          >
            <Sidebar isMobile onClose={() => setMobileSidebarOpen(false)} onOpenSearch={onOpenSearch} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ============================================================
   APP SHELL
   ============================================================ */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const urlToken = urlParams.get('token')
      if (urlToken) {
        useAuthStore.getState().setSession(urlToken)
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        url.searchParams.delete('oauth')
        const remaining = url.searchParams.toString()
        window.history.replaceState({}, document.title, url.pathname + (remaining ? `?${remaining}` : ''))
      } else {
        useAuthStore.getState().checkAuth()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background aurora-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar onOpenSearch={() => setIsSearchOpen(true)} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Main content container */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {children}
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  )
}
