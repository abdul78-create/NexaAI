'use client'

import React, { useState } from 'react'
import { Search, Sparkles, FileText, Layers, Loader2 } from 'lucide-react'
import { SearchResultChunk } from '@/lib/documents-api'
import { Button } from '@/components/ui/button'

interface DocumentSearchProps {
  onSearch: (query: string) => Promise<SearchResultChunk[]>
}

export function DocumentSearch({ onSearch }: DocumentSearchProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResultChunk[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const res = await onSearch(query.trim())
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Sparkles className="size-4 text-brand" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Semantic Vector Search</h3>
          <p className="text-xs text-muted-foreground">Cosine vector dot-product similarity matching across chunks</p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask or search concept across indexed documents..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-background/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/50 transition-colors"
          />
        </div>

        <Button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="h-9 px-4 gradient-brand text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2"
        >
          {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          <span>Search</span>
        </Button>
      </form>

      {/* Search Results */}
      {results.length > 0 ? (
        <div className="space-y-3 pt-2">
          {results.map((res, idx) => (
            <div
              key={`${res.chunk_id}-${idx}`}
              className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-2 hover:border-brand/30 transition-all"
            >
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-brand" />
                  <span className="font-semibold text-foreground">{res.filename}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Page {res.page_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">Similarity:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {(res.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-foreground/90 font-mono leading-relaxed bg-black/20 p-2.5 rounded border border-white/5">
                {res.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        hasSearched && !isSearching && (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Layers className="size-6 opacity-40" />
            <p>No matching document chunks found for inquiry '{query}'.</p>
          </div>
        )
      )}
    </div>
  )
}
