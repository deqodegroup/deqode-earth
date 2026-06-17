import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/auth/redirects'

function loginRedirect(request: NextRequest, next: string, error: string) {
  const url = new URL('/login', request.url)
  url.searchParams.set('next', sanitizeRedirectPath(next))
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = sanitizeRedirectPath(String(formData.get('next') ?? '/dashboard'))
  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl, { status: 303 })

  if (!email || !password) {
    return loginRedirect(request, next, 'missing_credentials')
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return loginRedirect(request, next, 'invalid_credentials')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return loginRedirect(request, next, 'session_failed')
  }

  return response
}
