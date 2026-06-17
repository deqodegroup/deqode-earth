export function getRootAuthCodeRedirectUrl(nextUrl: URL): URL | null {
  if (nextUrl.pathname !== '/') return null

  const code = nextUrl.searchParams.get('code')
  if (!code) return null

  const next = nextUrl.searchParams.get('next') ?? '/auth/reset'
  const type = nextUrl.searchParams.get('type') ?? 'recovery'

  const redirectUrl = new URL(nextUrl)
  redirectUrl.pathname = '/auth/callback'
  redirectUrl.search = ''
  redirectUrl.searchParams.set('code', code)
  redirectUrl.searchParams.set('next', next)
  redirectUrl.searchParams.set('type', type)
  return redirectUrl
}
