'use client'

import React, { useState, useEffect } from 'react'
import { Folder } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Check, FolderPlus, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderDialogProps {
  isOpen: boolean
  folderToEdit?: Folder | null
  onClose: () => void
  onSave: (name: string, color: string) => Promise<void>
}

export const PRESET_COLORS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-400' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', ring: 'ring-sky-400' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', ring: 'ring-rose-400' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', ring: 'ring-amber-400' },
]

export function FolderDialog({
  isOpen,
  folderToEdit,
  onClose,
  onSave,
}: FolderDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('indigo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name)
      setColor(folderToEdit.color || 'indigo')
    } else {
      setName('')
      setColor('indigo')
    }
    setError(null)
  }, [folderToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name cannot be empty.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSave(trimmed, color)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save folder.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-xl border border-white/10 bg-card p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg gradient-brand flex items-center justify-center shadow-md">
            <FolderPlus className="size-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {folderToEdit ? 'Rename / Recolor Folder' : 'Create New Folder'}
          </h3>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research Papers"
              className="w-full rounded-lg border border-white/10 bg-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="size-3 text-muted-foreground/70" />
              <span>Theme Color</span>
            </label>
            <div className="flex items-center justify-between gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={cn(
                    'size-6 rounded-full flex items-center justify-center transition-all',
                    c.bg,
                    color === c.id ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : 'opacity-70 hover:opacity-100'
                  )}
                  title={c.label}
                >
                  {color === c.id && <Check className="size-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gradient-brand border-0 text-white text-xs px-4"
            >
              {isSubmitting ? 'Saving...' : folderToEdit ? 'Save Changes' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
