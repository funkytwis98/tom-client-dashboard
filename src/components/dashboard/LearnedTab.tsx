'use client'

import { useState, useTransition, useCallback } from 'react'
import { useToast } from '@/components/dashboard/Toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Proposal {
  id: string
  client_id: string
  proposal_type: string
  title: string
  description: string | null
  proposed_entry: Record<string, unknown> | null
  source_reflection_ids: string[] | null
  status: string
  dismissed_hash: string | null
  reviewed_at: string | null
  created_at: string
}

interface Question {
  id: string
  question: string
  context: string | null
  status: string
  answer: string | null
  added_to_kb: boolean
  kb_entry_id: string | null
  call_id: string | null
  created_at: string
  calls?: { caller_name: string | null; caller_number: string | null; created_at: string } | null
}

interface Reflection {
  id: string
  capability: string
  confidence_score: number | null
  pattern_noticed: string | null
  interaction_summary: string | null
  caller_sentiment: string | null
  created_at: string
}

type SectionTab = 'gaps' | 'patterns' | 'suggestions' | 'unanswered'

interface AddressedItem {
  id: string
  title: string
  proposal_type: string
  reviewed_at: string | null
}

interface LearnedTabProps {
  agentName: string
  initialGaps: Proposal[]
  initialSuggestions: Proposal[]
  initialQuestions: Question[]
  initialPatterns: Reflection[]
  initialAddressed?: AddressedItem[]
}

// ---------------------------------------------------------------------------
// Section colors
// ---------------------------------------------------------------------------

