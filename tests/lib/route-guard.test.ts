import {
  isRouteAllowed,
  getDefaultRoute,
  OPERATOR_ONLY_ROUTES,
  PRODUCT_GATED_ROUTES,
} from '@/lib/route-guard'

describe('isRouteAllowed', () => {
  it('returns true for admin role on any route', () => {
    expect(isRouteAllowed('/clients', 'admin', [])).toBe(true)
    expect(isRouteAllowed('/billing', 'admin', [])).toBe(true)
    expect(isRouteAllowed('/knowledge', 'admin', [])).toBe(true)
    expect(isRouteAllowed('/posts', 'admin', [])).toBe(true)
    expect(isRouteAllowed('/calls', 'admin', [])).toBe(true)
  })

  it('returns false for client_owner on operator-only routes', () => {
    expect(isRouteAllowed('/clients', 'client_owner', ['receptionist'])).toBe(false)
    expect(isRouteAllowed('/billing', 'client_owner', ['receptionist'])).toBe(false)
    expect(isRouteAllowed('/knowledge', 'client_owner', ['receptionist'])).toBe(false)
  })

  it('returns false for client_owner with products=["receptionist"] on social_media routes', () => {
    expect(isRouteAllowed('/posts', 'client_owner', ['receptionist'])).toBe(false)
    expect(isRouteAllowed('/conversations', 'client_owner', ['receptionist'])).toBe(false)
    expect(isRouteAllowed('/social', 'client_owner', ['receptionist'])).toBe(false)
  })

  it('returns true for client_owner with products=["social_media"] on /posts', () => {
    expect(isRouteAllowed('/posts', 'client_owner', ['social_media'])).toBe(true)
  })

  it('returns true for client_owner on / (Health Overview, always allowed)', () => {
    expect(isRouteAllowed('/', 'client_owner', ['receptionist'])).toBe(true)
    expect(isRouteAllowed('/', 'client_owner', ['social_media'])).toBe(true)
    expect(isRouteAllowed('/', 'client_owner', [])).toBe(true)
  })

  it('returns true for client_owner on /settings (always allowed)', () => {
    expect(isRouteAllowed('/settings', 'client_owner', ['receptionist'])).toBe(true)
    expect(isRouteAllowed('/settings', 'client_owner', [])).toBe(true)
  })
})

describe('getDefaultRoute', () => {
  it('returns "/" regardless of products', () => {
    expect(getDefaultRoute(['receptionist'])).toBe('/')
    expect(getDefaultRoute(['social_media'])).toBe('/')
    expect(getDefaultRoute(['receptionist', 'social_media'])).toBe('/')
    expect(getDefaultRoute([])).toBe('/')
  })
})

describe('exports', () => {
  it('exports OPERATOR_ONLY_ROUTES as an array', () => {
    expect(Array.isArray(OPERATOR_ONLY_ROUTES)).toBe(true)
    expect(OPERATOR_ONLY_ROUTES).toContain('/clients')
    expect(OPERATOR_ONLY_ROUTES).toContain('/billing')
    expect(OPERATOR_ONLY_ROUTES).toContain('/knowledge')
  })

  it('exports PRODUCT_GATED_ROUTES as a record', () => {
    expect(PRODUCT_GATED_ROUTES).toBeDefined()
    expect(typeof PRODUCT_GATED_ROUTES).toBe('object')
  })
})
