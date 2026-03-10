'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isToday, isYesterday } from 'date-fns'

interface Message {
  id: string
  sender: string
  message: string
  is_photo: boolean
  photo_url: string | null
  created_at: string
}

interface ConversationViewProps {
  initialMessages: Message[]
}

function dateSeparatorLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMM d')
}

export function ConversationView({ initialMessages }: ConversationViewProps) {
  const [senderFilter, setSenderFilter] = useState('all')
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const uniqueSenders = [...new Set(initialMessages.map(m => m.sender))]

  const filtered = initialMessages.filter(m => {
    if (senderFilter !== 'all' && m.sender !== senderFilter) return false
    if (search && !m.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalMessages = initialMessages.length
  const participants = uniqueSenders.length
  const photos = initialMessages.filter(m => m.is_photo).length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filtered.length])

  // Group messages by date for separators
  let lastDateStr = ''

  const stats = [
    { label: 'Messages', value: totalMessages },
    { label: 'Participants', value: participants },
    { label: 'Photos', value: photos },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Sender:</span>
          <button
            onClick={() => setSenderFilter('all')}
            className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center ${
              senderFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {uniqueSenders.map(s => (
            <button
              key={s}
              onClick={() => setSenderFilter(s)}
              className={`min-h-[44px] md:min-h-0 py-2.5 md:py-1 px-3 md:px-2.5 rounded-md text-xs font-medium transition-colors flex items-center capitalize ${
                senderFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No messages yet</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              SMS conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
            {filtered.map(m => {
              const msgDate = new Date(m.created_at)
              const dateStr = format(msgDate, 'yyyy-MM-dd')
              let separator: string | null = null
              if (dateStr !== lastDateStr) {
                lastDateStr = dateStr
                separator = dateSeparatorLabel(msgDate)
              }

              const isTom = m.sender === 'tom'

              return (
                <div key={m.id}>
                  {separator && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">{separator}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <div className={`flex ${isTom ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isTom
                          ? 'bg-white border border-gray-200 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className={`text-[10px] font-medium mb-0.5 capitalize ${isTom ? 'text-gray-500' : 'text-blue-100'}`}>
                        {m.sender}
                      </p>
                      {m.is_photo && m.photo_url ? (
                        <img src={m.photo_url} alt="Photo" className="rounded-md max-w-full mb-1" />
                      ) : null}
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                      <p className={`text-[10px] mt-1 ${isTom ? 'text-gray-400' : 'text-blue-200'}`}>
                        {format(msgDate, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </>
  )
}
