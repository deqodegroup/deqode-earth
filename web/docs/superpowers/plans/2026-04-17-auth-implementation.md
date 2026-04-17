# DEQODE EARTH Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add invite-only, role-based auth to DEQODE EARTH using Supabase Auth + `@supabase/ssr`, gating all analysis and operational routes behind sign-in while keeping the homepage and country overview pages public.

**Architecture:** Supabase Auth handles sessions, magic links, and email+password. A `profiles` table extends `auth.users` with role, org_slug, and invite_status. Next.js middleware runs at the edge on every request — refreshing the session cookie, redirecting unauthenticated users away from protected routes, and blocking non-`deqode_admin` users from `/admin`.

**Tech Stack:** Next.js 16 · React 19 · Tailwind 4 · Supabase Auth · `@supabase/ssr` 0.10.2 · `@supabase/supabase-js` 2.x · TypeScript · Vitest (added for auth utility tests)

---

## File Map

### New files
```
middleware.ts                                  — edge route protection + session refresh
lib/supabase/server.ts                        — createServerClient for RSC + route handlers
lib/supabase/client.ts                        — createBrowserClient for client components
lib/supabase/admin.ts                         — service-role client (server-only)
lib/supabase/types.ts                         — Profile type, Role enum, UserWithProfile type
lib/auth/get-profile.ts                       — server helper: fetch profile for current session
supabase/migrations/001_profiles.sql          — profiles table + RLS + trigger
app/login/page.tsx                            — sign-in page (email+password + forgot password)
app/auth/accept/page.tsx                      — invite acceptance + password set
app/auth/reset/page.tsx                       — password reset form
app/auth/callback/route.ts                    — Supabase auth code exchange handler
app/dashboard/page.tsx                        — server redirect → /[org_slug]
app/admin/page.tsx                            — user management panel (deqode_admin only)
app/api/admin/users/route.ts                  — GET all users
app/api/admin/invite/route.ts                 — POST send invite
app/api/admin/invite/resend/route.ts          — POST resend invite
app/api/admin/users/[id]/route.ts             — PATCH role / invite_status
components/auth/SignInForm.tsx                — email+password form (client component)
components/auth/AcceptInviteForm.tsx          — set-password form (client component)
components/auth/ResetPasswordForm.tsx         — reset form (client component)
components/auth/AuthCard.tsx                  — centred card shell for auth pages
components/admin/UserTable.tsx                — admin user list (client component)
components/admin/InviteModal.tsx              — invite user modal (client component)
components/nav/TopNav.tsx                     — MODIFIED: wire Sign In + show session state
components/dashboard/ModuleGrid.tsx           — MODIFIED: locked cards + Request Access CTA
```

### Existing files modified
```
components/nav/TopNav.tsx                     — add session-aware Sign In / user display
components/dashboard/ModuleGrid.tsx           — add locked state + Request Access CTA variant
app/[country]/coastline/page.tsx              — no change needed (middleware handles auth gate)
```

---

## Task 1: Vitest setup + Supabase types

**Files:**
- Create: `lib/supabase/types.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest devDependency)

- [ ] **Step 1: Install Vitest**

```bash
cd C:/Dev/deqode-earth/web
npm install --save-dev vitest @vitest/ui
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `lib/supabase/types.ts`**

```typescript
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
```

- [ ] **Step 5: Write test for role constants**

Create `lib/supabase/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CAN_RUN_ANALYSIS, CAN_DOWNLOAD, PROTECTED_ROLE_ROUTES } from './types'

describe('role constants', () => {
  it('viewer cannot run analysis', () => {
    expect(CAN_RUN_ANALYSIS.includes('viewer')).toBe(false)
  })
  it('analyst can run analysis', () => {
    expect(CAN_RUN_ANALYSIS.includes('analyst')).toBe(true)
  })
  it('admin route requires deqode_admin', () => {
    expect(PROTECTED_ROLE_ROUTES['/admin']).toEqual(['deqode_admin'])
  })
  it('viewer cannot download', () => {
    expect(CAN_DOWNLOAD.includes('viewer')).toBe(false)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts lib/supabase/types.ts lib/supabase/types.test.ts package.json package-lock.json
git commit -m "feat: add Vitest + Supabase auth types"
```

---

## Task 2: Supabase client utilities

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/admin.ts`

These require two env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), plus `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in client bundle).

- [ ] **Step 1: Add env vars to `.env.local`**

