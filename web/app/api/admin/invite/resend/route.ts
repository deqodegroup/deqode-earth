import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { email } = await request.json() as { email: string }
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('invite_status')
    .eq('email', email)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  if (profile.invite_status !== 'pending') {
    return NextResponse.json({ error: 'Invite can only be resent for pending users.' }, { status: 400 })
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
  })

  if (error) return NextResponse.json({ error: 'Failed to resend invite.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
