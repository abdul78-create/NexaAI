'use client'

import React from 'react'
import { FileText, Music, Image as ImageIcon, X, Download } from 'lucide-react'
import type { AttachmentItem } from '@/lib/attachments-api'
import { formatFileSize, getAttachmentDownloadUrl } from '@/lib/attachments-api'

interface AttachmentPreviewProps {
  attachment: AttachmentItem
  /** Preview URL for images (object URL from local file or download_url). */
  previewUrl?: string
  onRemove?: (id: string) => void
  /** Show download button. Default true. */
  showDownload?: boolean
  token?: string
}

function MediaIcon({ mediaType }: { mediaType: string }) {
  if (mediaType === 'image') return <ImageIcon size={20} aria-hidden />
  if (mediaType === 'audio') return <Music size={20} aria-hidden />
  return <FileText size={20} aria-hidden />
}

export function AttachmentPreview({
  attachment,
  previewUrl,
  onRemove,
  showDownload = true,
}: AttachmentPreviewProps) {
  const isImage = attachment.media_type === 'image'
  const downloadUrl = attachment.download_url || getAttachmentDownloadUrl(attachment.id)

  return (
    <div
      className="attachment-preview"
      role="figure"
      aria-label={`Attachment: ${attachment.original_filename}`}
    >
      {/* Thumbnail / icon */}
      <div className="attachment-preview__thumb">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={attachment.original_filename}
            className="attachment-preview__img"
            loading="lazy"
          />
        ) : (
          <div className="attachment-preview__icon">
            <MediaIcon mediaType={attachment.media_type} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="attachment-preview__info">
        <span className="attachment-preview__name" title={attachment.original_filename}>
          {attachment.original_filename}
        </span>
        <span className="attachment-preview__meta">
          {formatFileSize(attachment.file_size)}
          {' · '}
          <span className={`attachment-preview__badge attachment-preview__badge--${attachment.media_type}`}>
            {attachment.media_type}
          </span>
        </span>
      </div>

      {/* Actions */}
      <div className="attachment-preview__actions">
        {showDownload && (
          <a
            href={downloadUrl}
            download={attachment.original_filename}
            className="attachment-preview__action"
            aria-label={`Download ${attachment.original_filename}`}
          >
            <Download size={14} />
          </a>
        )}
        {onRemove && (
          <button
            type="button"
            className="attachment-preview__action attachment-preview__action--remove"
            aria-label={`Remove ${attachment.original_filename}`}
            onClick={() => onRemove(attachment.id)}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
