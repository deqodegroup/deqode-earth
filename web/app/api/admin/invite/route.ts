import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { email, role, org_slug } = body as { email: string; role: Role; org_slug: string }

  if (!email || !role || !org_slug) {
    return NextResponse.json({ error: 'email, role, and org_slug are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: inviteData.user.id,
    email,
    role,
    org_slug,
    invite_status: 'pending',
    invited_at: new Date().toISOString(),
    created_by: auth.userId,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
