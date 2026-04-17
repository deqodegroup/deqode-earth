import { describe, it, expect } from 'vitest'
import { CAN_RUN_ANALYSIS, CAN_DOWNLOAD, PROTECTED_ROLE_ROUTES } from './types'

describe('role constants', () => {
  it('viewer cannot run analysis', () => {
    expect(CAN_RUN_ANALYSIS.includes('viewer')).toBe(false)
  })
  it('analyst can run analysis', () => {
    expect(CAN_RUN_ANALYSIS.includes('analyst')).toBe(true)
  })
  it('admin route requires deqode_admin', () => {
    expect(PROTECTED_ROLE_ROUTES['/admin']).toEqual(['deqode_admin'])
  })
  it('viewer cannot download', () => {
    expect(CAN_DOWNLOAD.includes('viewer')).toBe(false)
  })
})
