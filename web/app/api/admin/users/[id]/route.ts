import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Role, InviteStatus } from '@/lib/supabase/types'

interface PatchBody {
  role?: Role
  invite_status?: InviteStatus
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 })
  }
  const body = await request.json() as PatchBody

  const update: PatchBody = {}
  if (body.role !== undefined) update.role = body.role
  if (body.invite_status !== undefined) update.invite_status = body.invite_status

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('profiles').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
