'use client'

import React, { useState } from 'react'
import { RotateCw, FileCheck2, Sliders, RefreshCw, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ImageToolsPanelProps {
  onProcess: (
    action: 'resize' | 'rotate' | 'crop' | 'compress' | 'convert' | 'enhance',
    params?: Record<string, unknown>
  ) => Promise<void>
  isLoading: boolean
}

export function ImageToolsPanel({ onProcess, isLoading }: ImageToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<'rotate' | 'resize' | 'convert' | 'enhance'>('rotate')
  const [resizeWidth, setResizeWidth] = useState<string>('800')
  const [resizeHeight, setResizeHeight] = useState<string>('600')
  const [targetMime, setTargetMime] = useState<string>('image/jpeg')

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/6 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-brand" />
          <h4 className="text-xs font-semibold text-foreground">OpenCV Image Operations</h4>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">Server-side Processing</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('rotate')}
          className={cn(
            'flex-1 text-[11px] font-medium py-1 rounded-md transition-colors',
            activeTab === 'rotate' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Rotate
        </button>
        <button
          onClick={() => setActiveTab('resize')}
          className={cn(
            'flex-1 text-[11px] font-medium py-1 rounded-md transition-colors',
            activeTab === 'resize' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Resize
        </button>
        <button
          onClick={() => setActiveTab('convert')}
          className={cn(
            'flex-1 text-[11px] font-medium py-1 rounded-md transition-colors',
            activeTab === 'convert' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Convert
        </button>
        <button
          onClick={() => setActiveTab('enhance')}
          className={cn(
            'flex-1 text-[11px] font-medium py-1 rounded-md transition-colors',
            activeTab === 'enhance' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Enhance
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'rotate' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Rotate image clockwise</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={() => onProcess('rotate', { angle: 90 })}
              className="flex-1 text-xs gap-1.5"
            >
              <RotateCw className="size-3.5" />
              90°
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={() => onProcess('rotate', { angle: 180 })}
              className="flex-1 text-xs gap-1.5"
            >
              <RotateCw className="size-3.5" />
              180°
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={() => onProcess('rotate', { angle: 270 })}
              className="flex-1 text-xs gap-1.5"
            >
              <RotateCw className="size-3.5" />
              270°
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'resize' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Target Width (px)</label>
              <Input
                type="number"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(e.target.value)}
                className="h-8 text-xs bg-white/5"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Target Height (px)</label>
              <Input
                type="number"
                value={resizeHeight}
                onChange={(e) => setResizeHeight(e.target.value)}
                className="h-8 text-xs bg-white/5"
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() =>
              onProcess('resize', {
                width: parseInt(resizeWidth) || undefined,
                height: parseInt(resizeHeight) || undefined,
                preserve_aspect: true,
              })
            }
            className="w-full text-xs gap-1.5 gradient-brand text-white"
          >
            <RefreshCw className="size-3.5" />
            Apply Resizing
          </Button>
        </div>
      )}

      {activeTab === 'convert' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Select Format</label>
            <select
              value={targetMime}
              onChange={(e) => setTargetMime(e.target.value)}
              className="w-full h-8 rounded-md border border-white/10 bg-black/40 text-xs text-foreground px-2"
            >
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/png">PNG (.png)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
          </div>
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => onProcess('convert', { target_mime_type: targetMime })}
            className="w-full text-xs gap-1.5 gradient-brand text-white"
          >
            <Layers className="size-3.5" />
            Convert Format
          </Button>
        </div>
      )}

      {activeTab === 'enhance' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Apply adaptive contrast normalization (CLAHE) for document scans & screenshot legibility.
          </p>
          <Button
            size="sm"
            disabled={isLoading}
            onClick={() => onProcess('enhance')}
            className="w-full text-xs gap-1.5 gradient-brand text-white"
          >
            <FileCheck2 className="size-3.5" />
            Enhance Document Contrast
          </Button>
        </div>
      )}
    </div>
  )
}
