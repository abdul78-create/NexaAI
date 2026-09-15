import { AiModel, Conversation, SuggestedPrompt } from '@/types/chat'

export const AI_MODELS: AiModel[] = [
  {
    id: 'nexa-standard',
    name: 'Nexa Standard',
    tagline: 'Fast, balanced for general tasks',
    description: 'Optimal for daily conversation, quick queries, and code generation with ultra-low latency.',
    badge: 'Standard',
    speed: 'Ultra Fast',
    reasoning: 'Standard',
    contextWindow: '128K tokens',
    isAvailable: true,
  },
  {
    id: 'nexa-pro',
    name: 'Nexa Pro',
    tagline: 'Deep analysis and NLP intelligence',
    description: 'High-capability model tailored for nuanced text analysis, document extraction, and complex writing.',
    badge: 'Pro',
    speed: 'Fast',
    reasoning: 'Advanced',
    contextWindow: '200K tokens',
    isAvailable: true,
  },
  {
    id: 'nexa-reasoning',
    name: 'Nexa Reasoning',
    tagline: 'Step-by-step logic and proofs',
    description: 'Executes chain-of-thought verification for advanced mathematics, algorithms, and systems design.',
    badge: 'Reasoning',
    speed: 'Deep',
    reasoning: 'Maximum',
    contextWindow: '128K tokens',
    isAvailable: true,
  },
]

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'sentiment-analysis',
    title: 'Analyze sentiment & emotion',
    category: 'NLP Studio',
    description: 'Evaluate tone, subjective polarity, emotion distribution, and underlying customer intent.',
    prompt: 'Analyze the following user feedback: "The new platform launch exceeded expectations. The speed and visual elegance are impressive, although the onboarding documentation could be more comprehensive." Provide sentiment score, emotion breakdown, and actionable insights.',
    iconName: 'BarChart3',
  },
  {
    id: 'summarize-document',
    title: 'Summarize a complex document',
    category: 'Synthesis',
    description: 'Condense dense technical or business prose into concise, high-signal bulleted takeaways.',
    prompt: 'Please provide an executive summary of modern Retrieval-Augmented Generation (RAG) architecture, focusing on chunking strategies, vector embeddings, and re-ranking pipelines.',
    iconName: 'FileText',
  },
  {
    id: 'explain-concept',
    title: 'Explain a complex concept',
    category: 'Engineering',
    description: 'Deconstruct distributed consensus, raft algorithms, or concurrency paradigms with clear analogies.',
    prompt: 'Explain the difference between Python\'s asyncio event loop concurrency and true multiprocessing with GIL considerations. Include code examples of when to use each.',
    iconName: 'Brain',
  },
  {
    id: 'extract-information',
    title: 'Extract key information',
    category: 'Structured Data',
    description: 'Pull entities, contractual obligations, dates, and metrics into structured Markdown tables or JSON.',
    prompt: 'Extract the key obligations, SLAs, and party details from this mock clause: "NexaAI shall maintain 99.95% system uptime measured calendar-monthly, excluding scheduled maintenance windows notified 48 hours in advance. Breach remedies trigger within 30 business days." Format as a structured JSON specification.',
    iconName: 'Sparkles',
  },
]

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-fastapi-async',
    title: 'Async concurrency with FastAPI & asyncio',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    modelId: 'nexa-standard',
    group: 'Today',
    pinned: true,
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'How should I structure concurrent API calls in FastAPI using asyncio without blocking the event loop?',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        status: 'done',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        model: 'Nexa Standard',
        createdAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
        status: 'done',
        tokens: 342,
        content: `To execute concurrent operations cleanly in FastAPI without choking the event loop, use **\`asyncio.gather\`** or Python 3.11+ **\`asyncio.TaskGroup\`** with an asynchronous HTTP client like \`httpx.AsyncClient\`.

### Recommended Pattern: Async TaskGroup

\`\`\`python
import asyncio
import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI(title="NexaAI Concurrent Pipeline")

async def fetch_service_data(client: httpx.AsyncClient, url: str) -> dict:
    response = await client.get(url, timeout=5.0)
    response.raise_for_status()
    return response.json()

@app.get("/aggregate")
async def aggregate_metrics():
    urls = [
        "https://api.example.com/nlp/sentiment",
        "https://api.example.com/nlp/entities",
        "https://api.example.com/vector/stats",
    ]
    
    async with httpx.AsyncClient() as client:
        try:
            async with asyncio.TaskGroup() as tg:
                tasks = [tg.create_task(fetch_service_data(client, url)) for url in urls]
        except* httpx.HTTPError as exc_group:
            raise HTTPException(status_code=502, detail=f"Upstream failures: {exc_group.exceptions}")
            
    return {"results": [t.result() for t in tasks]}
\`\`\`

### Key Architectural Guidelines:
1. **Never call synchronous blocking I/O** (e.g. \`requests.get\` or \`time.sleep\`) inside async routes. If needed, offload them using \`asyncio.to_thread(sync_func)\`.
2. **Reuse HTTP Client connections**: instantiate \`httpx.AsyncClient\` in a FastAPI \`lifespan\` context rather than instantiating per-request.
3. **Handle partial failures**: \`asyncio.TaskGroup\` guarantees that all child tasks are cancelled cleanly if one throws.`,
      },
    ],
  },
  {
    id: 'conv-sentiment-matrix',
    title: 'Customer sentiment & emotion matrix',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    modelId: 'nexa-pro',
    group: 'Yesterday',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Compare rule-based sentiment analyzers (like VADER) versus modern transformer embeddings for multi-language customer sentiment scoring.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        status: 'done',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        model: 'Nexa Pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
        status: 'done',
        tokens: 418,
        content: `Here is an architectural comparison between rule-based analyzers and transformer embeddings for sentiment scoring:

| Feature | VADER / Lexicon Rules | Transformer Embeddings (e.g. RoBERTa) |
|---|---|---|
| **Latency** | < 1ms per document | 15–40ms (CPU) / 3–8ms (GPU) |
| **Sarcasm & Nuance** | Poor (heuristic only) | High contextual comprehension |
| **Multilingual** | English predominantly | Native multilingual support (XLM-R) |
| **Resource Footprint** | Extremely lightweight (~5MB) | Heavy (250MB–1.2GB model weights) |
| **Domain Adaptation** | Manual lexicon tuning required | Fine-tunable with small labeled dataset |

### Hybrid Pipeline Recommendation

For high-throughput SaaS platforms, implement a **two-tier cascade**:
- **Tier 1 (Fast Filter)**: Run high-confidence lexicon screening on raw feedback.
- **Tier 2 (Deep Transformer)**: Route ambiguous or mixed polarity text (compound score between -0.3 and +0.3) to fine-tuned transformer models for nuanced evaluation.`,
      },
    ],
  },
  {
    id: 'conv-rag-architecture',
    title: 'Vector embeddings & pgvector pipeline',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    modelId: 'nexa-reasoning',
    group: 'Previous 7 Days',
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'What is the optimal chunking strategy and index type for 50,000 PDF documents in PostgreSQL with pgvector?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        status: 'done',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        model: 'Nexa Reasoning',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4 + 1000 * 2).toISOString(),
        status: 'done',
        tokens: 380,
        content: `For **50,000 documents** (~500,000 to 1,500,000 text chunks) in PostgreSQL using \`pgvector\`, here is the optimal production design:

### 1. Chunking Strategy
- **Chunk Size**: 512 tokens with a **64-token overlap** (using \`RecursiveCharacterTextSplitter\` with markdown and paragraph delimiters).
- **Metadata Tagging**: Attach \`document_id\`, \`page_number\`, \`section_heading\`, and \`created_at\` to every vector row to allow pre-filtered vector queries.

### 2. Index Selection: HNSW vs IVFFlat

For dataset sizes between 100K and 5M vectors, **HNSW (Hierarchical Navigable Small World)** is superior to IVFFlat:

\`\`\`sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table schema
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- High-recall HNSW index with cosine distance
CREATE INDEX idx_embeddings_hnsw ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
\`\`\`

> **Key Rule**: HNSW builds index graph structures in memory with no training step, providing 98%+ recall with under 10ms query times.`,
      },
    ],
  },
]

