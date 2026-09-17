'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Library,
  Search,
  Plus,
  Copy,
  Check,
  ArrowUpRight,
  Trash2,
  Sparkles,
  Code2,
  FileText,
  BarChart3,
  Zap,
  Filter,
  X,
  Lock,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PromptItem, PromptCreateInput } from '@/types/prompt'
import {
  fetchPrompts,
  createPrompt,
  deletePrompt,
  recordPromptUse,
} from '@/lib/prompt-api'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  coding: Code2,
  writing: FileText,
  analysis: BarChart3,
  productivity: Zap,
  general: Sparkles,
}

export function PromptLibrary() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setDraftInput = useChatStore((s) => s.setDraftInput)

  const [prompts, setPrompts] = useState<PromptItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Modals & transient states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // New prompt form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newContent, setNewContent] = useState('')
  const [newIsPublic, setNewIsPublic] = useState(false)

  const loadPrompts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchPrompts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
      })
      setPrompts(data.items)
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt library.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPrompts()
    }, 200)
    return () => clearTimeout(timer)
  }, [loadPrompts])

  const handleCopy = async (prompt: PromptItem) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopiedId(prompt.id)
      recordPromptUse(prompt.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // ignore
    }
  }

  const handleUsePrompt = async (prompt: PromptItem) => {
    recordPromptUse(prompt.id)
    // If setDraftInput exists on chat store, set it, then redirect to /app
    if (setDraftInput) {
      setDraftInput(prompt.content)
    }
    router.push('/app')
  }

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this custom prompt?')) return
    try {
      await deletePrompt(promptId)
      setPrompts((prev) => prev.filter((p) => p.id !== promptId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete prompt.')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Title and prompt template content are required.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: PromptCreateInput = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory.trim().toLowerCase() || 'general',
        content: newContent.trim(),
        is_public: newIsPublic,
      }
      const created = await createPrompt(payload)
      setPrompts((prev) => [created, ...prev])
      setIsCreateOpen(false)
      // reset
      setNewTitle('')
      setNewDescription('')
      setNewCategory('general')
      setNewContent('')
      setNewIsPublic(false)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create prompt.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allCategories = useMemo(() => {
    const set = new Set(['all', ...categories])
    return Array.from(set)
  }, [categories])

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-background p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="size-9 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
              <Library className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Prompt Library
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Curated system templates, community prompts, and your custom reusable instructions.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gradient-brand text-white font-medium gap-2 shadow-md hover:opacity-90 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Create Prompt
        </Button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="my-6 space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts by title, description, or keyword..."
            className="pl-10 pr-10 h-11 bg-card/60 border-border/70 focus-visible:ring-brand/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="size-3" /> Filter:
          </span>
          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'gradient-brand text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-2xl border border-border/60 bg-card/40 animate-pulse p-5" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-500 text-sm">
          {error}
        </div>
      ) : prompts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/30 p-12 text-center max-w-md mx-auto my-12">
          <Library className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">No prompts found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            No templates match your search criteria. Try a different query or category.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {prompts.map((item) => {
              const Icon = CATEGORY_ICONS[item.category.toLowerCase()] || Sparkles
              const isOwner = Boolean(user?.id && item.user_id === user.id)
              const isSystem = !item.user_id

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-sm p-5 transition-all duration-200 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
                >
                  <div>
                    {/* Top Row: Category + Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                          <Icon className="size-4" />
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider border-border/70 text-muted-foreground">
                          {item.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.is_featured && (
                          <Badge variant="default" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0">
                            Featured
                          </Badge>
                        )}
                        {isSystem ? (
                          <span title="System verified template" className="text-muted-foreground/60">
                            <Sparkles className="size-3.5 text-brand" />
                          </span>
                        ) : item.is_public ? (
                          <span title="Public Community Template" className="text-muted-foreground/60">
                            <Globe className="size-3.5" />
                          </span>
                        ) : (
                          <span title="Private Template" className="text-muted-foreground/60">
                            <Lock className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-bold text-base text-foreground group-hover:text-brand transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {item.description || 'No description provided.'}
                    </p>

                    {/* Template Content Snippet */}
                    <div className="mt-3.5 rounded-xl border border-border/60 bg-muted/40 p-2.5 text-[11px] font-mono text-muted-foreground line-clamp-3 leading-relaxed overflow-hidden">
                      {item.content}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground/60">
                      Used {item.usage_count} times
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Delete if owner */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDelete(item.id)}
                          title="Delete custom prompt"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}

                      {/* Copy Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs gap-1.5 border-border/80 hover:bg-muted"
                        onClick={() => handleCopy(item)}
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="size-3.5 text-green-500" />
                            <span className="text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>

                      {/* Use Prompt Button */}
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs gap-1 gradient-brand text-white font-medium hover:opacity-90 shadow-sm"
                        onClick={() => handleUsePrompt(item)}
                      >
                        <span>Use</span>
                        <ArrowUpRight className="size-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Prompt Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="size-5 text-brand" />
              Create Custom Prompt Template
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Save reusable instructions with optional placeholders like <code className="text-brand font-mono text-xs">{'{{input}}'}</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Title *</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., PostgreSQL Optimization Advisor"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="coding, writing, analysis..."
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer h-10">
                  <input
                    type="checkbox"
                    checked={newIsPublic}
                    onChange={(e) => setNewIsPublic(e.target.checked)}
                    className="size-4 rounded accent-brand"
                  />
                  <span>Make Public in Community</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short summary of the prompt purpose"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Prompt Content Template *</label>
              <Textarea
                rows={5}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Analyze this code for query optimization:&#10;&#10;{{code}}"
                className="font-mono text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gradient-brand text-white font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
