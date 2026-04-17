import { describe, it, expect } from 'vitest'
import { isProtectedRoute, isAdminRoute } from './lib/auth/route-guards'

describe('isProtectedRoute', () => {
  it('homepage is public', () => expect(isProtectedRoute('/')).toBe(false))
  it('country page is public', () => expect(isProtectedRoute('/niue')).toBe(false))
  it('login is public', () => expect(isProtectedRoute('/login')).toBe(false))
  it('dashboard is protected', () => expect(isProtectedRoute('/dashboard')).toBe(true))
  it('admin is protected', () => expect(isProtectedRoute('/admin')).toBe(true))
  it('coastline is protected', () => expect(isProtectedRoute('/niue/coastline')).toBe(true))
  it('ocean is protected', () => expect(isProtectedRoute('/palau/ocean')).toBe(true))
  it('reports is protected', () => expect(isProtectedRoute('/fiji/reports')).toBe(true))
})

describe('isAdminRoute', () => {
  it('/admin is admin route', () => expect(isAdminRoute('/admin')).toBe(true))
  it('/dashboard is not admin route', () => expect(isAdminRoute('/dashboard')).toBe(false))
})
