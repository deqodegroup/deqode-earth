import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/get-profile'

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role === 'deqode_admin') redirect('/admin')
  redirect(`/${profile.org_slug}`)
}
