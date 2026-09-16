'use client'

import React, { useState } from 'react'
import { motion } from 'motion/react'
import { ZoomIn, ZoomOut, Maximize2, ShieldCheck, Eye } from 'lucide-react'
import { AttachmentItem } from '@/lib/attachments-api'
import { QualityMetrics } from '@/lib/images-api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  attachment: AttachmentItem
  quality?: QualityMetrics
  className?: string
}

export function ImagePreview({ attachment, quality, className }: ImagePreviewProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')

  const downloadUrl = `/api/v1/attachments/${attachment.id}/download`

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
  const toggleFitMode = () => setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))

  return (
    <div className={cn('relative flex flex-col rounded-xl border border-white/10 bg-black/40 overflow-hidden', className)}>
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-2.5 bg-black/20">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="size-4 text-brand" />
          <span className="text-xs font-semibold text-foreground truncate">{attachment.original_filename}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
            {(attachment.file_size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
            title="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground w-9 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
            title="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFitMode}
            className={cn('size-7 rounded-md text-muted-foreground hover:text-foreground', fitMode === 'cover' && 'bg-white/10 text-foreground')}
            title="Toggle fit"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Image View Container */}
      <div className="relative flex-1 min-h-[320px] max-h-[500px] flex items-center justify-center p-4 overflow-auto scrollbar-none bg-black/60">
        <motion.img
          key={attachment.id}
          src={downloadUrl}
          alt={attachment.original_filename}
          style={{ transform: `scale(${zoom})` }}
          transition={{ duration: 0.2 }}
          className={cn(
            'max-h-full max-w-full rounded-md shadow-2xl transition-all duration-200 select-none object-contain',
            fitMode === 'cover' && 'object-cover w-full h-full'
          )}
        />
      </div>

      {/* Quality Analysis Toolbar Badge */}
      {quality && (
        <div className="flex items-center justify-between border-t border-white/6 px-4 py-2 bg-black/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Resolution: <strong className="text-foreground font-mono">{quality.width} × {quality.height}</strong>
            </span>
            <span>
              Aspect: <strong className="text-foreground font-mono">{quality.aspect_ratio}</strong>
            </span>
            <span>
              Brightness: <strong className="text-foreground font-mono">{quality.brightness}</strong>
            </span>
            <span>
              Contrast: <strong className="text-foreground font-mono">{quality.contrast}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck className={cn('size-3.5', quality.is_blurry ? 'text-amber-400' : 'text-emerald-400')} />
            <span>Blur Score: <strong className="text-foreground font-mono">{quality.blur_score}</strong> ({quality.is_blurry ? 'Low Focus' : 'Clear'})</span>
          </div>
        </div>
      )}
    </div>
  )
}
