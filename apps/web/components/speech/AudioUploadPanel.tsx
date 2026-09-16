'use client'

import React, { useRef, useState } from 'react'
import { Upload, FileAudio, AlertCircle } from 'lucide-react'

interface AudioUploadPanelProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  maxSizeMB?: number
}

const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.webm', '.ogg']

export const AudioUploadPanel: React.FC<AudioUploadPanelProps> = ({
  onFileSelect,
  disabled = false,
  maxSizeMB = 25,
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSelect = (file: File) => {
    setError(null)

    // Check size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`Audio file size (${sizeMB.toFixed(1)} MB) exceeds maximum limit of ${maxSizeMB} MB.`)
      return
    }

    // Check extension / MIME
    const nameLower = file.name.toLowerCase()
    const isExtensionValid = SUPPORTED_AUDIO_EXTENSIONS.some((ext) => nameLower.endsWith(ext))
    const isMimeValid = file.type.startsWith('audio/') || file.type === 'video/webm' || file.type === 'video/ogg'

    if (!isExtensionValid && !isMimeValid) {
      setError(`Unsupported audio format. Please upload WAV, MP3, M4A, WebM, or OGG audio files.`)
      return
    }

    onFileSelect(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0])
    }
  }

  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="p-3 bg-slate-800/80 text-indigo-400 rounded-xl mb-3 shadow-inner">
          <FileAudio className="w-8 h-8" />
        </div>

        <p className="text-sm font-medium text-slate-200 text-center">
          <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop audio file
        </p>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Supported: WAV, MP3, M4A, WebM, OGG (Max {maxSizeMB} MB)
        </p>
      </div>
    </div>
  )
}
