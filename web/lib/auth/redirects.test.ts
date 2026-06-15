import { describe, expect, it } from 'vitest'
import { buildLoginRedirectPath, sanitizeRedirectPath } from './redirects'

describe('sanitizeRedirectPath', () => {
  it('preserves the RMAC insights return path', () => {
    expect(sanitizeRedirectPath('/rmac/alofi-south/insights')).toBe(
      '/rmac/alofi-south/insights'
    )
  })

  it('preserves query strings and fragments on local paths', () => {
    expect(sanitizeRedirectPath('/dashboard?period=2026-06#activity')).toBe(
      '/dashboard?period=2026-06#activity'
    )
  })

  it.each([
    'https://attacker.example/steal',
    '//attacker.example/steal',
    'javascript:alert(1)',
    '',
  ])('rejects unsafe redirect value %s', value => {
    expect(sanitizeRedirectPath(value)).toBe('/dashboard')
  })
})

describe('buildLoginRedirectPath', () => {
  it('retains the full protected destination for login', () => {
    expect(
      buildLoginRedirectPath('/rmac/alofi-south/insights', '?period=2026-06')
    ).toBe(
      '/login?next=%2Frmac%2Falofi-south%2Finsights%3Fperiod%3D2026-06'
    )
  })
})
