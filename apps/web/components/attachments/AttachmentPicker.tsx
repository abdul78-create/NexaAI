'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import type { AttachmentMediaType } from '@/lib/attachments-api'

export interface PickedFile {
  file: File
  preview?: string   // object URL for images
  mediaType: AttachmentMediaType
}

interface AttachmentPickerProps {
  /** Called when the user selects / drops / pastes one or more files. */
  onFilesSelected: (files: PickedFile[]) => void
  /** Allowed media types. Defaults to image + document. */
  accept?: string
  /** Max files per pick action. Defaults to 5. */
  maxFiles?: number
  disabled?: boolean
  className?: string
}

const MEDIA_TYPE_MAP: Record<string, AttachmentMediaType> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document', 'text/markdown': 'document',
  'audio/webm': 'audio', 'audio/mpeg': 'audio', 'audio/wav': 'audio',
  'audio/mp4': 'audio', 'audio/x-m4a': 'audio',
}

function toMediaType(mime: string): AttachmentMediaType {
  return MEDIA_TYPE_MAP[mime] ?? 'other'
}

function buildPickedFile(file: File): PickedFile {
  const mediaType = toMediaType(file.type)
  const preview = mediaType === 'image' ? URL.createObjectURL(file) : undefined
  return { file, preview, mediaType }
}

export function AttachmentPicker({
  onFilesSelected,
  accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.docx,text/plain,.md,audio/webm,audio/mpeg,audio/wav',
  maxFiles = 5,
  disabled = false,
  className = '',
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).slice(0, maxFiles)
    if (files.length === 0) return
    const picked = files.map(buildPickedFile)
    onFilesSelected(picked)
  }, [onFilesSelected, maxFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) processFiles(e.dataTransfer.files)
  }, [disabled, processFiles])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return
    const items = Array.from(e.clipboardData.items)
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(Boolean) as File[]
    if (files.length > 0) processFiles(files)
  }, [disabled, processFiles])

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Attach files — click, drag and drop, or paste"
      aria-disabled={disabled}
      className={[
        'attachment-picker',
        isDragging ? 'attachment-picker--dragging' : '',
        disabled ? 'attachment-picker--disabled' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click() }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <Upload size={20} aria-hidden />
      <span>Drop files here, click to browse, or paste from clipboard</span>
      <span className="attachment-picker__hint">
        Images (JPG, PNG, WebP) · Documents (PDF, DOCX, TXT) · Audio (MP3, WAV)
      </span>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files)
          e.target.value = ''
        }}
        aria-hidden="true"
      />
    </div>
  )
}
