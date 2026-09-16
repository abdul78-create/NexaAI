'use client'

import React from 'react'
import { AlertCircle, X, RotateCcw } from 'lucide-react'

interface AttachmentErrorProps {
  message: string
  onDismiss?: () => void
  onRetry?: () => void
  /** Show inline (compact) variant. Default false. */
  compact?: boolean
}

export function AttachmentError({
  message,
  onDismiss,
  onRetry,
  compact = false,
}: AttachmentErrorProps) {
  return (
    <div
      className={`attachment-error ${compact ? 'attachment-error--compact' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={compact ? 14 : 18} className="attachment-error__icon" aria-hidden />
      <span className="attachment-error__message">{message}</span>

      <div className="attachment-error__actions">
        {onRetry && (
          <button
            type="button"
            className="attachment-error__btn attachment-error__btn--retry"
            aria-label="Retry"
            onClick={onRetry}
          >
            <RotateCcw size={14} aria-hidden />
            {!compact && <span>Retry</span>}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="attachment-error__btn attachment-error__btn--dismiss"
            aria-label="Dismiss error"
            onClick={onDismiss}
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
