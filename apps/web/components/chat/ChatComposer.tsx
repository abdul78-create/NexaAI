'use client'

import React, { useRef, useState, useEffect } from 'react'
import { ArrowUp, Square, Paperclip, X } from 'lucide-react'
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
  placeholder = 'Ask NexaAI anything...',
}: ChatComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
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
    } catch (e) {
      // Ignore SSR / sessionStorage errors
    }
  }, [])

  // Auto-resize textarea up to 200px max height
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
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const tokenEstimate = Math.round(content.length / 4)

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Hidden file input for attachment UI */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSimulatedFileUpload}
        multiple
        className="hidden"
        aria-label="Upload document or code"
      />

      <div className="relative flex flex-col rounded-2xl border border-white/10 bg-card/85 backdrop-blur-xl shadow-xl transition-all focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/20">
        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-md bg-brand/10 border border-brand/20 px-2 py-1 text-xs text-brand"
              >
                <Paperclip className="size-3" />
                <span className="max-w-[160px] truncate">{file}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="rounded hover:bg-brand/20 p-0.5"
                  aria-label={`Remove ${file}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none scrollbar-none leading-relaxed"
          aria-label="Chat input message"
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left toolbar items */}
          <div className="flex items-center gap-2">
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
                    className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                    aria-label="Attach file or document"
                  >
                    <Paperclip className="size-4" />
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
            {content.length > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground/50 select-none">
                ~{tokenEstimate} tokens
              </span>
            )}

            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon"
                      onClick={onStopGeneration}
                      className="size-8 rounded-xl bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-md transition-transform active:scale-95"
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
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!content.trim()}
                className={cn(
                  'size-8 rounded-xl transition-all',
                  content.trim()
                    ? 'gradient-brand text-white shadow-md glow-brand-sm hover:opacity-95 active:scale-95'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-muted-foreground/40">
        NexaAI may produce inaccurate information. Press <kbd className="font-mono text-[10px] bg-muted/60 px-1 py-0.5 rounded border border-border/40">Enter</kbd> to send, <kbd className="font-mono text-[10px] bg-muted/60 px-1 py-0.5 rounded border border-border/40">Shift + Enter</kbd> for newline.
      </div>
    </div>
  )
}