/**
 * Intelligent local response simulator.
 * Returns contextual responses formatted as Markdown.
 */
export function generateMockAiResponse(prompt: string, modelId: string): string {
  const p = prompt.toLowerCase()
  const model = AI_MODELS.find((m) => m.id === modelId) || AI_MODELS[0]

  if (p.includes('sentiment') || p.includes('emotion') || p.includes('feedback')) {
    return `### Sentiment & Emotion Analysis

Here is the breakdown of the evaluated text using **${model.name}**:

| Metric | Score | Assessment |
|---|---|---|
| **Overall Sentiment** | **+0.84** | Strongly Positive |
| **Subjectivity** | **0.62** | Moderately Objective |
| **Dominant Emotion** | **Joy / Satisfaction (78%)** | Positive Reception |
| **Readability Level** | **Grade 8.4** | Accessible & Clear |

#### Key Observations
1. **Praise for Core Attributes**: High appreciation for system responsiveness and aesthetic polish.
2. **Actionable Constructive Note**: The onboarding flow is identified as an area for clearer contextual documentation.
3. **Recommended Next Step**: Trigger an automated follow-up offering the documentation cheat sheet.`;
  }

  if (p.includes('summar') || p.includes('condense') || p.includes('overview') || p.includes('rag')) {
    return `### Executive Summary: Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation connects generative language models to external, verified knowledge repositories to eliminate hallucinations and support domain-specific intelligence.

#### Key Architectural Pillars
- **Ingestion & Semantic Chunking**: Documents are parsed, split into coherent semantic units (300–600 tokens), and enriched with metadata.
- **Dense Embedding Generation**: Text chunks are projected into continuous vector space (e.g. 1536 dimensions).
- **Hybrid Retrieval**: Combining dense vector search (semantic similarity) with sparse BM25 retrieval (exact keyword matching).
- **Re-Ranking Filter**: Cross-encoder re-ranking narrows retrieved candidate chunks from Top 20 to Top 5 most relevant contexts.
- **Grounded Prompt Synthesis**: The LLM generates answers citing verified source excerpts with zero temperature drift.`;
  }

  if (p.includes('code') || p.includes('python') || p.includes('function') || p.includes('typescript') || p.includes('api')) {
    return `Here is a clean, production-grade implementation addressing your request:

\`\`\`typescript
interface StreamChunk {
  id: string
  delta: string
  finishReason?: 'stop' | 'length' | null
}

export async function* consumeServerStream(
  endpoint: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(\`Stream request failed with status: \${response.status}\`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(':')) continue
      if (trimmed === 'data: [DONE]') return

      if (trimmed.startsWith('data: ')) {
        const json: StreamChunk = JSON.parse(trimmed.slice(6))
        yield json.delta
      }
    }
  }
}
\`\`\`

### Highlights
- Handles line chunk fragmentation safely across TCP boundaries.
- Adheres to standard Server-Sent Events (SSE) specifications.
- Supports caller cancellation via \`AbortSignal\`.`;
  }

  if (p.includes('extract') || p.includes('json') || p.includes('schema') || p.includes('table')) {
    return `### Structured Extraction Specification

\`\`\`json
{
  "contract_spec": {
    "provider": "NexaAI Systems Inc.",
    "service_level_agreement": {
      "target_uptime_percentage": 99.95,
      "measurement_period": "calendar-month",
      "maintenance_window": {
        "advance_notice_hours": 48,
        "is_excluded_from_sla": true
      },
      "remedy_period_days": 30
    },
    "compliance_status": "APPROVED",
    "verified_timestamp": "${new Date().toISOString()}"
  }
}
\`\`\`

All requested entity specifications, contractual percentages, and conditional maintenance windows have been mapped into typed JSON keys.`;
  }

  // Default response
  return `### Analysis & Solution

Thank you for your prompt. Here is a structured response processed by **${model.name}**:

1. **Context & Objective**: Your inquiry centers on effectively implementing and understanding this workflow within modern AI systems.
2. **Recommended Approach**:
   - **Deconstruct Requirements**: Isolate data models, business logic constraints, and interfaces.
   - **Implement with Modularity**: Separate state orchestration from presentation components.
   - **Optimize for Performance**: Leverage streaming responses, client-side caching, and accessible UI patterns.

\`\`\`bash
# Example NexaAI CLI execution
nexa-cli analyze --model "${model.id}" --stream true
\`\`\`

*Note: This is simulated client-side streaming response using the ${model.name} preset. When backend integration is established in Phase 4, live endpoints will power real-time inference.*`;
}
