'use client'

import React, { useState, useEffect } from 'react'
import {
  FlaskConical,
  History,
  LayoutDashboard,
  Smile,
  Tag,
  Key,
  FileText,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
  analyzeText,
  deleteNlpAnalysisApi,
  fetchNlpDetail,
  fetchNlpHistory,
  NLPAnalysisDetail,
  NLPAnalysisSummary,
} from '@/lib/nlp-api'
import { AnalysisInput } from '@/components/nlp/AnalysisInput'
import { SentimentCard } from '@/components/nlp/SentimentCard'
import { EntityPanel } from '@/components/nlp/EntityPanel'
import { KeywordCloud } from '@/components/nlp/KeywordCloud'
import { TextStatistics } from '@/components/nlp/TextStatistics'
import { SummaryPanel } from '@/components/nlp/SummaryPanel'
import { AnalysisHistory } from '@/components/nlp/AnalysisHistory'
import { cn } from '@/lib/utils'

type TabType = 'overview' | 'sentiment' | 'entities' | 'keywords' | 'summary' | 'statistics'

export function NlpWorkspace() {
  const { token, isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<NLPAnalysisDetail | null>(null)
  const [history, setHistory] = useState<NLPAnalysisSummary[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load history on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadHistory()
    }
  }, [isAuthenticated, token])

  const loadHistory = async () => {
    if (!token) return
    try {
      const items = await fetchNlpHistory(token)
      setHistory(items)
    } catch {
      // Ignore
    }
  }

  const handleAnalyze = async (text: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const report = await analyzeText(token, text)
      setCurrentAnalysis(report)
      setActiveTab('overview')
      if (isAuthenticated && token) {
        await loadHistory()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectHistoryReport = async (id: string) => {
    if (!token) return
    setIsLoading(true)
    try {
      const detail = await fetchNlpDetail(token, id)
      setCurrentAnalysis(detail)
      setActiveTab('overview')
    } catch {
      setError('Failed to load analysis report detail.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteHistoryReport = async (id: string) => {
    if (!token) return
    try {
      await deleteNlpAnalysisApi(token, id)
      setHistory((prev) => prev.filter((item) => item.id !== id))
      if (currentAnalysis?.id === id) {
        setCurrentAnalysis(null)
      }
    } catch {
      // Ignore
    }
  }

  const result = currentAnalysis?.result

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-4 md:p-6 lg:p-8 space-y-6 scrollbar-thin">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg">
            <FlaskConical className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">NLP Analysis Studio</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/15 text-brand border border-brand/20 font-bold">
                Phase 7 Engine
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-dimensional sentiment, entity extraction, readability scoring, & summarization
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-all shadow-sm"
          >
            <History className="size-4 text-brand" />
            <span>Analysis History ({history.length})</span>
          </button>
        )}
      </div>

      {/* Input Section */}
      <AnalysisInput onAnalyze={handleAnalyze} isLoading={isLoading} />

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Analysis Results Section */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'sentiment', label: 'Sentiment & Emotion', icon: Smile },
                { id: 'entities', label: 'Entities (NER)', icon: Tag },
                { id: 'keywords', label: 'Keywords', icon: Key },
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'statistics', label: 'Readability & Stats', icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      isActive
                        ? 'bg-brand/15 text-brand border-brand/30 shadow-sm font-semibold'
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Processed {result.statistics.word_count} words</span>
            </div>
          </div>

          {/* Active Tab View */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <SentimentCard sentiment={result.sentiment} emotions={result.emotions} intent={result.intent} />
              <EntityPanel entities={result.entities} />
              <KeywordCloud keywords={result.keywords} />
              <SummaryPanel summary={result.summary} originalText={currentAnalysis.original_text} />
              <TextStatistics statistics={result.statistics} readability={result.readability} safety={result.safety} />
            </div>
          )}

          {activeTab === 'sentiment' && (
            <SentimentCard sentiment={result.sentiment} emotions={result.emotions} intent={result.intent} />
          )}

          {activeTab === 'entities' && <EntityPanel entities={result.entities} />}

          {activeTab === 'keywords' && <KeywordCloud keywords={result.keywords} />}

          {activeTab === 'summary' && (
            <SummaryPanel summary={result.summary} originalText={currentAnalysis.original_text} />
          )}

          {activeTab === 'statistics' && (
            <TextStatistics statistics={result.statistics} readability={result.readability} safety={result.safety} />
          )}
        </div>
      )}

      {/* History Drawer Modal */}
      <AnalysisHistory
        history={history}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectHistoryReport}
        onDelete={handleDeleteHistoryReport}
      />
    </div>
  )
}
