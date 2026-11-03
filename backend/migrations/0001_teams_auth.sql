-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0001_teams_auth.sql — team/user/brand-access data model              ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Uses Supabase Auth (auth.users) for login — we only store the
-- role/team mapping on top of it, not passwords/sessions ourselves.

-- ── Teams ─────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ── Profiles — extends auth.users with role + team ──────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Team → GrowifyOS brandId assignments (many-to-many) ─────────────────
create table if not exists public.team_brands (
  team_id    uuid not null references public.teams(id) on delete cascade,
  brand_id   text not null,
  created_at timestamptz not null default now(),
  primary key (team_id, brand_id)
);
create index if not exists team_brands_team_id_idx on public.team_brands(team_id);

-- ── Auto-create a profile row whenever someone signs up via Supabase Auth ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────
-- Our FastAPI backend does all reads/writes with the Supabase SERVICE key,
-- which bypasses RLS entirely — these policies are defense-in-depth for if
-- the frontend ever queries Supabase directly (e.g. for "my team" display),
-- not the primary enforcement point (that's the backend, per the plan).
alter table public.teams       enable row level security;
alter table public.profiles    enable row level security;
alter table public.team_brands enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "teams_select_authenticated"
  on public.teams for select
  to authenticated
  using (true);

create policy "team_brands_select_own_team_or_admin"
  on public.team_brands for select
  using (
    team_id = (select team_id from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- No insert/update/delete policies for the `authenticated` role on any of
-- these tables — a normal logged-in user can never edit their own role,
-- team, or any team's brand list. Only the backend's service-key writes can.
