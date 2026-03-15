/**
 * Route access control for the client dashboard.
 * Determines which routes are accessible based on user role and enabled products.
 */

import type { Product } from '@/lib/navigation'

/** Routes only accessible to admin/operator users */
export const OPERATOR_ONLY_ROUTES: string[] = ['/clients', '/billing', '/knowledge']

/** Routes gated by product -- client_owner needs the product enabled to access */
export const PRODUCT_GATED_ROUTES: Record<string, Product[]> = {
  '/content': ['social'],
  '/analytics': ['social'],
  '/posts': ['social'],
  '/conversations': ['social'],
  '/social': ['social'],
  '/insights': ['receptionist'],
  '/calls': ['receptionist'],
  '/leads': ['receptionist'],
  '/learned': ['receptionist'],
  '/knowledge-base': ['receptionist'],
  '/customers': ['receptionist'],
}

/**
 * Check if a route is allowed for the given role and products.
 * - Admins can access all routes.
 * - Client owners are blocked from operator-only routes.
 * - Client owners are blocked from product-gated routes unless they have the product.
 */
export function isRouteAllowed(
  pathname: string,
  role: string,
  productsEnabled: string[]
): boolean {
  if (role === 'admin') return true

  // Check operator-only routes (startsWith matching)
  for (const route of OPERATOR_ONLY_ROUTES) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return false
    }
  }

  // Check product-gated routes (startsWith matching)
  const enabledSet = new Set(productsEnabled)
  for (const [route, requiredProducts] of Object.entries(PRODUCT_GATED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return requiredProducts.some((product) => enabledSet.has(product))
    }
  }

  // All other routes are allowed (e.g., /, /settings)
  return true
}

/**
 * Returns the default route for a client. Always returns '/' (Health Overview).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDefaultRoute(_productsEnabled: string[]): string {
  return '/'
}
