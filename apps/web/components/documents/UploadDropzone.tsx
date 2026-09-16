'use client'

import React, { useState, useRef } from 'react'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
}

export function UploadDropzone({ onUpload, isUploading }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndUpload = async (file: File) => {
    setError(null)
    setSuccessMsg(null)

    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowed = ['pdf', 'docx', 'txt', 'md']

    if (!ext || !allowed.includes(ext)) {
      setError(`Unsupported file extension '.${ext}'. Allowed formats: PDF, DOCX, TXT, MD.`)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds maximum limit of 10MB.')
      return
    }

    try {
      await onUpload(file)
      setSuccessMsg(`Successfully uploaded and indexed '${file.name}'`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setError(msg)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0])
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 flex flex-col gap-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">Upload & Index Document</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/5">
          PDF, DOCX, TXT, MD (Max 10MB)
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
          isDragOver
            ? 'border-brand bg-brand/10'
            : 'border-white/10 bg-white/[0.01] hover:border-white/25 hover:bg-white/[0.03]',
          isUploading && 'opacity-60 pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="size-12 rounded-xl bg-brand/15 text-brand flex items-center justify-center shadow-inner">
          {isUploading ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground">
            {isUploading ? 'Extracting & Generating Embeddings...' : 'Drag and drop document file here, or click to browse'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automatic text chunking, sentence parsing, & 1536-dimensional vector embedding
          </p>
        </div>

        <Button
          type="button"
          disabled={isUploading}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-white/10 hover:bg-white/10"
        >
          Select Document
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
          <AlertCircle className="size-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
          <CheckCircle2 className="size-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  )
}
