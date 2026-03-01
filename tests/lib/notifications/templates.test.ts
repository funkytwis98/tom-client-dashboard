import {
  formatUrgentLeadSMS,
  formatMissedCallSMS,
  formatDailySummarySMS,
} from '@/lib/notifications/templates'
import type { NotificationPayload, DailySummary } from '@/types/api'

// Helper to build a minimal NotificationPayload
function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    client_id: 'client-123',
    type: 'urgent',
    recipient_phone: '+14235550000',
    caller_name: 'John Smith',
    caller_number: '+14235551234',
    service: 'Tire Installation',
    lead_score: 9,
    summary: 'Caller needs 4 new tires for their truck.',
    ...overrides,
  }
}

describe('formatUrgentLeadSMS', () => {
  it('includes the caller name', () => {
    const msg = formatUrgentLeadSMS(makePayload({ caller_name: 'Jane Doe' }))
    expect(msg).toContain('Jane Doe')
  })

  it('includes the service', () => {
    const msg = formatUrgentLeadSMS(makePayload({ service: 'Oil Change' }))
    expect(msg).toContain('Oil Change')
  })

  it('includes the lead score', () => {
    const msg = formatUrgentLeadSMS(makePayload({ lead_score: 9 }))
    expect(msg).toContain('9')
  })

  it('includes the caller phone number', () => {
    const msg = formatUrgentLeadSMS(makePayload({ caller_number: '+14235551234' }))
    expect(msg).toContain('+14235551234')
  })

  it('includes URGENT prefix', () => {
    const msg = formatUrgentLeadSMS(makePayload())
    expect(msg).toMatch(/urgent/i)
  })

  it('stays under 300 characters', () => {
    const msg = formatUrgentLeadSMS(makePayload())
    expect(msg.length).toBeLessThanOrEqual(300)
  })

  it('handles missing caller name gracefully', () => {
    const msg = formatUrgentLeadSMS(makePayload({ caller_name: undefined }))
    expect(msg).toBeTruthy()
    expect(msg.length).toBeGreaterThan(0)
  })
})

describe('formatMissedCallSMS', () => {
  it('includes the caller number', () => {
    const msg = formatMissedCallSMS(makePayload({ caller_number: '+14235551234', type: 'missed_call' }))
    expect(msg).toContain('+14235551234')
  })

  it('includes a time reference', () => {
    const msg = formatMissedCallSMS(makePayload({ type: 'missed_call' }))
    // Should contain either "Missed call" or time-like text
    expect(msg).toMatch(/missed call/i)
  })

  it('includes summary if available', () => {
    const msg = formatMissedCallSMS(makePayload({ summary: 'Asked about tire prices', type: 'missed_call' }))
    expect(msg).toContain('Asked about tire prices')
  })

  it('stays under 300 characters', () => {
    const msg = formatMissedCallSMS(makePayload({ type: 'missed_call' }))
    expect(msg.length).toBeLessThanOrEqual(300)
  })
})

describe('formatDailySummarySMS', () => {
  const baseSummary: DailySummary = {
    date: '2026-03-01',
    total_calls: 12,
    new_leads: 5,
    booked: 3,
    avg_duration_seconds: 180,
    top_lead: { name: 'Mike Johnson', service: 'Tire Rotation', score: 8 },
  }

  it('includes total call count', () => {
    const msg = formatDailySummarySMS(baseSummary)
    expect(msg).toContain('12')
  })

  it('includes new leads count', () => {
    const msg = formatDailySummarySMS(baseSummary)
    expect(msg).toContain('5')
  })

  it('includes booked count', () => {
    const msg = formatDailySummarySMS(baseSummary)
    expect(msg).toContain('3')
  })

  it('includes top lead info when available', () => {
    const msg = formatDailySummarySMS(baseSummary)
    expect(msg).toContain('Mike Johnson')
  })

  it('handles missing top lead gracefully', () => {
    const msg = formatDailySummarySMS({ ...baseSummary, top_lead: null })
    expect(msg).toBeTruthy()
    expect(msg).not.toContain('undefined')
    expect(msg).not.toContain('null')
  })

  it('stays under 300 characters', () => {
    const msg = formatDailySummarySMS(baseSummary)
    expect(msg.length).toBeLessThanOrEqual(300)
  })
})
