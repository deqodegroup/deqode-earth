import { TopNav } from '@/components/nav/TopNav'
import { UserTable } from '@/components/admin/UserTable'
import { getProfile } from '@/lib/auth/get-profile'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'

export default async function AdminPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'deqode_admin') redirect('/dashboard')

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('*')
    .order('invited_at', { ascending: false })

  return (
    <div className="min-h-screen flex flex-col bg-ocean">
      <TopNav />
      <main className="max-w-[1440px] mx-auto px-16 py-10 w-full flex-1">
        <div className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-8">
          DEQODE EARTH · Admin Console
        </div>
        <UserTable initialUsers={(data as Profile[]) ?? []} />
      </main>
    </div>
  )
}
