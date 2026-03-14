'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, isToday } from 'date-fns'

interface Notification {
  id: string
  type: string
  channel: string
  message: string
  status: string
  read_at: string | null
  call_id: string | null
  lead_id: string | null
  created_at: string
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  new_lead: { label: 'New Lead', className: 'bg-green-100 text-green-800' },
  missed_call: { label: 'Missed Call', className: 'bg-yellow-100 text-yellow-800' },
  daily_summary: { label: 'Daily Summary', className: 'bg-purple-100 text-purple-800' },
}

interface NotificationInboxProps {
  initialNotifications: Notification[]
}

export function NotificationInbox({ initialNotifications }: NotificationInboxProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [typeFilter, setTypeFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const total = notifications.length
  const unread = notifications.filter(n => !n.read_at).length
  const urgent = notifications.filter(n => n.type === 'urgent').length
  const todayCount = notifications.filter(n => isToday(new Date(n.created_at))).length

  const filtered = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (readFilter === 'unread' && n.read_at) return false
    if (readFilter === 'read' && !n.read_at) return false
    return true
  })

  function markAsRead(id: string) {
    startTransition(async () => {
      const now = new Date().toISOString()
      await supabase.from('notifications').update({ read_at: now }).eq('id', id)
      setNotifications(curr => curr.map(n => n.id === id ? { ...n, read_at: now } : n))
    })
  }

  function markAllAsRead() {
    startTransition(async () => {
      const now = new Date().toISOString()
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
      if (unreadIds.length === 0) return
      await supabase.from('notifications').update({ read_at: now }).in('id', unreadIds)
      setNotifications(curr => curr.map(n => n.read_at ? n : { ...n, read_at: now }))
    })
  }

  const stats = [
    { label: 'Total', value: total },
    { label: 'Unread', value: unread },
    { label: 'Urgent', value: urgent },
    { label: 'Today', value: todayCount },
  ]

  const typeFilters = [
    { value: 'all', label: 'All' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'new_lead', label: 'New Lead' },
    { value: 'missed_call', label: 'Missed Call' },
    { value: 'daily_summary', label: 'Daily Summary' },
  ]

  const readFilters = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ]

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Type:</span>
          {typeFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
                typeFilter === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
          {readFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setReadFilter(f.value)}
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
                readFilter === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={isPending}
            className="ml-auto min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No notifications yet</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Notifications will appear here when your receptionist handles calls.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(n => {
              const badge = TYPE_BADGE[n.type] ?? { label: n.type, className: 'bg-gray-100 text-gray-800' }
              const isExpanded = expandedId === n.id
              return (
                <div
                  key={n.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read_at ? 'bg-blue-50/30' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="pt-1.5 flex-shrink-0">
                      {!n.read_at ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      ) : (
                        <div className="w-2.5 h-2.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(n.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className={`text-sm text-gray-700 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {n.message}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {!n.read_at && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}
                              disabled={isPending}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                              Mark as read
                            </button>
                          )}
                          {n.call_id && (
                            <Link
                              href={`/calls`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                            >
                              View Call
                            </Link>
                          )}
                          {n.lead_id && (
                            <Link
                              href={`/leads`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors"
                            >
                              View Lead
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
