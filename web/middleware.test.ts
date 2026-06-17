import { describe, it, expect } from 'vitest'
import { isProtectedRoute, isAdminRoute } from './lib/auth/route-guards'
import { getRootAuthCodeRedirectUrl } from './lib/auth/recovery-redirect'

describe('getRootAuthCodeRedirectUrl', () => {
  it('redirects legacy root recovery links to /auth/callback', () => {
    const url = new URL('https://deqode-earth.vercel.app/?code=test-reset-code')
    const result = getRootAuthCodeRedirectUrl(url)
    expect(result?.pathname).toBe('/auth/callback')
    expect(result?.search).toBe('?code=test-reset-code&next=%2Fauth%2Freset&type=recovery')
  })

  it('ignores requests without a code param', () => {
    expect(getRootAuthCodeRedirectUrl(new URL('https://deqode-earth.vercel.app/'))).toBeNull()
  })

  it('ignores non-root paths', () => {
    expect(getRootAuthCodeRedirectUrl(new URL('https://deqode-earth.vercel.app/dashboard?code=x'))).toBeNull()
  })
})

describe('isProtectedRoute', () => {
  it('homepage is public', () => expect(isProtectedRoute('/')).toBe(false))
  it('country page is public', () => expect(isProtectedRoute('/niue')).toBe(false))
  it('login is public', () => expect(isProtectedRoute('/login')).toBe(false))
  it('dashboard is protected', () => expect(isProtectedRoute('/dashboard')).toBe(true))
  it('admin is protected', () => expect(isProtectedRoute('/admin')).toBe(true))
  it('coastline is protected', () => expect(isProtectedRoute('/niue/coastline')).toBe(true))
  it('ocean is protected', () => expect(isProtectedRoute('/palau/ocean')).toBe(true))
  it('reports is protected', () => expect(isProtectedRoute('/fiji/reports')).toBe(true))
  it('RMAC workspace is protected', () => expect(isProtectedRoute('/rmac/alofi-south')).toBe(true))
  it('RMAC insights are protected', () => expect(isProtectedRoute('/rmac/alofi-south/insights')).toBe(true))
})

describe('isAdminRoute', () => {
  it('/admin is admin route', () => expect(isAdminRoute('/admin')).toBe(true))
  it('/dashboard is not admin route', () => expect(isAdminRoute('/dashboard')).toBe(false))
})
