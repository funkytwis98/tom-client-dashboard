'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface WebsiteRequest {
  id: string
  request_type: string
  subject: string
  message: string
  status: string
  created_at: string
}

const REQUEST_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'content_update', label: 'Content Update' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'bug_fix', label: 'Bug Fix' },
]

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-[rgba(255,215,0,0.1)]', text: 'text-[#b8960f]', label: 'Pending' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function typeLabel(type: string) {
  return REQUEST_TYPES.find(t => t.value === type)?.label ?? type
}

export function WebsiteRequestPortal({ clientId, initialRequests }: { clientId: string; initialRequests: WebsiteRequest[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [requestType, setRequestType] = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const inputCls = 'w-full bg-white border border-[#e5e7eb] rounded-lg px-3.5 py-3 text-sm focus:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700]'
  const labelCls = 'block text-[13px] font-medium text-[#555] mb-1.5'
  const cardCls = 'bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'

  function handleSubmit() {
    if (!subject.trim()) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('website_requests').insert({
        client_id: clientId,
        request_type: requestType,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
      })
      setShowForm(false)
      setSubject('')
      setMessage('')
      setRequestType('general')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Request button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#FFD700] text-[#111] font-semibold text-sm rounded-[14px] px-6 py-3 hover:brightness-95 transition-all"
        >
          Request a Change
        </button>
      )}

      {/* Request form */}
      {showForm && (
        <div className={`${cardCls} p-4 md:p-6`}>
          <h2 className="text-lg font-bold text-[#111] mb-5">New Request</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={requestType} onChange={e => setRequestType(e.target.value)}>
                {REQUEST_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subject</label>
              <input
                type="text"
                className={inputCls}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What needs to be changed?"
              />
            </div>
            <div>
              <label className={labelCls}>Message</label>
              <textarea
                rows={4}
                className={inputCls}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe the change you'd like in detail..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSubmit}
              disabled={!subject.trim() || isPending}
              className="bg-[#FFD700] text-[#111] font-semibold text-sm rounded-[14px] px-6 py-3 disabled:opacity-50 hover:brightness-95 transition-all"
            >
              {isPending ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              onClick={() => { setShowForm(false); setSubject(''); setMessage(''); setRequestType('general') }}
              className="text-sm text-[#777] hover:text-[#111] px-4 py-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Requests list */}
      {initialRequests.length === 0 ? (
        <div className={`${cardCls} p-8 text-center`}>
          <p className="text-sm text-gray-500">
            No requests yet. Need something updated on your website? Click the button above.
          </p>
        </div>
      ) : (
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-[#e5e7eb]">
            <h2 className="text-base font-semibold text-[#111]">Your Requests</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {initialRequests.map(req => {
              const style = statusStyle[req.status] ?? statusStyle.pending
              return (
                <li key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#111]">{req.subject}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#999] bg-gray-50 px-2 py-0.5 rounded">{typeLabel(req.request_type)}</span>
                        <span className="text-xs text-[#999]">{formatDate(req.created_at)}</span>
                      </div>
                      {req.message && (
                        <p className="text-xs text-[#777] mt-2 line-clamp-2">{req.message}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
