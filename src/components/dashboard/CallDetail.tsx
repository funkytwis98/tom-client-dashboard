'use client'

import { useOptimistic, useTransition } from 'react'
import { updateLeadStatus } from '@/app/actions/leads'
import type { Call, Lead } from '@/types/domain'

interface CallDetailProps {
  call: Call
  lead?: Lead
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const SENTIMENT_BADGE: Record<string, { label: string; className: string }> = {
  positive: { label: 'Positive', className: 'bg-green-100 text-green-800' },
  neutral:  { label: 'Neutral',  className: 'bg-gray-100 text-gray-700' },
  negative: { label: 'Negative', className: 'bg-red-100 text-red-800' },
}

const URGENCY_BADGE: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  high:   { label: 'High',   className: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
  low:    { label: 'Low',    className: 'bg-gray-100 text-gray-700' },
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new:       { label: 'New',       className: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', className: 'bg-purple-100 text-purple-800' },
  booked:    { label: 'Booked',    className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
  lost:      { label: 'Lost',      className: 'bg-red-100 text-red-800' },
}

function formatTranscript(transcript: string): React.ReactNode {
  const lines = transcript.split('\n').filter(Boolean)
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const agentMatch = line.match(/^(Agent|AI|Receptionist):\s*/i)
        const callerMatch = line.match(/^(Caller|Customer|User):\s*/i)
        if (agentMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-xs font-semibold text-blue-600 whitespace-nowrap mt-0.5">Agent:</span>
              <span className="text-sm text-gray-700">{line.replace(agentMatch[0], '')}</span>
            </div>
          )
        }
        if (callerMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap mt-0.5">Caller:</span>
              <span className="text-sm text-gray-700">{line.replace(callerMatch[0], '')}</span>
            </div>
          )
        }
        return (
          <div key={i} className="text-sm text-gray-700">{line}</div>
        )
      })}
    </div>
  )
}

function LeadCard({ lead, clientId }: { lead: Lead; clientId: string }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticLead, updateOptimistic] = useOptimistic(
    lead,
    (state: Lead, status: Lead['status']) => ({ ...state, status })
  )

  function handleStatusChange(status: Lead['status']) {
    startTransition(async () => {
      updateOptimistic(status)
      await updateLeadStatus(lead.id, status, clientId)
    })
  }

  const urgencyBadge = URGENCY_BADGE[optimisticLead.urgency]
  const statusBadge = STATUS_BADGE[optimisticLead.status]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Associated Lead</h3>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge.className}`}>
            {urgencyBadge.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="font-medium text-gray-900 mt-0.5">{optimisticLead.name ?? 'Unknown'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Phone</p>
          <p className="font-medium text-gray-900 mt-0.5">{optimisticLead.phone ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Service Interested In</p>
          <p className="font-medium text-gray-900 mt-0.5">{optimisticLead.service_interested ?? '—'}</p>
        </div>
        {optimisticLead.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Notes</p>
            <p className="text-gray-700 mt-0.5">{optimisticLead.notes}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500 mr-1">Update status:</span>
        {(optimisticLead.status === 'new') && (
          <button
            onClick={() => handleStatusChange('contacted')}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            Contacted
          </button>
        )}
        {(optimisticLead.status === 'new' || optimisticLead.status === 'contacted') && (
          <button
            onClick={() => handleStatusChange('booked')}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
          >
            Booked
          </button>
        )}
        {(optimisticLead.status === 'new' || optimisticLead.status === 'contacted') && (
          <button
            onClick={() => handleStatusChange('lost')}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Lost
          </button>
        )}
      </div>
    </div>
  )
}

export function CallDetail({ call, lead }: CallDetailProps) {
  const directionColor = call.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
  const statusBadge = STATUS_BADGE[call.status] ?? { label: call.status, className: 'bg-gray-100 text-gray-700' }
  const sentimentBadge = call.sentiment ? SENTIMENT_BADGE[call.sentiment] : null

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {call.caller_name ?? call.caller_number ?? 'Unknown Caller'}
            </h2>
            {call.caller_name && call.caller_number && (
              <p className="text-sm text-gray-500 mt-0.5">{call.caller_number}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">{formatDateTime(call.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${directionColor}`}>
              {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Duration: </span>
            <span className="font-medium text-gray-900">{formatDuration(call.duration_seconds)}</span>
          </div>
          {call.lead_score !== null && (
            <div>
              <span className="text-gray-500">Lead Score: </span>
              <span className={`font-medium ${
                call.lead_score >= 8 ? 'text-green-700' :
                call.lead_score >= 5 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {call.lead_score}/10
              </span>
            </div>
          )}
          {sentimentBadge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sentimentBadge.className}`}>
              {sentimentBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Lead card */}
      {lead && <LeadCard lead={lead} clientId={call.client_id} />}

      {/* Summary card */}
      {call.summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">AI Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Recording player */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Recording</h3>
        {call.recording_url ? (
          <audio
            controls
            src={call.recording_url}
            className="w-full"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
        ) : (
          <p className="text-sm text-gray-400 italic">No recording available for this call.</p>
        )}
      </div>

      {/* Transcript */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Full Transcript</h3>
        {call.transcript ? (
          <div className="max-h-96 overflow-y-auto pr-2">
            {formatTranscript(call.transcript)}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No transcript available for this call.</p>
        )}
      </div>
    </div>
  )
}
