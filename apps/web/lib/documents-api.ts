/**
 * NexaAI Document Intelligence & RAG API Client
 * Communication with FastAPI backend document upload, vector search, & RAG Q&A endpoints.
 */

import { getApiBaseUrl } from './api-config'

const API_BASE = getApiBaseUrl()

export interface DocumentChunkItem {
  id: string
  chunk_index: number
  content: string
  page_number: number
}

export interface DocumentItem {
  id: string
  user_id: string
  filename: string
  file_type: string
  file_size: number
  status: 'processing' | 'indexed' | 'failed'
  error_message?: string | null
  chunk_count: number
  created_at: string
}

export interface DocumentDetail extends DocumentItem {
  chunks: DocumentChunkItem[]
}

export interface SearchResultChunk {
  chunk_id: string
  document_id: string
  filename: string
  chunk_index: number
  content: string
  page_number: number
  similarity_score: number
}

export interface RAGCitation {
  citation_id: number
  document_id: string
  filename: string
  page_number: number
  excerpt: string
  relevance_score: number
}

export interface RAGQueryResponse {
  query: string
  answer: string
  citations: RAGCitation[]
  retrieved_chunks_count: number
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

export async function uploadDocumentApi(token: string | null, file: File): Promise<DocumentItem> {
  if (!token) {
    // Guest mode fallback
    return {
      id: `guest-doc-${Date.now()}`,
      user_id: 'guest',
      filename: file.name,
      file_type: file.name.split('.').pop()?.toUpperCase() || 'TXT',
      file_size: file.size,
      status: 'indexed',
      chunk_count: Math.max(1, Math.floor(file.size / 500)),
      created_at: new Date().toISOString(),
    }
  }

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
    body: formData,
  })
  return handleJsonResponse<DocumentItem>(res)
}

export async function fetchDocuments(token: string): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  return handleJsonResponse<DocumentItem[]>(res)
}

export async function fetchDocumentDetail(token: string, documentId: string): Promise<DocumentDetail> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  return handleJsonResponse<DocumentDetail>(res)
}

export async function deleteDocumentApi(token: string, documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  })
  await handleJsonResponse<void>(res)
}

export async function searchDocumentsApi(
  token: string | null,
  query: string,
  topK: number = 4
): Promise<SearchResultChunk[]> {
  if (!token) {
    return [
      {
        chunk_id: 'chk-guest-1',
        document_id: 'doc-guest-sample-1',
        filename: 'NexaAI_Architecture_Guide.pdf',
        chunk_index: 0,
        content: `NexaAI Phase 8 architecture uses sentence-aware chunking and vector similarity retrieval for query '${query}'.`,
        page_number: 1,
        similarity_score: 0.94,
      },
    ]
  }

  const res = await fetch(`${API_BASE}/documents/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ query, top_k: topK }),
  })
  return handleJsonResponse<SearchResultChunk[]>(res)
}

export async function queryRagApi(
  token: string | null,
  question: string,
  topK: number = 4
): Promise<RAGQueryResponse> {
  if (!token) {
    return {
      query: question,
      answer: `Based on your uploaded documents [Source 1], NexaAI utilizes PostgreSQL/SQLite vector indexing and grounded context generation for question: "${question}".`,
      retrieved_chunks_count: 1,
      citations: [
        {
          citation_id: 1,
          document_id: 'doc-guest-sample-1',
          filename: 'NexaAI_Architecture_Guide.pdf',
          page_number: 1,
          excerpt: 'NexaAI Phase 8 architecture uses sentence-aware chunking and vector similarity retrieval.',
          relevance_score: 0.94,
        },
      ],
    }
  }

  const res = await fetch(`${API_BASE}/documents/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ question, top_k: topK }),
  })
  return handleJsonResponse<RAGQueryResponse>(res)
}
