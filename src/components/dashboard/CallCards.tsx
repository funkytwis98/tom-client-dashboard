'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { markCallbackDone } from '@/app/actions/calls'
import { useToast } from '@/components/dashboard/Toast'
import { Phone, AlertTriangle, Search, Play, Pause, Trash2 } from 'lucide-react'
import type { Call } from '@/types/domain'

type FilterType = 'all' | 'needs_callback' | 'positive' | 'negative'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const styles: Record<string, string> = {
    positive: 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]',
    neutral: 'bg-[#f5f5f4] text-[#57534e] border border-[#d6d3d1]',
    negative: 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[sentiment] ?? styles.neutral}`}>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  )
}

function CallbackBadge({ promised, completed }: { promised: boolean; completed: boolean }) {
  if (!promised) return null
  if (completed) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
        Called back
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a] animate-pulse">
      <AlertTriangle size={11} />
      Callback requested
    </span>
  )
}

function LeadScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null
  const pct = (score / 10) * 100
  const color = score >= 7 ? '#22c55e' : score >= 4 ? '#eab308' : '#ef4444'
  const label = score >= 7 ? 'Hot' : score >= 4 ? 'Warm' : 'Cold'
  return (
    <div className="flex items-center gap-2">
      <div className="w-[60px] h-[6px] rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-medium" style={{ color }}>{label}</span>
    </div>
  )
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
  }, [playing])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * duration
  }, [duration])

  return (
    <div className="flex items-center gap-2.5 mt-3" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration)
        }}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
      />
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
        style={{ backgroundColor: '#f0f0f0', color: '#333' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
      >
        {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
      </button>
      <div
        className="flex-1 h-1 rounded-full cursor-pointer"
        style={{ backgroundColor: '#e5e7eb' }}
        onClick={handleProgressClick}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
            backgroundColor: '#FFD700',
          }}
        />
      </div>
      <span className="text-[12px] shrink-0" style={{ color: '#999' }}>
        {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
      </span>
    </div>
  )
}

function hasValidRecording(url: string | null): boolean {
  return !!url && !url.includes('example.com')
}

function ConfirmDialog({
  onCancel,
  onConfirm,
  deleting,
}: {
  onCancel: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white"
        style={{ maxWidth: 400, padding: 24, borderRadius: 14 }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[16px] font-bold" style={{ color: '#111' }}>Delete this call?</p>
        <p className="text-[14px] mt-2" style={{ color: '#666' }}>
          This will also remove the associated lead. This action can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2.5 mt-5">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="text-[13px] font-medium transition-colors"
            style={{ backgroundColor: '#f0f0f0', color: '#333', padding: '10px 20px', borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#dc2626', padding: '10px 20px', borderRadius: 8 }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function parseTranscript(transcript: string | null, agentName: string): { speaker: string; text: string }[] {
  if (!transcript) return []
  const lines = transcript.split('\n').filter(l => l.trim())
  const parsed: { speaker: string; text: string }[] = []
  for (const line of lines) {
    const match = line.match(/^(Agent|Caller|Customer|User|AI|Tom|Assistant|Bot)\s*:\s*(.+)/i)
    if (match) {
      const speaker = ['agent', 'ai', 'tom', 'assistant', 'bot'].includes(match[1].toLowerCase()) ? agentName : 'Caller'
      parsed.push({ speaker, text: match[2].trim() })
    } else {
      parsed.push({ speaker: 'Caller', text: line.trim() })
    }
  }
  return parsed
}

function CallCard({
  call,
  clientId,
  agentName,
  onDeleted,
}: {
  call: Call
  clientId: string
  agentName: string
  onDeleted: (callId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const { showToast } = useToast()
  const hasPendingCallback = call.callback_promised && !call.callback_completed
  const transcriptLines = useMemo(() => parseTranscript(call.transcript, agentName), [call.transcript, agentName])

  async function handleMarkDone(e: React.MouseEvent) {
    e.stopPropagation()
    setMarkingDone(true)
    try {
      await markCallbackDone(call.id, clientId)
    } catch {
      // silently fail
    }
    setMarkingDone(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/calls/${call.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowConfirm(false)
        setFadeOut(true)
        setTimeout(() => onDeleted(call.id), 300)
        showToast('Call deleted', 'success')
      } else {
        showToast('Failed to delete call', 'error')
        setDeleting(false)
      }
    } catch {
      showToast('Failed to delete call', 'error')
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="bg-white cursor-pointer px-4 py-4 md:px-6 md:py-5"
        style={{
          borderRadius: 14,
          border: hasPendingCallback ? '1px solid #fde68a' : '1px solid #e5e7eb',
          boxShadow: expanded ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
          opacity: fadeOut ? 0 : 1,
          transform: fadeOut ? 'scale(0.97)' : 'scale(1)',
          transition: 'opacity 0.3s, transform 0.3s, box-shadow 0.2s',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[17px] font-bold text-[#111] truncate">
                {call.caller_name ?? 'Unknown Caller'}
              </span>
              <SentimentBadge sentiment={call.sentiment} />
              <CallbackBadge promised={call.callback_promised} completed={call.callback_completed} />
            </div>
            <p className="text-[13px] text-[#888] mt-0.5">{call.caller_number ?? 'No number'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[13px] font-semibold text-[#555]">{formatDuration(call.duration_seconds)}</p>
            <p className="text-[12px] text-[#aaa] mt-0.5">{formatDate(call.created_at)}</p>
            <p className="text-[12px] text-[#aaa]">{formatTime(call.created_at)}</p>
          </div>
        </div>

        {/* Summary */}
        {call.summary && (
          <p
            className="text-[14px] text-[#555] mt-3 leading-[1.6]"
            style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {call.summary}
          </p>
        )}

        {/* Audio player */}
        {hasValidRecording(call.recording_url) && (
          <AudioPlayer url={call.recording_url!} />
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3">
          <LeadScoreBar score={call.lead_score} />
          <span className="text-[12px] text-[#bbb]">
            {expanded ? 'Click to collapse' : 'Click for transcript'}
          </span>
        </div>

        {/* Mark callback done button */}
        {expanded && hasPendingCallback && (
          <div className="mt-3">
            <button
              onClick={handleMarkDone}
              disabled={markingDone}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] hover:bg-[#d1fae5] transition-colors disabled:opacity-50"
            >
              {markingDone ? 'Marking...' : 'Mark callback done'}
            </button>
          </div>
        )}

        {/* Expanded transcript */}
        {expanded && transcriptLines.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Full Transcript</p>
            <div
              className="rounded-xl border border-gray-200 bg-[#f9fafb] p-4 space-y-3 overflow-y-auto"
              style={{ maxHeight: 320 }}
            >
              {transcriptLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={
                      line.speaker !== 'Caller'
                        ? { backgroundColor: '#FFD700', color: '#111' }
                        : { backgroundColor: '#e5e7eb', color: '#555' }
                    }
                  >
                    {line.speaker !== 'Caller' ? agentName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#888]">
                      {line.speaker !== 'Caller' ? `${agentName} (AI)` : 'Caller'}
                    </p>
                    <p className="text-[13px] text-[#333] leading-[1.5]">{line.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expanded && transcriptLines.length === 0 && call.transcript && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">Full Transcript</p>
            <div
              className="rounded-xl border border-gray-200 bg-[#f9fafb] p-4 overflow-y-auto text-[13px] text-[#333] leading-[1.6] whitespace-pre-wrap"
              style={{ maxHeight: 320 }}
            >
              {call.transcript}
            </div>
          </div>
        )}

        {/* Delete button */}
        {expanded && (
          <div className="flex justify-end mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
              className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
              style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </>
  )
}

interface CallCardsProps {
  initialCalls: Call[]
  clientId: string
  callbackCount: number
  agentName: string
}

export function CallCards({ initialCalls, clientId, agentName }: CallCardsProps) {
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter') === 'callback' ? 'needs_callback' : 'all'
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [filter, setFilter] = useState<FilterType>(initialFilter)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(10)

  const handleDelete = useCallback((callId: string) => {
    setCalls(prev => prev.filter(c => c.id !== callId))
  }, [])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`calls:${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCalls(prev => [payload.new as Call, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCalls(prev => prev.map(c => c.id === (payload.new as Call).id ? (payload.new as Call) : c))
          } else if (payload.eventType === 'DELETE') {
            setCalls(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clientId])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return calls.filter(call => {
      // Apply filter pills
      if (filter === 'needs_callback' && !(call.callback_promised && !call.callback_completed)) return false
      if (filter === 'positive' && call.sentiment !== 'positive') return false
      if (filter === 'negative' && call.sentiment !== 'negative') return false

      // Apply search
      if (q) {
        const nameMatch = call.caller_name?.toLowerCase().includes(q)
        const numberMatch = call.caller_number?.includes(q)
        if (!nameMatch && !numberMatch) return false
      }

      return true
    })
  }, [calls, filter, searchQuery])

  const callbackCount = useMemo(() => {
    return calls.filter(c => c.callback_promised && !c.callback_completed).length
  }, [calls])

  const visible = filtered.slice(0, visibleCount)

  const filters: { value: FilterType; label: string; badge?: number }[] = [
    { value: 'all', label: 'All Calls' },
    { value: 'needs_callback', label: 'Needs Callback', badge: callbackCount },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
  ]

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: '#999' }}
        />
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setVisibleCount(10) }}
          className="w-full text-[14px] outline-none"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: '14px 16px 14px 44px',
            color: '#333',
          }}
        />
      </div>

      {/* Filter pills */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex gap-1 flex-wrap">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setVisibleCount(10) }}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
            style={
              filter === f.value
                ? { backgroundColor: '#111', color: '#fff' }
                : { backgroundColor: 'transparent', color: '#666' }
            }
          >
            {f.label}
            {f.badge !== undefined && f.badge > 0 ? (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-bold min-w-[20px]"
                style={{ backgroundColor: '#FFD700', color: '#111' }}
              >
                {f.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-[13px] text-[#888] mt-3 mb-4">
        {filtered.length} {filtered.length === 1 ? 'call' : 'calls'}
      </p>

      {/* Cards or empty state */}
      {filtered.length === 0 ? (
        calls.length === 0 && !searchQuery ? (
          <div className="text-center py-16">
            <Phone size={32} className="text-[#ccc] mx-auto mb-3" />
            <p className="text-[15px] font-semibold text-[#333]">No calls yet</p>
            <p className="text-[13px] text-[#888] mt-1 max-w-sm mx-auto">
              {agentName} is ready and waiting. When someone calls your business number, the call will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <Phone size={32} className="text-[#ccc] mx-auto mb-3" />
            <p className="text-[15px] font-semibold text-[#333]">No calls match this filter</p>
            <p className="text-[13px] text-[#888] mt-1">
              Try selecting &quot;All Calls&quot; to see everything.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(call => (
            <CallCard key={call.id} call={call} clientId={clientId} agentName={agentName} onDeleted={handleDelete} />
          ))}
        </div>
      )}

      {/* Load more */}
      {filtered.length > visibleCount && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount(n => n + 10)}
            className="px-4 py-2 text-[13px] text-[#666] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
