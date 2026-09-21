'use client'

import React, { useState } from 'react'
import { Paperclip, Loader2 } from 'lucide-react'
import type { AttachmentItem, AttachmentMediaType } from '@/lib/attachments-api'
import { AttachmentPreview } from './AttachmentPreview'

interface AttachmentListProps {
  attachments: AttachmentItem[]
  isLoading?: boolean
  onDelete?: (id: string) => Promise<void>
  /** Filter shown items client-side. If undefined shows all. */
  filterMediaType?: AttachmentMediaType
  className?: string
}

export function AttachmentList({
  attachments,
  isLoading = false,
  onDelete,
  filterMediaType,
  className = '',
}: AttachmentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const visible = filterMediaType
    ? attachments.filter(a => a.media_type === filterMediaType)
    : attachments

  const handleDelete = async (id: string) => {
    if (!onDelete || deleting) return
    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <div className={`attachment-list attachment-list--loading ${className}`} aria-busy="true">
        {[1, 2, 3].map(i => (
          <div key={i} className="attachment-list__skeleton" aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className={`attachment-list attachment-list--empty ${className}`} role="status">
        <Paperclip size={32} aria-hidden />
        <p>No attachments yet</p>
        <span>Upload images, documents, or audio files to get started.</span>
      </div>
    )
  }

  return (
    <ul
      className={`attachment-list ${className}`}
      aria-label={`Attachments (${visible.length})`}
    >
      {visible.map(attachment => (
        <li key={attachment.id} className="attachment-list__item">
          <AttachmentPreview
            attachment={attachment}
            onRemove={onDelete ? (id) => { handleDelete(id) } : undefined}
          />
          {deleting === attachment.id && (
            <div className="attachment-list__deleting" aria-live="polite">
              <Loader2 size={14} className="attachment-list__spinner" aria-hidden />
              <span>Deleting…</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
