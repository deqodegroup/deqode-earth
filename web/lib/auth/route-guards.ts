export const PROTECTED_PREFIXES = ['/dashboard', '/admin']
export const PROTECTED_PATTERNS = [
  /^\/[^/]+\/coastline/,
  /^\/[^/]+\/ocean/,
  /^\/[^/]+\/reef/,
  /^\/[^/]+\/reports/,
  /^\/[^/]+\/alerts/,
]

export function isProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) ||
    PROTECTED_PATTERNS.some(r => r.test(pathname))
  )
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}