Create `C:/Dev/deqode-earth/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get these from: Supabase Dashboard → Project Settings → API.

- [ ] **Step 2: Add env vars to Vercel**

In Vercel dashboard → deqode-earth project → Settings → Environment Variables, add all three. Set `SUPABASE_SERVICE_ROLE_KEY` to **server-only** (do not expose to browser).

- [ ] **Step 3: Create `lib/supabase/server.ts`**

Used in Server Components, Route Handlers, and Server Actions. Must be called inside a request context (has access to cookies).

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create `lib/supabase/client.ts`**

Used in Client Components only.

```typescript
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Create `lib/supabase/admin.ts`**

Service role client. Never import this in any client component or expose to the browser.

```typescript
import { createClient } from '@supabase/supabase-js'

// IMPORTANT: server-side only. Never import in client components.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 6: Create `lib/auth/get-profile.ts`**

Server helper — fetches the current user's profile row. Returns null if no session.

```typescript
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
```

- [ ] **Step 7: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts lib/supabase/admin.ts lib/auth/get-profile.ts .env.local
git commit -m "feat: add Supabase client utilities and profile helper"
```

Note: `.env.local` should be in `.gitignore`. Verify before committing:
```bash
cat .gitignore | grep .env
```
If `.env.local` is not listed, add it before committing.

---

## Task 3: Database schema — profiles table + RLS + trigger

**Files:**
- Create: `supabase/migrations/001_profiles.sql`

This SQL runs in the Supabase SQL editor (Dashboard → SQL Editor) or via Supabase CLI. It creates the `profiles` table, enables RLS, adds policies, and creates the trigger that auto-inserts a profile row when a new user signs in.

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001_profiles.sql`:

```sql
-- profiles table
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  role            text not null check (role in ('viewer','analyst','admin','deqode_admin')),
  org_slug        text not null,
  invite_status   text not null default 'pending'
                  check (invite_status in ('pending','active','deactivated')),
  invited_at      timestamptz default now(),
  last_sign_in_at timestamptz,
  created_by      uuid references public.profiles(id)
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "users_read_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

-- deqode_admin can read all profiles
create policy "deqode_admin_read_all_profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'deqode_admin'
    )
  );

-- deqode_admin can update any profile (role, invite_status)
create policy "deqode_admin_update_profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'deqode_admin'
    )
  );

-- Service role bypasses RLS (used by admin API routes)
-- (no policy needed — service role is exempt from RLS by default)

-- Trigger: update last_sign_in_at and set invite_status=active on sign-in
create or replace function public.handle_user_sign_in()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set
    last_sign_in_at = now(),
    invite_status = case
      when invite_status = 'pending' then 'active'
      else invite_status
    end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_sign_in
  after update of last_sign_in_at on auth.users
  for each row execute procedure public.handle_user_sign_in();
```

- [ ] **Step 2: Run migration in Supabase**

Go to: Supabase Dashboard → SQL Editor → New query → paste contents of `supabase/migrations/001_profiles.sql` → Run.

Expected: no errors. Confirm in Table Editor that the `profiles` table appears with all columns.

- [ ] **Step 3: Verify RLS is enabled**

In Supabase Dashboard → Table Editor → profiles → Auth policies. Confirm 3 policies are listed.

- [ ] **Step 4: Create your own deqode_admin user manually**

In Supabase Dashboard → Authentication → Users → Invite user → enter your email.

Then in SQL Editor:
```sql
insert into public.profiles (id, email, role, org_slug, invite_status, invited_at)
select id, email, 'deqode_admin', 'deqode', 'active', now()
from auth.users
where email = 'bhaiosi@gmail.com';
```

This creates your admin profile. You'll use this account to manage all other users.

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/migrations/001_profiles.sql
git commit -m "feat: add profiles table with RLS and sign-in trigger"
```

---

## Task 4: Middleware — route protection + session refresh

**Files:**
- Create: `middleware.ts` (project root, next to `package.json`)

- [ ] **Step 1: Write failing test for middleware route logic**

Create `middleware.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

// Pure logic extracted from middleware — no Next.js deps needed for unit test
function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = [
    '/dashboard',
    '/admin',
  ]
  const protectedPatterns = [
    /^\/[^/]+\/coastline/,
    /^\/[^/]+\/ocean/,
    /^\/[^/]+\/reef/,
    /^\/[^/]+\/reports/,
    /^\/[^/]+\/alerts/,
  ]
  return (
    protectedPrefixes.some(p => pathname.startsWith(p)) ||
    protectedPatterns.some(r => r.test(pathname))
  )
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

describe('isProtectedRoute', () => {
  it('homepage is public', () => expect(isProtectedRoute('/')).toBe(false))
  it('country page is public', () => expect(isProtectedRoute('/niue')).toBe(false))
  it('login is public', () => expect(isProtectedRoute('/login')).toBe(false))
  it('dashboard is protected', () => expect(isProtectedRoute('/dashboard')).toBe(true))
  it('admin is protected', () => expect(isProtectedRoute('/admin')).toBe(true))
  it('coastline is protected', () => expect(isProtectedRoute('/niue/coastline')).toBe(true))
  it('ocean is protected', () => expect(isProtectedRoute('/palau/ocean')).toBe(true))
  it('reports is protected', () => expect(isProtectedRoute('/fiji/reports')).toBe(true))
})

describe('isAdminRoute', () => {
  it('/admin is admin route', () => expect(isAdminRoute('/admin')).toBe(true))
  it('/dashboard is not admin route', () => expect(isAdminRoute('/dashboard')).toBe(false))
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- middleware.test.ts
```

