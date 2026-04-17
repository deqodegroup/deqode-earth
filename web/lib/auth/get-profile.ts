import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (data as Profile) ?? null
}
