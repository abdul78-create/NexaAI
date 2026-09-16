'use client'

import React, { useState } from 'react'
import { AttachmentPicker, PickedFile } from '@/components/attachments/AttachmentPicker'
import { AttachmentItem, uploadAttachment } from '@/lib/attachments-api'
import { useAuthStore } from '@/stores/auth-store'
import { ImageIcon, Loader2 } from 'lucide-react'

interface ImageUploadPanelProps {
  onImageSelected: (attachment: AttachmentItem) => void
  disabled?: boolean
}

export function ImageUploadPanel({ onImageSelected, disabled }: ImageUploadPanelProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)

  const handleFilesSelected = async (pickedFiles: PickedFile[]) => {
    if (pickedFiles.length === 0) return
    const firstImage = pickedFiles.find((p) => p.mediaType === 'image') || pickedFiles[0]
    if (!firstImage) return

    setIsUploading(true)
    setErrorMsg(null)

    try {
      if (!token) {
        // Guest demo mode mock attachment item
        const mockItem: AttachmentItem = {
          id: `img-guest-${Date.now()}`,
          user_id: 'guest',
          original_filename: firstImage.file.name,
          mime_type: firstImage.file.type || 'image/jpeg',
          file_size: firstImage.file.size,
          media_type: 'image',
          status: 'ready',
          checksum_sha256: 'mock',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        onImageSelected(mockItem)
      } else {
        const item = await uploadAttachment(token, firstImage.file)
        onImageSelected(item)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed'
      setErrorMsg(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
          <ImageIcon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Image Selection</h3>
          <p className="text-xs text-muted-foreground">Upload or drag an image (JPEG, PNG, WebP) up to 10 MB</p>
        </div>
      </div>

      <AttachmentPicker
        onFilesSelected={handleFilesSelected}
        accept="image/jpeg,image/png,image/webp,image/gif"
        maxFiles={1}
        disabled={disabled || isUploading}
      />

      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-xs text-brand py-2">
          <Loader2 className="size-4 animate-spin" />
          <span>Uploading image attachment...</span>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