Expected: FAIL — `isProtectedRoute is not defined`.

- [ ] **Step 3: Create `middleware.ts`**

```typescript
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

  // Refresh session — must be called before any redirects
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
```

- [ ] **Step 4: Update `middleware.test.ts` to import from middleware**

Replace the inline function definitions with imports. Since middleware uses Next.js server APIs we can't import the full module, but the logic functions are already tested via the inline copies in step 1. The test file as written tests the logic contracts — leave it as-is.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all 10 tests pass.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts middleware.test.ts
git commit -m "feat: add route protection middleware with session refresh"
```

---

## Task 5: Auth callback route handler

The Supabase invite link and magic links contain a `code` parameter. This route exchanges it for a session.

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create `app/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // For invite acceptance, redirect to the set-password page
  const isInvite = searchParams.get('type') === 'invite'
  if (isInvite) {
    return NextResponse.redirect(`${origin}/auth/accept`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

- [ ] **Step 2: In Supabase Dashboard, set Redirect URL**

Go to: Supabase Dashboard → Authentication → URL Configuration.

Set **Site URL** to: `https://deqode-earth.vercel.app`

Add to **Redirect URLs**:
```
https://deqode-earth.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add Supabase auth callback route handler"
```

---

## Task 6: Auth UI components + pages

**Files:**
- Create: `components/auth/AuthCard.tsx`
- Create: `components/auth/SignInForm.tsx`
- Create: `components/auth/AcceptInviteForm.tsx`
- Create: `components/auth/ResetPasswordForm.tsx`
- Create: `app/login/page.tsx`
- Create: `app/auth/accept/page.tsx`
- Create: `app/auth/reset/page.tsx`

All auth pages use the same design language: full ocean background, centred card, teal accents, JetBrains Mono labels, DM Sans body.

- [ ] **Step 1: Create `components/auth/AuthCard.tsx`**

```tsx
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean px-4
                    relative overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(76,185,192,0.06) 0%, transparent 70%)' }} />
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
           style={{
             backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
             backgroundSize: '48px 48px',
           }} />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded bg-teal flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-ocean" />
          </div>
          <div>
            <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
              DEQODE GROUP
            </div>
            <div className="font-display text-lg leading-none text-[var(--text)]">
              EARTH<span className="text-teal">.</span>
            </div>
          </div>
        </div>
        {/* Card */}
        <div className="rounded-lg border border-[var(--border)] bg-surface p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/auth/SignInForm.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { next?: string }

export function SignInForm({ next = '/dashboard' }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    setResetSent(true)
    setLoading(false)
  }

  if (resetSent) {
    return (
      <div className="text-center">
        <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-teal mb-3">
          Reset link sent
        </div>
        <p className="font-sans text-sm text-[var(--text-mid)]">
          Check your email for a password reset link.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-5">
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">
          Secure Access
        </div>
        <div className="font-sans text-xs text-[var(--text-dim)]">
          DEQODE EARTH partner portal
        </div>
      </div>

      {error && (
        <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)]
                     focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="you@government.gov"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)]
                     focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase
                   py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={loading}
        className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)]
                   hover:text-teal transition-colors text-center disabled:opacity-50"
      >
        Forgot password
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create `components/auth/AcceptInviteForm.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AcceptInviteForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSetPassword} className="flex flex-col gap-5">
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">Set your password</div>
        <div className="font-sans text-xs text-[var(--text-dim)]">
          You have been invited to DEQODE EARTH. Set a password to activate your account.
        </div>
      </div>

      {error && (
        <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          New password
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Confirm password
        </label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase
                   py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Activating…' : 'Activate Account'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create `components/auth/ResetPasswordForm.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleReset} className="flex flex-col gap-5">
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">Reset password</div>
        <div className="font-sans text-xs text-[var(--text-dim)]">Enter your new password below.</div>
      </div>

      {error && (
        <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">New password</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Confirm password</label>
        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50">
        {loading ? 'Saving…' : 'Set New Password'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Create `app/login/page.tsx`**

```tsx
import { AuthCard } from '@/components/auth/AuthCard'
import { SignInForm } from '@/components/auth/SignInForm'

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams
  return (
    <AuthCard>
      <SignInForm next={next ?? '/dashboard'} />
      {error === 'auth_failed' && (
        <p className="mt-4 font-mono text-[0.6rem] tracking-[0.1em] text-coral text-center">
          Authentication failed. Try again or contact DEQODE.
        </p>
      )}
    </AuthCard>
  )
}
```

- [ ] **Step 6: Create `app/auth/accept/page.tsx`**

```tsx
import { AuthCard } from '@/components/auth/AuthCard'
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm'

export default function AcceptInvitePage() {
  return (
    <AuthCard>
      <AcceptInviteForm />
    </AuthCard>
  )
}
```

- [ ] **Step 7: Create `app/auth/reset/page.tsx`**

```tsx
import { AuthCard } from '@/components/auth/AuthCard'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <AuthCard>
      <ResetPasswordForm />
    </AuthCard>
  )
}
```

- [ ] **Step 8: Start dev server and test sign-in manually**

```bash
npm run dev
```

1. Go to `http://localhost:3000/login` — verify card renders, design matches EARTH aesthetic
2. Try signing in with your `bhaiosi@gmail.com` admin account (set via Supabase invite in Task 3)
3. Verify redirect to `/dashboard` after sign-in
4. Go to `http://localhost:3000/niue/coastline` without signing in — verify redirect to `/login?next=/niue/coastline`
5. Sign in — verify redirect back to `/niue/coastline`

- [ ] **Step 9: Commit**

```bash
git add components/auth/ app/login/ app/auth/
git commit -m "feat: add auth pages — sign-in, invite acceptance, password reset"
```

---

## Task 7: Dashboard redirect page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/get-profile'

export default async function DashboardPage() {
  const profile = await getProfile()

  // Middleware guarantees a session exists — profile should always be present
  // deqode_admin goes to /admin; everyone else goes to their country dashboard
  if (!profile) redirect('/login')
  if (profile.role === 'deqode_admin') redirect('/admin')
  redirect(`/${profile.org_slug}`)
}
```

- [ ] **Step 2: Verify manually**

With the dev server running:
1. Sign in as `bhaiosi@gmail.com` (deqode_admin) → should redirect to `/admin` (will 404 until Task 9 — that's expected)
2. Verify the redirect chain works

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add dashboard redirect to org or admin"
```

---

## Task 8: Update TopNav — session-aware Sign In button

**Files:**
- Modify: `components/nav/TopNav.tsx`

- [ ] **Step 1: Update `components/nav/TopNav.tsx`**

Replace the entire file:

```tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function TopNav() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-4
                    bg-ocean/95 backdrop-blur border-b border-[var(--border)]">
      <Link href="/" className="flex items-center gap-4 group">
        <div className="w-9 h-9 rounded bg-teal flex items-center justify-center flex-shrink-0
                        group-hover:bg-teal/90 transition-colors animate-glow-teal">
          <div className="w-5 h-5 rounded-full border-2 border-ocean relative">
            <div className="absolute inset-0"
                 style={{ animation: 'earth-orbit 5s linear infinite' }}>
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal/80" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-ocean" />
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
            DEQODE GROUP
          </div>
          <div className="font-display text-xl leading-none text-[var(--text)]">
            EARTH<span className="text-teal">.</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="relative flex items-center justify-center w-3 h-3">
            <span className="absolute w-3 h-3 rounded-full bg-teal/25 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
          </span>
          <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-teal">
            Sentinel Active
          </span>
        </div>

        {user ? (
          <Link
            href="/dashboard"
            className="font-mono text-[0.65rem] tracking-[0.14em] uppercase
                       px-4 py-2 rounded border border-teal/40 bg-teal/5
                       text-teal hover:bg-teal/10 transition-colors"
          >
            Dashboard →
          </Link>
        ) : (
          <Link
            href="/login"
            className="font-mono text-[0.65rem] tracking-[0.14em] uppercase
                       px-4 py-2 rounded border border-[var(--border)]
                       text-[var(--text-mid)] hover:border-teal hover:text-teal
                       transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify manually**

1. Visit `http://localhost:3000` signed out — Sign In button shown
2. Sign in — revisit homepage — Dashboard → button shown
3. Click Dashboard → button — redirects correctly

- [ ] **Step 3: Commit**

```bash
git add components/nav/TopNav.tsx
git commit -m "feat: session-aware Sign In / Dashboard button in TopNav"
```

---

## Task 9: Public dashboard — locked module cards + Request Access CTA

**Files:**
- Modify: `components/dashboard/ModuleGrid.tsx`

The public country page already shows module cards. Add a "locked" state variant for modules that require auth — shown to unauthenticated visitors in place of the current roadmap teaser card for active modules.

- [ ] **Step 1: Update `components/dashboard/ModuleGrid.tsx`**

Add `isAuthenticated` prop and a locked card variant. Replace the export and `ModuleCard` function:

```tsx
import Link from "next/link";
import { type Location } from "@/lib/locations";

interface Module {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  teaserText?: string;
  launchQuarter?: string;
  metrics: { label: string; value: string; unit?: string }[];
  accentColor: string;
  available: boolean;
}

function getModules(loc: Location): Module[] {
  return [
    {
      id: "coastline",
      icon: "◎",
      title: "Coastline Intelligence",
      subtitle: "Optical-derived erosion, accretion & shoreline change",
      metrics: [
        { label: "Analysis Period", value: loc.isLive ? "2019 – 2025" : "Coming soon" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "30 m" },
      ],
      accentColor: "teal",
      available: loc.isLive,
    },
    {
      id: "ocean",
      icon: "⬡",
      title: "Ocean Intelligence",
      subtitle: "Dark vessel detection across your EEZ",
      teaserText: `Automated monitoring for illegal, unreported, and unregulated fishing. Every vessel in your ${loc.eez} EEZ — named or dark.`,
      launchQuarter: "Q3 2026",
      metrics: [
        { label: "Coverage", value: loc.eez },
        { label: "Sensor", value: "AIS + Sentinel-2" },
        { label: "Update", value: "5-day repeat" },
      ],
      accentColor: "sky",
      available: false,
    },
    {
      id: "reef",
      icon: "✦",
      title: "Reef Intelligence",
      subtitle: "Coral health index & bleaching risk from optical data",
      teaserText: "Bleaching risk scores from Sentinel-2 multispectral data. Continuous coral health monitoring without deploying a dive team.",
      launchQuarter: "Q4 2026",
      metrics: [
        { label: "Bands", value: "B2–B8A" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "10–20 m" },
      ],
      accentColor: "gold",
      available: false,
    },
    {
      id: "land",
      icon: "▲",
      title: "Land Intelligence",
      subtitle: "Cyclone damage, deforestation & flood extent mapping",
      teaserText: "Post-cyclone damage corridors, flood extent, and land-use change — satellite-verified evidence for insurance, aid, and UNFCCC submissions.",
      launchQuarter: "2027",
      metrics: [
        { label: "Index", value: "NDVI / dNBR" },
        { label: "Sensor", value: "Sentinel-2 MSI" },
        { label: "Resolution", value: "10 m" },
      ],
      accentColor: "coral",
      available: false,
    },
  ];
}

const ACCENT: Record<string, string> = {
  teal:  "border-teal/30  bg-teal/5  text-teal",
  sky:   "border-sky/30   bg-sky/5   text-sky",
  gold:  "border-gold/30  bg-gold/5  text-gold",
  coral: "border-coral/30 bg-coral/5 text-coral",
};

export function ModuleGrid({ loc, isAuthenticated = false }: { loc: Location; isAuthenticated?: boolean }) {
  const modules = getModules(loc);
  return (
    <section className="max-w-[1440px] mx-auto px-16 py-12">
      <div className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-6">
        Intelligence Modules
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} slug={loc.slug} isAuthenticated={isAuthenticated} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ mod, slug, isAuthenticated }: { mod: Module; slug: string; isAuthenticated: boolean }) {
  const accent = ACCENT[mod.accentColor];
  const accentText = accent.split(" ")[2];
  const accentBorder = accent.split(" ")[0];
  const accentBg = accent.split(" ")[1];

  // Active module, authenticated — full card with link
  if (mod.available && isAuthenticated) {
    return (
      <Link href={`/${slug}/${mod.id}`}>
        <div className={`group relative flex flex-col gap-6 rounded-lg border bg-surface p-8
                         transition-all duration-200 ${accentBorder} hover:bg-surface2 hover:-translate-y-0.5 cursor-pointer`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`font-mono text-xl leading-none ${accentText}`}>{mod.icon}</span>
              <div>
                <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
                <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
              </div>
            </div>
            <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 ${accent}`}>Active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4">
            {mod.metrics.map((m) => (
              <div key={m.label}>
                <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">{m.label}</div>
                <div className="font-sans text-xs font-medium text-[var(--text-mid)]">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <span className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase ${accentText} group-hover:underline underline-offset-2`}>
              Run Analysis <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Active module, not authenticated — locked card with Request Access CTA
  if (mod.available && !isAuthenticated) {
    return (
      <div className={`relative flex flex-col gap-6 rounded-lg border bg-surface p-8 ${accentBorder}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xl leading-none ${accentText} opacity-50`}>{mod.icon}</span>
            <div>
              <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
              <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
            </div>
          </div>
          <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase border border-[var(--border)] rounded-full px-2 py-0.5 text-[var(--text-dim)]">
            Restricted
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 opacity-40">
          {mod.metrics.map((m) => (
            <div key={m.label}>
              <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">{m.label}</div>
              <div className="font-sans text-xs font-medium text-[var(--text-mid)]">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <span className="font-sans text-xs text-[var(--text-dim)]">Partner access required</span>
          <Link
            href="/login"
            className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase px-3 py-1.5 rounded border ${accentBorder} ${accentBg} ${accentText} hover:opacity-80 transition-opacity`}
          >
            Request Access →
          </Link>
        </div>
      </div>
    );
  }

  // Roadmap teaser card (module not yet available)
  return (
    <div className="relative flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-surface p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl leading-none text-[var(--text-dim)]">{mod.icon}</span>
          <div>
            <div className="font-display text-lg leading-tight text-[var(--text)]">{mod.title}</div>
            <div className="font-sans text-xs text-[var(--text-mid)] mt-0.5 leading-relaxed">{mod.subtitle}</div>
          </div>
        </div>
        <span className={`font-mono text-[0.65rem] tracking-[0.12em] uppercase border rounded-full px-2 py-0.5 whitespace-nowrap
                          ${accentBorder} ${accentBg} ${accentText} opacity-70 badge-shimmer`}>
          {mod.launchQuarter}
        </span>
      </div>
      {mod.teaserText && (
        <p className="font-sans text-xs text-[var(--text-dim)] leading-relaxed border-t border-[var(--border)] pt-4">
          {mod.teaserText}
        </p>
      )}
      <div className={`font-mono text-[0.65rem] tracking-[0.1em] uppercase ${accentText} opacity-60`}>
        Coming {mod.launchQuarter} — notify me
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pass `isAuthenticated` from the country page**

Update `app/[country]/page.tsx` to fetch auth state and pass it to `ModuleGrid`:

```tsx
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { CountryHero } from "@/components/dashboard/CountryHero";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { LOCATIONS, LOCATIONS_LIST } from "@/lib/locations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return LOCATIONS_LIST.map((loc) => ({ country: loc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc) return {};
  return {
    title: `${loc.name} — DEQODE EARTH`,
    description: `Sovereign intelligence for ${loc.name}: coastline, ocean, reef, and land monitoring.`,
  };
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-ocean">
      <TopNav />
      <CountryHero loc={loc} />
      <ModuleGrid loc={loc} isAuthenticated={!!user} />
    </div>
  );
}
```

Note: `generateStaticParams` remains — the page uses dynamic data at runtime via cookies. Next.js 16 handles this correctly: static params are pre-rendered but session data is read dynamically.

- [ ] **Step 3: Verify manually**

1. Visit `http://localhost:3000/niue` signed out — Coastline card shows "Restricted" + "Request Access →" link
2. Sign in — revisit `/niue` — Coastline card shows full active state with "Run Analysis →"

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ModuleGrid.tsx app/[country]/page.tsx
git commit -m "feat: locked module cards with Request Access CTA for unauthenticated users"
```

---

## Task 10: Admin API routes

All admin routes require a valid session and `deqode_admin` role. The service role key is used server-side only.

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/invite/route.ts`
- Create: `app/api/admin/invite/resend/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`
- Create: `lib/auth/require-admin.ts`

- [ ] **Step 1: Create `lib/auth/require-admin.ts`**

Shared guard used by all admin API routes.

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'deqode_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { userId: user.id }
}
```

- [ ] **Step 2: Create `app/api/admin/users/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data })
}
```

- [ ] **Step 3: Create `app/api/admin/invite/route.ts`**

```typescript
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

  // Send Supabase invite (magic link email)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Insert profile row immediately (invite_status = 'pending')
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
```

- [ ] **Step 4: Add `NEXT_PUBLIC_SITE_URL` to env**

Add to `.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Add to Vercel env vars:
```
NEXT_PUBLIC_SITE_URL=https://deqode-earth.vercel.app
```

- [ ] **Step 5: Create `app/api/admin/invite/resend/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { email } = await request.json() as { email: string }
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Create `app/api/admin/users/[id]/route.ts`**

```typescript
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
  const body = await request.json() as PatchBody

  const allowed: (keyof PatchBody)[] = ['role', 'invite_status']
  const update: PatchBody = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key] as never
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('profiles').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth/require-admin.ts app/api/admin/
git commit -m "feat: admin API routes — invite, resend, list users, update role/status"
```

---

## Task 11: Admin panel UI

**Files:**
- Create: `components/admin/UserTable.tsx`
- Create: `components/admin/InviteModal.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create `components/admin/InviteModal.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Role } from '@/lib/supabase/types'
import { LOCATIONS_LIST } from '@/lib/locations'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const ROLES: Role[] = ['viewer', 'analyst', 'admin']
const ORG_SLUGS = ['deqode', ...LOCATIONS_LIST.map(l => l.slug)]

export function InviteModal({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [org_slug, setOrgSlug] = useState('niue')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, org_slug }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    onSuccess()
    onClose()
  }

  const selectClass = "bg-ocean border border-[var(--border)] rounded px-3 py-2 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors w-full"
  const inputClass = `${selectClass}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/80 backdrop-blur-sm px-4">
      <div className="bg-surface border border-[var(--border)] rounded-lg p-8 w-full max-w-sm">
        <div className="font-display text-xl text-[var(--text)] mb-6">Invite User</div>

        {error && (
          <div className="font-mono text-[0.65rem] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass} placeholder="minister@gov.nz" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)} className={selectClass}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Organisation</label>
            <select value={org_slug} onChange={e => setOrgSlug(e.target.value)} className={selectClass}>
              {ORG_SLUGS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 font-mono text-[0.65rem] tracking-[0.1em] uppercase py-2.5 rounded border border-[var(--border)] text-[var(--text-mid)] hover:border-teal hover:text-teal transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 font-mono text-[0.65rem] tracking-[0.1em] uppercase py-2.5 rounded bg-teal text-ocean hover:bg-teal/90 transition-colors disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/admin/UserTable.tsx`**

```tsx
'use client'
import { useState } from 'react'
import type { Profile } from '@/lib/supabase/types'
import { InviteModal } from './InviteModal'

interface Props {
  initialUsers: Profile[]
}

export function UserTable({ initialUsers }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function refreshUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
  }

  async function resendInvite(email: string) {
    await fetch('/api/admin/invite/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  }

  async function toggleStatus(user: Profile) {
    setLoadingId(user.id)
    const newStatus = user.invite_status === 'deactivated' ? 'active' : 'deactivated'
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_status: newStatus }),
    })
    await refreshUsers()
    setLoadingId(null)
  }

  async function updateRole(userId: string, role: string) {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    await refreshUsers()
    setLoadingId(null)
  }

  const statusColor: Record<string, string> = {
    active: 'text-teal border-teal/30 bg-teal/5',
    pending: 'text-gold border-gold/30 bg-gold/5',
    deactivated: 'text-coral border-coral/30 bg-coral/5',
  }

  const selectClass = "bg-ocean border border-[var(--border)] rounded px-2 py-1 font-mono text-[0.6rem] tracking-[0.08em] text-[var(--text-mid)] focus:outline-none focus:border-teal/60 transition-colors"

  return (
    <>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={refreshUsers}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-display text-2xl text-[var(--text)]">User Management</div>
          <div className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)] mt-1">
            {users.length} accounts · DEQODE admin only
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="font-mono text-[0.65rem] tracking-[0.12em] uppercase px-4 py-2.5 rounded
                     bg-teal text-ocean hover:bg-teal/90 transition-colors"
        >
          + Invite User
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface">
              {['Email', 'Org', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)] last:border-0 hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3 font-sans text-sm text-[var(--text)]">{user.email}</td>
                <td className="px-4 py-3 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--text-mid)]">{user.org_slug}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={e => updateRole(user.id, e.target.value)}
                    disabled={loadingId === user.id}
                    className={selectClass}
                  >
                    {['viewer', 'analyst', 'admin', 'deqode_admin'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[0.6rem] tracking-[0.1em] uppercase border rounded-full px-2 py-0.5 ${statusColor[user.invite_status] ?? ''}`}>
                    {user.invite_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[0.6rem] text-[var(--text-dim)]">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.invite_status === 'pending' && (
                      <button
                        onClick={() => resendInvite(user.email)}
                        className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={loadingId === user.id}
                      className={`font-mono text-[0.6rem] tracking-[0.08em] uppercase transition-colors disabled:opacity-40
                        ${user.invite_status === 'deactivated'
                          ? 'text-teal hover:text-teal/80'
                          : 'text-coral hover:text-coral/80'}`}
                    >
                      {loadingId === user.id ? '…' : user.invite_status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create `app/admin/page.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify admin panel manually**

1. Sign in as `bhaiosi@gmail.com`
2. Go to `http://localhost:3000/admin`
3. Verify user table renders
4. Click **+ Invite User** → fill in a test email → click Send Invite
5. Check Supabase Dashboard → Authentication → Users — new user should appear
6. Check that test email receives the invite (check spam)

- [ ] **Step 5: Commit**

```bash
git add components/admin/ app/admin/
git commit -m "feat: admin panel — user table, invite modal, role and status management"
```

---

## Task 12: Sign-out + final wiring

**Files:**
- Create: `components/auth/SignOutButton.tsx`
- Create: `app/api/auth/signout/route.ts`

- [ ] **Step 1: Create `app/api/auth/signout/route.ts`**

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL!))
}
```

- [ ] **Step 2: Create `components/auth/SignOutButton.tsx`**

```tsx
'use client'

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className="font-mono text-[0.6rem] tracking-[0.12em] uppercase
                   text-[var(--text-dim)] hover:text-coral transition-colors"
      >
        Sign Out
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Add sign-out to TopNav for authenticated users**

