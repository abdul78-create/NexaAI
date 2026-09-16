'use client'

import React, { useState } from 'react'
import { motion } from 'motion/react'
import { FileText, Copy, Check, ScanLine } from 'lucide-react'
import { OCRAnalysisResponse } from '@/lib/images-api'
import { Button } from '@/components/ui/button'

interface OCRResultPanelProps {
  onExtractOCR: () => Promise<void>
  result: OCRAnalysisResponse | null
  isLoading: boolean
}

export function OCRResultPanel({ onExtractOCR, result, isLoading }: OCRResultPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (result?.ocr_result?.extracted_text) {
      navigator.clipboard.writeText(result.ocr_result.extracted_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="size-4 text-brand" />
          <h4 className="text-xs font-semibold text-foreground">Optical Character Recognition (OCR)</h4>
        </div>
        <Button
          onClick={onExtractOCR}
          disabled={isLoading}
          size="sm"
          className="h-8 text-xs gradient-brand text-white gap-1.5"
        >
          <ScanLine className="size-3.5" />
          <span>Extract Text</span>
        </Button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
        >
          {/* Metadata bar */}
          <div className="flex items-center justify-between border-b border-white/6 pb-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Words: <strong className="text-foreground font-mono">{result.ocr_result.word_count}</strong></span>
              <span>Lang: <strong className="text-foreground font-mono uppercase">{result.ocr_result.language}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span>Confidence:</span>
              <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${Math.round(result.ocr_result.confidence * 100)}%` }}
                />
              </div>
              <strong className="text-foreground font-mono">
                {Math.round(result.ocr_result.confidence * 100)}%
              </strong>
            </div>
          </div>

          {/* Extracted text container */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-2 right-2 size-7 rounded-md bg-black/40 text-muted-foreground hover:text-foreground border border-white/10"
              title="Copy text"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            </Button>
            <pre className="text-xs font-mono text-foreground bg-black/40 border border-white/6 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 scrollbar-none">
              {result.ocr_result.extracted_text}
            </pre>
          </div>

          {/* Bounding box tokens preview */}
          {result.ocr_result.blocks?.length > 0 && (
            <div className="space-y-1.5 border-t border-white/6 pt-2">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="size-3" />
                Detected Text Tokens ({result.ocr_result.blocks.length})
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-none">
                {result.ocr_result.blocks.map((block, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground"
                    title={`Conf: ${Math.round(block.confidence * 100)}% [${block.x_min.toFixed(2)}, ${block.y_min.toFixed(2)}]`}
                  >
                    {block.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
