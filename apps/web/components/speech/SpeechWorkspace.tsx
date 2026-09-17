'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Mic, Upload, Sparkles, AlertCircle, FileAudio } from 'lucide-react'
import { MicrophoneRecorder } from './MicrophoneRecorder'
import { AudioUploadPanel } from './AudioUploadPanel'
import { TranscriptEditor } from './TranscriptEditor'
import { SpeechProcessingStatus } from './SpeechProcessingStatus'
import { SpeechHistory } from './SpeechHistory'
import { ProviderBadge } from './ProviderBadge'
import {
  SpeechTranscriptionResponse,
  SpeechHistoryItem,
  transcribeAudioAttachment,
  getSpeechHistory,
} from '@/lib/speech-api'
import { uploadAttachment } from '@/lib/attachments-api'
import { useAuthStore } from '@/stores/auth-store'

export const SpeechWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentTranscription, setCurrentTranscription] = useState<SpeechTranscriptionResponse | null>(null)

  const [historyItems, setHistoryItems] = useState<SpeechHistoryItem[]>([])
  const [promptInput, setPromptInput] = useState<string>('')
  const [languageInput, setLanguageInput] = useState<string>('en')

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getSpeechHistory()
      setHistoryItems(data.items)
    } catch (err) {
      console.error('Failed to load speech history', err)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Handles raw audio (either recorded Blob or uploaded File)
  const processAudioSource = async (audioData: Blob | File, filename: string, mimeType: string) => {
    setErrorMessage(null)
    setIsProcessing(true)

    try {
      // 1. Upload audio attachment via existing attachment infrastructure
      setStatusMessage('Uploading audio attachment to secure storage...')
      const fileToUpload =
        audioData instanceof File
          ? audioData
          : new File([audioData], filename, { type: mimeType })

      const token = useAuthStore.getState().token || ''
      const attachment = await uploadAttachment(token, fileToUpload)


      if (attachment.media_type !== 'audio') {
        throw new Error(`File registered as media type '${attachment.media_type}', expected 'audio'.`)
      }

      // 2. Trigger transcription endpoint
      setStatusMessage('Transcribing speech using Speech-to-Text engine...')
      const response = await transcribeAudioAttachment(
        attachment.id,
        languageInput.trim() || undefined,
        promptInput.trim() || undefined
      )

      setCurrentTranscription(response)
      await fetchHistory()
    } catch (err: any) {
      setErrorMessage(err.message || 'Speech processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRecordingComplete = (blob: Blob, durationSeconds: number) => {
    const filename = `recording_${new Date().toISOString().slice(0, 19).replace(/[: shadow-]/g, '')}.webm`
    processAudioSource(blob, filename, blob.type || 'audio/webm')
  }

  const handleFileUpload = (file: File) => {
    processAudioSource(file, file.name, file.type || 'audio/wav')
  }

  const handleHistoryItemDeleted = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id))
    if (currentTranscription?.id === id) {
      setCurrentTranscription(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card text-card-foreground border border-border rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Mic className="w-6 h-6 text-indigo-500" />
              Speech Intelligence Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Phase 13
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Microphone recording, audio uploads, and AI Speech-to-Text transcription.
          </p>
        </div>

        {currentTranscription && (
          <ProviderBadge
            provider={currentTranscription.provider}
            isMock={currentTranscription.is_mock}
            modelName={currentTranscription.model_name}
          />
        )}
      </div>

      {/* Main Grid: Input/Control Panel vs Output Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Inputs & Controls) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Audio Input Tabs */}
          <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'record'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mic className="w-4 h-4" />
                Record Microphone
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Audio File
              </button>
            </div>

            {/* Optional Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Language Hint
                </label>
                <input
                  type="text"
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  placeholder="e.g. en, es, fr"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Context Prompt
                </label>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Glossary or names..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Active Tab View */}
            {activeTab === 'record' ? (
              <MicrophoneRecorder
                onRecordingComplete={handleRecordingComplete}
                disabled={isProcessing}
              />
            ) : (
              <AudioUploadPanel
                onFileSelect={handleFileUpload}
                disabled={isProcessing}
              />
            )}
          </div>

          {/* History List */}
          <SpeechHistory
            items={historyItems}
            onSelect={(item) => setCurrentTranscription(item)}
            onItemDeleted={handleHistoryItemDeleted}
            selectedId={currentTranscription?.id}
          />
        </div>

        {/* Right Column (Status & Transcript Output) */}
        <div className="lg:col-span-7 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-destructive">Transcription Error</h4>
                <p className="text-xs text-destructive/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {isProcessing ? (
            <SpeechProcessingStatus statusText={statusMessage} />
          ) : currentTranscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Active Transcript
                </h3>
              </div>

              <TranscriptEditor
                initialTranscript={currentTranscription.transcript}
                audioDurationSeconds={currentTranscription.audio_duration_seconds}
                executionDurationMs={currentTranscription.duration_ms}
                language={currentTranscription.language}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-3xl text-center space-y-3">
              <div className="p-4 bg-muted rounded-2xl text-muted-foreground">
                <FileAudio className="w-10 h-10" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Transcript Loaded</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Record microphone audio or upload an audio file on the left to view and edit its AI-generated transcription.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