const SECTION_COLORS: Record<SectionTab, string> = {
  gaps: '#f59e0b',
  patterns: '#3b82f6',
  suggestions: '#22c55e',
  unanswered: '#8b5cf6',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LearnedTab({
  agentName,
  initialGaps,
  initialSuggestions,
  initialQuestions,
  initialPatterns,
  initialAddressed = [],
}: LearnedTabProps) {
  const [gaps, setGaps] = useState(initialGaps)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [questions, setQuestions] = useState(initialQuestions)
  const [patterns] = useState(initialPatterns)
  const [activeTab, setActiveTab] = useState<SectionTab>('gaps')
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({})

  const pendingGaps = gaps.filter(g => g.status === 'pending')
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
  const pendingQuestions = questions.filter(q => q.status === 'pending')
  const approvedGaps = gaps.filter(g => g.status === 'approved')

  const setAnswer = useCallback((id: string, text: string) => {
    setAnswerTexts(curr => ({ ...curr, [id]: text }))
  }, [])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function generateInsights() {
    setIsGenerating(true)
    startTransition(async () => {
      try {
        // Run cleanup and generate in parallel
        const [cleanupRes, genRes] = await Promise.all([
          fetch('/api/learned/cleanup-stale', { method: 'POST' }),
          fetch('/api/learned/generate-proposals', { method: 'POST' }),
        ])
        const cleanupData = cleanupRes.ok ? await cleanupRes.json() : null
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error)

        const cleaned = (cleanupData?.proposalsCleaned ?? 0) + (cleanupData?.questionsCleaned ?? 0)
        const parts = []
        if (genData.reflections_processed) parts.push(`${genData.reflections_processed} reflections processed`)
        if (genData.proposals) parts.push(`${genData.proposals} new insights`)
        if (cleaned > 0) parts.push(`${cleaned} auto-resolved`)
        showToast(parts.length > 0 ? parts.join(', ') : 'All up to date', 'success')
        router.refresh()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to generate insights', 'error')
      } finally {
        setIsGenerating(false)
      }
    })
  }

  function approveGap(proposal: Proposal, answer: string) {
    if (!answer.trim()) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/learned/proposals/${proposal.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: answer.trim() }),
        })
        if (!res.ok) throw new Error('Failed to approve')
        setGaps(curr => curr.map(g => g.id === proposal.id ? { ...g, status: 'approved' } : g))
        setAnswerTexts(curr => {
          const next = { ...curr }
          delete next[proposal.id]
          return next
        })
        showToast('Added to Knowledge Base', 'success')
      } catch {
        showToast('Failed to add to Knowledge Base', 'error')
      }
    })
  }

  function dismissProposal(id: string, type: 'gap' | 'suggestion') {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/learned/proposals/${id}/dismiss`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to dismiss')
        if (type === 'gap') {
          setGaps(curr => curr.filter(g => g.id !== id))
        } else {
          setSuggestions(curr => curr.filter(s => s.id !== id))
        }
      } catch {
        showToast('Failed to dismiss', 'error')
      }
    })
  }

  function approveSuggestion(proposal: Proposal) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/learned/proposals/${proposal.id}/approve`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to approve')
        setSuggestions(curr => curr.filter(s => s.id !== proposal.id))
        showToast('Added to Knowledge Base', 'success')
      } catch {
        showToast('Failed to approve suggestion', 'error')
      }
    })
  }

  function answerQuestion(id: string) {
    const answer = answerTexts[id]?.trim()
    if (!answer) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/learned/questions/${id}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        })
        if (!res.ok) throw new Error('Failed to answer')
        setQuestions(curr => curr.map(q => q.id === id ? { ...q, status: 'answered', answer, added_to_kb: true } : q))
        setAnswerTexts(curr => {
          const next = { ...curr }
          delete next[id]
          return next
        })
        showToast('Added as FAQ', 'success')
      } catch {
        showToast('Failed to add FAQ', 'error')
      }
    })
  }

  function dismissQuestion(id: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/learned/questions/${id}/dismiss`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to dismiss')
        setQuestions(curr => curr.filter(q => q.id !== id))
      } catch {
        showToast('Failed to dismiss', 'error')
      }
    })
  }

  // -------------------------------------------------------------------------
  // Tabs config
  // -------------------------------------------------------------------------

  const tabs: { key: SectionTab; label: string; count: number }[] = [
    { key: 'gaps', label: 'Knowledge Gaps', count: pendingGaps.length },
    { key: 'patterns', label: 'Patterns', count: patterns.length },
    { key: 'suggestions', label: 'Suggestions', count: pendingSuggestions.length },
    { key: 'unanswered', label: 'Unanswered', count: pendingQuestions.length },
  ]

  const sectionSummaries: Record<SectionTab, string> = {
    gaps: pendingGaps.length > 0
      ? `${pendingGaps.length} gap${pendingGaps.length !== 1 ? 's' : ''} found \u2014 ${agentName} needs your help with these`
      : `No gaps right now \u2014 ${agentName} is handling calls well`,
    patterns: patterns.length > 0
      ? `${patterns.length} pattern${patterns.length !== 1 ? 's' : ''} noticed across your calls`
      : `No patterns yet \u2014 they\u2019ll appear as ${agentName} handles more calls`,
    suggestions: pendingSuggestions.length > 0
      ? `${pendingSuggestions.length} way${pendingSuggestions.length !== 1 ? 's' : ''} to make ${agentName} smarter`
      : `No suggestions yet \u2014 ${agentName} will suggest improvements based on call patterns`,
    unanswered: pendingQuestions.length > 0
      ? `${pendingQuestions.length} question${pendingQuestions.length !== 1 ? 's' : ''} callers asked that ${agentName} couldn\u2019t answer`
      : `No unanswered questions \u2014 ${agentName} has been covering everything`,
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Learned</h1>
          <p className="text-sm text-[#777] mt-1">
            What {agentName} is learning from your calls. Review and approve to make {agentName} smarter.
          </p>
        </div>
        <button
          onClick={generateInsights}
          disabled={isPending || isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111] bg-white border border-[#e5e7eb] rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          <div className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}>
            <RefreshIcon />
          </div>
          Refresh Insights
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-[#111] text-white'
                : 'bg-white text-[#666] border border-[#e5e7eb] hover:border-[#ccc]'
            }`}
          >
            {t.label}
            {t.count > 0 ? (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                activeTab === t.key ? 'bg-white/20 text-white' : 'bg-[#FFD700] text-[#111]'
              }`}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Section Summary */}
      <p className="text-[13px] text-[#999] mb-5">{sectionSummaries[activeTab]}</p>

      {/* Section: Knowledge Gaps */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {pendingGaps.length === 0 && approvedGaps.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              message={`${agentName} hasn't identified any knowledge gaps yet. They'll appear here after calls where ${agentName} couldn't answer something.`}
            />
          ) : (
            <>
              {pendingGaps.map(gap => (
                <div key={gap.id} className="bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex">
                  <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: SECTION_COLORS.gaps }} />
                  <div className="p-[20px_24px] flex-1">
                    <p className="text-[16px] font-bold text-[#111] mb-1">{gap.title}</p>
                    {gap.description && (
                      <p className="text-[14px] text-[#666] mb-2">
                        A caller needed help with this but {agentName} didn&apos;t have the information.
                      </p>
                    )}
                    <p className="text-[13px] text-[#dc2626] italic mb-3">
                      Without this, {agentName} has to tell callers to call back &mdash; which loses leads.
                    </p>
                    <textarea
                      value={answerTexts[gap.id] ?? ''}
                      onChange={e => setAnswer(gap.id, e.target.value)}
                      placeholder={`e.g., Brake pad replacement: $150-$300 depending on vehicle`}
                      rows={2}
                      className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700] resize-none"
                    />
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => approveGap(gap, answerTexts[gap.id] ?? '')}
                        disabled={isPending || !(answerTexts[gap.id] ?? '').trim()}
                        className="px-4 py-2 bg-[#FFD700] text-[#111] text-sm font-medium rounded-lg hover:bg-[#e6c200] disabled:opacity-40 transition-colors"
                      >
                        Add to Knowledge Base
                      </button>
                      <button
                        onClick={() => dismissProposal(gap.id, 'gap')}
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {approvedGaps.length > 0 && (
                <RecentlyAdded items={approvedGaps} />
              )}

              {initialAddressed.length > 0 && (
                <AlreadyAddressed items={initialAddressed} />
              )}
            </>
          )}
        </div>
      )}

      {/* Section: Patterns & Insights */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <EmptyState
              icon={<TrendingIcon />}
              message={`No patterns noticed yet. As ${agentName} handles more calls, patterns about your customers will appear here.`}
            />
          ) : (
            patterns.map(p => (
              <div key={p.id} className="bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex">
                <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: SECTION_COLORS.patterns }} />
                <div className="p-[20px_24px] flex-1">
                  <p className="text-[14px] text-[#333] leading-relaxed">{p.pattern_noticed}</p>
                  <p className="text-[12px] text-[#999] mt-2">
                    {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Section: Suggestions */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {pendingSuggestions.length === 0 ? (
            <EmptyState
              icon={<LightbulbIcon />}
              message={`No suggestions yet. ${agentName} will suggest knowledge base additions based on call patterns.`}
            />
          ) : (
            pendingSuggestions.map(s => {
              const entry = s.proposed_entry ?? {}
              const beforeExample = (entry.before_example as string) ||
                `I don't have that information right now. Let me have someone get back to you.`
              const afterExample = (entry.after_example as string) ||
                (entry.content ? `Based on what I know, ${(entry.content as string).toLowerCase()}. Would you like to schedule a time to come in?` : null)
              const entryTitle = (entry.title as string) ?? s.title
              const entryContent = entry.content as string | undefined
              const entryCategory = (entry.category as string) ?? 'General'

              return (
                <div key={s.id} className="bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex">
                  <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: SECTION_COLORS.suggestions }} />
                  <div className="p-[20px_24px] flex-1">
                    <p className="text-[16px] font-bold text-[#111] mb-1">{s.title}</p>
                    {s.description && (
                      <p className="text-[14px] text-[#666] mb-3">{s.description}</p>
                    )}

                    {/* Before / After */}
                    {afterExample && (
                      <div className="rounded-lg border border-[#e5e7eb] overflow-hidden mb-3">
                        <div className="grid grid-cols-2">
                          <div className="p-3 bg-[#fef2f2]">
                            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">
                              What {agentName} says now
                            </p>
                            <p className="text-[13px] text-[#666] italic leading-relaxed">
                              &ldquo;{beforeExample}&rdquo;
                            </p>
                          </div>
                          <div className="p-3 bg-[#f0fdf4] border-l border-[#e5e7eb]">
                            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1.5">
                              What {agentName} would say
                            </p>
                            <p className="text-[13px] text-[#333] italic leading-relaxed">
                              &ldquo;{afterExample}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Proposed KB entry */}
                    {entryContent && (
                      <p className="text-[12px] text-[#999] mb-3">
                        Will add to: {entryCategory} &rarr; &ldquo;{entryTitle}: {entryContent}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => approveSuggestion(s)}
                        disabled={isPending}
                        className="px-4 py-2 bg-[#FFD700] text-[#111] text-sm font-medium rounded-lg hover:bg-[#e6c200] disabled:opacity-40 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => dismissProposal(s.id, 'suggestion')}
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Section: Unanswered Questions */}
      {activeTab === 'unanswered' && (
        <div className="space-y-4">
          {pendingQuestions.length === 0 ? (
            <EmptyState
              icon={<QuestionIcon />}
              message={`No unanswered questions yet. Questions callers ask that ${agentName} can't answer will appear here.`}
            />
          ) : (
            pendingQuestions.map(q => (
              <div key={q.id} className="bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex">
                <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: SECTION_COLORS.unanswered }} />
                <div className="p-[20px_24px] flex-1">
                  <p className="text-[16px] font-bold text-[#111] mb-1">&ldquo;{q.question}&rdquo;</p>
                  {q.context && (
                    <p className="text-[14px] text-[#666] mb-2">{q.context}</p>
                  )}
                  {q.calls && (
                    <p className="text-[12px] text-[#999] mb-3">
                      Asked during a call on {format(new Date(q.calls.created_at), 'MMM d')}
                      {q.calls.caller_name ? ` with ${q.calls.caller_name}` : ''}
                    </p>
                  )}
                  <textarea
                    value={answerTexts[q.id] ?? ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Type the answer and it will be added as a FAQ..."
                    rows={2}
                    className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700] resize-none"
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => answerQuestion(q.id)}
                      disabled={isPending || !(answerTexts[q.id] ?? '').trim()}
                      className="px-4 py-2 bg-[#FFD700] text-[#111] text-sm font-medium rounded-lg hover:bg-[#e6c200] disabled:opacity-40 transition-colors"
                    >
                      Add as FAQ
                    </button>
                    <button
                      onClick={() => dismissQuestion(q.id)}
                      disabled={isPending}
                      className="px-4 py-2 text-sm font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e5e7eb] p-[22px_24px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center py-16">
      <div className="mx-auto w-12 h-12 text-[#ccc] mb-4">{icon}</div>
      <p className="text-sm text-[#999] max-w-md mx-auto">{message}</p>
    </div>
  )
}

function RecentlyAdded({ items }: { items: Proposal[] }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#999] hover:text-[#666] transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Recently Added ({items.length})
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-800">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlreadyAddressed({ items }: { items: AddressedItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#999] hover:text-[#666] transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Already in Knowledge Base ({items.length})
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-emerald-700">{item.title}</span>
              <span className="text-xs text-emerald-400 ml-auto">auto-resolved</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function TrendingIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function QuestionIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
