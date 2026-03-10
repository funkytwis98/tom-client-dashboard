'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/dashboard/Toast'

interface RealtimeCall {
  id: string
  caller_name: string | null
  caller_number: string | null
  client_id: string
  created_at: string
}

interface RealtimeLead {
  id: string
  name: string | null
  phone: string | null
  service_interested: string | null
  client_id: string
  created_at: string
}

export function RealtimeCallAlerts() {
  const { showToast } = useToast()
  const [recentCalls, setRecentCalls] = useState<RealtimeCall[]>([])
  const supabaseRef = useRef(createClient())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const supabase = supabaseRef.current

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls' },
        (payload) => {
          const call = payload.new as RealtimeCall
          const name = call.caller_name || call.caller_number || 'Unknown'
          showToast(`New call from ${name}`, 'success')
          setRecentCalls(prev => [call, ...prev].slice(0, 5))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as RealtimeLead
          const name = lead.name || lead.phone || 'Unknown'
          const service = lead.service_interested ? ` — ${lead.service_interested}` : ''
          showToast(`New lead: ${name}${service}`, 'success')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showToast])

  if (recentCalls.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-5 py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        <p className="text-xs font-medium text-indigo-700">Live — Recent calls</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentCalls.map(call => (
          <span
            key={call.id}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs text-gray-700 border border-indigo-100"
          >
            <svg className="h-3 w-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {call.caller_name || call.caller_number || 'Unknown'}
          </span>
        ))}
      </div>
    </div>
  )
}
