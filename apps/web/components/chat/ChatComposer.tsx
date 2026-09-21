'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, Square, Paperclip, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'

interface ChatComposerProps {
  onSendMessage: (content: string) => void
  onStopGeneration: () => void
  isStreaming: boolean
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  placeholder?: string
}

export function ChatComposer({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  selectedModelId,
  onSelectModel,
  placeholder = 'Ask NexaAI anything…',
}: ChatComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draftInput = useChatStore((s) => s.draftInput)
  const setDraftInput = useChatStore((s) => s.setDraftInput)

  // Sync draftInput from prompt library or templates
  useEffect(() => {
    if (draftInput) {
      setContent(draftInput)
      setDraftInput('')
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }, [draftInput, setDraftInput])

  // Check for pending chat input staged from Speech Studio or other tools
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('nexaai_pending_chat_input')
      if (pending) {
        setContent(pending)
        sessionStorage.removeItem('nexaai_pending_chat_input')
      }
    } catch {
      // Ignore SSR / sessionStorage errors
    }
  }, [])

  // Auto-resize textarea up to 180px max height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [content])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed || isStreaming) return

    let finalPrompt = trimmed
    if (attachments.length > 0) {
      finalPrompt = `[Attached files: ${attachments.join(', ')}]\n\n${trimmed}`
    }

    onSendMessage(finalPrompt)
    setContent('')
    setAttachments([])
    setIsFocused(false)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const names = Array.from(files).map((f) => f.name)
      setAttachments((prev) => [...prev, ...names])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const tokenEstimate = Math.round(content.length / 4)
  const canSend = content.trim().length > 0 && !isStreaming

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 pb-5">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSimulatedFileUpload}
        multiple
        className="hidden"
        aria-label="Upload document or code"
      />

      {/* Composer container with animated focus border */}
      <motion.div
        animate={{
          boxShadow: isFocused
            ? '0 0 0 1px oklch(0.72 0.22 280 / 0.40), 0 8px 40px oklch(0 0 0 / 0.35), 0 0 32px oklch(0.72 0.22 280 / 0.08)'
            : '0 4px 24px oklch(0 0 0 / 0.25), 0 1px 4px oklch(0 0 0 / 0.15)',
        }}
        transition={{ duration: 0.25 }}
        className={cn(
          'relative flex flex-col rounded-2xl transition-colors duration-200',
          'composer-glass',
          isFocused ? 'border-brand/35' : 'border-white/8',
          'border'
        )}
      >
        {/* Shimmer top accent line when focused */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 inset-x-0 h-px rounded-t-2xl overflow-hidden"
            >
              <div className="h-full shimmer-border rounded-t-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment chips preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5 px-3.5 pt-3"
            >
              {attachments.map((file, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-1.5 rounded-lg bg-brand/10 border border-brand/20 px-2.5 py-1 text-xs text-brand"
                >
                  <Paperclip className="size-3 flex-shrink-0" />
                  <span className="max-w-[140px] truncate">{file}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="rounded hover:bg-brand/20 p-0.5 ml-0.5"
                    aria-label={`Remove ${file}`}
                  >
                    <X className="size-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2.5 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none scrollbar-none leading-relaxed min-h-[48px]"
          aria-label="Chat input message"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left toolbar items */}
          <div className="flex items-center gap-1.5">
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              disabled={isStreaming}
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming}
                    className="size-8 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
                    aria-label="Attach file or document"
                  >
                    <Paperclip className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent side="top" className="text-xs">
                Attach document or code snippet
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right toolbar items */}
          <div className="flex items-center gap-2.5">
            {/* Token estimate */}
            <AnimatePresence>
              {content.length > 20 && (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  className="text-[11px] font-mono text-muted-foreground/35 select-none flex items-center gap-1"
                >
                  <Zap className="size-2.5 text-brand/40" />
                  ~{tokenEstimate}
                </motion.span>
              )}
            </AnimatePresence>

            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon"
                      onClick={onStopGeneration}
                      className="size-9 rounded-xl bg-destructive/80 text-destructive-foreground hover:bg-destructive shadow-md transition-transform active:scale-95"
                      aria-label="Stop generation"
                    >
                      <Square className="size-3.5 fill-current" />
                    </Button>
                  }
                />
                <TooltipContent side="top" className="text-xs">
                  Stop generation
                </TooltipContent>
              </Tooltip>
            ) : (
              <motion.div
                animate={canSend ? {
                  boxShadow: [
                    '0 0 8px oklch(0.72 0.22 280 / 0.30)',
                    '0 0 16px oklch(0.72 0.22 280 / 0.50)',
                    '0 0 8px oklch(0.72 0.22 280 / 0.30)',
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-xl"
              >
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className={cn(
                    'size-9 rounded-xl transition-all duration-200',
                    canSend
                      ? 'gradient-brand text-white shadow-md hover:opacity-95 active:scale-95'
                      : 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed'
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Footer hint */}
      <div className="mt-2 text-center text-[11px] text-muted-foreground/30 select-none">
        <kbd className="font-mono text-[10px] bg-muted/40 px-1 py-0.5 rounded border border-border/30">Enter</kbd>
        {' to send · '}
        <kbd className="font-mono text-[10px] bg-muted/40 px-1 py-0.5 rounded border border-border/30">Shift+Enter</kbd>
        {' for newline'}
      </div>
    </div>
  )
}
