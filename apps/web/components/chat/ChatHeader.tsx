'use client'

import React from 'react'
import Link from 'next/link'
import {
  Menu,
  Home,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface ChatHeaderProps {
  title?: string
  modelName: string
  hasMessages: boolean
  onClearChat: () => void
  onToggleMobileMenu: () => void
}

export function ChatHeader({
  title = 'New conversation',
  modelName,
  hasMessages,
  onClearChat,
  onToggleMobileMenu,
}: ChatHeaderProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/6 bg-background/80 backdrop-blur-md px-4 gap-3 z-10">
      {/* Left: Mobile menu toggle + Title + Model Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-8 text-muted-foreground hover:text-foreground"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-4" />
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
            {title}
          </h1>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 border-white/10 text-muted-foreground bg-muted/40"
          >
            <Sparkles className="size-3 text-brand" />
            <span>{modelName}</span>
          </Badge>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {hasMessages && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearChat}
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="Clear conversation history"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">
              Clear conversation
            </TooltipContent>
          </Tooltip>
        )}

        <ThemeToggle />

        <Tooltip>
          <TooltipTrigger
            render={
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Return to landing page"
                >
                  <Home className="size-4" />
                </Button>
              </Link>
            }
          />
          <TooltipContent side="bottom" className="text-xs">
            Back to landing page
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
