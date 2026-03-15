/**
 * Client navigation configuration.
 * Pure logic module -- no React, no JSX. Icon names are strings.
 * Downstream consumers (Sidebar.tsx) map icon names to React components.
 */

export type Product = 'receptionist' | 'social'

export interface NavConfig {
  label: string
  href: string
  icon: string
  requiredProducts?: Product[]
}

/**
 * Navigation items available to client_owner users.
 * Items with requiredProducts only appear when that product is enabled.
 */
export const CLIENT_NAV_CONFIG: NavConfig[] = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'CRM', href: '/crm', icon: 'contact' },
  { label: 'Website', href: '/website-analytics', icon: 'globe' },
  { label: 'Calls', href: '/calls', icon: 'phone', requiredProducts: ['receptionist'] },
  { label: 'Leads', href: '/leads', icon: 'users', requiredProducts: ['receptionist'] },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: 'book', requiredProducts: ['receptionist'] },
  { label: 'Learned', href: '/learned', icon: 'lightbulb', requiredProducts: ['receptionist'] },
  { label: 'Content', href: '/content', icon: 'calendar', requiredProducts: ['social'] },
  { label: 'Analytics', href: '/analytics', icon: 'chart', requiredProducts: ['social'] },
  { label: 'Settings', href: '/settings', icon: 'settings' },
]

/**
 * Returns filtered navigation items for a client based on their enabled products.
 * Items with no requiredProducts are always included.
 * Items with requiredProducts are included if ANY required product is in productsEnabled.
 */
export function getClientNav(productsEnabled: string[]): NavConfig[] {
  const enabledSet = new Set(productsEnabled)

  return CLIENT_NAV_CONFIG.filter((item) => {
    if (!item.requiredProducts) return true
    return item.requiredProducts.some((product) => enabledSet.has(product))
  })
}
