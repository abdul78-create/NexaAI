'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageProcessingStatusProps {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  message?: string
  className?: string
}

export function ImageProcessingStatus({ status, message, className }: ImageProcessingStatusProps) {
  if (status === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border',
        status === 'processing' || status === 'uploading'
          ? 'bg-brand/10 border-brand/20 text-brand'
          : status === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        className
      )}
    >
      {status === 'processing' || status === 'uploading' ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <AlertCircle className="size-3.5" />
      )}
      <span>{message || (status === 'processing' ? 'Processing image...' : status === 'success' ? 'Completed' : 'Error')}</span>
    </motion.div>
  )
}
