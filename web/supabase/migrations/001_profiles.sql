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
