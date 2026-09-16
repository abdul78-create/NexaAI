/**
 * Frontend client for Phase 11 Image Intelligence API.
 */

import { useAuthStore } from '@/stores/auth-store'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface QualityMetrics {
  blur_score: number
  is_blurry: boolean
  brightness: number
  contrast: number
  width: number
  height: number
  aspect_ratio: number
}

export interface OCRBoundingBox {
  text: string
  confidence: number
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

export interface OCRResult {
  extracted_text: string
  confidence: number
  language: string
  word_count: number
  blocks: OCRBoundingBox[]
  provider: string
  is_mock: boolean
}

export interface VisionAnalysisResponse {
  analysis_id: string
  attachment_id: string
  analysis_type: string
  prompt?: string
  description: string
  answer?: string
  tags: string[]
  objects_detected: string[]
  suggested_actions: string[]
  quality: QualityMetrics
  provider: string
  is_mock: boolean
  created_at: string
}

export interface OCRAnalysisResponse {
  analysis_id: string
  attachment_id: string
  analysis_type: string
  ocr_result: OCRResult
  quality: QualityMetrics
  provider: string
  is_mock: boolean
  created_at: string
}

export interface ImageProcessResponse {
  analysis_id: string
  original_attachment_id: string
  new_attachment_id: string
  action: string
  output_size_bytes: number
  width: number
  height: number
  format: string
  quality: QualityMetrics
  created_at: string
}

export interface ImageAnalysisHistoryItem {
  id: string
  attachment_id: string
  analysis_type: string
  prompt?: string
  extracted_text?: string
  status: string
  created_at: string
  result_json?: string
  image_metadata_json?: string
}

export interface ImageAnalysisHistoryList {
  items: ImageAnalysisHistoryItem[]
  total: number
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message
      } else if (errJson?.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg)
  }
  if (res.status === 204) return {} as T
  return res.json()
}

export async function analyzeImage(
  attachmentId: string,
  prompt?: string,
  model?: string
): Promise<VisionAnalysisResponse> {
  const res = await fetchWithAuth('/images/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachment_id: attachmentId,
      prompt,
      model,
    }),
  })
  return handleJsonResponse<VisionAnalysisResponse>(res)
}

export async function extractOCR(
  attachmentId: string,
  language: string = 'en'
): Promise<OCRAnalysisResponse> {
  const res = await fetchWithAuth('/images/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachment_id: attachmentId,
      language,
    }),
  })
  return handleJsonResponse<OCRAnalysisResponse>(res)
}

export async function processImage(
  attachmentId: string,
  action: 'resize' | 'rotate' | 'crop' | 'compress' | 'convert' | 'enhance',
  params: Record<string, unknown> = {}
): Promise<ImageProcessResponse> {
  const res = await fetchWithAuth('/images/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachment_id: attachmentId,
      action,
      params,
    }),
  })
  return handleJsonResponse<ImageProcessResponse>(res)
}

export async function getImageHistory(limit = 50, offset = 0): Promise<ImageAnalysisHistoryList> {
  const res = await fetchWithAuth(`/images/history?limit=${limit}&offset=${offset}`)
  return handleJsonResponse<ImageAnalysisHistoryList>(res)
}

export async function deleteImageHistoryItem(id: string): Promise<void> {
  const res = await fetchWithAuth(`/images/history/${id}`, {
    method: 'DELETE',
  })
  return handleJsonResponse<void>(res)
}
