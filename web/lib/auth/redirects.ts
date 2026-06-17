const DEFAULT_AUTH_REDIRECT = '/dashboard'

export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }

  try {
    const base = 'https://deqode-earth.invalid'
    const parsed = new URL(value, base)
    if (parsed.origin !== base) {
      return fallback
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function buildLoginRedirectPath(pathname: string, search = ''): string {
  const protectedPath = sanitizeRedirectPath(`${pathname}${search}`)
  return `/login?next=${encodeURIComponent(protectedPath)}`
}
