'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  language?: string
  value: string
}

function CodeBlock({ language = 'plaintext', value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-lg">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground font-mono">
          <Terminal className="size-3.5 text-brand" />
          <span className="font-semibold lowercase">{language}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-100">
        <pre>
          <code>{value}</code>
        </pre>
      </div>
    </div>
  )
}

interface MessageRendererProps {
  content: string
  className?: string
}

export function MessageRenderer({ content, className }: MessageRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed',
        // Custom typography refinements
        'prose-p:my-2 prose-p:leading-relaxed',
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:my-3',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm',
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        'prose-blockquote:border-l-2 prose-blockquote:border-brand/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        'prose-hr:border-white/10 prose-hr:my-4',
        'prose-table:border-collapse prose-th:border prose-th:border-border/50 prose-th:bg-muted/40 prose-th:px-3 prose-th:py-1.5 prose-th:text-xs prose-td:border prose-td:border-border/40 prose-td:px-3 prose-td:py-1.5 prose-td:text-xs',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !String(children).includes('\n')

            if (isInline) {
              return (
                <code
                  className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-foreground border border-border/40"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            const codeText = String(children).replace(/\n$/, '')
            const lang = match ? match[1] : 'plaintext'

            return <CodeBlock language={lang} value={codeText} />
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:underline underline-offset-4"
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
