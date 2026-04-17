# DEQODE EARTH — Auth & Access Design
**Date:** 2026-04-17  
**Status:** Approved  
**Stack:** Next.js 16 · Supabase Auth · `@supabase/ssr` · Tailwind 4

---

## Context

DEQODE EARTH is a government-facing geospatial intelligence platform for Pacific SIDS. This spec covers the auth and access control layer required to transition it from a public demo to a secure partner-facing product.

Existing Supabase packages (`@supabase/ssr`, `@supabase/supabase-js`) are already installed. No new auth dependencies are introduced.

---

## Access Model

**Invite-only.** No public self-signup. DEQODE provisions all accounts manually via `/admin`. Multi-user per country/org with role-based access control. Structured to expand as the product matures.

---

## Data Model

### `profiles` table

Extends Supabase `auth.users`. Created via trigger on first sign-in.

```sql
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  role            text not null check (role in ('viewer','analyst','admin','deqode_admin')),
  org_slug        text not null,           -- country slug or 'deqode'
  invite_status   text not null default 'pending'
                  check (invite_status in ('pending','active','deactivated')),
  invited_at      timestamptz default now(),
  last_sign_in_at timestamptz,
  created_by      uuid references profiles(id)
);
```

### Role capabilities

| Role | Public dashboard | Private dashboard | Run analysis | Download reports | Admin panel |
|---|---|---|---|---|---|
| `viewer` | ✓ | ✓ read-only | — | — | — |
| `analyst` | ✓ | ✓ full | ✓ | ✓ | — |
| `admin` | ✓ | ✓ full | ✓ | ✓ | own org only |
| `deqode_admin` | ✓ | ✓ full | ✓ | ✓ | all orgs |

### RLS policies

Row Level Security enforced on all sensitive tables. Users can only read data where `org_slug` matches their profile. `deqode_admin` bypasses org filter. RLS is the enforcement layer — middleware is the UX layer.

---

## Auth Flows

### Invite (new user)

1. DEQODE admin opens `/admin` → clicks **Invite User** → fills email, role, org
2. Server calls `supabase.auth.admin.inviteUserByEmail()` via `/api/admin/invite`
3. Supabase sends branded magic link email to the user
4. User clicks link → `/auth/accept` → sets password
5. Supabase Auth hook fires → creates `profiles` row → sets `invite_status = 'active'`

### Sign-in (returning user)

1. User visits `/login` → enters email + password
2. Supabase Auth validates → returns session
3. `@supabase/ssr` sets encrypted session cookie
4. Middleware reads cookie on subsequent requests
5. User redirected to `/dashboard` → resolves to `/[user.org_slug]`

### Magic link fallback

- **Password reset:** user requests reset on `/login` → Supabase sends link → `/auth/reset`
- **Re-entry / lockout:** DEQODE admin triggers re-invite from `/admin` → new magic link sent
- **First-time onboarding:** invite email is itself a magic link → `/auth/accept`

---

## Middleware

File: `middleware.ts` at project root.

**Logic:**
- Runs on all routes except `/_next`, `/public`, `/api/health`
- Refreshes Supabase session cookie on every request
- If route is protected and no valid session → redirect to `/login?next=[path]`
- If route is `/admin` and role is not `deqode_admin` → redirect to `/dashboard`
- Public routes (`/`, `/[country]`) always pass through

**Protected route patterns:**
```
/dashboard/*
/[country]/coastline
/[country]/ocean
/[country]/reef
/[country]/reports
/[country]/alerts
/admin/*
```

---

## Route Structure

```
/                          public  — homepage
/[country]                 public  — sanitised country dashboard
/login                     public  — sign-in (email+password + magic link fallback)
/auth/accept               public  — invite acceptance + password set
/auth/reset                public  — password reset

/dashboard                 private — server redirect → /[user.org_slug] (deqode_admin → /admin)
/[country]/coastline       private — full coastline analysis module
/[country]/ocean           private — EEZ/ocean module (Phase 2)
/[country]/reef            private — reef module (Phase 3)
/[country]/reports         private — report library + downloads
/[country]/alerts          private — watch zones + alerts

/admin                     deqode_admin — user management panel
```

---

## Public vs Private Dashboard Split

### Public `/[country]`
- Country hero, headline risk level, safe summary map
- Module summary cards (coastline, ocean, reef, land)
- Locked state on private content → "Request Access" CTA
- Methodology section, sample outputs
- No GEE calls, no sensitive data — static or lightly cached
- Purpose: build trust with governments, NGOs, and funding bodies

### Private `/[country]/*`
- Full analysis modules with live GEE calls
- Report downloads, watch zones, event drill-downs, vessel/activity layers
- Data scoped to user's `org_slug` via RLS
- Niue analyst sees only Niue operational data

---

## Admin Panel `/admin`

Accessible only to `deqode_admin` role. Enforced at middleware and API layer.

### User table columns
Email · Org · Role · Invite status · Last login · Actions

### Actions per user
- **Invite** — modal: email, role, org → triggers `/api/admin/invite`
- **Edit role** — inline dropdown → PATCH `/api/admin/users/[id]`
- **Resend invite** — re-triggers magic link → POST `/api/admin/invite/resend`
- **Deactivate / Reactivate** — toggles `invite_status` → PATCH `/api/admin/users/[id]`

### API routes (server-side only)
All admin mutations use the Supabase service role key server-side. The service role key is never exposed to the client.

```
POST   /api/admin/invite
POST   /api/admin/invite/resend
PATCH  /api/admin/users/[id]
GET    /api/admin/users
```

---

## Security Constraints

- Supabase service role key: server-side only, never in client bundle
- Anon key: client-safe, used for public data only
- RLS enforces org isolation at the database layer
- Middleware enforces route protection at the edge
- Session cookies: httpOnly, secure, SameSite=Lax via `@supabase/ssr`
- `/api/admin/*` routes: additional server-side role check on every request

---

## UI Approach

Preserve existing EARTH design language exactly. New auth UI components use the same palette, typography, and component patterns:

- Ocean `#0D1B2A` background, teal `#4CB9C0` accents
- Playfair Display SC for display, DM Sans for body, JetBrains Mono for labels/codes
- Sign-in page: centred card on full ocean background, minimal form
- `/admin` panel: existing nav + data table, consistent with dashboard aesthetic
- "Request Access" CTA on public dashboard: same border/mono style as existing nav Sign In button

---

## Out of Scope (this phase)

- SSO / OAuth (Google Workspace, government identity providers)
- MFA / 2FA (add in Phase 2 if government requirements demand it)
- Full audit log UI (backend audit trail via Supabase logs is sufficient for Phase 1)
- Self-service org management
- Billing / subscription gating
