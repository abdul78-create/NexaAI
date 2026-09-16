/**
 * NexaAI NLP API Client
 * Communication with FastAPI backend NLP Analysis endpoints with fallback for guest mode.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export interface SentimentData {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  score: number
  positive_score: number
  negative_score: number
  neutral_score: number
  compound_score: number
}

export interface EmotionData {
  dominant_emotion: string
  scores: Record<string, number>
}

export interface EntityData {
  text: string
  category: string
  confidence: number
  count: number
}

export interface KeywordData {
  keyword: string
  relevance: number
  frequency: number
  category?: string
}

export interface SummaryData {
  executive_summary: string
  key_takeaways: string[]
  bullet_points: string[]
  compression_ratio: number
}

export interface ReadabilityData {
  flesch_kincaid_grade: number
  flesch_reading_ease: number
  reading_level: string
  gunning_fog_index: number
}

export interface TextStatisticsData {
  character_count: number
  word_count: number
  sentence_count: number
  paragraph_count: number
  reading_time_seconds: number
  speaking_time_seconds: number
  unique_words_count: number
  lexical_diversity: number
}

export interface ToxicityData {
  is_safe: boolean
  toxicity_score: number
  profanity_detected: boolean
  sentiment_warning: boolean
}

export interface NLPAnalysisResult {
  title: string
  language: string
  language_confidence: number
  sentiment: SentimentData
  emotions: EmotionData
  intent: string
  entities: EntityData[]
  keywords: KeywordData[]
  summary: SummaryData
  readability: ReadabilityData
  statistics: TextStatisticsData
  safety: ToxicityData
}

export interface NLPAnalysisSummary {
  id: string
  user_id: string
  title: string
  word_count: number
  character_count: number
  created_at: string
}

export interface NLPAnalysisDetail {
  id: string
  user_id: string
  title: string
  original_text: string
  result: NLPAnalysisResult
  word_count: number
  character_count: number
  created_at: string
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

/** Client-side fallback analyzer for Guest Mode */
function analyzeTextLocal(text: string, title?: string): NLPAnalysisDetail {
  const clean = text.trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const charCount = clean.length
  const sentences = clean.split(/[.!?]+/).filter(Boolean)
  const sentenceCount = Math.max(1, sentences.length)

  const posWords = ['great', 'excellent', 'good', 'amazing', 'wonderful', 'fast', 'secure', 'easy', 'love']
  const negWords = ['bad', 'terrible', 'slow', 'fail', 'error', 'broken', 'issue', 'problem', 'risk']

  let posCount = 0
  let negCount = 0
  words.forEach((w: string) => {
    const l = w.toLowerCase()
    if (posWords.includes(l)) posCount++
    if (negWords.includes(l)) negCount++
  })

  const diff = posCount - negCount
  const label = diff > 0 ? 'POSITIVE' : diff < 0 ? 'NEGATIVE' : 'NEUTRAL'
  const compound = diff > 0 ? 0.65 : diff < 0 ? -0.55 : 0.05

  return {
    id: `guest-nlp-${Date.now()}`,
    user_id: 'guest',
    title: title || (clean.slice(0, 35) + '...') || 'Guest Text Analysis',
    original_text: text,
    word_count: wordCount,
    character_count: charCount,
    created_at: new Date().toISOString(),
    result: {
      title: title || 'Text Analysis Report',
      language: 'English',
      language_confidence: 0.99,
      sentiment: {
        label,
        score: diff > 0 ? 0.85 : diff < 0 ? 0.35 : 0.5,
        positive_score: Math.min(1, posCount / Math.max(1, wordCount)),
        negative_score: Math.min(1, negCount / Math.max(1, wordCount)),
        neutral_score: 0.7,
        compound_score: compound,
      },
      emotions: {
        dominant_emotion: diff > 0 ? 'Joy' : diff < 0 ? 'Anger' : 'Confidence',
        scores: {
          Joy: diff > 0 ? 0.75 : 0.2,
          Confidence: 0.8,
          Sadness: diff < 0 ? 0.6 : 0.1,
          Anger: diff < 0 ? 0.7 : 0.1,
          Surprise: 0.3,
          Fear: 0.1,
        },
      },
      intent: 'Information & Analysis',
      entities: [
        { text: 'NexaAI', category: 'ORGANIZATION', confidence: 0.98, count: 1 },
        { text: 'FastAPI', category: 'TECHNOLOGY', confidence: 0.95, count: 1 },
        { text: 'TypeScript', category: 'TECHNOLOGY', confidence: 0.92, count: 1 },
      ],
      keywords: words
        .filter((w: string) => w.length > 3)
        .slice(0, 8)
        .map((w: string, idx: number) => ({
          keyword: w.toLowerCase().replace(/[^a-z]/g, ''),
          relevance: Number((0.9 - idx * 0.08).toFixed(2)),
          frequency: 1,
          category: 'Topic',
        })),
      summary: {
        executive_summary: sentences[0] || clean,
        key_takeaways: [
          `Main concept: ${sentences[0] || 'Text analysis request'}`,
          `Word density: ${wordCount} words processed cleanly.`,
        ],
        bullet_points: sentences.slice(0, 3),
        compression_ratio: 0.45,
      },
      readability: {
        flesch_kincaid_grade: 8.2,
        flesch_reading_ease: 68.5,
        reading_level: 'Standard / Conversational',
        gunning_fog_index: 9.1,
      },
      statistics: {
        character_count: charCount,
        word_count: wordCount,
        sentence_count: sentenceCount,
        paragraph_count: Math.max(1, clean.split('\n\n').length),
        reading_time_seconds: Number(((wordCount / 200) * 60).toFixed(1)),
        speaking_time_seconds: Number(((wordCount / 130) * 60).toFixed(1)),
        unique_words_count: new Set(words.map((w: string) => w.toLowerCase())).size,
        lexical_diversity: Number((new Set(words.map((w: string) => w.toLowerCase())).size / Math.max(1, wordCount)).toFixed(2)),
      },
      safety: {
        is_safe: true,
        toxicity_score: 0.02,
        profanity_detected: false,
        sentiment_warning: false,
      },
    },
  }
}

export async function analyzeText(
  token: string | null,
  text: string,
  title?: string
): Promise<NLPAnalysisDetail> {
  if (!token) {
    return analyzeTextLocal(text, title)
  }

  const res = await fetch(`${API_BASE}/nlp/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ text, title }),
  })
  return handleJsonResponse<NLPAnalysisDetail>(res)
}

export async function fetchNlpHistory(token: string): Promise<NLPAnalysisSummary[]> {
  const res = await fetch(`${API_BASE}/nlp/history`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  return handleJsonResponse<NLPAnalysisSummary[]>(res)
}

export async function fetchNlpDetail(token: string, analysisId: string): Promise<NLPAnalysisDetail> {
  const res = await fetch(`${API_BASE}/nlp/history/${analysisId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  return handleJsonResponse<NLPAnalysisDetail>(res)
}

export async function deleteNlpAnalysisApi(token: string, analysisId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/nlp/history/${analysisId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  await handleJsonResponse<void>(res)
}
