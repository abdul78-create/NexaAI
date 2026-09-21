'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Menu,
  Trash2,
  Sparkles,
  Share2,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ExportMenu } from '@/components/chat/ExportMenu'
import { ShareDialog } from '@/components/chat/ShareDialog'

interface ChatHeaderProps {
  conversationId?: string
  title?: string
  modelName: string
  hasMessages: boolean
  onClearChat: () => void
  onToggleMobileMenu: () => void
}

export function ChatHeader({
  conversationId,
  title = 'New conversation',
  modelName,
  hasMessages,
  onClearChat,
  onToggleMobileMenu,
}: ChatHeaderProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.05] bg-background/75 backdrop-blur-xl px-4 gap-3 z-10 relative">
      {/* Subtle bottom gradient separator */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* Left: Mobile menu toggle + Title + Model Badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-8 text-muted-foreground hover:text-foreground rounded-lg"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-4" />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-sm">
            {title}
          </h1>

          {/* Model badge — microchip style */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand/8 border border-brand/15 text-[11px] text-brand font-medium flex-shrink-0">
            <Cpu className="size-3 opacity-70" />
            <Sparkles className="size-2.5 opacity-60" />
            <span className="font-semibold tracking-tight">{modelName}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {conversationId && hasMessages && (
          <>
            <ExportMenu conversationId={conversationId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsShareOpen(true)}
              className="h-8 px-2.5 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg border border-transparent hover:border-white/8 transition-all"
            >
              <Share2 className="size-3.5 text-brand" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </>
        )}

        {hasMessages && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearChat}
                  className="size-8 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
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
                  className="size-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
                  aria-label="Return to landing page"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </Button>
              </Link>
            }
          />
          <TooltipContent side="bottom" className="text-xs">
            Back to home
          </TooltipContent>
        </Tooltip>
      </div>

      {conversationId && (
        <ShareDialog
          conversationId={conversationId}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </header>
  )
}
