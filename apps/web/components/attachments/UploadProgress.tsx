'use client'

import React from 'react'
import { X, RotateCcw, Loader2 } from 'lucide-react'
import { formatFileSize } from '@/lib/attachments-api'

export type UploadState = 'pending' | 'uploading' | 'done' | 'error'

export interface UploadProgressProps {
  filename: string
  fileSize: number
  progress: number         // 0–100
  state: UploadState
  errorMessage?: string
  onCancel?: () => void
  onRetry?: () => void
}

export function UploadProgress({
  filename,
  fileSize,
  progress,
  state,
  errorMessage,
  onCancel,
  onRetry,
}: UploadProgressProps) {
  const isActive = state === 'uploading' || state === 'pending'
  const isError = state === 'error'
  const isDone = state === 'done'

  return (
    <div
      className={[
        'upload-progress',
        isError ? 'upload-progress--error' : '',
        isDone ? 'upload-progress--done' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label={`${filename}: ${isDone ? 'Upload complete' : isError ? 'Upload failed' : `${progress}%`}`}
    >
      {/* Header row */}
      <div className="upload-progress__header">
        <span className="upload-progress__name" title={filename}>{filename}</span>
        <span className="upload-progress__size">{formatFileSize(fileSize)}</span>

        {isActive && onCancel && (
          <button
            type="button"
            className="upload-progress__cancel"
            aria-label="Cancel upload"
            onClick={onCancel}
          >
            <X size={14} />
          </button>
        )}
        {isError && onRetry && (
          <button
            type="button"
            className="upload-progress__retry"
            aria-label="Retry upload"
            onClick={onRetry}
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!isError && (
        <div className="upload-progress__bar-track" aria-hidden="true">
          <div
            className="upload-progress__bar-fill"
            style={{ width: `${isDone ? 100 : progress}%` }}
          />
        </div>
      )}

      {/* Status line */}
      <div className="upload-progress__status">
        {state === 'uploading' && (
          <>
            <Loader2 size={12} className="upload-progress__spinner" aria-hidden />
            <span>Uploading… {progress}%</span>
          </>
        )}
        {state === 'pending' && <span>Waiting…</span>}
        {isDone && <span className="upload-progress__done-text">✓ Upload complete</span>}
        {isError && (
          <span className="upload-progress__error-text">
            {errorMessage || 'Upload failed'}
          </span>
        )}
      </div>
    </div>
  )
}