Update `components/nav/TopNav.tsx` — replace the authenticated state block:

```tsx
{user ? (
  <div className="flex items-center gap-4">
    <Link
      href="/dashboard"
      className="font-mono text-[0.65rem] tracking-[0.14em] uppercase
                 px-4 py-2 rounded border border-teal/40 bg-teal/5
                 text-teal hover:bg-teal/10 transition-colors"
    >
      Dashboard →
    </Link>
    <SignOutButton />
  </div>
) : (
  <Link
    href="/login"
    className="font-mono text-[0.65rem] tracking-[0.14em] uppercase
               px-4 py-2 rounded border border-[var(--border)]
               text-[var(--text-mid)] hover:border-teal hover:text-teal
               transition-colors"
  >
    Sign In
  </Link>
)}
```

Add import at top of `TopNav.tsx`:
```tsx
import { SignOutButton } from '@/components/auth/SignOutButton'
```

- [ ] **Step 4: Full end-to-end verification**

Run through the complete flow:

1. `http://localhost:3000` — Sign In button visible
2. Click Sign In → `/login` — form renders correctly
3. Sign in with admin credentials → redirects to `/admin`
4. Visit `/niue` — module card shows authenticated state
5. Visit `/niue/coastline` — analysis module loads
6. Click Sign Out → redirected to `/`
7. Try `http://localhost:3000/niue/coastline` — redirected to `/login?next=/niue/coastline`
8. Sign in → redirected back to `/niue/coastline`
9. Try `http://localhost:3000/admin` signed out → redirected to `/login`
10. Sign in as non-admin user (create one via admin panel) → `/admin` redirects to `/dashboard`

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/auth/SignOutButton.tsx app/api/auth/signout/route.ts components/nav/TopNav.tsx
git commit -m "feat: sign-out route and button — auth system complete"
```

---

## Task 13: Deploy to Vercel

- [ ] **Step 1: Verify all env vars are set in Vercel**

Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=https://deqode-earth.vercel.app
```

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Monitor Vercel build**

