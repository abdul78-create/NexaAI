'use client'

import React, { useState } from 'react'
import { MessageSquare, Send, Sparkles, Loader2, Bot, User } from 'lucide-react'
import { RAGQueryResponse } from '@/lib/documents-api'
import { SourceCitation } from '@/components/documents/SourceCitation'
import { Button } from '@/components/ui/button'

interface DocumentChatProps {
  onQuery: (question: string) => Promise<RAGQueryResponse>
}

interface ChatHistoryItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: RAGQueryResponse['citations']
}

export function DocumentChat({ onQuery }: DocumentChatProps) {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<ChatHistoryItem[]>([
    {
      id: 'welcome-rag',
      role: 'assistant',
      content: 'Welcome to RAG Document Q&A! Ask any question grounded directly in your uploaded document library.',
    },
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    const userItem: ChatHistoryItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }

    setHistory((prev) => [...prev, userItem])
    setQuestion('')
    setIsLoading(true)

    try {
      const response = await onQuery(trimmed)
      const assistantItem: ChatHistoryItem = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      }
      setHistory((prev) => [...prev, assistantItem])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Q&A failed.'
      setHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Error answering question: ${msg}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md h-[520px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Grounded RAG Q&A Workspace</h3>
            <p className="text-xs text-muted-foreground">Answers strictly grounded in your vector-indexed documents</p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1 p-1">
        {history.map((item) => (
          <div
            key={item.id}
            className={`flex gap-3 text-xs ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {item.role === 'assistant' && (
              <div className="size-7 rounded-lg bg-brand/15 text-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="size-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3.5 rounded-xl border leading-relaxed ${
                item.role === 'user'
                  ? 'gradient-brand text-white border-brand/50 shadow-md font-medium'
                  : 'bg-white/[0.03] border-white/10 text-foreground/95 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap font-sans">{item.content}</p>

              {/* Citations badges footer */}
              {item.citations && item.citations.length > 0 && (
                <div className="mt-3 border-t border-white/10 pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-brand">Sources:</span>
                  {item.citations.map((citation) => (
                    <SourceCitation key={citation.citation_id} citation={citation} />
                  ))}
                </div>
              )}
            </div>

            {item.role === 'user' && (
              <div className="size-7 rounded-lg bg-white/10 text-foreground flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 text-xs justify-start items-center">
            <div className="size-7 rounded-lg bg-brand/15 text-brand flex items-center justify-center flex-shrink-0">
              <Bot className="size-4" />
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-brand" />
              <span>Searching vector embeddings & generating grounded response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/5 pt-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          className="flex-1 h-9 px-3 rounded-lg border border-white/10 bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 transition-colors"
        />

        <Button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="h-9 px-4 gradient-brand text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2"
        >
          <Send className="size-3.5" />
          <span>Ask RAG</span>
        </Button>
      </form>
    </div>
  )
}
