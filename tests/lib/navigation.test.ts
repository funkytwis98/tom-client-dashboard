import { getClientNav, CLIENT_NAV_CONFIG } from '@/lib/navigation'

describe('getClientNav', () => {
  it('returns receptionist-only items for products_enabled=["receptionist"]', () => {
    const nav = getClientNav(['receptionist'])
    const labels = nav.map((item) => item.label)

    expect(labels).toContain('Health Overview')
    expect(labels).toContain('Calls')
    expect(labels).toContain('Leads')
    expect(labels).toContain('Customers')
    expect(labels).toContain('Settings')

    expect(labels).not.toContain('Posts')
    expect(labels).not.toContain('Conversations')
    expect(labels).not.toContain('Social Connections')
  })

  it('returns social_media-only items for products_enabled=["social_media"]', () => {
    const nav = getClientNav(['social_media'])
    const labels = nav.map((item) => item.label)

    expect(labels).toContain('Health Overview')
    expect(labels).toContain('Posts')
    expect(labels).toContain('Conversations')
    expect(labels).toContain('Social Connections')
    expect(labels).toContain('Settings')

    expect(labels).not.toContain('Calls')
    expect(labels).not.toContain('Leads')
    expect(labels).not.toContain('Customers')
  })

  it('returns all items for products_enabled=["receptionist","social_media"]', () => {
    const nav = getClientNav(['receptionist', 'social_media'])
    const labels = nav.map((item) => item.label)

    expect(labels).toContain('Health Overview')
    expect(labels).toContain('Calls')
    expect(labels).toContain('Leads')
    expect(labels).toContain('Customers')
    expect(labels).toContain('Posts')
    expect(labels).toContain('Conversations')
    expect(labels).toContain('Social Connections')
    expect(labels).toContain('Settings')
  })

  it('never returns operator-only items (Clients, Billing, Knowledge Base)', () => {
    const nav = getClientNav(['receptionist', 'social_media'])
    const labels = nav.map((item) => item.label)

    expect(labels).not.toContain('Clients')
    expect(labels).not.toContain('Billing')
    expect(labels).not.toContain('Knowledge Base')
  })

  it('does not include Knowledge Base as a standalone nav item (REORG-07)', () => {
    const allLabels = CLIENT_NAV_CONFIG.map((item) => item.label)
    expect(allLabels).not.toContain('Knowledge Base')
  })
})