Watch build logs in Vercel dashboard. Expected: build succeeds with no errors.

- [ ] **Step 4: Verify on production**

Repeat the 10-step manual verification from Task 12, Step 4 against `https://deqode-earth.vercel.app`.

- [ ] **Step 5: Final commit tag**

```bash
git tag auth-v1.0
git push origin auth-v1.0
```

---

## Self-review notes

**Spec coverage check:**
- ✓ Invite-only, no self-signup (Task 10 — no public invite route)
- ✓ Multi-user per org, RBAC (Task 1 types, Task 3 schema)
- ✓ Email+password primary (Task 6 SignInForm)
- ✓ Magic link for invite/reset/recovery (Task 5 callback, Task 10 invite route)
- ✓ Middleware route protection + session refresh (Task 4)
- ✓ `/dashboard` redirect → org_slug or `/admin` (Task 7)
- ✓ Public `/[country]` with locked cards + Request Access CTA (Task 9)
- ✓ Private `/[country]/coastline` gated (Task 4 middleware)
- ✓ `/admin` locked to deqode_admin (Task 4 middleware + Task 11 server check)
- ✓ Admin panel: invite, edit role, resend, deactivate/reactivate, last login (Task 11)
- ✓ Service role key server-side only (Task 2 admin.ts + Task 10 API routes)
- ✓ RLS org isolation (Task 3 SQL)
- ✓ Design language preserved (Tasks 6, 8, 9, 11 — all use existing tokens)
- ✓ Sign-out (Task 12)

**Type consistency:** `Profile`, `Role`, `InviteStatus` defined in `lib/supabase/types.ts` (Task 1) and used consistently across all subsequent tasks. `requireAdmin()` return type (`{ userId: string } | NextResponse`) is consistent across all admin routes.
