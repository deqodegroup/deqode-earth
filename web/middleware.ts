import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const PROTECTED_PATTERNS = [
  /^\/[^/]+\/coastline/,
  /^\/[^/]+\/ocean/,
  /^\/[^/]+\/reef/,
  /^\/[^/]+\/reports/,
  /^\/[^/]+\/alerts/,
]

function isProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) ||
    PROTECTED_PATTERNS.some(r => r.test(pathname))
  )
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute(pathname) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'deqode_admin') {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      dashboardUrl.search = ''
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
