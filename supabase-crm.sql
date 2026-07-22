-- ============================================================
-- Mammoetgras sales-CRM — Database setup
-- Voer dit uit in de Supabase SQL Editor (Dashboard > SQL Editor)
-- Los van supabase-setup.sql (die de bezwaarkaarten aanmaakt).
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROLE-HELPER (security definer → omzeilt RLS, voorkomt recursie)
-- ------------------------------------------------------------
create or replace function public.current_role_is(target text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = target and active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role_is('admin');
$$;

-- ------------------------------------------------------------
-- 2. PROFILES
-- ------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('agent','closer','admin');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  leaddesk_name text,          -- naam zoals in LeadDesk-CSV (voor matching)
  role public.user_role not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profielen leesbaar voor ingelogden" on public.profiles;
create policy "profielen leesbaar voor ingelogden"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiel bijwerken (eigen of admin)" on public.profiles;
create policy "profiel bijwerken (eigen of admin)"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiel invoegen door admin" on public.profiles;
create policy "profiel invoegen door admin"
  on public.profiles for insert to authenticated
  with check (public.is_admin());

-- GUARD: niet-admin mag rol/active/id niet wijzigen (dicht het escalatie-gat)
create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.id is distinct from old.id then
      raise exception 'Alleen een admin mag rol of status wijzigen';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- AUTO-PROFIEL bij nieuwe auth-user (accounts worden in dashboard aangemaakt)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: maak profielen voor bestaande auth-users die er nog geen hebben
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- BOOTSTRAP (één keer): maak robin admin.
--   update public.profiles set role='admin'
--   where id = (select id from auth.users where email='robin@tictaps.com');

-- ------------------------------------------------------------
-- 3. LEADS
-- ------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  external_ref text,                       -- LeadDesk-id, voor dedupe
  full_name text,
  address text,
  phone text,
  email text,
  extra jsonb not null default '{}',       -- niet-gekoppelde CSV-kolommen
  agent_id uuid references public.profiles(id) on delete set null,
  closer_id uuid references public.profiles(id) on delete set null,
  funnel text not null default 'agent' check (funnel in ('agent','closing')),
  stage text not null,
  voicemail_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_external_ref_key
  on public.leads(external_ref) where external_ref is not null;
create index if not exists leads_agent_idx on public.leads(agent_id) where funnel = 'agent';
create index if not exists leads_closer_idx on public.leads(closer_id) where funnel = 'closing';
alter table public.leads enable row level security;

drop policy if exists "leads select (eigen/toegewezen/admin)" on public.leads;
create policy "leads select (eigen/toegewezen/admin)"
  on public.leads for select to authenticated
  using (agent_id = auth.uid() or closer_id = auth.uid() or public.is_admin());

drop policy if exists "leads insert door admin" on public.leads;
create policy "leads insert door admin"
  on public.leads for insert to authenticated
  with check (public.is_admin());

drop policy if exists "leads update (betrokken of admin)" on public.leads;
create policy "leads update (betrokken of admin)"
  on public.leads for update to authenticated
  using (agent_id = auth.uid() or closer_id = auth.uid() or public.is_admin())
  with check (agent_id = auth.uid() or closer_id = auth.uid() or public.is_admin());

drop policy if exists "leads delete door admin" on public.leads;
create policy "leads delete door admin"
  on public.leads for delete to authenticated using (public.is_admin());

-- updated_at bijwerken bij elke update
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_leads_touch on public.leads;
create trigger trg_leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 4. LEAD COMMENTS
-- ------------------------------------------------------------
create table if not exists public.lead_comments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_comments_lead_idx on public.lead_comments(lead_id);
alter table public.lead_comments enable row level security;

drop policy if exists "comments select (als lead zichtbaar)" on public.lead_comments;
create policy "comments select (als lead zichtbaar)"
  on public.lead_comments for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));

drop policy if exists "comments insert (eigen auteur)" on public.lead_comments;
create policy "comments insert (eigen auteur)"
  on public.lead_comments for insert to authenticated
  with check (author_id = auth.uid()
              and exists (select 1 from public.leads l where l.id = lead_id));

-- ------------------------------------------------------------
-- 5. APPOINTMENTS
-- ------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('terugbel','closing')),
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists appt_owner_time_idx on public.appointments(owner_id, starts_at);
alter table public.appointments enable row level security;

drop policy if exists "appointments select voor ingelogden" on public.appointments;
create policy "appointments select voor ingelogden"
  on public.appointments for select to authenticated using (true);

drop policy if exists "appointments insert" on public.appointments;
create policy "appointments insert"
  on public.appointments for insert to authenticated
  with check (owner_id = auth.uid() or created_by = auth.uid() or public.is_admin());

drop policy if exists "appointments update" on public.appointments;
create policy "appointments update"
  on public.appointments for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "appointments delete" on public.appointments;
create policy "appointments delete"
  on public.appointments for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());
