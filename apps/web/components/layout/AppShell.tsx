'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  MessageSquare,
  FlaskConical,
  FileText,
  BookOpen,
  BarChart3,
  Settings,
  Sparkles,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Menu,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { slideInLeft } from '@/lib/animations'

/* ============================================================
   NAV STRUCTURE
   ============================================================ */
const mainNav = [
  { href: '/app',       icon: MessageSquare, label: 'Chat',               shortcut: '⌘1' },
  { href: '/app/nlp',   icon: FlaskConical,  label: 'NLP Studio',         shortcut: '⌘2' },
  { href: '/app/docs',  icon: FileText,      label: 'Documents',          shortcut: '⌘3' },
  { href: '/app/prompts', icon: BookOpen,    label: 'Prompt Library',     shortcut: '⌘4' },
  { href: '/app/usage', icon: BarChart3,     label: 'Usage Dashboard',    shortcut: '⌘5' },
]

const bottomNav = [
  { href: '/app/settings', icon: Settings, label: 'Settings' },
]

/* ============================================================
   NAV ITEM
   ============================================================ */
interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  shortcut?: string
  collapsed: boolean
  isActive: boolean
}

function NavItem({ href, icon: Icon, label, shortcut, collapsed, isActive }: NavItemProps) {
  const item = (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
        isActive
          ? 'bg-brand/15 text-brand border border-brand/20'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className={cn('size-4 flex-shrink-0 transition-colors', isActive ? 'text-brand' : '')} />
      {!collapsed && (
        <span className="flex-1 font-medium truncate">{label}</span>
      )}
      {!collapsed && shortcut && (
        <kbd className="hidden sm:flex text-[10px] text-muted-foreground/50 font-mono">
          {shortcut}
        </kbd>
      )}
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-brand"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={item}
        />
        <TooltipContent side="right" className="text-xs">
          <p>{label}</p>
          {shortcut && <p className="text-muted-foreground mt-0.5">{shortcut}</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return item
}

/* ============================================================
   SIDEBAR
   ============================================================ */
interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col border-r border-white/6 bg-sidebar h-full flex-shrink-0 overflow-hidden"
    >
      {/* Logo area */}
      <div className={cn(
        'flex h-16 flex-shrink-0 items-center border-b border-white/6 px-3',
        collapsed ? 'justify-center' : 'gap-3 px-4',
      )}>
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="size-8 flex-shrink-0 rounded-lg gradient-brand flex items-center justify-center shadow-lg group-hover:glow-brand-sm transition-all">
            <Sparkles className="size-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-base tracking-tight whitespace-nowrap overflow-hidden"
              >
                Nexa<span className="gradient-text">AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto size-7 rounded-md"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* New chat */}
      <div className={cn('px-3 py-3', collapsed && 'px-2')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  className="w-full gradient-brand border-0 text-white shadow-lg hover:opacity-90"
                  aria-label="New chat"
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className="w-full gradient-brand border-0 text-white text-sm font-medium shadow-lg hover:opacity-90"
          >
            <Plus className="size-4 mr-2" />
            New chat
          </Button>
        )}
      </div>

      {/* Main navigation */}
      <nav className={cn('flex-1 overflow-y-auto scrollbar-none px-3 py-1', collapsed && 'px-2')}>
        {!collapsed && (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Workspace
          </p>
        )}
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              isActive={pathname === item.href}
            />
          ))}
        </div>

        {!collapsed && (
          <Separator className="my-4 bg-white/6" />
        )}
        {collapsed && <div className="my-2" />}

        {/* Recent conversations — placeholder */}
        {!collapsed && (
          <>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Recent
            </p>
            <div className="space-y-0.5">
              {['Python async patterns', 'Marketing review', 'Data pipeline'].map((title) => (
                <button
                  key={title}
                  className="w-full text-left px-3 py-2 text-xs text-muted-foreground rounded-lg hover:bg-white/5 hover:text-foreground transition-colors truncate"
                >
                  {title}
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className={cn('border-t border-white/6 p-3', collapsed && 'px-2')}>
        {bottomNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={collapsed}
            isActive={pathname === item.href}
          />
        ))}
        {!collapsed && (
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 cursor-default">
            <div className="size-7 rounded-full bg-brand/30 border border-brand/40 flex items-center justify-center text-xs font-bold text-brand">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Abdul</p>
              <p className="text-[10px] text-muted-foreground truncate">Free plan</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed — expand button at bottom */}
      {collapsed && (
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="w-full size-8 rounded-lg"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="size-3.5 text-muted-foreground" />
                </Button>
              }
            />
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}
    </motion.aside>
  )
}

/* ============================================================
   TOP BAR
   ============================================================ */
interface TopBarProps {
  onMobileMenuToggle: () => void
}

function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const pathname = usePathname()

  const currentPage = mainNav.find((n) => n.href === pathname)
  const pageName = currentPage?.label ?? 'NexaAI'

  return (
    <header className="flex h-14 flex-shrink-0 items-center border-b border-white/6 bg-background/80 backdrop-blur-sm px-4 gap-3">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden size-8"
        onClick={onMobileMenuToggle}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      {/* Page title */}
      <h1 className="text-sm font-semibold">{pageName}</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link href="/">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Back to home">
            <Home className="size-4 text-muted-foreground" />
          </Button>
        </Link>
      </div>
    </header>
  )
}

/* ============================================================
   MOBILE SIDEBAR OVERLAY
   ============================================================ */
interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-white/6 md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-white/6 px-4">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md gradient-brand flex items-center justify-center">
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm">
                  Nexa<span className="gradient-text">AI</span>
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="size-7">
                <X className="size-4" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {mainNav.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  collapsed={false}
                  isActive={pathname === item.href}
                />
              ))}
            </nav>
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
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
