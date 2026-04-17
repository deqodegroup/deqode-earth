export type Role = 'viewer' | 'analyst' | 'admin' | 'deqode_admin'

export type InviteStatus = 'pending' | 'active' | 'deactivated'

export interface Profile {
  id: string
  email: string
  role: Role
  org_slug: string
  invite_status: InviteStatus
  invited_at: string
  last_sign_in_at: string | null
  created_by: string | null
}

export interface UserWithProfile {
  id: string
  email: string
  profile: Profile | null
}

export const PROTECTED_ROLE_ROUTES: Record<string, Role[]> = {
  '/admin': ['deqode_admin'],
}

export const CAN_RUN_ANALYSIS: Role[] = ['analyst', 'admin', 'deqode_admin']
export const CAN_DOWNLOAD: Role[] = ['analyst', 'admin', 'deqode_admin']
