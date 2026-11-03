-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0002_team_brand_names.sql — brand NAME → team, resolved by brandId   ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- team_brands (brandId -> team) only works for brands GrowifyOS already
-- knows about. Most of the business's real brands aren't connected to
-- GrowifyOS yet, so team assignment has to be plannable by NAME ahead of
-- that — this table holds that intent (e.g. "Angad Singh Official -> Team 4"
-- decided today, brand connected by the teammate next month).
--
-- The backend resolves this automatically: whenever it fetches the live
-- GrowifyOS brand list, any brand whose name matches a row here gets a
-- team_brands row written for it right then — no admin action required
-- the moment a brand goes live, which is the whole point.

create table if not exists public.team_brand_names (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  -- Matched case-insensitively against GrowifyOS's brand `name` field.
  brand_name text not null,
  created_at timestamptz not null default now(),
  unique (brand_name)
);
create index if not exists team_brand_names_team_id_idx on public.team_brand_names(team_id);

alter table public.team_brand_names enable row level security;

create policy "team_brand_names_select_own_team_or_admin"
  on public.team_brand_names for select
  using (
    team_id = (select team_id from public.profiles where id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- No insert/update/delete policy for `authenticated` — only the backend's
-- service-key admin endpoints can write these.
