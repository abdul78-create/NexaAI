'use client'

import React, { useState } from 'react'
import { Tag, Cpu, Building2, MapPin, User, Calendar, CheckCircle2 } from 'lucide-react'
import { EntityData } from '@/lib/nlp-api'
import { cn } from '@/lib/utils'

interface EntityPanelProps {
  entities: EntityData[]
}

const CATEGORIES = ['ALL', 'TECHNOLOGY', 'ORGANIZATION', 'LOCATION', 'PERSON', 'DATE']

export function EntityPanel({ entities }: EntityPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const getCategoryIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'TECHNOLOGY':
        return <Cpu className="size-3.5 text-cyan-400" />
      case 'ORGANIZATION':
        return <Building2 className="size-3.5 text-indigo-400" />
      case 'LOCATION':
        return <MapPin className="size-3.5 text-emerald-400" />
      case 'PERSON':
        return <User className="size-3.5 text-pink-400" />
      case 'DATE':
        return <Calendar className="size-3.5 text-amber-400" />
      default:
        return <Tag className="size-3.5 text-brand" />
    }
  }

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'TECHNOLOGY':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'ORGANIZATION':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      case 'LOCATION':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'PERSON':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'DATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      default:
        return 'bg-brand/10 text-brand border-brand/20'
    }
  }

  const filtered = selectedCategory === 'ALL'
    ? entities
    : entities.filter((e) => e.category.toUpperCase() === selectedCategory)

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Named Entity Recognition (NER)</h3>
            <p className="text-xs text-muted-foreground">Classified entities extracted from source text</p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'text-[11px] font-mono px-2.5 py-1 rounded-md transition-all border',
                selectedCategory === cat
                  ? 'bg-brand text-white border-brand shadow-sm font-bold'
                  : 'bg-white/5 text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/10'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entity Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((entity, idx) => (
            <div
              key={`${entity.text}-${idx}`}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                  {getCategoryIcon(entity.category)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{entity.text}</p>
                  <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded border inline-block mt-0.5', getCategoryBadgeClass(entity.category))}>
                    {entity.category}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-400" />
                  {(entity.confidence * 100).toFixed(0)}%
                </span>
                {entity.count > 1 && (
                  <span className="text-[10px] font-mono bg-white/10 text-foreground px-1.5 py-0.2 rounded-full font-bold">
                    x{entity.count}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No named entities found for category <strong className="text-foreground">{selectedCategory}</strong>.
        </div>
      )}
    </div>
  )
}
