/**
 * Client navigation configuration.
 * Pure logic module -- no React, no JSX. Icon names are strings.
 * Downstream consumers (Sidebar.tsx) map icon names to React components.
 */

export type Product = 'receptionist' | 'social_media'

export interface NavConfig {
  label: string
  href: string
  icon: string
  requiredProducts?: Product[]
}

/**
 * Navigation items available to client_owner users.
 * Items without requiredProducts are always visible.
 * Items with requiredProducts are visible when ANY required product is enabled.
 * Knowledge Base is NOT a standalone nav item (REORG-07 -- it lives in Settings).
 */
export const CLIENT_NAV_CONFIG: NavConfig[] = [
  { label: 'Health Overview', href: '/', icon: 'activity' },
  { label: 'Calls', href: '/calls', icon: 'phone', requiredProducts: ['receptionist'] },
  { label: 'Leads', href: '/leads', icon: 'target', requiredProducts: ['receptionist'] },
  { label: 'Customers', href: '/customers', icon: 'users', requiredProducts: ['receptionist'] },
  { label: 'Posts', href: '/posts', icon: 'file-text', requiredProducts: ['social_media'] },
  { label: 'Conversations', href: '/conversations', icon: 'message-circle', requiredProducts: ['social_media'] },
  { label: 'Social Connections', href: '/social', icon: 'share-2', requiredProducts: ['social_media'] },
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
