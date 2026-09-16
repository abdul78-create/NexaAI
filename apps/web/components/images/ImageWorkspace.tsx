'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { ImageIcon, Sparkles, Sliders, ScanLine, RefreshCw } from 'lucide-react'
import { AttachmentItem } from '@/lib/attachments-api'
import {
  analyzeImage,
  extractOCR,
  processImage,
  getImageHistory,
  deleteImageHistoryItem,
  VisionAnalysisResponse,
  OCRAnalysisResponse,
  ImageAnalysisHistoryItem,
  QualityMetrics,
} from '@/lib/images-api'
import { ImageUploadPanel } from './ImageUploadPanel'
import { ImagePreview } from './ImagePreview'
import { ImageAnalysisPanel } from './ImageAnalysisPanel'
import { ImageToolsPanel } from './ImageToolsPanel'
import { OCRResultPanel } from './OCRResultPanel'
import { ImageHistory } from './ImageHistory'
import { ImageProcessingStatus } from './ImageProcessingStatus'
import { Button } from '@/components/ui/button'

export function ImageWorkspace() {
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentItem | null>(null)
  const [visionResult, setVisionResult] = useState<VisionAnalysisResponse | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRAnalysisResponse | null>(null)
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | undefined>()
  const [historyItems, setHistoryItems] = useState<ImageAnalysisHistoryItem[]>([])

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'vision' | 'ocr' | 'tools'>('vision')

  const fetchHistory = async () => {
    try {
      const data = await getImageHistory()
      setHistoryItems(data.items)
    } catch {
      // Ignore silent error if unauthenticated demo mode
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleImageSelected = (attachment: AttachmentItem) => {
    setSelectedAttachment(attachment)
    setVisionResult(null)
    setOcrResult(null)
    setQualityMetrics(undefined)
    setStatus('success')
    setStatusMessage(`Image loaded: ${attachment.original_filename}`)
  }

  const handleAnalyzeVision = async (prompt?: string) => {
    if (!selectedAttachment) return
    setStatus('processing')
    setStatusMessage('Analyzing image with Vision AI...')
    try {
      const res = await analyzeImage(selectedAttachment.id, prompt)
      setVisionResult(res)
      setQualityMetrics(res.quality)
      setStatus('success')
      setStatusMessage('Vision AI analysis complete')
      fetchHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vision AI analysis failed'
      setStatus('error')
      setStatusMessage(msg)
    }
  }

  const handleExtractOCR = async () => {
    if (!selectedAttachment) return
    setStatus('processing')
    setStatusMessage('Extracting OCR text...')
    try {
      const res = await extractOCR(selectedAttachment.id)
      setOcrResult(res)
      if (res.quality?.width) {
        setQualityMetrics(res.quality)
      }
      setStatus('success')
      setStatusMessage('OCR extraction complete')
      fetchHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR extraction failed'
      setStatus('error')
      setStatusMessage(msg)
    }
  }

  const handleProcessImage = async (
    action: 'resize' | 'rotate' | 'crop' | 'compress' | 'convert' | 'enhance',
    params: Record<string, unknown> = {}
  ) => {
    if (!selectedAttachment) return
    setStatus('processing')
    setStatusMessage(`Executing ${action} image operation...`)
    try {
      const res = await processImage(selectedAttachment.id, action, params)
      setQualityMetrics(res.quality)
      // Replace active attachment with newly processed output attachment
      setSelectedAttachment({
        id: res.new_attachment_id,
        user_id: selectedAttachment.user_id,
        original_filename: `${selectedAttachment.original_filename.split('.')[0]}_${action}.${res.format.toLowerCase()}`,
        mime_type: `image/${res.format.toLowerCase()}`,
        file_size: res.output_size_bytes,
        checksum_sha256: '',
        media_type: 'image',
        status: 'ready',
        created_at: res.created_at,
        updated_at: res.created_at,
      })
      setStatus('success')
      setStatusMessage(`Successfully processed: ${action}`)
      fetchHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image processing failed'
      setStatus('error')
      setStatusMessage(msg)
    }
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteImageHistoryItem(id)
      setHistoryItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      // Ignore
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-white/6 px-6 py-3.5 bg-sidebar flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md">
            <ImageIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              Image Studio
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/15 text-brand border border-brand/20 uppercase">
                Phase 11 Multimodal
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">OpenCV computer vision, OCR text extraction & Vision AI analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ImageProcessingStatus status={status} message={statusMessage} />

          {selectedAttachment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAttachment(null)
                setVisionResult(null)
                setOcrResult(null)
                setQualityMetrics(undefined)
                setStatus('idle')
              }}
              className="h-8 text-xs gap-1.5 border-white/10"
            >
              <RefreshCw className="size-3" />
              New Image
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {!selectedAttachment ? (
          /* Initial Upload View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4 w-full"
            >
              <div className="size-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto shadow-xl">
                <ImageIcon className="size-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Select an Image to Begin</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Upload screenshot, document scan, product photo, or chart. Analyze visual details, extract text, or run OpenCV operations.
                </p>
              </div>

              <ImageUploadPanel onImageSelected={handleImageSelected} />
            </motion.div>

            {/* History preview if available */}
            {historyItems.length > 0 && (
              <div className="w-full text-left pt-4 border-t border-white/6">
                <ImageHistory
                  historyItems={historyItems}
                  onSelectHistoryItem={() => {}}
                  onDeleteHistoryItem={handleDeleteHistory}
                  isLoading={false}
                />
              </div>
            )}
          </div>
        ) : (
          /* Studio Layout with Split Panes */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
            {/* Left Pane: Image Preview & Metadata (7 cols) */}
            <div className="lg:col-span-7 flex flex-col border-r border-white/6 p-4 gap-4 overflow-y-auto scrollbar-none">
              <ImagePreview attachment={selectedAttachment} quality={qualityMetrics} />

              <div className="border border-white/6 rounded-xl bg-white/5 p-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Attachment ID: <code className="text-foreground font-mono">{selectedAttachment.id}</code></span>
                <span>Type: <strong className="text-foreground uppercase">{selectedAttachment.mime_type.split('/')[1]}</strong></span>
              </div>
            </div>

            {/* Right Pane: Analysis, OCR, Tools & History (5 cols) */}
            <div className="lg:col-span-5 flex flex-col overflow-hidden bg-sidebar/50">
              {/* Studio Tabs */}
              <div className="flex border-b border-white/6 px-4 pt-3 gap-2 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('vision')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'vision'
                      ? 'border-brand text-brand bg-white/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="size-3.5" />
                  Vision AI
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'ocr'
                      ? 'border-brand text-brand bg-white/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ScanLine className="size-3.5" />
                  OCR Text
                </button>
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                    activeTab === 'tools'
                      ? 'border-brand text-brand bg-white/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sliders className="size-3.5" />
                  Tools
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 p-4 overflow-y-auto scrollbar-none space-y-6">
                {activeTab === 'vision' && (
                  <ImageAnalysisPanel
                    onAnalyze={handleAnalyzeVision}
                    result={visionResult}
                    isLoading={status === 'processing'}
                  />
                )}

                {activeTab === 'ocr' && (
                  <OCRResultPanel
                    onExtractOCR={handleExtractOCR}
                    result={ocrResult}
                    isLoading={status === 'processing'}
                  />
                )}

                {activeTab === 'tools' && (
                  <ImageToolsPanel
                    onProcess={handleProcessImage}
                    isLoading={status === 'processing'}
                  />
                )}

                <div className="pt-4 border-t border-white/6">
                  <ImageHistory
                    historyItems={historyItems}
                    onSelectHistoryItem={() => {}}
                    onDeleteHistoryItem={handleDeleteHistory}
                    isLoading={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
