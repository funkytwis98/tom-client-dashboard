'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

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

interface Proposal {
  id: string
  proposal_type: string
  title: string
  description: string | null
  proposed_entry: Record<string, unknown> | null
  status: string
  created_at: string
}

interface UsageEntry {
  capability: string
  estimated_cost: number
  created_at: string
}

interface LearnLoopProps {
  initialQuestions: Question[]
  kbCategories: string[]
  clientId: string
  initialProposals: Proposal[]
  usageLog: UsageEntry[]
  agentName?: string
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-4 border-l-orange-400',
  answered: 'border-l-4 border-l-green-400',
  dismissed: 'border-l-4 border-l-gray-300',
}

const ALL_CATEGORIES = ['services', 'pricing', 'faq', 'hours', 'policies', 'location', 'team', 'promotions', 'competitors']

const KB_TYPES = [
  { value: 'fact', label: 'Fact', desc: 'Business info (services, pricing, hours)' },
  { value: 'behavior', label: 'Behavior', desc: 'How to handle situations' },
  { value: 'policy', label: 'Policy', desc: 'Business rules and policies' },
] as const

type ActiveTab = 'questions' | 'proposals' | 'usage'

export function LearnLoop({ initialQuestions, kbCategories, clientId, initialProposals, usageLog, agentName = 'Your receptionist' }: LearnLoopProps) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [proposals, setProposals] = useState(initialProposals)
  const [statusFilter, setStatusFilter] = useState('all')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [addingToKbId, setAddingToKbId] = useState<string | null>(null)
  const [kbTitle, setKbTitle] = useState('')
  const [kbCategory, setKbCategory] = useState(kbCategories[0] ?? 'faq')
  const [kbType, setKbType] = useState<'fact' | 'behavior' | 'policy'>('fact')
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions')
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  const pending = questions.filter(q => q.status === 'pending').length
  const answered = questions.filter(q => q.status === 'answered').length
  const addedToKb = questions.filter(q => q.added_to_kb).length

  const filtered = statusFilter === 'all'
    ? questions
    : questions.filter(q => q.status === statusFilter)

  const categories = ALL_CATEGORIES.filter(c =>
    kbCategories.includes(c) || c === 'faq'
  )

  // Usage stats
  const usageStats = useMemo(() => {
    let totalCost = 0
    const byCap: Record<string, number> = {}
    for (const entry of usageLog) {
      totalCost += Number(entry.estimated_cost)
      byCap[entry.capability] = (byCap[entry.capability] ?? 0) + Number(entry.estimated_cost)
    }
    return { totalCost, byCap, callCount: usageLog.length }
  }, [usageLog])

  function saveAnswer(id: string) {
    if (!answerText.trim()) return
    startTransition(async () => {
      await supabase
        .from('unanswered_questions')
        .update({ answer: answerText.trim(), status: 'answered' })
        .eq('id', id)
      setQuestions(curr => curr.map(q => q.id === id ? { ...q, answer: answerText.trim(), status: 'answered' } : q))
      setAnsweringId(null)
      setAnswerText('')
    })
  }

  function dismiss(id: string) {
    startTransition(async () => {
      await supabase
        .from('unanswered_questions')
        .update({ status: 'dismissed' })
        .eq('id', id)
      setQuestions(curr => curr.map(q => q.id === id ? { ...q, status: 'dismissed' } : q))
    })
  }

  function addToKnowledgeBase(questionId: string, answerContent: string) {
    if (!kbTitle.trim()) return
    startTransition(async () => {
      const { data } = await supabase
        .from('knowledge_base')
        .insert({
          client_id: clientId,
          category: kbCategory,
          title: kbTitle.trim(),
          content: answerContent,
          priority: 0,
          is_active: true,
          type: kbType,
        })
        .select('id')
        .single()

      if (data) {
        await supabase
          .from('unanswered_questions')
          .update({ added_to_kb: true, kb_entry_id: data.id })
          .eq('id', questionId)
        setQuestions(curr => curr.map(q => q.id === questionId ? { ...q, added_to_kb: true, kb_entry_id: data.id } : q))
      }
      setAddingToKbId(null)
      setKbTitle('')
      setKbType('fact')
    })
  }

  function approveProposal(proposal: Proposal) {
    startTransition(async () => {
      const entry = proposal.proposed_entry
      if (entry) {
        await supabase
          .from('knowledge_base')
          .insert({
            client_id: clientId,
            category: (entry.category as string) ?? 'faq',
            title: proposal.title,
            content: (entry.content as string) ?? proposal.description ?? '',
            priority: 0,
            is_active: true,
            type: (entry.type as string) ?? 'fact',
          })
      }
      await supabase
        .from('learning_proposals')
        .update({ status: 'approved' })
        .eq('id', proposal.id)
      setProposals(curr => curr.filter(p => p.id !== proposal.id))
    })
  }

  function dismissProposal(proposal: Proposal) {
    startTransition(async () => {
      const hash = btoa(proposal.title).slice(0, 32)
      await supabase
        .from('learning_proposals')
        .update({ status: 'dismissed', dismissed_hash: hash })
        .eq('id', proposal.id)
      setProposals(curr => curr.filter(p => p.id !== proposal.id))
    })
  }

  const stats = [
    { label: 'Needs Answer', value: pending },
    { label: 'Answered', value: answered },
    { label: 'Added to KB', value: addedToKb },
  ]

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'answered', label: 'Answered' },
    { value: 'dismissed', label: 'Dismissed' },
  ]

  const tabs = [
    { value: 'questions' as const, label: 'Questions', count: pending },
    { value: 'proposals' as const, label: 'Learning Proposals', count: proposals.length },
    { value: 'usage' as const, label: 'Usage Stats', count: null },
  ]

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap mb-4 md:mb-6 border-b border-gray-200 pb-2">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1.5 px-3 md:px-3 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === t.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 ? (
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                activeTab === t.value ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
              }`}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Questions tab */}
      {activeTab === 'questions' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-1 flex-wrap mb-4 md:mb-6">
            <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
                  statusFilter === f.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Empty / explainer */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="text-center py-12 px-4">
                <div className="mx-auto h-12 w-12 text-gray-300">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-medium text-gray-900">No questions yet</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                  Here&apos;s how the learning loop works:
                </p>
                <div className="mt-4 text-left max-w-sm mx-auto space-y-2">
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                    <span>A caller asks something {agentName} doesn&apos;t know</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                    <span>The question appears here for you to review</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                    <span>You type the answer so {agentName} learns it</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">4</span>
                    <span>Optionally add it to the Knowledge Base</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(q => {
                const borderClass = STATUS_BORDER[q.status] ?? ''
                return (
                  <div key={q.id} className={`bg-white rounded-lg border border-gray-200 ${borderClass} p-4`}>
                    {/* Question */}
                    <p className="text-sm font-medium text-gray-900 mb-1">&ldquo;{q.question}&rdquo;</p>
                    {q.context && (
                      <p className="text-xs text-gray-500 mb-2">{q.context}</p>
                    )}
                    {q.calls && (
                      <p className="text-xs text-gray-400 mb-3">
                        From {q.calls.caller_name ?? q.calls.caller_number ?? 'Unknown caller'} &middot; {format(new Date(q.calls.created_at), 'MMM d, h:mm a')}
                      </p>
                    )}

                    {/* Pending actions */}
                    {q.status === 'pending' && (
                      <>
                        {answeringId === q.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={answerText}
                              onChange={e => setAnswerText(e.target.value)}
                              placeholder="Type your answer..."
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveAnswer(q.id)}
                                disabled={isPending || !answerText.trim()}
                                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                              >
                                Save Answer
                              </button>
                              <button
                                onClick={() => { setAnsweringId(null); setAnswerText('') }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => setAnsweringId(q.id)}
                              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
                            >
                              Answer this question &rarr;
                            </button>
                            <button
                              onClick={() => dismiss(q.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Answered */}
                    {q.status === 'answered' && q.answer && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded-md p-3">{q.answer}</p>
                        {q.added_to_kb ? (
                          <p className="mt-2 text-xs text-green-600 font-medium">Added to Knowledge Base</p>
                        ) : addingToKbId === q.id ? (
                          <div className="mt-3 space-y-2 bg-gray-50 border border-gray-200 rounded-md p-3">
                            <input
                              type="text"
                              value={kbTitle}
                              onChange={e => setKbTitle(e.target.value)}
                              placeholder="Knowledge Base entry title"
                              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <select
                              value={kbCategory}
                              onChange={e => setKbCategory(e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                              {categories.map(c => (
                                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                              ))}
                            </select>
                            {/* KB Type selector */}
                            <div className="flex items-center gap-3">
                              {KB_TYPES.map(t => (
                                <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="kbType"
                                    value={t.value}
                                    checked={kbType === t.value}
                                    onChange={() => setKbType(t.value)}
                                    className="text-gray-900 focus:ring-gray-400"
                                  />
                                  <span className="text-xs text-gray-700">{t.label}</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-[10px] text-gray-400">
                              {KB_TYPES.find(t => t.value === kbType)?.desc}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToKnowledgeBase(q.id, q.answer!)}
                                disabled={isPending || !kbTitle.trim()}
                                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                              >
                                Add to KB
                              </button>
                              <button
                                onClick={() => { setAddingToKbId(null); setKbTitle('') }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingToKbId(q.id)}
                            className="mt-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            + Add to Knowledge Base
                          </button>
                        )}
                      </div>
                    )}

                    {/* Dismissed */}
                    {q.status === 'dismissed' && (
                      <p className="mt-2 text-xs text-gray-400 italic">Dismissed</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Proposals tab */}
      {activeTab === 'proposals' && (
        <div>
          {proposals.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12 px-4">
              <h3 className="text-sm font-medium text-gray-900">No pending proposals</h3>
              <p className="mt-1 text-xs text-gray-500">
                The weekly learning pass analyzes call patterns and suggests new knowledge entries. Proposals will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map(p => (
                <div key={p.id} className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-purple-400 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded mb-1">
                        {p.proposal_type.replace('_', ' ')}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{p.title}</p>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {format(new Date(p.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => approveProposal(p)}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      Approve &amp; Add to KB
                    </button>
                    <button
                      onClick={() => dismissProposal(p)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Usage tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Monthly Cost</p>
              <p className="text-2xl font-bold text-gray-900">${usageStats.totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Interactions</p>
              <p className="text-2xl font-bold text-gray-900">{usageStats.callCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Avg Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                ${usageStats.callCount > 0 ? (usageStats.totalCost / usageStats.callCount).toFixed(3) : '0.00'}
              </p>
            </div>
          </div>
          {Object.keys(usageStats.byCap).length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Cost by Capability</p>
              <div className="space-y-2">
                {Object.entries(usageStats.byCap)
                  .toSorted(([, a], [, b]) => b - a)
                  .map(([cap, cost]) => (
                    <div key={cap} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 capitalize">{cap.replace('_', ' ')}</span>
                      <span className="font-medium text-gray-900">${cost.toFixed(3)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-8 px-4">
              <p className="text-sm text-gray-500">No usage data this month</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
