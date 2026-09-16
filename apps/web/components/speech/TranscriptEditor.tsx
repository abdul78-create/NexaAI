'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Download, MessageSquare, Check, Edit3, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TranscriptEditorProps {
  initialTranscript: string
  audioDurationSeconds?: number | null
  executionDurationMs?: number
  language?: string
  onTranscriptChange?: (newTranscript: string) => void
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  initialTranscript,
  audioDurationSeconds,
  executionDurationMs,
  language = 'en',
  onTranscriptChange,
}) => {
  const [transcript, setTranscript] = useState(initialTranscript)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setTranscript(initialTranscript)
  }, [initialTranscript])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy transcript', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleInsertIntoChat = () => {
    // Store in localStorage or session state for chat composer pickup
    try {
      sessionStorage.setItem('nexaai_pending_chat_input', transcript)
      router.push('/app')
    } catch (e) {
      console.error('Failed to stage transcript for chat', e)
    }
  }

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const charCount = transcript.length

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Language: <strong className="text-slate-200 uppercase">{language}</strong></span>
          <span>•</span>
          <span>{wordCount} words ({charCount} chars)</span>
          {audioDurationSeconds && (
            <>
              <span>•</span>
              <span>Audio: {audioDurationSeconds.toFixed(1)}s</span>
            </>
          )}
          {executionDurationMs && (
            <>
              <span>•</span>
              <span>Latency: {(executionDurationMs / 1000).toFixed(2)}s</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                if (onTranscriptChange) onTranscriptChange(transcript)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-lg hover:bg-emerald-600/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Text
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all"
            title="Download .txt"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>

          <button
            type="button"
            onClick={handleInsertIntoChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-md shadow-indigo-600/20 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Insert into Chat
          </button>
        </div>
      </div>

      {/* Editor body */}
      {isEditing ? (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          className="w-full p-4 bg-slate-950 border border-indigo-500/40 focus:border-indigo-500 text-slate-100 text-sm font-sans rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed resize-y"
          placeholder="Edit transcript here..."
        />
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-slate-200 text-sm font-sans leading-relaxed whitespace-pre-wrap select-text min-h-[120px]">
          {transcript}
        </div>
      )}
    </div>
  )
}
