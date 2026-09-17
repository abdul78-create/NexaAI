'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Pause, Play, RefreshCw, AlertCircle, Volume2 } from 'lucide-react'

interface MicrophoneRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void
  disabled?: boolean
  maxDurationSeconds?: number
}

export const MicrophoneRecorder: React.FC<MicrophoneRecorderProps> = ({
  onRecordingComplete,
  disabled = false,
  maxDurationSeconds = 300, // 5 minutes default
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [duration, setDuration] = useState(0)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Clean up media tracks and object URL on unmount
  useEffect(() => {
    return () => {
      stopTracks()
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const startRecording = async () => {
    setPermissionError(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    audioChunksRef.current = []
    setDuration(0)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick supported MIME type
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        stopTracks()
      }

      mediaRecorder.start(250) // Collect 250ms chunks
      setRecordingState('recording')

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording()
            return maxDurationSeconds
          }
          return prev + 1
        })
      }, 1000)

    } catch (err: any) {
      stopTracks()
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No microphone detected on your device.')
      } else {
        setPermissionError(err.message || 'Failed to start microphone recording.')
      }
      setRecordingState('idle')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording()
            return maxDurationSeconds
          }
          return prev + 1
        })
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecordingState('stopped')
  }

  const handleUseRecording = () => {
    if (audioChunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
      onRecordingComplete(audioBlob, duration)
    }
  }

  const handleReset = () => {
    stopTracks()
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    audioChunksRef.current = []
    setDuration(0)
    setRecordingState('idle')
    setPermissionError(null)
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card text-card-foreground border border-border rounded-2xl shadow-sm space-y-5">
      {permissionError && (
        <div className="w-full flex items-start gap-3 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{permissionError}</div>
        </div>
      )}

      {/* Recording Display & Waveform */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-4xl font-mono font-bold tracking-tight text-foreground">
          {formatTimer(duration)}
        </div>
        <div className="text-xs text-muted-foreground">
          Max Duration: {formatTimer(maxDurationSeconds)}
        </div>

        {recordingState === 'recording' && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Recording</span>
          </div>
        )}

        {recordingState === 'paused' && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Paused</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {recordingState === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-xl shadow-sm transition-all"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {recordingState === 'recording' && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="p-3 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl transition-all"
              title="Pause Recording"
            >
              <Pause className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-sm transition-all"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop Recording
            </button>
          </>
        )}

        {recordingState === 'paused' && (
          <>
            <button
              type="button"
              onClick={resumeRecording}
              className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-sm transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              Resume
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-sm transition-all"
            >
              <Square className="w-5 h-5 fill-current" />
              Stop
            </button>
          </>
        )}

        {recordingState === 'stopped' && (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-sm font-medium rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Re-record
            </button>

            <button
              type="button"
              onClick={handleUseRecording}
              disabled={disabled}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
            >
              <Volume2 className="w-4 h-4" />
              Use This Recording
            </button>
          </>
        )}
      </div>

      {/* Audio Playback Preview */}
      {audioUrl && recordingState === 'stopped' && (
        <div className="w-full pt-2 border-t border-border">
          <audio controls src={audioUrl} className="w-full h-10 rounded-lg bg-muted" />
        </div>
      )}
    </div>
  )
}
