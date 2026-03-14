import {
  formatHotLeadSMS,
  formatMediumLeadSMS,
  formatBasicCallSMS,
  formatAfterHoursSMS,
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

describe('formatHotLeadSMS', () => {
  it('includes the caller name', () => {
    const msg = formatHotLeadSMS(makePayload({ caller_name: 'Jane Doe' }))
    expect(msg).toContain('Jane Doe')
  })

  it('includes the service', () => {
    const msg = formatHotLeadSMS(makePayload({ service: 'Oil Change' }))
    expect(msg).toContain('Oil Change')
  })

  it('includes the lead score', () => {
    const msg = formatHotLeadSMS(makePayload({ lead_score: 9 }))
    expect(msg).toContain('9/10')
  })

  it('includes the caller phone number', () => {
    const msg = formatHotLeadSMS(makePayload({ caller_number: '+14235551234' }))
    expect(msg).toContain('+14235551234')
  })

  it('includes hot lead emoji', () => {
    const msg = formatHotLeadSMS(makePayload())
    expect(msg).toContain('🔥')
  })

  it('stays under 320 characters', () => {
    const msg = formatHotLeadSMS(makePayload())
    expect(msg.length).toBeLessThanOrEqual(320)
  })

  it('handles missing caller name gracefully', () => {
    const msg = formatHotLeadSMS(makePayload({ caller_name: undefined }))
    expect(msg).toContain('+14235551234')
    expect(msg).not.toContain('null')
    expect(msg).not.toContain('undefined')
  })
})

describe('formatMediumLeadSMS', () => {
  it('includes the caller name and service', () => {
    const msg = formatMediumLeadSMS(makePayload({ lead_score: 5, service: 'Alignment' }))
    expect(msg).toContain('John Smith')
    expect(msg).toContain('Alignment')
  })

  it('includes the lead score', () => {
    const msg = formatMediumLeadSMS(makePayload({ lead_score: 5 }))
    expect(msg).toContain('5/10')
  })

  it('stays under 300 characters', () => {
    const msg = formatMediumLeadSMS(makePayload({ lead_score: 5 }))
    expect(msg.length).toBeLessThanOrEqual(300)
  })
})

describe('formatBasicCallSMS', () => {
  it('includes the caller number', () => {
    const msg = formatBasicCallSMS(makePayload({ caller_number: '+14235551234', lead_score: 2 }))
    expect(msg).toContain('+14235551234')
  })

  it('includes summary if available', () => {
    const msg = formatBasicCallSMS(makePayload({ summary: 'Asked about tire prices', lead_score: 2 }))
    expect(msg).toContain('Asked about tire prices')
  })

  it('stays under 300 characters', () => {
    const msg = formatBasicCallSMS(makePayload({ lead_score: 2 }))
    expect(msg.length).toBeLessThanOrEqual(300)
  })

  it('handles no summary gracefully', () => {
    const msg = formatBasicCallSMS(makePayload({ summary: undefined, lead_score: 2 }))
    expect(msg).toContain('No details captured')
    expect(msg).not.toContain('null')
    expect(msg).not.toContain('undefined')
  })
})

describe('formatAfterHoursSMS', () => {
  it('includes after-hours label', () => {
    const msg = formatAfterHoursSMS(makePayload({ is_after_hours: true }))
    expect(msg).toContain('After-hours')
  })

  it('includes callback note', () => {
    const msg = formatAfterHoursSMS(makePayload({ is_after_hours: true }))
    expect(msg).toContain('business hours')
  })

  it('includes caller name and service', () => {
    const msg = formatAfterHoursSMS(makePayload({ is_after_hours: true, service: 'Brake Repair' }))
    expect(msg).toContain('John Smith')
    expect(msg).toContain('Brake Repair')
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
