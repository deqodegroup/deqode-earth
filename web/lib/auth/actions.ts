'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function signInAction(
  _prev: { error: string | null; redirectTo?: string },
  formData: FormData
): Promise<{ error: string | null; redirectTo?: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/dashboard'

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  // Return the redirect target instead of calling redirect() here.
  // redirect() from a Server Action triggers a soft (RSC) navigation which
  // can serve a stale client-side cache entry for /dashboard (from when the
  // user visited unauthenticated). window.location.href in the client forces
  // a full page load, bypassing the RSC cache and ensuring middleware sees
  // the freshly-set session cookies.
  return { error: null, redirectTo: next }
}

export async function resetPasswordAction(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get('email') as string

  const supabase = await createSupabaseServerClient()
  const origin = formData.get('origin') as string

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset`,
  })

  return { error: null }
}
