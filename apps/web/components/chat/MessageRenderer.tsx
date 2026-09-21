'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ---- Language color dot map ---- */
const LANG_DOT_COLORS: Record<string, string> = {
  ts:         '#3178c6',
  tsx:        '#3178c6',
  typescript: '#3178c6',
  js:         '#f7df1e',
  jsx:        '#f7de1e',
  javascript: '#f7df1e',
  python:     '#3776ab',
  py:         '#3776ab',
  bash:       '#4eaa25',
  sh:         '#4eaa25',
  zsh:        '#4eaa25',
  json:       '#cb3837',
  css:        '#264de4',
  html:       '#e34c26',
  rust:       '#ce412b',
  rs:         '#ce412b',
  go:         '#00add8',
  sql:        '#f29111',
  yaml:       '#cb171e',
  yml:        '#cb171e',
  md:         '#083fa1',
  markdown:   '#083fa1',
  java:       '#007396',
  c:          '#555555',
  cpp:        '#00599c',
  cs:         '#178600',
  php:        '#4f5d95',
  ruby:       '#701516',
  rb:         '#701516',
  swift:      '#fa7343',
  kotlin:     '#7f52ff',
}

function getLangColor(lang: string): string {
  return LANG_DOT_COLORS[lang.toLowerCase()] ?? 'oklch(0.72 0.22 280)'
}

function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    python: 'Python', py: 'Python', bash: 'Bash', sh: 'Shell',
    json: 'JSON', css: 'CSS', html: 'HTML', rust: 'Rust', rs: 'Rust',
    go: 'Go', sql: 'SQL', yaml: 'YAML', yml: 'YAML', md: 'Markdown',
    java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', php: 'PHP',
    ruby: 'Ruby', rb: 'Ruby', swift: 'Swift', kotlin: 'Kotlin',
    typescript: 'TypeScript', javascript: 'JavaScript', markdown: 'Markdown',
  }
  return labels[lang.toLowerCase()] ?? lang
}

interface CodeBlockProps {
  language?: string
  value: string
}

function CodeBlock({ language = 'plaintext', value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const dotColor = getLangColor(language)
  const langLabel = getLanguageLabel(language)

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
    <div className="my-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 shadow-xl shadow-black/30">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* macOS-style traffic dot (language color) */}
          <div
            className="size-2.5 rounded-full flex-shrink-0 shadow-sm"
            style={{
              backgroundColor: dotColor,
              boxShadow: `0 0 6px ${dotColor}60`,
            }}
          />
          <span
            className="text-xs font-semibold font-mono"
            style={{ color: dotColor }}
          >
            {langLabel}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-white/8 transition-colors"
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
      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <pre className="text-zinc-200">
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
        // Typography refinements
        'prose-p:my-2 prose-p:leading-relaxed',
        'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:my-3',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm',
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        // Blockquote with brand accent
        'prose-blockquote:border-l-2 prose-blockquote:border-brand/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:bg-brand/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1',
        // Divider
        'prose-hr:border-white/10 prose-hr:my-4',
        // Tables
        'prose-table:border-collapse prose-th:border prose-th:border-white/10 prose-th:bg-muted/40 prose-th:px-3 prose-th:py-1.5 prose-th:text-xs prose-td:border prose-td:border-white/8 prose-td:px-3 prose-td:py-1.5 prose-td:text-xs',
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
                  className="rounded-lg bg-brand/8 px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-brand/90 border border-brand/15"
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
                className="font-medium text-brand hover:underline underline-offset-4 decoration-brand/40"
              >
                {children}
              </a>
            )
          },
          // Enhanced strong
          strong({ children }) {
            return (
              <strong className="font-bold text-foreground">{children}</strong>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
